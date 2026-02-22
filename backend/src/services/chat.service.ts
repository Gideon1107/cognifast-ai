import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/dbConnection';
import { conversations, conversationSources, messages, sources } from '../db/schema';
import { eq, inArray, asc, desc } from 'drizzle-orm';
import { StorageService } from './storage.service';
import { executeChatGraph, streamChatGraph } from '../graphs/chat.graph';
import type { SourceType } from '@shared/types';
import {
    Conversation,
    Message,
    ConversationState,
    StartConversationRequest,
    SendMessageRequest,
    SendMessageResult
} from '../types/chat.types';
import { createLogger } from '../utils/logger';

const logger = createLogger('CHAT-SERVICE');

function toConv(
    row: { id: string; title: string | null; createdAt: Date | null; updatedAt: Date | null },
    sourceIds: string[],
    sourceNames: string[],
    sourceTypes?: SourceType[]
): Conversation {
    return {
        id: row.id,
        sourceIds,
        sourceNames,
        sourceTypes: sourceTypes ?? sourceNames.map(() => 'pdf' as const),
        title: row.title ?? undefined,
        createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
}

function toMsg(row: {
    id: string;
    conversationId: string | null;
    role: string | null;
    content: string;
    sources: unknown;
    createdAt: Date | null;
}): Message {
    return {
        id: row.id,
        conversationId: row.conversationId ?? '',
        role: (row.role as 'user' | 'assistant' | 'system') ?? 'user',
        content: row.content,
        sources: row.sources as Message['sources'],
        createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    };
}

export class ChatService {
    static async getAllConversations(): Promise<Conversation[]> {
        try {
            const convRows = await db
                .select()
                .from(conversations)
                .orderBy(desc(conversations.updatedAt));

            if (convRows.length === 0) return [];

            const result: Conversation[] = [];
            for (const conv of convRows) {
                const csRows = await db
                    .select({ sourceId: conversationSources.sourceId })
                    .from(conversationSources)
                    .where(eq(conversationSources.conversationId, conv.id));
                const sourceIds = csRows.map(s => s.sourceId);
                if (sourceIds.length === 0) {
                    result.push(toConv(conv, [], [], []));
                    continue;
                }
                const sourceRows = await db
                    .select({ id: sources.id, originalName: sources.originalName, fileType: sources.fileType })
                    .from(sources)
                    .where(inArray(sources.id, sourceIds));
                const sourceNames = sourceRows.map(s => s.originalName);
                const sourceTypes = sourceRows.map(s => s.fileType as SourceType);
                result.push(toConv(conv, sourceIds, sourceNames, sourceTypes));
            }
            return result;
        } catch (error: any) {
            logger.error(`Error fetching conversations: ${error.message}`);
            throw error;
        }
    }

    static async createConversation(request: StartConversationRequest): Promise<{ conversation: Conversation; initialMessages: Message[] }> {
        try {
            const { sourceIds } = request;
            if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
                throw new Error('sourceIds must be a non-empty array');
            }

            const sourceRows = await db
                .select({ id: sources.id, originalName: sources.originalName, fileType: sources.fileType })
                .from(sources)
                .where(inArray(sources.id, sourceIds));

            if (sourceRows.length !== sourceIds.length) {
                logger.error('One or more sources not found');
                throw new Error('One or more sources not found');
            }

            const conversationId = uuidv4();
            let title: string;
            if (request.title?.trim()) {
                title = request.title.trim().slice(0, 100);
            } else if (request.initialMessage?.trim()) {
                title = request.initialMessage.trim().slice(0, 50);
            } else {
                title = 'New Conversation';
            }
            if (title.length > 100) title = title.slice(0, 100);

            logger.info(`Creating conversation with title: "${title}"`);

            await db.insert(conversations).values({
                id: conversationId,
                title,
            });

            try {
                await db.insert(conversationSources).values(
                    sourceIds.map(sourceId => ({ conversationId, sourceId }))
                );
            } catch (junctionError: any) {
                await db.delete(conversations).where(eq(conversations.id, conversationId));
                logger.error(`Failed to associate sources: ${junctionError.message}`);
                throw new Error(`Failed to associate sources: ${junctionError.message}`);
            }

            logger.info(`Conversation created: ${conversationId} with ${sourceIds.length} source(s)`);

            const conversation: Conversation = {
                id: conversationId,
                sourceIds,
                sourceNames: sourceRows.map(s => s.originalName),
                sourceTypes: sourceRows.map(s => s.fileType as SourceType),
                title,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (request.initialMessage) {
                const result = await this.sendMessage({
                    conversationId,
                    message: request.initialMessage,
                });
                return {
                    conversation,
                    initialMessages: [
                        {
                            id: uuidv4(),
                            conversationId,
                            role: 'user' as const,
                            content: request.initialMessage,
                            createdAt: new Date().toISOString(),
                        },
                        result.message,
                    ],
                };
            }

            return { conversation, initialMessages: [] };
        } catch (error: any) {
            logger.error(`Error creating conversation: ${error.message}`);
            throw error;
        }
    }

    static async sendMessage(request: SendMessageRequest): Promise<SendMessageResult> {
        try {
            const sendMessageStartTime = Date.now();

            const [conversation] = await db
                .select()
                .from(conversations)
                .where(eq(conversations.id, request.conversationId))
                .limit(1);

            if (!conversation) {
                logger.error(`Conversation not found: ${request.conversationId}`);
                throw new Error(`Conversation not found: ${request.conversationId}`);
            }

            const convoSourceRows = await db
                .select({ sourceId: conversationSources.sourceId })
                .from(conversationSources)
                .where(eq(conversationSources.conversationId, request.conversationId));

            const sourceIds = convoSourceRows.map(cs => cs.sourceId);
            if (sourceIds.length === 0) {
                logger.error('No sources associated with this conversation');
                throw new Error('No sources associated with this conversation');
            }

            const messageRows = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, request.conversationId))
                .orderBy(asc(messages.createdAt));

            const historyMessages: Message[] = messageRows.map(toMsg);

            const userMessage: Message = {
                id: uuidv4(),
                conversationId: request.conversationId,
                role: 'user',
                content: request.message,
                createdAt: new Date().toISOString(),
            };

            await db.insert(messages).values({
                id: userMessage.id,
                conversationId: userMessage.conversationId,
                role: userMessage.role,
                content: userMessage.content,
            });

            const isFirstMessage = historyMessages.length === 0;
            const initialState: ConversationState = {
                conversationId: request.conversationId,
                sourceIds,
                messages: [...historyMessages, userMessage],
                currentQuery: request.message,
                retrievedChunks: [],
                routerDecision: 'clarify',
                responseQuality: 'pending',
                retryCount: 0,
                metadata: { startTime: Date.now(), isFirstMessage },
            };

            const finalState = await executeChatGraph(initialState);
            const assistantMessage = finalState.messages[finalState.messages.length - 1];

            if (!assistantMessage || assistantMessage.role !== 'assistant') {
                logger.error('No assistant message generated');
                throw new Error('No assistant message generated');
            }

            await db.insert(messages).values({
                id: assistantMessage.id,
                conversationId: assistantMessage.conversationId,
                role: assistantMessage.role,
                content: assistantMessage.content,
                sources: assistantMessage.sources
                    ? (assistantMessage.sources as unknown as Record<string, unknown>)
                    : null,
            });

            await db
                .update(conversations)
                .set({ updatedAt: new Date() })
                .where(eq(conversations.id, request.conversationId));

            const totalTime = Date.now() - sendMessageStartTime;
            logger.info(`[TIMING] Total sendMessage time: ${totalTime}ms`);

            return {
                message: assistantMessage,
                metadata: {
                    totalTokens: finalState.metadata.totalTokens,
                    model: finalState.metadata.model,
                    executionTime: totalTime,
                    startTime: finalState.metadata.startTime,
                    endTime: finalState.metadata.endTime,
                },
            };
        } catch (error: any) {
            logger.error(`Error sending message: ${error.message}`);
            throw error;
        }
    }

    static async getConversation(conversationId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
        try {
            const [conversation] = await db
                .select()
                .from(conversations)
                .where(eq(conversations.id, conversationId))
                .limit(1);

            if (!conversation) {
                logger.error(`Conversation not found: ${conversationId}`);
                throw new Error(`Conversation not found: ${conversationId}`);
            }

            const convSourceRows = await db
                .select({ sourceId: conversationSources.sourceId })
                .from(conversationSources)
                .where(eq(conversationSources.conversationId, conversationId));

            const sourceIds = convSourceRows.map(cs => cs.sourceId);
            let sourceNames: string[] = [];
            let sourceTypes: SourceType[] = [];
            if (sourceIds.length > 0) {
                const sourceRows = await db
                    .select({ originalName: sources.originalName, fileType: sources.fileType })
                    .from(sources)
                    .where(inArray(sources.id, sourceIds));
                sourceNames = sourceRows.map(s => s.originalName);
                sourceTypes = sourceRows.map(s => s.fileType as SourceType);
            }

            const messageRows = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(asc(messages.createdAt));

            const msgs = messageRows.map(toMsg);

            return {
                conversation: toConv(conversation, sourceIds, sourceNames, sourceTypes),
                messages: msgs,
            };
        } catch (error: any) {
            logger.error(`Error getting conversation: ${error.message}`);
            throw error;
        }
    }

    static async getConversationsBySource(sourceId: string): Promise<Conversation[]> {
        try {
            const csRows = await db
                .select({ conversationId: conversationSources.conversationId })
                .from(conversationSources)
                .where(eq(conversationSources.sourceId, sourceId));

            const conversationIds = csRows.map(cs => cs.conversationId);
            if (conversationIds.length === 0) return [];

            const convRows = await db
                .select()
                .from(conversations)
                .where(inArray(conversations.id, conversationIds))
                .orderBy(desc(conversations.updatedAt));

            const result: Conversation[] = [];
            for (const conv of convRows) {
                const sRows = await db
                    .select({ sourceId: conversationSources.sourceId })
                    .from(conversationSources)
                    .where(eq(conversationSources.conversationId, conv.id));
                const sourceIds = sRows.map(s => s.sourceId);
                const sourceDetails = await db
                    .select({ originalName: sources.originalName })
                    .from(sources)
                    .where(inArray(sources.id, sourceIds));
                result.push({
                    id: conv.id,
                    sourceIds,
                    sourceNames: sourceDetails.map(s => s.originalName),
                    sourceTypes: sourceDetails.map((): SourceType => 'pdf'),
                    title: conv.title ?? undefined,
                    createdAt: conv.createdAt?.toISOString() ?? new Date().toISOString(),
                    updatedAt: conv.updatedAt?.toISOString() ?? new Date().toISOString(),
                });
            }
            return result;
        } catch (error: any) {
            logger.error(`Error getting conversations by document: ${error.message}`);
            throw error;
        }
    }

    static async updateConversationTitle(conversationId: string, title: string): Promise<Conversation> {
        try {
            const trimmedTitle = title.trim();
            if (!trimmedTitle) throw new Error('Title must be a non-empty string');
            const finalTitle = trimmedTitle.length > 100 ? trimmedTitle.slice(0, 100) : trimmedTitle;

            const [existing] = await db
                .select({ id: conversations.id })
                .from(conversations)
                .where(eq(conversations.id, conversationId))
                .limit(1);

            if (!existing) {
                logger.error(`Conversation not found: ${conversationId}`);
                throw new Error('Conversation not found');
            }

            const [updated] = await db
                .update(conversations)
                .set({ title: finalTitle, updatedAt: new Date() })
                .where(eq(conversations.id, conversationId))
                .returning();

            if (!updated) throw new Error('Failed to update conversation title');

            const csRows = await db
                .select({ sourceId: conversationSources.sourceId })
                .from(conversationSources)
                .where(eq(conversationSources.conversationId, conversationId));
            const sourceIds = csRows.map(s => s.sourceId);
            const sourceRows = await db
                .select({ originalName: sources.originalName, fileType: sources.fileType })
                .from(sources)
                .where(inArray(sources.id, sourceIds));

            const conversation: Conversation = {
                id: updated.id,
                title: updated.title ?? undefined,
                sourceIds,
                sourceNames: sourceRows.map(s => s.originalName),
                sourceTypes: sourceRows.map(s => s.fileType as SourceType),
                createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
                updatedAt: updated.updatedAt?.toISOString() ?? new Date().toISOString(),
            };

            logger.info(`Updated conversation title: ${conversationId} -> ${finalTitle}`);
            return conversation;
        } catch (error: any) {
            logger.error(`Error updating conversation title: ${error.message}`);
            throw error;
        }
    }

    static async deleteConversation(conversationId: string): Promise<void> {
        try {
            // 1. Fetch source IDs and file paths BEFORE deletion (rows gone after cascade)
            const linkedSources = await db
                .select({ id: sources.id, filePath: sources.filePath, fileType: sources.fileType })
                .from(conversationSources)
                .innerJoin(sources, eq(conversationSources.sourceId, sources.id))
                .where(eq(conversationSources.conversationId, conversationId));

            // 2. Delete conversation — DB cascade handles:
            //    messages, conversation_sources, quizzes, quiz_attempts
            await db.delete(conversations).where(eq(conversations.id, conversationId));
            logger.info(`Conversation deleted: ${conversationId}`);

            // 3. Delete source rows and their chunks (cascade: source_chunks)
            if (linkedSources.length > 0) {
                const sourceIds = linkedSources.map(s => s.id);
                await db.delete(sources).where(inArray(sources.id, sourceIds));
            }

            // 4. Delete physical files (non-fatal, skip URL sources)
            const storageService = new StorageService();
            for (const source of linkedSources) {
                if (source.fileType !== 'url') {
                    await storageService.deleteFile(source.filePath);
                }
            }
        } catch (error: any) {
            logger.error(`Error deleting conversation: ${error.message}`);
            throw error;
        }
    }

    static async* streamMessage(request: SendMessageRequest) {
        try {
            const [conversation] = await db
                .select()
                .from(conversations)
                .where(eq(conversations.id, request.conversationId))
                .limit(1);

            if (!conversation) {
                logger.error(`Conversation not found: ${request.conversationId}`);
                throw new Error(`Conversation not found: ${request.conversationId}`);
            }

            const convoSourceRows = await db
                .select({ sourceId: conversationSources.sourceId })
                .from(conversationSources)
                .where(eq(conversationSources.conversationId, request.conversationId));

            const sourceIds = convoSourceRows.map(cs => cs.sourceId);
            if (sourceIds.length === 0) {
                logger.error('No sources associated with this conversation');
                throw new Error('No sources associated with this conversation');
            }

            const messageRows = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, request.conversationId))
                .orderBy(asc(messages.createdAt));

            const historyMessages = messageRows.map(toMsg);

            const userMessage: Message = {
                id: uuidv4(),
                conversationId: request.conversationId,
                role: 'user',
                content: request.message,
                createdAt: new Date().toISOString(),
            };

            await db.insert(messages).values({
                id: userMessage.id,
                conversationId: userMessage.conversationId,
                role: userMessage.role,
                content: userMessage.content,
            });

            const initialState: ConversationState = {
                conversationId: request.conversationId,
                sourceIds,
                messages: [...historyMessages, userMessage],
                currentQuery: request.message,
                retrievedChunks: [],
                routerDecision: 'clarify',
                responseQuality: 'pending',
                retryCount: 0,
                metadata: { startTime: Date.now() },
            };

            logger.info('Streaming Chat StateGraph...');
            for await (const stateUpdate of streamChatGraph(initialState)) {
                yield stateUpdate;
            }
        } catch (error: any) {
            logger.error(`Error streaming message: ${error.message}`);
            throw error;
        }
    }
}

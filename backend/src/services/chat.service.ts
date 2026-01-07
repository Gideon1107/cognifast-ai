import { v4 as uuidv4 } from 'uuid';
import supabase from '../db/dbConnection';
import { executeChatGraph, streamChatGraph } from '../graphs/chat.graph';
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

export class ChatService {
    /**
     * Get all conversations with source IDs and names
     */
    static async getAllConversations(): Promise<Conversation[]> {
        try {
            const { data: conversations, error } = await supabase
                .from('conversations')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) {
                logger.error(`Error fetching conversations: ${error.message}`);
                throw new Error(`Error fetching conversations: ${error.message}`);
            }

            if (!conversations || conversations.length === 0) {
                return [];
            }

            // Enrich each conversation with source IDs and names
            const conversationsWithSources = await Promise.all(
                conversations.map(async (conv) => {
                    // Get source IDs from junction table
                    const { data: convSources } = await supabase
                        .from('conversation_sources')
                        .select('source_id')
                        .eq('conversation_id', conv.id);

                    const sourceIds = (convSources || []).map(s => s.source_id);

                    // Fetch source names
                    const { data: sourceDetails } = await supabase
                        .from('sources')
                        .select('id, original_name')
                        .in('id', sourceIds);

                    const sourceNames = (sourceDetails || []).map(s => s.original_name);

                    return {
                        id: conv.id,
                        sourceIds: sourceIds,
                        sourceNames: sourceNames,
                        title: conv.title,
                        createdAt: conv.created_at,
                        updatedAt: conv.updated_at
                    };
                })
            );

            return conversationsWithSources;

        } catch (error: any) {
            logger.error(`Error getting all conversations: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a new conversation
     */
    static async createConversation(request: StartConversationRequest): Promise<{ conversation: Conversation; initialMessages: Message[] }> {
        try {
            const { sourceIds } = request;

            // Validate sourceIds is non-empty array
            if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
                throw new Error('sourceIds must be a non-empty array');
            }

            // Validate all sources exist
            const { data: sources, error: sourceError } = await supabase
                .from('sources')
                .select('id, original_name')
                .in('id', sourceIds);

            if (sourceError) {
                logger.error('Error fetching sources:', sourceError.message);
                throw new Error(`Error fetching sources: ${sourceError.message}`);
            }

            if (!sources || sources.length !== sourceIds.length) {
                logger.error('One or more sources not found');
                throw new Error('One or more sources not found');
            }

            // Create conversation
            const conversationId = uuidv4();
            // Use provided title if available, otherwise fall back to existing logic
            let title: string;
            if (request.title && request.title.trim().length > 0) {
                title = request.title.trim();
            } else if (request.initialMessage && request.initialMessage.trim().length > 0) {
                title = request.initialMessage.trim().slice(0, 50);
            } else {
                title = 'New Conversation';
            }
            // Ensure title doesn't exceed 100 characters
            if (title.length > 100) {
                title = title.slice(0, 100);
            }

            logger.info(`Creating conversation with title: "${title}" (from request.title: "${request.title}")`);

            const { data, error } = await supabase
                .from('conversations')
                .insert([{
                    id: conversationId,
                    title: title,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                logger.error(`Failed to create conversation: ${error.message}`);
                throw new Error(`Failed to create conversation: ${error.message}`);
            }

            // Insert source associations via junction table
            const associations = sourceIds.map(sourceId => ({
                conversation_id: conversationId,
                source_id: sourceId
            }));

            const { error: junctionError } = await supabase
                .from('conversation_sources')
                .insert(associations);

            if (junctionError) {
                // Rollback: delete the conversation
                logger.error(`Failed to associate documents: ${junctionError.message}`);
                await supabase.from('conversations').delete().eq('id', conversationId);
                throw new Error(`Failed to associate sources: ${junctionError.message}`);
            }

            logger.info(`Conversation created: ${conversationId} with ${sourceIds.length} source(s)`);

            const conversation: Conversation = {
                id: data.id,
                sourceIds: sourceIds,
                sourceNames: sources.map(s => s.original_name),
                title: data.title,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };

            // If there's an initial message, process it and return the conversation with messages
            if (request.initialMessage) {
                const result = await this.sendMessage({
                    conversationId: conversationId,
                    message: request.initialMessage
                });
                
                // Return conversation with the initial exchange
                return {
                    conversation,
                    initialMessages: [
                        {
                            id: uuidv4(),
                            conversationId: conversationId,
                            role: 'user' as const,
                            content: request.initialMessage,
                            createdAt: new Date().toISOString()
                        },
                        result.message
                    ]
                };
            }

            return { conversation, initialMessages: [] };

        } catch (error: any) {
            logger.error(`Error creating conversation: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send a message and get AI response using LangGraph
     */
    static async sendMessage(request: SendMessageRequest): Promise<SendMessageResult> {
        try {
            const sendMessageStartTime = Date.now();
            
            // Get conversation
            const convStartTime = Date.now();
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', request.conversationId)
                .single();

            if (convError || !conversation) {
                logger.error(`Conversation not found: ${request.conversationId}`);
                throw new Error(`Conversation not found: ${request.conversationId}`);
            }
            logger.info(`[TIMING] Fetch conversation: ${Date.now() - convStartTime}ms`);

            // Get source IDs from junction table
            const sourceStartTime = Date.now();
            const { data: convoSources, error: convoSourcesError } = await supabase
                .from('conversation_sources')
                .select('source_id')
                .eq('conversation_id', request.conversationId);

            if (convoSourcesError) {
                logger.error(`Failed to fetch conversation sources: ${convoSourcesError.message}`);
                throw new Error(`Failed to fetch conversation sources: ${convoSourcesError.message}`);
            }

            const sourceIds = (convoSources || []).map(cs => cs.source_id);

            if (sourceIds.length === 0) {
                logger.error('No sources associated with this conversation');
                throw new Error('No sources associated with this conversation');
            }
            logger.info(`[TIMING] Fetch source IDs: ${Date.now() - sourceStartTime}ms`);

            // Get conversation history
            const historyStartTime = Date.now();
            const { data: messageHistory, error: msgError } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', request.conversationId)
                .order('created_at', { ascending: true });

            if (msgError) {
                logger.error(`Failed to fetch messages: ${msgError.message}`);
                throw new Error(`Failed to fetch messages: ${msgError.message}`);
            }
            logger.info(`[TIMING] Fetch message history: ${Date.now() - historyStartTime}ms`);

            // Convert to Message format
            const messages: Message[] = (messageHistory || []).map(msg => ({
                id: msg.id,
                conversationId: msg.conversation_id,
                role: msg.role,
                content: msg.content,
                sources: msg.sources,
                createdAt: msg.created_at
            }));

            // Create user message
            const userMessage: Message = {
                id: uuidv4(),
                conversationId: request.conversationId,
                role: 'user',
                content: request.message,
                createdAt: new Date().toISOString()
            };

            // Save user message to database
            const saveUserMsgStartTime = Date.now();
            await supabase
                .from('messages')
                .insert([{
                    id: userMessage.id,
                    conversation_id: userMessage.conversationId,
                    role: userMessage.role,
                    content: userMessage.content,
                    created_at: userMessage.createdAt
                }]);
            logger.info(`[TIMING] Save user message: ${Date.now() - saveUserMsgStartTime}ms`);
            logger.info(`User message saved: ${userMessage.id}`);

            // Prepare initial state for LangGraph
            const isFirstMessage = messages.length === 0;
            const initialState: ConversationState = {
                conversationId: request.conversationId,
                sourceIds: sourceIds, // Array of source IDs
                messages: [...messages, userMessage], // Include user message
                currentQuery: request.message,
                retrievedChunks: [],
                routerDecision: 'clarify',
                responseQuality: 'pending',
                retryCount: 0,
                metadata: {
                    startTime: Date.now(),
                    isFirstMessage: isFirstMessage // Flag to skip quality check
                }
            };

            // Execute the LangGraph chat workflow
            const totalStartTime = Date.now();
            logger.info('Executing Chat StateGraph...');
            const finalState = await executeChatGraph(initialState);
            const totalEndTime = Date.now();
            logger.info(`Total graph execution time: ${totalEndTime - totalStartTime}ms`);

            // Get the assistant's message (last message in the final state)
            const assistantMessage = finalState.messages[finalState.messages.length - 1];

            if (!assistantMessage || assistantMessage.role !== 'assistant') {
                logger.error('Final state messages:', finalState.messages.map(m => ({ role: m.role, contentLength: m.content?.length })));
                logger.error(`Final state quality: ${finalState.responseQuality}`);
                logger.error(`Final state retry count: ${finalState.retryCount}`);
                logger.error('No assistant message generated');
                throw new Error('No assistant message generated');
            }

            // Save assistant message to database
            const saveAssistantMsgStartTime = Date.now();
            await supabase
                .from('messages')
                .insert([{
                    id: assistantMessage.id,
                    conversation_id: assistantMessage.conversationId,
                    role: assistantMessage.role,
                    content: assistantMessage.content,
                    sources: assistantMessage.sources ? JSON.stringify(assistantMessage.sources) : null,
                    created_at: assistantMessage.createdAt
                }]);
            logger.info(`[TIMING] Save assistant message: ${Date.now() - saveAssistantMsgStartTime}ms`);
            logger.info(`Assistant message saved: ${assistantMessage.id}`);

            // Update conversation's updated_at timestamp
            const updateConvStartTime = Date.now();
            await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', request.conversationId);
            logger.info(`[TIMING] Update conversation timestamp: ${Date.now() - updateConvStartTime}ms`);

            const sendMessageEndTime = Date.now();
            const totalTime = sendMessageEndTime - sendMessageStartTime;
            const isFollowUp = messages.length > 0;
            
            logger.info(`[TIMING] ========================================`);
            logger.info(`[TIMING] Total sendMessage time: ${totalTime}ms (${isFollowUp ? 'FOLLOW-UP' : 'FIRST'} message)`);
            logger.info(`[TIMING] ========================================`);

            return {
                message: assistantMessage,
                metadata: {
                    totalTokens: finalState.metadata.totalTokens,
                    model: finalState.metadata.model,
                    executionTime: totalTime,
                    startTime: finalState.metadata.startTime,
                    endTime: finalState.metadata.endTime
                }
            };

        } catch (error: any) {
            logger.error(`Error sending message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get a conversation with all messages
     */
    static async getConversation(conversationId: string): Promise<{ conversation: Conversation; messages: Message[] }> {
        try {
            // Get conversation
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .single();

            if (convError || !conversation) {
                logger.error(`Conversation not found: ${conversationId}`);
                throw new Error(`Conversation not found: ${conversationId}`);
            }

            // Get source IDs and names from junction table
            const { data: convSources, error: convSourcesError } = await supabase
                .from('conversation_sources')
                .select('source_id')
                .eq('conversation_id', conversationId);

            if (convSourcesError) {
                logger.error(`Failed to fetch conversation sources: ${convSourcesError.message}`);
                throw new Error(`Failed to fetch conversation sources: ${convSourcesError.message}`);
            }

            const sourceIds = (convSources || []).map(cs => cs.source_id);

            // Get source names
            let sourceNames: string[] = [];
            if (sourceIds.length > 0) {
                const { data: sources } = await supabase
                    .from('sources')
                    .select('id, original_name')
                    .in('id', sourceIds);
                sourceNames = (sources || []).map(s => s.original_name);
            }

            // Get messages
            const { data: messageData, error: msgError } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true});

            if (msgError) {
                logger.error(`Failed to fetch messages: ${msgError.message}`);
                throw new Error(`Failed to fetch messages: ${msgError.message}`);
            }

            const messages: Message[] = (messageData || []).map(msg => ({
                id: msg.id,
                conversationId: msg.conversation_id,
                role: msg.role,
                content: msg.content,
                sources: msg.sources,
                createdAt: msg.created_at
            }));

            return {
                conversation: {
                    id: conversation.id,
                    sourceIds: sourceIds,
                    sourceNames: sourceNames,
                    title: conversation.title,
                    createdAt: conversation.created_at,
                    updatedAt: conversation.updated_at
                },
                messages
            };

        } catch (error: any) {
            logger.error(`Error getting conversation: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all conversations for a source
     */
    static async getConversationsBySource(sourceId: string): Promise<Conversation[]> {
        try {
            // Get conversation IDs that include this source via junction table
            const { data: convSources, error: junctionError } = await supabase
                .from('conversation_sources')
                .select('conversation_id')
                .eq('source_id', sourceId);

            if (junctionError) {
                logger.error(`Failed to fetch conversations: ${junctionError.message}`);
                throw new Error(`Failed to fetch conversations: ${junctionError.message}`);
            }

            const conversationIds = (convSources || []).map(cs => cs.conversation_id);

            if (conversationIds.length === 0) {
                return [];
            }

            // Get conversation details
            const { data: conversations, error } = await supabase
                .from('conversations')
                .select('*')
                .in('id', conversationIds)
                .order('updated_at', { ascending: false });

            if (error) {
                logger.error(`Failed to fetch conversations: ${error.message}`);
                throw new Error(`Failed to fetch conversations: ${error.message}`);
            }

            // For each conversation, fetch all associated source IDs and names
            const conversationsWithSources = await Promise.all(
                (conversations || []).map(async (conv) => {
                    const { data: sources } = await supabase
                        .from('conversation_sources')
                        .select('source_id')
                        .eq('conversation_id', conv.id);

                    const sourceIds = (sources || []).map(s => s.source_id);

                    // Fetch source names
                    const { data: sourceDetails } = await supabase
                        .from('sources')
                        .select('id, original_name')
                        .in('id', sourceIds);

                    const sourceNames = (sourceDetails || []).map(s => s.original_name);

                    return {
                        id: conv.id,
                        sourceIds: sourceIds,
                        sourceNames: sourceNames,
                        title: conv.title,
                        createdAt: conv.created_at,
                        updatedAt: conv.updated_at
                    };
                })
            );

            return conversationsWithSources;

        } catch (error: any) {
            logger.error(`Error getting conversations by document: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update conversation title
     */
    static async updateConversationTitle(conversationId: string, title: string): Promise<Conversation> {
        try {
            // Validate title
            const trimmedTitle = title.trim();
            if (!trimmedTitle || trimmedTitle.length === 0) {
                throw new Error('Title must be a non-empty string');
            }

            // Ensure title doesn't exceed 100 characters
            const finalTitle = trimmedTitle.length > 100 ? trimmedTitle.slice(0, 100) : trimmedTitle;

            // Check if conversation exists
            const { data: existingConv, error: fetchError } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', conversationId)
                .single();

            if (fetchError || !existingConv) {
                logger.error(`Conversation not found: ${conversationId}`);
                throw new Error('Conversation not found');
            }

            // Update conversation title
            const { data, error } = await supabase
                .from('conversations')
                .update({
                    title: finalTitle,
                    updated_at: new Date().toISOString()
                })
                .eq('id', conversationId)
                .select()
                .single();

            if (error) {
                logger.error(`Failed to update conversation title: ${error.message}`);
                throw new Error(`Failed to update conversation title: ${error.message}`);
            }

            // Enrich with source names (similar to getAllConversations)
            const { data: convSources } = await supabase
                .from('conversation_sources')
                .select('source_id')
                .eq('conversation_id', conversationId);

            const sourceIds = (convSources || []).map(s => s.source_id);

            // Fetch source names
            const { data: sourceDetails } = await supabase
                .from('sources')
                .select('id, original_name')
                .in('id', sourceIds);

            const sourceIdsArray: string[] = sourceIds;
            const sourceNames: string[] = (sourceDetails || []).map(s => s.original_name);

            const conversation: Conversation = {
                id: data.id,
                title: data.title || null,
                sourceIds: sourceIdsArray,
                sourceNames: sourceNames,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };

            logger.info(`Updated conversation title: ${conversationId} -> ${finalTitle}`);
            return conversation;

        } catch (error: any) {
            logger.error(`Error updating conversation title: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete a conversation and all its messages
     */
    static async deleteConversation(conversationId: string): Promise<void> {
        try {
            // Messages will be deleted automatically due to CASCADE
            const { error } = await supabase
                .from('conversations')
                .delete()
                .eq('id', conversationId);

            if (error) {
                logger.error(`Failed to delete conversation: ${error.message}`);
                throw new Error(`Failed to delete conversation: ${error.message}`);
            }

            logger.info(`Conversation deleted: ${conversationId}`);

        } catch (error: any) {
            logger.error(`Error deleting conversation: ${error.message}`);
            throw error;
        }
    }

    /**
     * Stream a chat response (for future WebSocket implementation)
     */
    static async* streamMessage(request: SendMessageRequest) {
        try {
            // Get conversation
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', request.conversationId)
                .single();

            if (convError || !conversation) {
                logger.error(`Conversation not found: ${request.conversationId}`);
                throw new Error(`Conversation not found: ${request.conversationId}`);
            }

            // Get source IDs from junction table
            const { data: convSources, error: convSourcesError } = await supabase
                .from('conversation_sources')
                .select('source_id')
                .eq('conversation_id', request.conversationId);

            if (convSourcesError) {
                logger.error(`Failed to fetch conversation sources: ${convSourcesError.message}`);
                throw new Error(`Failed to fetch conversation sources: ${convSourcesError.message}`);
            }

            const sourceIds = (convSources || []).map(cs => cs.source_id);

            if (sourceIds.length === 0) {
                logger.error('No sources associated with this conversation');
                throw new Error('No sources associated with this conversation');
            }

            // Get conversation history
            const { data: messageHistory, error: msgError } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', request.conversationId)
                .order('created_at', { ascending: true });

            if (msgError) {
                logger.error(`Failed to fetch messages: ${msgError.message}`);
                throw new Error(`Failed to fetch messages: ${msgError.message}`);
            }

            const messages: Message[] = (messageHistory || []).map(msg => ({
                id: msg.id,
                conversationId: msg.conversation_id,
                role: msg.role,
                content: msg.content,
                sources: msg.sources,
                createdAt: msg.created_at
            }));

            // Create user message
            const userMessage: Message = {
                id: uuidv4(),
                conversationId: request.conversationId,
                role: 'user',
                content: request.message,
                createdAt: new Date().toISOString()
            };

            // Save user message
            await supabase
                .from('messages')
                .insert([{
                    id: userMessage.id,
                    conversation_id: userMessage.conversationId,
                    role: userMessage.role,
                    content: userMessage.content,
                    created_at: userMessage.createdAt
                }]);

            // Prepare initial state
            const initialState: ConversationState = {
                conversationId: request.conversationId,
                sourceIds: sourceIds, // Array of source IDs
                messages: [...messages, userMessage],
                currentQuery: request.message,
                retrievedChunks: [],
                routerDecision: 'clarify',
                responseQuality: 'pending',
                retryCount: 0,
                metadata: {
                    startTime: Date.now()
                }
            };

            // Stream the graph execution
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


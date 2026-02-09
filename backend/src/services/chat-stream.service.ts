/**
 * Chat Streaming Service
 * Handles streaming chat graph execution via WebSocket
 */

import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/dbConnection';
import { messages, conversations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ChatService } from './chat.service';
import { streamChatGraph } from '../graphs/chat.graph';
import { ConversationState, Message } from '../types/chat.types';
import { createLogger } from '../utils/logger';

const logger = createLogger('CHAT-STREAM-SERVICE');

/**
 * Stream chat graph execution and emit events via WebSocket
 */
export async function streamChatGraphWithWebSocket(
    conversationId: string,
    message: string,
    socket: Socket
): Promise<void> {
    try {
        // Get conversation details and messages
        const conversationData = await ChatService.getConversation(conversationId);
        if (!conversationData) {
            throw new Error('Conversation not found');
        }

        const { conversation, messages: existingMessages } = conversationData;

        // Create user message
        const userMessage: Message = {
            id: uuidv4(),
            conversationId,
            role: 'user',
            content: message,
            createdAt: new Date().toISOString()
        };

        // Save user message to database
        await db.insert(messages).values({
            id: userMessage.id,
            conversationId: userMessage.conversationId,
            role: userMessage.role,
            content: userMessage.content,
        });

        // Create initial state
        const isFirstMessage = existingMessages.length === 0;
        const initialState: ConversationState = {
            conversationId,
            sourceIds: conversation.sourceIds,
            messages: [...existingMessages, userMessage],
            currentQuery: message,
            retrievedChunks: [],
            routerDecision: 'clarify', 
            responseQuality: 'pending',
            retryCount: 0,
            metadata: {
                startTime: Date.now(),
                isFirstMessage: isFirstMessage
            }
        };

        // Generate message ID for streaming
        const streamingMessageId = uuidv4();
        let lastStreamedContent = '';
        let finalAssistantMessage: Message | null = null;
        let lastNodeName = '';
        let generatorNodeStarted = false;

        // Create token callback for generator agent
        const onToken = (token: string) => {
            // Emit token immediately via WebSocket
            socket.emit('message_token', {
                conversationId,
                messageId: streamingMessageId,
                token: token
            });
        };

        // Add token callback to initial state metadata for generator agent
        const streamingInitialState: ConversationState = {
            ...initialState,
            metadata: {
                ...initialState.metadata,
                onToken: onToken
            }
        };

        // Stream graph execution
        for await (const stateUpdate of streamChatGraph(streamingInitialState)) {
            // Get current node from state (added by graph stream)
            const currentNode = (stateUpdate as any)._currentNode || '';
            
            // Emit loading stage if node changed
            if (currentNode && currentNode !== lastNodeName) {
                lastNodeName = currentNode;
                
                let loadingMessage = '';
                switch (currentNode) {
                    case 'router':
                        loadingMessage = 'Looking for cues...';
                        break;
                    case 'retrieval':
                        loadingMessage = 'Reviewing sources...';
                        break;
                    case 'generator':
                        loadingMessage = 'Generating response...';
                        generatorNodeStarted = true;
                        break;
                    case 'quality':
                        // Quality check happens quickly, skip loading message
                        break;
                }

                if (loadingMessage) {
                    socket.emit('loading_stage', {
                        conversationId,
                        stage: currentNode,
                        message: loadingMessage
                    });
                }
            }

            // Check if we have messages in the state update
            if (stateUpdate.messages && Array.isArray(stateUpdate.messages) && stateUpdate.messages.length > 0) {
                const lastMessage = stateUpdate.messages[stateUpdate.messages.length - 1];
                
                // Look for assistant message
                if (lastMessage && lastMessage.role === 'assistant') {
                    const currentContent = lastMessage.content || '';
                    
                    // Clear loading when we start receiving content (first token arrives)
                    if (currentContent.length > 0 && lastStreamedContent.length === 0 && generatorNodeStarted) {
                        socket.emit('loading_stage', {
                            conversationId,
                            stage: 'streaming',
                            message: ''
                        });
                    }
                    
                    // Note: Tokens are now emitted directly from generator agent via onToken callback
                    // We still track content for final message
                    lastStreamedContent = currentContent;
                    
                    // Keep track of final message
                    finalAssistantMessage = lastMessage;
                }
            }
        }

        // Save assistant message to database
        if (finalAssistantMessage) {
            finalAssistantMessage.id = streamingMessageId;

            await db.insert(messages).values({
                id: finalAssistantMessage.id,
                conversationId: finalAssistantMessage.conversationId,
                role: finalAssistantMessage.role,
                content: finalAssistantMessage.content,
                sources: finalAssistantMessage.sources
                    ? (finalAssistantMessage.sources as unknown as Record<string, unknown>)
                    : null,
            });

            // Update conversation updated_at
            await db
                .update(conversations)
                .set({ updatedAt: new Date() })
                .where(eq(conversations.id, conversationId));

            // Emit message end
            socket.emit('message_end', {
                conversationId,
                messageId: streamingMessageId,
                message: finalAssistantMessage
            });
        }

        logger.info(`[CHAT-STREAM-SERVICE] Completed streaming for conversation ${conversationId}`);

    } catch (error) {
        logger.error(`[CHAT-STREAM-SERVICE] Error streaming chat: ${error}`);
        throw error;
    }
}


/**
 * Chat Streaming Service
 * Handles streaming chat graph execution via WebSocket
 */

import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../db/dbConnection';
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
        await supabase
            .from('messages')
            .insert([{
                id: userMessage.id,
                conversation_id: userMessage.conversationId,
                role: userMessage.role,
                content: userMessage.content,
                created_at: userMessage.createdAt
            }]);

        // Create initial state
        const isFirstMessage = existingMessages.length === 0;
        const initialState: ConversationState = {
            conversationId,
            documentIds: conversation.documentIds,
            messages: [...existingMessages, userMessage],
            currentQuery: message,
            retrievedChunks: [],
            routerDecision: 'clarify', // Will be set by router agent
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

        // Stream graph execution
        for await (const stateUpdate of streamChatGraph(initialState)) {
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
                        loadingMessage = 'Reviewing document...';
                        break;
                    case 'generator':
                        loadingMessage = 'Generating response...';
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
                    
                    // Clear loading when we start receiving content
                    if (currentContent.length > 0 && lastStreamedContent.length === 0) {
                        socket.emit('loading_stage', {
                            conversationId,
                            stage: 'streaming',
                            message: ''
                        });
                    }
                    
                    // Emit new tokens if content has grown
                    if (currentContent.length > lastStreamedContent.length) {
                        const newTokens = currentContent.slice(lastStreamedContent.length);
                        lastStreamedContent = currentContent;
                        
                        socket.emit('message_token', {
                            conversationId,
                            messageId: streamingMessageId,
                            token: newTokens
                        });
                    }
                    
                    // Keep track of final message
                    finalAssistantMessage = lastMessage;
                }
            }
        }

        // Save assistant message to database
        if (finalAssistantMessage) {
            finalAssistantMessage.id = streamingMessageId;
            
            await supabase
                .from('messages')
                .insert([{
                    id: finalAssistantMessage.id,
                    conversation_id: finalAssistantMessage.conversationId,
                    role: finalAssistantMessage.role,
                    content: finalAssistantMessage.content,
                    sources: finalAssistantMessage.sources,
                    created_at: finalAssistantMessage.createdAt
                }]);

            // Update conversation updated_at
            await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', conversationId);

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


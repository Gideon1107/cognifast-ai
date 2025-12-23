import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import {
    StartConversationRequest,
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    GetConversationResponse,
    GetAllConversationsResponse,
    DeleteConversationResponse
} from '../types/chat.types';
import { createLogger } from '../utils/logger';

const logger = createLogger('CHAT-CONTROLLER');

export class ChatController {
    /**
     * POST /api/chat/conversations
     * Start a new conversation
     */
    static async startConversation(req: Request, res: Response): Promise<void> {
        try {
            const { documentIds, initialMessage } = req.body as StartConversationRequest;

            // Validate input
            if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'documentIds must be a non-empty array'
                } as StartConversationResponse);
                return;
            }

            logger.info(`Starting new conversation for ${documentIds.length} document(s): ${documentIds.join(', ')}`);

            const { conversation, initialMessages } = await ChatService.createConversation({
                documentIds,
                initialMessage
            });

            res.status(201).json({
                success: true,
                conversation,
                messages: initialMessages.length > 0 ? initialMessages : undefined
            } as StartConversationResponse);

        } catch (error: any) {
            logger.error(`Error starting conversation: ${error.message}`);
            res.status(500).json({
                success: false,
                error: error.message
            } as StartConversationResponse);
        }
    }

    /**
     * POST /api/chat/conversations/:conversationId/messages
     * Send a message and get AI response
     */
    static async sendMessage(req: Request, res: Response): Promise<void> {
        try {
            const { conversationId } = req.params;
            const { message } = req.body;

            // Validate input
            if (!conversationId) {
                res.status(400).json({
                    success: false,
                    error: 'Conversation ID is required'
                } as SendMessageResponse);
                return;
            }

            if (!message || message.trim() === '') {
                res.status(400).json({
                    success: false,
                    error: 'Message is required'
                } as SendMessageResponse);
                return;
            }

            logger.info(`Sending message to conversation: ${conversationId}`);
            logger.info(`Message: ${message}`);

            const request: SendMessageRequest = {
                conversationId,
                message: message.trim()
            };

            const result = await ChatService.sendMessage(request);

            res.status(200).json({
                success: true,
                message: result.message,
                sources: result.message.sources,
                metadata: result.metadata
            } as SendMessageResponse);

        } catch (error: any) {
            logger.error(`Error sending message: ${error.message}`);
            res.status(500).json({
                success: false,
                error: error.message
            } as SendMessageResponse);
        }
    }

    /**
     * GET /api/chat/conversations/:conversationId
     * Get a conversation with all messages
     */
    static async getConversation(req: Request, res: Response): Promise<void> {
        try {
            const { conversationId } = req.params;

            if (!conversationId) {
                res.status(400).json({
                    success: false,
                    error: 'Conversation ID is required'
                } as GetConversationResponse);
                return;
            }

            logger.info(`Fetching conversation: ${conversationId}`);

            const { conversation, messages } = await ChatService.getConversation(conversationId);

            res.status(200).json({
                success: true,
                conversation,
                messages
            } as GetConversationResponse);

        } catch (error: any) {
            logger.error(`Error getting conversation: ${error.message}`);
            res.status(500).json({
                success: false,
                error: error.message
            } as GetConversationResponse);
        }
    }

    /**
     * GET /api/chat/documents/:documentId/conversations
     * Get all conversations for a document
     */
    static async getConversationsByDocument(req: Request, res: Response): Promise<void> {
        try {
            const { documentId } = req.params;

            if (!documentId) {
                res.status(400).json({
                    success: false,
                    error: 'Document ID is required'
                });
                return;
            }

            logger.info(`Fetching conversations for document: ${documentId}`);

            const conversations = await ChatService.getConversationsByDocument(documentId);

            res.status(200).json({
                success: true,
                conversations
            });

        } catch (error: any) {
            logger.error(`Error getting conversations by document: ${error.message}`);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * DELETE /api/chat/conversations/:conversationId
     * Delete a conversation
     */
    static async deleteConversation(req: Request, res: Response): Promise<void> {
        try {
            const { conversationId } = req.params;

            if (!conversationId) {
                res.status(400).json({
                    success: false,
                    error: 'Conversation ID is required'
                } as DeleteConversationResponse);
                return;
            }

            logger.info(`Deleting conversation: ${conversationId}`);

            await ChatService.deleteConversation(conversationId);

            res.status(200).json({
                success: true,
                message: 'Conversation deleted successfully'
            } as DeleteConversationResponse);

        } catch (error: any) {
            logger.error(`Error deleting conversation: ${error.message}`);
            res.status(500).json({
                success: false,
                error: error.message
            } as DeleteConversationResponse);
        }
    }

    /**
     * GET /api/chat/conversations
     * Get all conversations
     */
    static async getAllConversations(req: Request, res: Response): Promise<void> {
        try {
            const conversations = await ChatService.getAllConversations();

            res.status(200).json({
                success: true,
                conversations
            } as GetAllConversationsResponse);
        } catch (error: any) {
            logger.error(`Error getting all conversations: ${error.message}`);
            res.status(500).json({
                success: false,
                error: error.message
            } as GetAllConversationsResponse);
        }
    }
}


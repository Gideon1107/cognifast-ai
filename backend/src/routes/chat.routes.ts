import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';

const router = Router();

/**
 * Chat Routes
 * 
 * POST   /api/chat/conversations                         - Start a new conversation
 * POST   /api/chat/conversations/:conversationId/messages - Send a message and get AI response
 * GET    /api/chat/conversations/:conversationId         - Get a conversation with all messages
 * GET    /api/chat/documents/:documentId/conversations   - Get all conversations for a document
 * DELETE /api/chat/conversations/:conversationId         - Delete a conversation
 */

// Start a new conversation
router.post('/conversations', ChatController.startConversation);

// Send a message to a conversation
router.post('/conversations/:conversationId/messages', ChatController.sendMessage);

// Get a specific conversation
router.get('/conversations/:conversationId', ChatController.getConversation);

// Get all conversations for a document
router.get('/documents/:documentId/conversations', ChatController.getConversationsByDocument);

// Delete a conversation
router.delete('/conversations/:conversationId', ChatController.deleteConversation);

export default router;


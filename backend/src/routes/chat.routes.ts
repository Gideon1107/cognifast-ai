import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';

const router = Router();

/**
 * Chat Routes
 * 
 * POST   /api/chat/conversations                         - Start a new conversation
 * GET    /api/chat/conversations                         - Get all conversations
 * POST   /api/chat/conversations/:conversationId/messages - Send a message and get AI response
 * GET    /api/chat/conversations/:conversationId         - Get a conversation with all messages
 * PATCH  /api/chat/conversations/:conversationId         - Update a conversation title
 * GET    /api/chat/sources/:sourceId/conversations       - Get all conversations for a source
 * DELETE /api/chat/conversations/:conversationId         - Delete a conversation
 */

// Start a new conversation
router.post('/conversations', ChatController.startConversation);

// Get all conversations
router.get('/conversations', ChatController.getAllConversations);

// Send a message to a conversation
router.post('/conversations/:conversationId/messages', ChatController.sendMessage);

// Get a specific conversation
router.get('/conversations/:conversationId', ChatController.getConversation);

// Update a conversation
router.patch('/conversations/:conversationId', ChatController.updateConversation);

// Get all conversations for a source
router.get('/sources/:sourceId/conversations', ChatController.getConversationsBySource);

// Delete a conversation
router.delete('/conversations/:conversationId', ChatController.deleteConversation);

export default router;


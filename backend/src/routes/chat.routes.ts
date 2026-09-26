import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: API for managing conversations and messages
 */

/**
 * @swagger
 * /api/chat/conversations:
 *   post:
 *     summary: Start a new conversation
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Conversation started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Conversation'
 *   get:
 *     summary: Get all conversations
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Conversation'
 */
router.post('/conversations', ChatController.startConversation);
router.get('/conversations', ChatController.getAllConversations);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/messages:
 *   post:
 *     summary: Send a message to a conversation
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent and AI response received
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userMessage:
 *                   $ref: '#/components/schemas/Message'
 *                 assistantMessage:
 *                   $ref: '#/components/schemas/Message'
 */
router.post('/conversations/:conversationId/messages', ChatController.sendMessage);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}:
 *   get:
 *     summary: Get a specific conversation
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Conversation details with messages
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Conversation'
 *   patch:
 *     summary: Update a conversation
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Conversation'
 *   delete:
 *     summary: Delete a conversation
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 */
router.get('/conversations/:conversationId', ChatController.getConversation);
router.patch('/conversations/:conversationId', ChatController.updateConversation);
router.delete('/conversations/:conversationId', ChatController.deleteConversation);

/**
 * @swagger
 * /api/chat/sources/{sourceId}/conversations:
 *   get:
 *     summary: Get all conversations for a source
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: sourceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of conversations for the source
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Conversation'
 */
router.get('/sources/:sourceId/conversations', ChatController.getConversationsBySource);

export default router;


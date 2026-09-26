import { Router } from 'express';
import {
    generateQuiz,
    createAttempt,
    submitAnswer,
    getAttemptSummary,
    getQuizzesForConversation
} from '../controllers/quiz.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Quiz
 *   description: API for managing quizzes and attempts
 */

/**
 * @swagger
 * /api/quiz/generate:
 *   post:
 *     summary: Generate a new quiz
 *     tags: [Quiz]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 format: uuid
 *               sourceId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Quiz generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 */
router.post('/generate', generateQuiz);

/**
 * @swagger
 * /api/quiz/conversation/{conversationId}:
 *   get:
 *     summary: Get quizzes for a conversation
 *     tags: [Quiz]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of quizzes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Quiz'
 */
router.get('/conversation/:conversationId', getQuizzesForConversation);

/**
 * @swagger
 * /api/quiz/{quizId}/attempts:
 *   post:
 *     summary: Start a quiz attempt
 *     tags: [Quiz]
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Quiz attempt started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizAttempt'
 */
router.post('/:quizId/attempts', createAttempt);

/**
 * @swagger
 * /api/quiz/attempts/{attemptId}/answer:
 *   post:
 *     summary: Submit an answer for a quiz attempt
 *     tags: [Quiz]
 *     parameters:
 *       - in: path
 *         name: attemptId
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
 *               questionId:
 *                 type: string
 *                 format: uuid
 *               answer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Answer submitted
 */
router.post('/attempts/:attemptId/answer', submitAnswer);

/**
 * @swagger
 * /api/quiz/attempts/{attemptId}:
 *   get:
 *     summary: Get an attempt summary
 *     tags: [Quiz]
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Attempt summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizAttempt'
 */
router.get('/attempts/:attemptId', getAttemptSummary);

export default router;

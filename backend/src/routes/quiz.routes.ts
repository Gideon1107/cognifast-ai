/**
 * Quiz Routes
 * 
 * POST /api/quiz/generate - Generate a new quiz
 * GET /api/quiz/conversation/:conversationId - Get quizzes for conversation
 * POST /api/quiz/:quizId/attempts - Start attempt (create + get questions)
 * POST /api/quiz/attempts/:attemptId/answer - Submit answer
 * GET /api/quiz/attempts/:attemptId - Get attempt summary
 */

import { Router } from 'express';
import {
    generateQuiz,
    createAttempt,
    submitAnswer,
    getAttemptSummary,
    getQuizzesForConversation
} from '../controllers/quiz.controller';

const router = Router();

// Generate quiz
router.post('/generate', generateQuiz);

// Get quizzes for conversation (must be before :quizId routes)
router.get('/conversation/:conversationId', getQuizzesForConversation);

// Start attempt (create + get questions for taking)
router.post('/:quizId/attempts', createAttempt);

// Submit answer
router.post('/attempts/:attemptId/answer', submitAnswer);

// Get attempt summary
router.get('/attempts/:attemptId', getAttemptSummary);

export default router;

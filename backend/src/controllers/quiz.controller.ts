/**
 * Quiz Controller - Handles HTTP requests for quiz operations
 */

import { Request, Response } from 'express';
import { QuizService } from '../services/quiz.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('QUIZ-CONTROLLER');
const quizService = new QuizService();

/**
 * POST /api/quiz/generate
 * Generate a new quiz for a conversation
 */
export async function generateQuiz(req: Request, res: Response): Promise<void> {
    try {
        const { conversationId, numQuestions } = req.body;

        // Validate request
        if (!conversationId) {
            res.status(400).json({ error: 'conversationId is required' });
            return;
        }

        if (!numQuestions || typeof numQuestions !== 'number' || numQuestions < 1) {
            res.status(400).json({ error: 'numQuestions must be a positive number' });
            return;
        }

        // Cap numQuestions to reasonable limit
        const cappedNumQuestions = Math.min(numQuestions, 20);

        logger.info(`Generate quiz: conversationId=${conversationId}, numQuestions=${cappedNumQuestions}`);

        const quizId = await quizService.generateQuiz(conversationId, cappedNumQuestions);

        res.status(201).json({ quizId });

    } catch (error: any) {
        logger.error(`Generate quiz error: ${error.message}`);
        
        if (error.message === 'Conversation has no sources') {
            res.status(400).json({ error: error.message });
            return;
        }
        
        res.status(500).json({ error: 'Failed to generate quiz' });
    }
}

/**
 * POST /api/quiz/:quizId/attempts
 * Start a new attempt (create attempt + return questions for taking)
 */
export async function createAttempt(req: Request, res: Response): Promise<void> {
    try {
        const { quizId } = req.params;

        if (!quizId) {
            res.status(400).json({ error: 'quizId is required' });
            return;
        }

        logger.info(`Create attempt: quizId=${quizId}`);

        const result = await quizService.createAttempt(quizId);

        res.status(201).json(result);

    } catch (error: any) {
        logger.error(`Create attempt error: ${error.message}`);
        
        if (error.message === 'Quiz not found') {
            res.status(404).json({ error: error.message });
            return;
        }
        
        res.status(500).json({ error: 'Failed to create attempt' });
    }
}

/**
 * POST /api/quiz/attempts/:attemptId/answer
 * Submit an answer for a question
 */
export async function submitAnswer(req: Request, res: Response): Promise<void> {
    try {
        const { attemptId } = req.params;
        const { questionId, selectedIndex } = req.body;

        if (!attemptId) {
            res.status(400).json({ error: 'attemptId is required' });
            return;
        }

        if (!questionId) {
            res.status(400).json({ error: 'questionId is required' });
            return;
        }

        if (typeof selectedIndex !== 'number') {
            res.status(400).json({ error: 'selectedIndex must be a number' });
            return;
        }

        logger.info(`Submit answer: attemptId=${attemptId}, questionId=${questionId}, selectedIndex=${selectedIndex}`);

        const result = await quizService.submitAnswer(attemptId, questionId, selectedIndex);

        res.status(200).json(result);

    } catch (error: any) {
        logger.error(`Submit answer error: ${error.message}`);
        
        if (error.message === 'Attempt not found' || error.message === 'Question not found in quiz') {
            res.status(404).json({ error: error.message });
            return;
        }
        
        if (error.message === 'Attempt already completed' || error.message === 'Invalid selected index') {
            res.status(400).json({ error: error.message });
            return;
        }
        
        res.status(500).json({ error: 'Failed to submit answer' });
    }
}

/**
 * GET /api/quiz/attempts/:attemptId
 * Get attempt summary
 */
export async function getAttemptSummary(req: Request, res: Response): Promise<void> {
    try {
        const { attemptId } = req.params;

        if (!attemptId) {
            res.status(400).json({ error: 'attemptId is required' });
            return;
        }

        logger.info(`Get attempt summary: attemptId=${attemptId}`);

        const result = await quizService.getAttemptSummary(attemptId);

        res.status(200).json(result);

    } catch (error: any) {
        logger.error(`Get attempt summary error: ${error.message}`);
        
        if (error.message === 'Attempt not found') {
            res.status(404).json({ error: error.message });
            return;
        }
        
        res.status(500).json({ error: 'Failed to get attempt summary' });
    }
}

/**
 * GET /api/quiz/conversation/:conversationId
 * Get all quizzes for a conversation
 */
export async function getQuizzesForConversation(req: Request, res: Response): Promise<void> {
    try {
        const { conversationId } = req.params;

        if (!conversationId) {
            res.status(400).json({ error: 'conversationId is required' });
            return;
        }

        logger.info(`Get quizzes for conversation: conversationId=${conversationId}`);

        const quizzes = await quizService.getQuizzesForConversation(conversationId);

        res.status(200).json({ quizzes });

    } catch (error: any) {
        logger.error(`Get quizzes for conversation error: ${error.message}`);
        res.status(500).json({ error: 'Failed to get quizzes' });
    }
}

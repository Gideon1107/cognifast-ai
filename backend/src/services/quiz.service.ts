/**
 * Quiz Service - Handles quiz generation, attempts, and answer submission
 */

import { db } from '../db/dbConnection';
import { conversationSources, quizzes, quizAttempts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { RetrievalService } from './retrieval.service';
import { executeQuizGenerationGraph } from '../graphs/quiz-generation.graph';
import {
    Quiz,
    Question,
    QuestionForTaking,
    AttemptAnswer,
    QuizGenerationState,
    CreateAttemptResponse,
    SubmitAnswerResponse
} from '../types/quiz.types';
import { createLogger } from '../utils/logger';

const logger = createLogger('QUIZ-SERVICE');

export class QuizService {
    private retrievalService: RetrievalService;

    constructor() {
        this.retrievalService = new RetrievalService();
    }

    /**
     * Generate a quiz for a conversation from its source content
     * @returns The new quiz ID
     */
    async generateQuiz(conversationId: string, numQuestions: number): Promise<string> {
        logger.info(`Generating quiz for conversation: ${conversationId}, questions: ${numQuestions}`);

        // 1. Get all source IDs from conversation_sources
        const convSourceRows = await db
            .select({ sourceId: conversationSources.sourceId })
            .from(conversationSources)
            .where(eq(conversationSources.conversationId, conversationId));

        if (convSourceRows.length === 0) {
            throw new Error('Conversation has no sources');
        }

        const sourceIds = convSourceRows.map(cs => cs.sourceId);
        logger.info(`Found ${sourceIds.length} source(s) for conversation`);

        // 2. Fetch all chunks for these sources
        const chunks = await this.retrievalService.getAllChunksForSources(sourceIds);
        if (chunks.length === 0) {
            throw new Error('No content found in conversation sources');
        }
        logger.info(`Retrieved ${chunks.length} chunks for quiz generation`);

        // 3. Run quiz generation graph (concept extract → question gen → validate)
        const initialState: QuizGenerationState = {
            conversationId,
            sourceIds,
            numQuestions,
            concepts: [],
            questions: [],
            validationResults: [],
            needsRegeneration: false,
            retryCount: 0,
            metadata: {
                startTime: Date.now(),
                totalChunks: chunks.length,
                chunks,
            },
        };

        const result = await executeQuizGenerationGraph(initialState);

        if (!result.questions || result.questions.length === 0) {
            throw new Error('Failed to generate quiz questions');
        }

        if (result.questions.length < numQuestions) {
            logger.warn(`Only ${result.questions.length} valid questions after validation (requested ${numQuestions})`);
            throw new Error(`Could not generate enough valid questions (got ${result.questions.length}, needed ${numQuestions}). Please try again.`);
        }

        // 4. Limit to requested number and persist quiz to database
        const finalQuestions = result.questions.slice(0, numQuestions);

        const [inserted] = await db
            .insert(quizzes)
            .values({
                conversationId,
                questions: finalQuestions as unknown as Record<string, unknown>,
            })
            .returning({ id: quizzes.id });

        if (!inserted) {
            logger.error('Failed to save quiz');
            throw new Error('Failed to save quiz');
        }

        logger.info(`Quiz created with ID: ${inserted.id}, ${finalQuestions.length} questions`);
        return inserted.id;
    }

    /**
     * Create a new attempt and return questions for taking (without correct answers)
     */
    async createAttempt(quizId: string): Promise<CreateAttemptResponse> {
        logger.info(`Creating attempt for quiz: ${quizId}`);

        // 1. Get quiz with questions
        const [quiz] = await db
            .select({ id: quizzes.id, questions: quizzes.questions })
            .from(quizzes)
            .where(eq(quizzes.id, quizId))
            .limit(1);

        if (!quiz) {
            logger.error(`Quiz not found: ${quizId}`);
            throw new Error('Quiz not found');
        }

        const questions = quiz.questions as Question[];

        // 2. Create attempt record (in_progress, empty answers)
        const [attempt] = await db
            .insert(quizAttempts)
            .values({
                quizId,
                answers: [],
                score: null,
                status: 'in_progress',
            })
            .returning({ id: quizAttempts.id });

        if (!attempt) {
            logger.error('Failed to create attempt');
            throw new Error('Failed to create attempt');
        }

        // 3. Strip sensitive fields (correctIndex) for client
        const questionsForTaking: QuestionForTaking[] = questions.map(q => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options,
        }));

        logger.info(`Attempt created: ${attempt.id}, ${questionsForTaking.length} questions`);

        return {
            attemptId: attempt.id,
            questions: questionsForTaking,
            total: questionsForTaking.length,
        };
    }

    /**
     * Submit an answer for a question (idempotent if already answered)
     */
    async submitAnswer(
        attemptId: string,
        questionId: string,
        selectedIndex: number
    ): Promise<SubmitAnswerResponse> {
        logger.info(`Submitting answer for attempt: ${attemptId}, question: ${questionId}`);

        // 1. Get attempt with current answers and status
        const [attempt] = await db
            .select({
                id: quizAttempts.id,
                quizId: quizAttempts.quizId,
                answers: quizAttempts.answers,
                status: quizAttempts.status,
            })
            .from(quizAttempts)
            .where(eq(quizAttempts.id, attemptId))
            .limit(1);

        if (!attempt) {
            logger.error(`Attempt not found: ${attemptId}`);
            throw new Error('Attempt not found');
        }

        if (attempt.status === 'completed') {
            throw new Error('Attempt already completed');
        }

        const quizIdRef = attempt.quizId;
        if (!quizIdRef) {
            throw new Error('Attempt has no quiz');
        }

        // 2. Get quiz questions to validate and score
        const [quiz] = await db
            .select({ questions: quizzes.questions })
            .from(quizzes)
            .where(eq(quizzes.id, quizIdRef))
            .limit(1);

        if (!quiz) {
            throw new Error('Quiz not found');
        }

        const questions = quiz.questions as Question[];
        const question = questions.find(q => q.id === questionId);

        if (!question) {
            throw new Error('Question not found in quiz');
        }

        // 3. Idempotent: if already answered, return existing result
        const existingAnswers = (attempt.answers || []) as AttemptAnswer[];
        const existingAnswer = existingAnswers.find(a => a.questionId === questionId);

        if (existingAnswer) {
            logger.info(`Question already answered, returning existing result`);
            return this.buildResponse(existingAnswer, existingAnswers, questions);
        }

        // 4. Validate selectedIndex and compute correctness
        if (selectedIndex < 0 || selectedIndex >= question.options.length) {
            throw new Error('Invalid selected index');
        }

        const correct = selectedIndex === question.correctIndex;
        const correctIndex = question.correctIndex;

        // 5. Append answer and update attempt (set score/status when last question)
        const newAnswer: AttemptAnswer = {
            questionId,
            selectedIndex,
            correct,
            correctIndex,
        };

        const updatedAnswers = [...existingAnswers, newAnswer];
        const isLast = updatedAnswers.length === questions.length;

        const updateValues: { answers: AttemptAnswer[]; score?: string; status?: string } = {
            answers: updatedAnswers,
        };
        if (isLast) {
            const correctCount = updatedAnswers.filter(a => a.correct).length;
            updateValues.score = String(Math.round((correctCount / questions.length) * 100));
            updateValues.status = 'completed';
        }

        await db
            .update(quizAttempts)
            .set(updateValues)
            .where(eq(quizAttempts.id, attemptId));

        logger.info(`Answer saved: ${correct ? 'correct' : 'incorrect'}, isLast: ${isLast}`);

        return this.buildResponse(newAnswer, updatedAnswers, questions);
    }

    /**
     * Build response for submitAnswer (includes final score when last question)
     */
    private buildResponse(
        answer: AttemptAnswer,
        allAnswers: AttemptAnswer[],
        questions: Question[]
    ): SubmitAnswerResponse {
        const isLast = allAnswers.length === questions.length;

        const response: SubmitAnswerResponse = {
            correct: answer.correct,
            correctIndex: answer.correctIndex,
        };

        if (isLast) {
            const correctCount = allAnswers.filter(a => a.correct).length;
            const wrongCount = allAnswers.length - correctCount;
            const score = Math.round((correctCount / questions.length) * 100);

            response.isLast = true;
            response.score = score;
            response.correctCount = correctCount;
            response.wrongCount = wrongCount;
            response.total = questions.length;
        }

        return response;
    }

    /**
     * Get attempt summary (score, counts, status, all answers)
     */
    async getAttemptSummary(attemptId: string): Promise<{
        score: number;
        correctCount: number;
        wrongCount: number;
        total: number;
        status: 'in_progress' | 'completed';
        answers: AttemptAnswer[];
    }> {
        const [attempt] = await db
            .select({
                quizId: quizAttempts.quizId,
                answers: quizAttempts.answers,
                score: quizAttempts.score,
                status: quizAttempts.status,
            })
            .from(quizAttempts)
            .where(eq(quizAttempts.id, attemptId))
            .limit(1);

        if (!attempt) {
            throw new Error('Attempt not found');
        }

        const quizIdRef = attempt.quizId;
        if (!quizIdRef) {
            throw new Error('Attempt has no quiz');
        }

        const [quiz] = await db
            .select({ questions: quizzes.questions })
            .from(quizzes)
            .where(eq(quizzes.id, quizIdRef))
            .limit(1);

        const questions = (quiz?.questions || []) as Question[];
        const answers = (attempt.answers || []) as AttemptAnswer[];
        const correctCount = answers.filter(a => a.correct).length;
        const wrongCount = answers.length - correctCount;
        const scoreNum = attempt.score != null ? Number(attempt.score) : 0;

        return {
            score: scoreNum,
            correctCount,
            wrongCount,
            total: questions.length,
            status: (attempt.status as 'in_progress' | 'completed') ?? 'in_progress',
            answers,
        };
    }

    /**
     * Get all quizzes for a conversation (for recent activity / quiz list)
     */
    async getQuizzesForConversation(conversationId: string): Promise<{
        id: string;
        createdAt: Date | null;
        questionCount: number;
    }[]> {
        logger.info(`Getting quizzes for conversation: ${conversationId}`);

        const rows = await db
            .select({ id: quizzes.id, questions: quizzes.questions, createdAt: quizzes.createdAt })
            .from(quizzes)
            .where(eq(quizzes.conversationId, conversationId))
            .orderBy(desc(quizzes.createdAt));

        return rows.map(quiz => ({
            id: quiz.id,
            createdAt: quiz.createdAt,
            questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
        }));
    }
}

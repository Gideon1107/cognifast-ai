/**
 * Quiz Service - Handles quiz generation, attempts, and answer submission
 */

import supabase from '../db/dbConnection';
import { RetrievalService } from './retrieval.service';
import { executeQuizGenerationGraph } from '../graphs/quiz-generation.graph';
import {
    Quiz,
    QuizAttempt,
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
     * Generate a quiz for a conversation
     */
    async generateQuiz(conversationId: string, numQuestions: number): Promise<string> {
        logger.info(`Generating quiz for conversation: ${conversationId}, questions: ${numQuestions}`);

        // 1. Get all source IDs from conversation_sources
        const { data: conversationSources, error: sourcesError } = await supabase
            .from('conversation_sources')
            .select('source_id')
            .eq('conversation_id', conversationId);

        if (sourcesError) {
            logger.error(`Failed to get conversation sources: ${sourcesError.message}`);
            throw new Error('Failed to get conversation sources');
        }

        if (!conversationSources || conversationSources.length === 0) {
            throw new Error('Conversation has no sources');
        }

        const sourceIds = conversationSources.map(cs => cs.source_id);
        logger.info(`Found ${sourceIds.length} source(s) for conversation`);

        // 2. Fetch all chunks for these sources
        const chunks = await this.retrievalService.getAllChunksForSources(sourceIds);
        
        if (chunks.length === 0) {
            throw new Error('No content found in conversation sources');
        }

        logger.info(`Retrieved ${chunks.length} chunks for quiz generation`);

        // 3. Run quiz generation graph
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
                chunks // Pass chunks in metadata for agents
            }
        };

        const result = await executeQuizGenerationGraph(initialState);

        if (!result.questions || result.questions.length === 0) {
            throw new Error('Failed to generate quiz questions');
        }

        if (result.questions.length < numQuestions) {
            logger.warn(`Only ${result.questions.length} valid questions after validation (requested ${numQuestions})`);
            throw new Error(`Could not generate enough valid questions (got ${result.questions.length}, needed ${numQuestions}). Please try again.`);
        }

        // 4. Limit to requested number of questions
        const finalQuestions = result.questions.slice(0, numQuestions);

        // 5. Persist quiz to database
        const { data: quiz, error: insertError } = await supabase
            .from('quizzes')
            .insert({
                conversation_id: conversationId,
                questions: finalQuestions
            })
            .select('id')
            .single();

        if (insertError) {
            logger.error(`Failed to save quiz: ${insertError.message}`);
            throw new Error('Failed to save quiz');
        }

        logger.info(`Quiz created with ID: ${quiz.id}, ${finalQuestions.length} questions`);
        return quiz.id;
    }

    /**
     * Create a new attempt and return questions for taking
     */
    async createAttempt(quizId: string): Promise<CreateAttemptResponse> {
        logger.info(`Creating attempt for quiz: ${quizId}`);

        // 1. Get quiz with questions
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('id, questions')
            .eq('id', quizId)
            .single();

        if (quizError || !quiz) {
            logger.error(`Quiz not found: ${quizId}`);
            throw new Error('Quiz not found');
        }

        const questions = quiz.questions as Question[];

        // 2. Create attempt
        const { data: attempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .insert({
                quiz_id: quizId,
                answers: [],
                score: null,
                status: 'in_progress'
            })
            .select('id')
            .single();

        if (attemptError) {
            logger.error(`Failed to create attempt: ${attemptError.message}`);
            throw new Error('Failed to create attempt');
        }

        // 3. Strip sensitive fields from questions
        const questionsForTaking: QuestionForTaking[] = questions.map(q => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options
        }));

        logger.info(`Attempt created: ${attempt.id}, ${questionsForTaking.length} questions`);

        return {
            attemptId: attempt.id,
            questions: questionsForTaking,
            total: questionsForTaking.length
        };
    }

    /**
     * Submit an answer for a question
     */
    async submitAnswer(
        attemptId: string,
        questionId: string,
        selectedIndex: number
    ): Promise<SubmitAnswerResponse> {
        logger.info(`Submitting answer for attempt: ${attemptId}, question: ${questionId}`);

        // 1. Get attempt with quiz
        const { data: attempt, error: attemptError } = await supabase
            .from('quiz_attempts')
            .select('id, quiz_id, answers, status')
            .eq('id', attemptId)
            .single();

        if (attemptError || !attempt) {
            logger.error(`Attempt not found: ${attemptId}`);
            throw new Error('Attempt not found');
        }

        if (attempt.status === 'completed') {
            throw new Error('Attempt already completed');
        }

        // 2. Get quiz questions
        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('questions')
            .eq('id', attempt.quiz_id)
            .single();

        if (quizError || !quiz) {
            throw new Error('Quiz not found');
        }

        const questions = quiz.questions as Question[];
        const question = questions.find(q => q.id === questionId);

        if (!question) {
            throw new Error('Question not found in quiz');
        }

        // 3. Check if already answered (idempotent)
        const existingAnswers = (attempt.answers || []) as AttemptAnswer[];
        const existingAnswer = existingAnswers.find(a => a.questionId === questionId);

        if (existingAnswer) {
            // Return existing result (idempotent)
            logger.info(`Question already answered, returning existing result`);
            return this.buildResponse(existingAnswer, existingAnswers, questions);
        }

        // 4. Validate selectedIndex
        if (selectedIndex < 0 || selectedIndex >= question.options.length) {
            throw new Error('Invalid selected index');
        }

        // 5. Check correctness
        const correct = selectedIndex === question.correctIndex;
        const correctIndex = question.correctIndex;

        // 6. Create answer record
        const newAnswer: AttemptAnswer = {
            questionId,
            selectedIndex,
            correct,
            correctIndex
        };

        // 7. Update attempt
        const updatedAnswers = [...existingAnswers, newAnswer];
        const isLast = updatedAnswers.length === questions.length;
        
        const updateData: any = {
            answers: updatedAnswers
        };

        if (isLast) {
            // Calculate final score
            const correctCount = updatedAnswers.filter(a => a.correct).length;
            const score = Math.round((correctCount / questions.length) * 100);
            updateData.score = score;
            updateData.status = 'completed';
        }

        const { error: updateError } = await supabase
            .from('quiz_attempts')
            .update(updateData)
            .eq('id', attemptId);

        if (updateError) {
            logger.error(`Failed to update attempt: ${updateError.message}`);
            throw new Error('Failed to save answer');
        }

        logger.info(`Answer saved: ${correct ? 'correct' : 'incorrect'}, isLast: ${isLast}`);

        return this.buildResponse(newAnswer, updatedAnswers, questions);
    }

    /**
     * Build response for submitAnswer
     */
    private buildResponse(
        answer: AttemptAnswer,
        allAnswers: AttemptAnswer[],
        questions: Question[]
    ): SubmitAnswerResponse {
        const isLast = allAnswers.length === questions.length;
        
        const response: SubmitAnswerResponse = {
            correct: answer.correct,
            correctIndex: answer.correctIndex
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
     * Get attempt summary
     */
    async getAttemptSummary(attemptId: string): Promise<{
        score: number;
        correctCount: number;
        wrongCount: number;
        total: number;
        status: 'in_progress' | 'completed';
        answers: AttemptAnswer[];
    }> {
        const { data: attempt, error } = await supabase
            .from('quiz_attempts')
            .select('quiz_id, answers, score, status')
            .eq('id', attemptId)
            .single();

        if (error || !attempt) {
            throw new Error('Attempt not found');
        }

        // Get total questions from quiz
        const { data: quiz } = await supabase
            .from('quizzes')
            .select('questions')
            .eq('id', attempt.quiz_id)
            .single();

        const questions = (quiz?.questions || []) as Question[];
        const answers = (attempt.answers || []) as AttemptAnswer[];
        const correctCount = answers.filter(a => a.correct).length;
        const wrongCount = answers.length - correctCount;

        return {
            score: attempt.score || 0,
            correctCount,
            wrongCount,
            total: questions.length,
            status: attempt.status as 'in_progress' | 'completed',
            answers
        };
    }

    /**
     * Get all quizzes for a conversation
     */
    async getQuizzesForConversation(conversationId: string): Promise<{
        id: string;
        createdAt: string;
        questionCount: number;
    }[]> {
        logger.info(`Getting quizzes for conversation: ${conversationId}`);

        const { data: quizzes, error } = await supabase
            .from('quizzes')
            .select('id, questions, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error(`Failed to get quizzes: ${error.message}`);
            throw new Error('Failed to get quizzes');
        }

        return (quizzes || []).map(quiz => ({
            id: quiz.id,
            createdAt: quiz.created_at,
            questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0
        }));
    }
}

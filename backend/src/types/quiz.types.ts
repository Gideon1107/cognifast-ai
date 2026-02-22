/**
 * Question types (multiple choice and true/false only)
 */
export type QuestionType = 'multiple_choice' | 'true_false';

/**
 * Bloom's Taxonomy cognitive level for a question
 */
export type BloomLevel = 'recall' | 'understand' | 'apply' | 'analyze';

/**
 * Single quiz question (stored in quizzes.questions JSONB)
 */
export interface Question {
    id: string;
    type: QuestionType;
    question: string;
    options: string[]; // For multiple choice or true/false
    correctIndex: number; // 0-based index into options
    concept: string; // Key concept this question tests
    difficulty?: BloomLevel; // Bloom's Taxonomy cognitive level (optional for backward compat)
}

/**
 * Question shape sent to client (no correctIndex, no concept)
 */
export interface QuestionForTaking {
    id: string;
    type: QuestionType;
    question: string;
    options: string[];
}

/**
 * Complete quiz (stored in DB)
 */
export interface Quiz {
    id: string;
    conversationId: string;
    questions: Question[];
    createdAt: string;
}

/**
 * Single answer stored in quiz_attempts.answers
 */
export interface AttemptAnswer {
    questionId: string;
    selectedIndex: number;
    correct: boolean;
    correctIndex: number;
}

/**
 * Quiz attempt/submission
 */
export interface QuizAttempt {
    id: string;
    quizId: string;
    answers: AttemptAnswer[];
    score: number | null;
    status: 'in_progress' | 'completed';
    createdAt: string;
}

/**
 * Quiz Generation State (for LangGraph)
 */
export interface QuizGenerationState {
    conversationId: string;
    sourceIds: string[]; // All source IDs from conversation_sources
    numQuestions: number;
    concepts: string[]; // Extracted key concepts
    questions: Question[];
    validationResults: ValidationResult[];
    needsRegeneration: boolean;
    retryCount: number;
    metadata: {
        startTime?: number;
        endTime?: number;
        totalChunks?: number;
        contextText?: string; 
        validQuestions?: Question[];
        deficit?: number; // Number of replacement questions needed on retry
        [key: string]: any; // Allow additional properties
    };
}

/**
 * Question validation result
 */
export interface ValidationResult {
    questionId: string;
    isValid: boolean;
    issues: string[];
    suggestions?: string[];
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * POST /api/quiz/generate
 */
export interface GenerateQuizRequest {
    conversationId: string;
    numQuestions: number;
}

export interface GenerateQuizResponse {
    quizId: string;
}

/**
 * POST /api/quiz/:quizId/attempts (Start attempt)
 */
export interface CreateAttemptResponse {
    attemptId: string;
    questions: QuestionForTaking[];
    total: number;
}

/**
 * POST /api/quiz/attempts/:attemptId/answer (Submit one answer)
 */
export interface SubmitAnswerRequest {
    questionId: string;
    selectedIndex: number;
}

export interface SubmitAnswerResponse {
    correct: boolean;
    correctIndex: number;
    // Included when this was the last question:
    isLast?: boolean;
    score?: number;
    correctCount?: number;
    wrongCount?: number;
    total?: number;
}

/**
 * GET /api/quiz/attempts/:attemptId (Get attempt summary)
 */
export interface GetAttemptSummaryResponse {
    score: number;
    correctCount: number;
    wrongCount: number;
    total: number;
    status: 'in_progress' | 'completed';
    answers: AttemptAnswer[];
}

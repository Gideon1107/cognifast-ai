/**
 * Quiz difficulty levels
 */
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Question types
 */
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

/**
 * Single quiz question
 */
export interface Question {
    id: string;
    type: QuestionType;
    question: string;
    options?: string[]; // For multiple choice
    correctAnswer: string | string[]; // Can be multiple for multi-select
    explanation: string; // Why this is the correct answer
    concept: string; // Key concept this question tests
    difficulty: QuizDifficulty;
}

/**
 * Complete quiz
 */
export interface Quiz {
    id: string;
    documentId: string;
    difficulty: QuizDifficulty;
    questions: Question[];
    createdAt: string;
}

/**
 * User's answer to a question
 */
export interface Answer {
    questionId: string;
    answer: string | string[];
    timeSpent?: number; // seconds
}

/**
 * Graded answer with feedback
 */
export interface GradedAnswer {
    questionId: string;
    question: string;
    userAnswer: string | string[];
    correctAnswer: string | string[];
    isCorrect: boolean;
    score: number; // Points earned
    maxScore: number; // Max possible points
    feedback: string; // Detailed explanation
    concept: string; // Concept tested
}

/**
 * Knowledge gap identified from quiz
 */
export interface KnowledgeGap {
    concept: string;
    questionsCount: number; // How many questions on this concept
    incorrectCount: number; // How many got wrong
    severity: 'low' | 'medium' | 'high';
    recommendation: string; // What to study
}

/**
 * Quiz attempt/submission
 */
export interface QuizAttempt {
    id: string;
    quizId: string;
    answers: Answer[];
    score?: number;
    feedback?: GradedAnswer[];
    knowledgeGaps?: KnowledgeGap[];
    status: 'in_progress' | 'completed' | 'failed';
    createdAt: string;
}

/**
 * Quiz Generation State (for LangGraph)
 */
export interface QuizGenerationState {
    documentId: string;
    difficulty: QuizDifficulty;
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

/**
 * Quiz Grading State (for LangGraph)
 */
export interface QuizGradingState {
    quizId: string;
    attemptId: string;
    questions: Question[];
    userAnswers: Answer[];
    gradedAnswers: GradedAnswer[];
    feedback: GradedAnswer[];
    knowledgeGaps: KnowledgeGap[];
    overallScore: number;
    feedbackQuality: 'good' | 'needs_improvement';
    retryCount: number;
    metadata: {
        startTime?: number;
        endTime?: number;
        gradedCount?: number;
        totalQuestions?: number;
    };
}

/**
 * Request/Response types for Quiz API
 */
export interface GenerateQuizRequest {
    documentId: string;
    difficulty: QuizDifficulty;
    numQuestions: number;
}

export interface GenerateQuizResponse {
    success: boolean;
    quiz: Quiz;
    error?: string;
}

export interface SubmitQuizRequest {
    quizId: string;
    answers: Answer[];
}

export interface SubmitQuizResponse {
    success: boolean;
    attempt: QuizAttempt;
    score: number;
    feedback: GradedAnswer[];
    knowledgeGaps: KnowledgeGap[];
    error?: string;
}

export interface GetQuizResponse {
    success: boolean;
    quiz: Quiz;
    error?: string;
}


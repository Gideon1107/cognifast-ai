/**
 * Quiz Store - Manages quiz state with Zustand
 * Redesigned for Studio panel integration
 */

import { create } from 'zustand';
import type { QuestionForTaking, SubmitAnswerResponse } from '../lib/api';

export interface AnsweredQuestion {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  correctIndex: number;
}

export interface QuizSummary {
  score: number;
  correctCount: number;
  wrongCount: number;
  total: number;
}

export interface QuizListItem {
  id: string;
  createdAt: string;
  questionCount: number;
}

export type StudioView = 'home' | 'quiz';
export type QuizStep = 'taking' | 'summary';

interface QuizState {
  // Studio navigation
  studioView: StudioView;
  
  // Quiz list (from DB for current conversation)
  quizList: QuizListItem[];
  isGenerating: boolean;
  generatingSourceCount: number; // For "based on X sources" display
  
  // Active quiz (when taking/viewing a quiz)
  activeQuizId: string | null;
  attemptId: string | null;
  questions: QuestionForTaking[];
  currentIndex: number;
  answered: Map<string, AnsweredQuestion>;
  quizStep: QuizStep;
  
  // Summary (from last answer when isLast)
  summary: QuizSummary | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions - Navigation
  goToHome: () => void;
  goToQuiz: (quizId: string) => void;
  
  // Actions - Quiz list
  setQuizList: (quizzes: QuizListItem[]) => void;
  addQuizToList: (quiz: QuizListItem) => void;
  setGenerating: (generating: boolean, sourceCount?: number) => void;
  
  // Actions - Loading/Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions - Quiz taking
  setActiveQuizId: (quizId: string) => void;
  startAttempt: (attemptId: string, questions: QuestionForTaking[]) => void;
  recordAnswer: (questionId: string, result: SubmitAnswerResponse, selectedIndex: number) => void;
  nextQuestion: () => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  studioView: 'home' as StudioView,
  quizList: [] as QuizListItem[],
  isGenerating: false,
  generatingSourceCount: 0,
  activeQuizId: null,
  attemptId: null,
  questions: [] as QuestionForTaking[],
  currentIndex: 0,
  answered: new Map<string, AnsweredQuestion>(),
  quizStep: 'taking' as QuizStep,
  summary: null,
  isLoading: false,
  error: null,
};

export const useQuizStore = create<QuizState>((set, get) => ({
  ...initialState,
  
  // Navigation
  goToHome: () => {
    set({
      studioView: 'home',
      activeQuizId: null,
      attemptId: null,
      questions: [],
      currentIndex: 0,
      answered: new Map(),
      quizStep: 'taking',
      summary: null,
      error: null,
    });
  },
  
  goToQuiz: (quizId: string) => {
    set({
      studioView: 'quiz',
      activeQuizId: quizId,
      error: null,
    });
  },
  
  // Quiz list
  setQuizList: (quizzes: QuizListItem[]) => {
    set({ quizList: quizzes });
  },
  
  addQuizToList: (quiz: QuizListItem) => {
    const state = get();
    set({ quizList: [quiz, ...state.quizList] });
  },
  
  setGenerating: (generating: boolean, sourceCount?: number) => {
    set({ 
      isGenerating: generating,
      generatingSourceCount: sourceCount ?? 0,
    });
  },
  
  // Loading/Error
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
  
  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },
  
  // Quiz taking
  setActiveQuizId: (quizId: string) => {
    set({ activeQuizId: quizId });
  },
  
  startAttempt: (attemptId: string, questions: QuestionForTaking[]) => {
    set({
      attemptId,
      questions,
      currentIndex: 0,
      answered: new Map(),
      quizStep: 'taking',
      isLoading: false,
    });
  },
  
  recordAnswer: (questionId: string, result: SubmitAnswerResponse, selectedIndex: number) => {
    const state = get();
    const newAnswered = new Map(state.answered);
    
    newAnswered.set(questionId, {
      questionId,
      selectedIndex,
      correct: result.correct,
      correctIndex: result.correctIndex,
    });
    
    const updates: Partial<QuizState> = {
      answered: newAnswered,
    };
    
    // If this was the last question, store summary
    if (result.isLast && result.score !== undefined) {
      updates.summary = {
        score: result.score,
        correctCount: result.correctCount!,
        wrongCount: result.wrongCount!,
        total: result.total!,
      };
    }
    
    set(updates);
  },
  
  nextQuestion: () => {
    const state = get();
    const nextIndex = state.currentIndex + 1;
    
    if (nextIndex >= state.questions.length) {
      // Last question - go to summary
      set({ quizStep: 'summary' });
    } else {
      set({ currentIndex: nextIndex });
    }
  },
  
  reset: () => {
    set(initialState);
  },
}));

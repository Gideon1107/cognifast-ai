/**
 * API Client for Cognifast AI Backend
 * Handles all HTTP requests to the backend API
 */

import axios, { AxiosError } from 'axios';
import type {
  SourceUploadResponse,
  GetSourcesResponse,
  GetSourceResponse,
  StartConversationRequest,
  StartConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetConversationResponse,
  GetAllConversationsResponse,
  DeleteConversationResponse,
  UpdateConversationResponse,
  UploadUrlRequest,
} from '@shared/types';

// Base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handler
const handleError = (error: AxiosError): never => {
  if (error.response) {
    // Server responded with error
    const data = error.response.data as { error?: string; message?: string };
    throw new Error(data?.error || data?.message || error.message);
  } else if (error.request) {
    // Request made but no response
    throw new Error('No response from server. Please check your connection.');
  } else {
    // Error setting up request
    throw new Error(error.message);
  }
};

// ============================================
// SOURCE API
// ============================================

/**
 * Upload a source (file)
 */
export async function uploadSource(file: File): Promise<SourceUploadResponse> {
  try {
    const formData = new FormData();
    formData.append('document', file);

    const response = await apiClient.post<SourceUploadResponse>('/sources/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Upload a source (URL)
 */
export async function uploadUrlSource(url: string): Promise<SourceUploadResponse> {
  try {
    const request: UploadUrlRequest = { url };

    const response = await apiClient.post<SourceUploadResponse>('/sources/upload-url', request);

    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Get all sources
 */
export async function getSources(): Promise<GetSourcesResponse> {
  try {
    const response = await apiClient.get<GetSourcesResponse>('/sources');
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Get source by ID
 */
export async function getSourceById(id: string): Promise<GetSourceResponse> {
  try {
    const response = await apiClient.get<GetSourceResponse>(`/sources/${id}`);
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

// ============================================
// CHAT API
// ============================================

/**
 * Start a new conversation
 */
export async function startConversation(
  request: StartConversationRequest
): Promise<StartConversationResponse> {
  try {
    const response = await apiClient.post<StartConversationResponse>('/chat/conversations', request);
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  message: string
): Promise<SendMessageResponse> {
  try {
    const request: SendMessageRequest = {
      conversationId,
      message,
    };

    const response = await apiClient.post<SendMessageResponse>(
      `/chat/conversations/${conversationId}/messages`,
      request
    );

    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Get a conversation with all messages
 */
export async function getConversation(conversationId: string): Promise<GetConversationResponse> {
  try {
    const response = await apiClient.get<GetConversationResponse>(
      `/chat/conversations/${conversationId}`
    );
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Update a conversation title
 */
export async function updateConversation(
  conversationId: string,
  title: string
): Promise<UpdateConversationResponse> {
  try {
    const response = await apiClient.patch<UpdateConversationResponse>(
      `/chat/conversations/${conversationId}`,
      { title }
    );
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Get all conversations
 */
export async function getAllConversations(): Promise<GetAllConversationsResponse> {
  try {
    const response = await apiClient.get<GetAllConversationsResponse>('/chat/conversations');
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<DeleteConversationResponse> {
  try {
    const response = await apiClient.delete<DeleteConversationResponse>(
      `/chat/conversations/${conversationId}`
    );
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

// ============================================
// QUIZ API
// ============================================

/**
 * Quiz types for frontend
 */
export interface QuestionForTaking {
  id: string;
  type: 'multiple_choice' | 'true_false';
  question: string;
  options: string[];
}

export interface GenerateQuizResponse {
  quizId: string;
}

export interface CreateAttemptResponse {
  attemptId: string;
  questions: QuestionForTaking[];
  total: number;
}

export interface SubmitAnswerResponse {
  correct: boolean;
  correctIndex: number;
  isLast?: boolean;
  score?: number;
  correctCount?: number;
  wrongCount?: number;
  total?: number;
}

export interface AttemptAnswer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  correctIndex: number;
}

export interface GetAttemptSummaryResponse {
  score: number;
  correctCount: number;
  wrongCount: number;
  total: number;
  status: 'in_progress' | 'completed';
  answers: AttemptAnswer[];
}

export interface QuizListItem {
  id: string;
  createdAt: string;
  questionCount: number;
}

export interface GetQuizzesForConversationResponse {
  quizzes: QuizListItem[];
}

/**
 * Generate a new quiz for a conversation
 */
export async function generateQuiz(
  conversationId: string,
  numQuestions: number
): Promise<GenerateQuizResponse> {
  try {
    const response = await apiClient.post<GenerateQuizResponse>('/quiz/generate', {
      conversationId,
      numQuestions,
    });
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Start a quiz attempt (create attempt + get questions)
 */
export async function createQuizAttempt(quizId: string): Promise<CreateAttemptResponse> {
  try {
    const response = await apiClient.post<CreateAttemptResponse>(`/quiz/${quizId}/attempts`);
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Submit an answer for a question
 */
export async function submitQuizAnswer(
  attemptId: string,
  questionId: string,
  selectedIndex: number
): Promise<SubmitAnswerResponse> {
  try {
    const response = await apiClient.post<SubmitAnswerResponse>(
      `/quiz/attempts/${attemptId}/answer`,
      { questionId, selectedIndex }
    );
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Get attempt summary
 */
export async function getAttemptSummary(attemptId: string): Promise<GetAttemptSummaryResponse> {
  try {
    const response = await apiClient.get<GetAttemptSummaryResponse>(
      `/quiz/attempts/${attemptId}`
    );
    return response.data;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

/**
 * Get all quizzes for a conversation
 */
export async function getQuizzesForConversation(
  conversationId: string
): Promise<QuizListItem[]> {
  try {
    const response = await apiClient.get<GetQuizzesForConversationResponse>(
      `/quiz/conversation/${conversationId}`
    );
    return response.data.quizzes;
  } catch (error) {
    return handleError(error as AxiosError);
  }
}

export default {
  uploadSource,
  uploadUrlSource,
  getSources,
  getSourceById,
  startConversation,
  sendMessage,
  getConversation,
  getAllConversations,
  deleteConversation,
  updateConversation,
  generateQuiz,
  createQuizAttempt,
  submitQuizAnswer,
  getAttemptSummary,
  getQuizzesForConversation,
};


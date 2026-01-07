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

export default {
  uploadSource,
  getSources,
  getSourceById,
  startConversation,
  sendMessage,
  getConversation,
  getAllConversations,
  deleteConversation,
  updateConversation,
};


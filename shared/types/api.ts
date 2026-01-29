/**
 * Shared API Types
 * Request and Response types for all API endpoints
 */

import type { Message, MessageSource, Conversation, SourceMetadata } from './entities';

// ============================================
// CHAT API TYPES
// ============================================

/**
 * Request to start a new conversation
 */
export interface StartConversationRequest {
    sourceIds: string[]; // Array of 1 or more source IDs
    initialMessage?: string;
    title?: string;
}

/**
 * Response from starting a conversation
 */
export interface StartConversationResponse {
    success: boolean;
    conversation: Conversation;
    messages?: Message[]; // Initial message exchange if initialMessage was provided
    error?: string;
}

/**
 * Request to send a message in a conversation
 */
export interface SendMessageRequest {
    conversationId: string;
    message: string;
}

/**
 * Response from sending a message
 */
export interface SendMessageResponse {
    success: boolean;
    message: Message;
    sources?: MessageSource[];
    metadata?: {
        totalTokens?: number;
        model?: string;
        executionTime?: number;
    };
    error?: string;
}

/**
 * Response from getting a conversation
 */
export interface GetConversationResponse {
    success: boolean;
    conversation: Conversation;
    messages: Message[];
    error?: string;
}

/**
 * Response from getting all conversations
 */
export interface GetAllConversationsResponse {
    success: boolean;
    conversations: Conversation[];
    error?: string;
}

/**
 * Response from deleting a conversation
 */
export interface DeleteConversationResponse {
    success: boolean;
    message: string;
    error?: string;
}

/**
 * Request to update a conversation
 */
export interface UpdateConversationRequest {
    title: string;
}

/**
 * Response from updating a conversation
 */
export interface UpdateConversationResponse {
    success: boolean;
    conversation: Conversation;
    error?: string;
}

// ============================================
// SOURCE API TYPES
// ============================================

/**
 * Request to upload a source from URL
 */
export interface UploadUrlRequest {
    url: string;
}

/**
 * Response from uploading a source
 */
export interface SourceUploadResponse {
    success: boolean;
    message: string;
    source?: SourceMetadata;
    error?: string;
}

/**
 * Response from getting all sources
 */
export interface GetSourcesResponse {
    success: boolean;
    sources: SourceMetadata[];
    error?: string;
}

/**
 * Response from getting a single source
 */
export interface GetSourceResponse {
    success: boolean;
    source: SourceMetadata;
    error?: string;
}


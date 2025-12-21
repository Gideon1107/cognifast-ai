/**
 * Shared API Types
 * Request and Response types for all API endpoints
 */

import { Message, MessageSource, Conversation, DocumentMetadata } from './entities';

// ============================================
// CHAT API TYPES
// ============================================

/**
 * Request to start a new conversation
 */
export interface StartConversationRequest {
    documentIds: string[]; // Array of 1 or more document IDs
    initialMessage?: string;
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
 * Response from deleting a conversation
 */
export interface DeleteConversationResponse {
    success: boolean;
    message: string;
    error?: string;
}

// ============================================
// DOCUMENT API TYPES
// ============================================

/**
 * Response from uploading a document
 */
export interface DocumentUploadResponse {
    success: boolean;
    message: string;
    document?: DocumentMetadata;
    error?: string;
}

/**
 * Response from getting all documents
 */
export interface GetDocumentsResponse {
    success: boolean;
    documents: DocumentMetadata[];
    error?: string;
}

/**
 * Response from getting a single document
 */
export interface GetDocumentResponse {
    success: boolean;
    document: DocumentMetadata;
    error?: string;
}


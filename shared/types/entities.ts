/**
 * Shared Entity Types
 * These represent domain models used across frontend and backend
 */

/**
 * Message role in a conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Single message in a conversation
 */
export interface Message {
    id?: string;
    conversationId: string;
    role: MessageRole;
    content: string;
    sources?: MessageSource[];
    createdAt?: string;
}

/**
 * Source citation for a message
 */
export interface MessageSource {
    chunkId: string;
    documentId: string;
    documentName: string;
    chunkText: string;
    chunkIndex: number;
    similarity: number;
}

/**
 * Conversation metadata
 */
export interface Conversation {
    id: string;
    documentIds: string[];
    documentNames?: string[];
    title?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
    id?: string;
    filename: string;
    originalName: string;
    fileType: 'pdf' | 'docx' | 'doc' | 'txt';
    fileSize: number;
    filePath: string;
    extractedText?: string;
    createdAt?: string;
    updatedAt?: string;
}


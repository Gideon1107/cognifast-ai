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
    sourceId: string;
    sourceName: string;
    sourceType?: 'pdf' | 'docx' | 'doc' | 'txt' | 'url'; // File type of the source
    chunkText: string;
    chunkIndex: number;
    similarity: number;
}

/**
 * Conversation metadata
 */
export interface Conversation {
    id: string;
    sourceIds: string[];
    sourceNames?: string[];
    sourceTypes?: ('pdf' | 'docx' | 'doc' | 'txt' | 'url')[]; // File types for each source
    title?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Source metadata
 */
export interface SourceMetadata {
    id?: string;
    filename: string;
    originalName: string;
    fileType: 'pdf' | 'docx' | 'doc' | 'txt' | 'url';
    fileSize: number;
    filePath: string;
    sourceUrl?: string;
    extractedText?: string;
    createdAt?: string;
    updatedAt?: string;
}


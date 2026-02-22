/**
 * Shared Entity Types
 * These represent domain models used across frontend and backend
 */

/**
 * Supported source file / content types
 */
export type SourceType = 'pdf' | 'docx' | 'doc' | 'txt' | 'url';

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
    sourceType?: SourceType;
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
    sourceTypes?: SourceType[];
    title?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Text chunk from a source (used during chunking and embedding)
 */
export interface SourceChunk {
    text: string;
    index: number;
}

/**
 * Source metadata (API/domain shape)
 */
export interface SourceMetadata {
    id?: string;
    filename: string;
    originalName: string;
    fileType: SourceType;
    fileSize: number;
    filePath: string;
    sourceUrl?: string;
    extractedText?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Shape of a source row as returned from the database (Drizzle/sources table)
 */
export interface SourceRow {
    id: string;
    filename: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    sourceUrl: string | null;
    extractedText: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}

/**
 * Chat Panel Props
 */
export interface ChatPanelProps {
    conversationId: string | null;
    title: string;
    sourceCount: number;
    messages: Message[];
    message: string;
    setMessage: (message: string) => void;
    onSendMessage: () => void;
    isLoading: boolean;
  }
  
  /**
   * Citation State
   */
export interface CitationState {
    source: MessageSource;
    position: { x: number; y: number };
    placement: 'above' | 'below';
  }
 


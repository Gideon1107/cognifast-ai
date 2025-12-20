import { RetrievedChunk as RetrievedChunkType } from '../services/retrieval.service';

/**
 * Re-export for convenience
 */
export type RetrievedChunk = RetrievedChunkType;

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
    documentName: string; // Name of the document (e.g., "Resume.pdf")
    chunkText: string;
    similarity: number;
}

/**
 * Conversation metadata
 */
export interface Conversation {
    id: string;
    documentIds: string[]; // Array of document IDs (1 or more)
    documentNames?: string[]; // Array of document names for display
    title?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Router agent decision types
 */
export type RouterDecision = 'retrieve' | 'direct_answer' | 'clarify';

/**
 * Response quality assessment
 */
export type ResponseQuality = 'good' | 'poor' | 'pending';

/**
 * State for Chat StateGraph (LangGraph)
 */
export interface ConversationState {
    conversationId: string;
    documentIds: string[]; // Array of document IDs (always an array)
    messages: Message[];
    currentQuery: string;
    retrievedChunks: RetrievedChunk[];
    routerDecision: RouterDecision;
    responseQuality: ResponseQuality;
    retryCount: number;
    metadata: {
        startTime?: number;
        endTime?: number;
        totalTokens?: number;
        model?: string;
        isFirstMessage?: boolean; // Flag to skip quality check for first message
    };
}

/**
 * Request/Response types for Chat API
 */
export interface StartConversationRequest {
    documentIds: string[]; // Array of 1 or more document IDs
    initialMessage?: string;
}

export interface StartConversationResponse {
    success: boolean;
    conversation: Conversation;
    messages?: Message[]; // Initial message exchange if initialMessage was provided
    error?: string;
}

export interface SendMessageRequest {
    conversationId: string;
    message: string;
}

export interface SendMessageResponse {
    success: boolean;
    message: Message;
    sources?: MessageSource[];
    error?: string;
}

export interface GetConversationResponse {
    success: boolean;
    conversation: Conversation;
    messages: Message[];
    error?: string;
}

export interface DeleteConversationResponse {
    success: boolean;
    message: string;
    error?: string;
}


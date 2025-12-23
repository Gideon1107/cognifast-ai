import { RetrievedChunk as RetrievedChunkType } from '../services/retrieval.service';

// Import and re-export shared types (used by frontend too)
import type {
    MessageRole,
    Message,
    MessageSource,
    Conversation,
    StartConversationRequest,
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    GetConversationResponse,
    GetAllConversationsResponse,
    DeleteConversationResponse
} from '@shared/types';

export type {
    MessageRole,
    Message,
    MessageSource,
    Conversation,
    StartConversationRequest,
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    GetConversationResponse,
    GetAllConversationsResponse,
    DeleteConversationResponse
};

/**
 * Re-export for convenience
 */
export type RetrievedChunk = RetrievedChunkType;

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
 * Internal Backend Types (not shared with frontend)
 */

/**
 * Internal service layer result (includes more metadata than API response)
 */
export interface SendMessageResult {
    message: Message;
    metadata: {
        totalTokens?: number;
        model?: string;
        executionTime?: number;
        startTime?: number;
        endTime?: number;
    };
}


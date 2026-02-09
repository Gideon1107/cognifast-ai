// Import and re-export shared types (used by frontend too)
import type {
    MessageRole,
    Message,
    MessageSource,
    Conversation,
    RetrievedChunk,
    SourceType,
    StartConversationRequest,
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    GetConversationResponse,
    GetAllConversationsResponse,
    DeleteConversationResponse,
    UpdateConversationRequest,
    UpdateConversationResponse
} from '@shared/types';

export type {
    MessageRole,
    Message,
    MessageSource,
    Conversation,
    RetrievedChunk,
    SourceType,
    StartConversationRequest,
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    GetConversationResponse,
    GetAllConversationsResponse,
    DeleteConversationResponse,
    UpdateConversationRequest,
    UpdateConversationResponse
};

/**
 * Router agent decision types
 */
export type RouterDecision = 'retrieve' | 'direct_answer' | 'clarify' | 'identity_block';

/**
 * Response quality assessment
 */
export type ResponseQuality = 'good' | 'poor' | 'pending';

/**
 * State for Chat StateGraph (LangGraph)
 */
export interface ConversationState {
    conversationId: string;
    sourceIds: string[];
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
        onToken?: (token: string) => void; // Callback for token-by-token streaming
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


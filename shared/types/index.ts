/**
 * Shared Types Index
 * Central export for all shared types used by frontend and backend
 */

// Entity types
export type {
    MessageRole,
    Message,
    MessageSource,
    Conversation,
    SourceMetadata
} from './entities';

// API types
export type {
    // Chat API
    StartConversationRequest,
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    GetConversationResponse,
    GetAllConversationsResponse,
    DeleteConversationResponse,
    UpdateConversationRequest,
    UpdateConversationResponse,
    // Source API
    UploadUrlRequest,
    SourceUploadResponse,
    GetSourcesResponse,
    GetSourceResponse
} from './api';


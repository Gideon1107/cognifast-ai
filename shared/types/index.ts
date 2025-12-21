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
    DocumentMetadata
} from './entities';

// API types
export type {
    // Chat API
    StartConversationRequest,
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    GetConversationResponse,
    DeleteConversationResponse,
    // Document API
    DocumentUploadResponse,
    GetDocumentsResponse,
    GetDocumentResponse
} from './api';


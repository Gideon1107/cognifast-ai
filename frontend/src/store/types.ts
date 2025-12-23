/**
 * Store Type Definitions
 * Types for the Zustand chat store
 */

import type { Conversation, Message } from '@shared/types';

/**
 * Streaming state for a conversation
 */
export interface StreamingState {
  content: string;
  messageId: string | null;
}

/**
 * Chat Store State Interface
 */
export interface ChatStore {
  // State
  conversations: Map<string, Conversation>;
  messages: Map<string, Message[]>;
  currentConversationId: string | null;
  streamingContent: Map<string, StreamingState>;

  // Actions - Conversations
  setConversation: (conversation: Conversation) => void;
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversationId: string | null) => void;
  removeConversation: (conversationId: string) => void;

  // Actions - Messages
  addMessage: (conversationId: string, message: Message) => void;
  addMessages: (conversationId: string, messages: Message[]) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  clearMessages: (conversationId: string) => void;

  // Actions - Streaming
  setStreamingContent: (conversationId: string, content: string, messageId?: string | null) => void;
  appendStreamingContent: (conversationId: string, token: string) => void;
  clearStreaming: (conversationId: string) => void;
  finalizeStreamingMessage: (conversationId: string, message: Message) => void;

  // Helpers
  getMessages: (conversationId: string) => Message[];
  getConversation: (conversationId: string) => Conversation | undefined;
  isStreaming: (conversationId: string) => boolean;
}


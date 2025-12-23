/**
 * Chat Store (Zustand)
 * Global state management for conversations and messages
 */

import { create } from 'zustand';
import type { Conversation, Message } from '@shared/types';
import type { ChatStore } from './types';

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial State
  conversations: new Map(),
  messages: new Map(),
  currentConversationId: null,
  streamingContent: new Map(),

  // ============================================
  // Conversation Actions
  // ============================================

  /**
   * Set or update a single conversation
   */
  setConversation: (conversation: Conversation) => {
    set((state) => {
      const newConversations = new Map(state.conversations);
      newConversations.set(conversation.id, conversation);
      return { conversations: newConversations };
    });
  },

  /**
   * Set multiple conversations (replaces existing)
   */
  setConversations: (conversations: Conversation[]) => {
    const conversationsMap = new Map<string, Conversation>();
    conversations.forEach((conv) => {
      conversationsMap.set(conv.id, conv);
    });
    set({ conversations: conversationsMap });
  },

  /**
   * Set the current active conversation
   */
  setCurrentConversation: (conversationId: string | null) => {
    set({ currentConversationId: conversationId });
  },

  /**
   * Remove a conversation from the store
   */
  removeConversation: (conversationId: string) => {
    set((state) => {
      const newConversations = new Map(state.conversations);
      const newMessages = new Map(state.messages);
      const newStreaming = new Map(state.streamingContent);

      newConversations.delete(conversationId);
      newMessages.delete(conversationId);
      newStreaming.delete(conversationId);

      return {
        conversations: newConversations,
        messages: newMessages,
        streamingContent: newStreaming,
      };
    });
  },

  // ============================================
  // Message Actions
  // ============================================

  /**
   * Add a single message to a conversation
   */
  addMessage: (conversationId: string, message: Message) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      const existingMessages = newMessages.get(conversationId) || [];
      
      // Check if message already exists (by ID)
      const messageExists = existingMessages.some((m) => m.id === message.id);
      if (messageExists) {
        return state; // Don't add duplicate
      }

      newMessages.set(conversationId, [...existingMessages, message]);
      return { messages: newMessages };
    });
  },

  /**
   * Add multiple messages to a conversation (replaces existing)
   */
  addMessages: (conversationId: string, messages: Message[]) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      newMessages.set(conversationId, messages);
      return { messages: newMessages };
    });
  },

  /**
   * Update an existing message
   */
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      const existingMessages = newMessages.get(conversationId) || [];
      
      const updatedMessages = existingMessages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );

      newMessages.set(conversationId, updatedMessages);
      return { messages: newMessages };
    });
  },

  /**
   * Remove a message from a conversation
   */
  removeMessage: (conversationId: string, messageId: string) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      const existingMessages = newMessages.get(conversationId) || [];
      
      const filteredMessages = existingMessages.filter((msg) => msg.id !== messageId);
      newMessages.set(conversationId, filteredMessages);
      
      return { messages: newMessages };
    });
  },

  /**
   * Clear all messages for a conversation
   */
  clearMessages: (conversationId: string) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      newMessages.delete(conversationId);
      return { messages: newMessages };
    });
  },

  // ============================================
  // Streaming Actions
  // ============================================

  /**
   * Set streaming content for a conversation
   */
  setStreamingContent: (conversationId: string, content: string, messageId: string | null = null) => {
    set((state) => {
      const newStreaming = new Map(state.streamingContent);
      newStreaming.set(conversationId, { content, messageId });
      return { streamingContent: newStreaming };
    });
  },

  /**
   * Append a token to streaming content
   */
  appendStreamingContent: (conversationId: string, token: string) => {
    set((state) => {
      const newStreaming = new Map(state.streamingContent);
      const current = newStreaming.get(conversationId) || { content: '', messageId: null };
      newStreaming.set(conversationId, {
        content: current.content + token,
        messageId: current.messageId,
      });
      return { streamingContent: newStreaming };
    });
  },

  /**
   * Clear streaming state for a conversation
   */
  clearStreaming: (conversationId: string) => {
    set((state) => {
      const newStreaming = new Map(state.streamingContent);
      newStreaming.delete(conversationId);
      return { streamingContent: newStreaming };
    });
  },

  /**
   * Finalize streaming message - convert streaming content to actual message
   */
  finalizeStreamingMessage: (conversationId: string, message: Message) => {
    const state = get();
    
    // Clear streaming state
    state.clearStreaming(conversationId);
    
    // Add the finalized message
    state.addMessage(conversationId, message);
  },

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * Get all messages for a conversation (including streaming if active)
   */
  getMessages: (conversationId: string) => {
    const state = get();
    const messages = state.messages.get(conversationId) || [];
    const streaming = state.streamingContent.get(conversationId);

    if (streaming && streaming.content) {
      // Create a temporary message for streaming content
      const streamingMessage: Message = {
        id: streaming.messageId || `streaming-${conversationId}`,
        conversationId,
        role: 'assistant',
        content: streaming.content,
        createdAt: new Date().toISOString(),
      };
      return [...messages, streamingMessage];
    }

    return messages;
  },

  /**
   * Get a conversation by ID
   */
  getConversation: (conversationId: string) => {
    return get().conversations.get(conversationId);
  },

  /**
   * Check if a conversation is currently streaming
   */
  isStreaming: (conversationId: string) => {
    const streaming = get().streamingContent.get(conversationId);
    return !!streaming && streaming.content.length > 0;
  },
}));


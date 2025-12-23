/**
 * useWebSocket Hook
 * React hook for managing WebSocket connection and chat streaming
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { getSocket } from '../lib/websocket';
import { useChatStore } from '../store';
import type { Message } from '@shared/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('USE-WEBSOCKET');

interface UseWebSocketOptions {
    conversationId: string | null;
    enabled?: boolean;
}

/**
 * Hook for managing WebSocket connection and chat streaming
 */
export function useWebSocket({ conversationId, enabled = true }: UseWebSocketOptions) {
    const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const {
        setStreamingContent,
        appendStreamingContent,
        clearStreaming,
        finalizeStreamingMessage,
        setLoadingState,
        clearLoadingState,
    } = useChatStore();

    /**
     * Send a message via WebSocket
     */
    const sendMessage = useCallback((message: string) => {
        if (!conversationId || !socketRef.current) {
            logger.error('Cannot send message: no conversation ID or socket not connected');
            return;
        }

        logger.info(`Sending message via WebSocket for conversation ${conversationId}`);
        socketRef.current.emit('send_message', {
            conversationId,
            message,
        });
    }, [conversationId]);

    useEffect(() => {
        if (!enabled || !conversationId) {
            return;
        }

        // Get or create socket connection
        const socket = getSocket();
        socketRef.current = socket;

        // Update connection status
        const updateConnectionStatus = () => {
            setIsConnected(socket.connected);
        };

        // Set initial connection status
        updateConnectionStatus();

        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Join conversation room
        socket.emit('join_conversation', { conversationId });

        // Handle joined confirmation
        socket.on('joined_conversation', (data: { conversationId: string }) => {
            logger.info(`Joined conversation room: ${data.conversationId}`);
        });

        // Handle message start
        socket.on('message_start', (data: { conversationId: string }) => {
            logger.info(`Message streaming started for conversation ${data.conversationId}`);
            // Initialize streaming content and show initial loading
            setStreamingContent(data.conversationId, '', null);
            setLoadingState(data.conversationId, 'initial', 'Looking for cues...');
            logger.info(`[USE-WEBSOCKET] Set initial loading state for ${data.conversationId}`);
        });

        // Handle loading stage updates
        socket.on('loading_stage', (data: { conversationId: string; stage: string; message: string }) => {
            const { conversationId: convId, stage, message } = data;
            logger.info(`[USE-WEBSOCKET] Loading stage update for conversation ${convId}: ${stage} - ${message}`);
            
            if (message && message.trim().length > 0) {
                setLoadingState(convId, stage, message);
                logger.info(`[USE-WEBSOCKET] Set loading state: ${message}`);
            } else {
                // Clear loading when message is empty (streaming started)
                clearLoadingState(convId);
                logger.info(`[USE-WEBSOCKET] Cleared loading state for ${convId}`);
            }
        });

        // Handle message tokens (streaming)
        socket.on('message_token', (data: { conversationId: string; messageId: string; token: string }) => {
            const { conversationId: convId, token } = data;
            logger.debug(`Received token for conversation ${convId}`);
            
            // Clear loading when we start receiving actual content
            if (token && token.trim().length > 0) {
                clearLoadingState(convId);
            }
            
            // Append token to streaming content
            appendStreamingContent(convId, token);
        });

        // Handle message end (streaming complete)
        socket.on('message_end', (data: { conversationId: string; messageId: string; message: Message }) => {
            const { conversationId: convId, message } = data;
            logger.info(`Message streaming completed for conversation ${convId}`);
            
            // Finalize the streaming message
            finalizeStreamingMessage(convId, message);
        });

        // Handle errors
        socket.on('error', (data: { conversationId?: string; message: string }) => {
            logger.error(`WebSocket error: ${data.message}`);
            
            if (data.conversationId) {
                // Clear streaming on error
                clearStreaming(data.conversationId);
            }
        });

        // Cleanup on unmount or conversation change
        return () => {
            if (conversationId) {
                socket.emit('leave_conversation', { conversationId });
            }
            
            // Remove all listeners for this conversation
            socket.off('connect');
            socket.off('disconnect');
            socket.off('joined_conversation');
            socket.off('message_start');
            socket.off('loading_stage');
            socket.off('message_token');
            socket.off('message_end');
            socket.off('error');
        };
    }, [conversationId, enabled]);

    return {
        sendMessage,
        isConnected,
    };
}


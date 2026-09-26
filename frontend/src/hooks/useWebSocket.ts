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

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

/**
 * Hook for managing WebSocket connection and chat streaming
 */
export function useWebSocket({ conversationId, enabled = true }: UseWebSocketOptions) {
    const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const messageQueueRef = useRef<string[]>([]);
    const {
        setStreamingContent,
        appendStreamingContent,
        clearStreaming,
        finalizeStreamingMessage,
        setLoading,
        clearLoadingState,
    } = useChatStore();

    /**
     * Send a message via WebSocket
     */
    const sendMessage = useCallback((message: string) => {
        if (!conversationId) {
            logger.error('Cannot send message: no conversation ID');
            return;
        }

        if (!socketRef.current || status !== 'connected') {
            logger.info('Socket not connected. Queueing message.');
            messageQueueRef.current.push(message);
            return;
        }

        logger.info(`Sending message via WebSocket for conversation ${conversationId}`);
        socketRef.current.emit('send_message', {
            conversationId,
            message,
        });
    }, [conversationId, status]);

    useEffect(() => {
        if (!enabled || !conversationId) {
            return;
        }

        const socket = getSocket();
        socketRef.current = socket;

        setStatus(socket.connected ? 'connected' : 'disconnected');

        const onConnect = () => {
            setStatus('connected');
            socket.emit('join_conversation', { conversationId });
            
            // Process queued messages
            if (messageQueueRef.current.length > 0) {
                logger.info(`Processing ${messageQueueRef.current.length} queued messages`);
                messageQueueRef.current.forEach(msg => {
                    socket.emit('send_message', { conversationId, message: msg });
                });
                messageQueueRef.current = [];
            }
        };

        const onDisconnect = (reason: string) => {
            if (reason === 'io server disconnect' || reason === 'io client disconnect') {
                setStatus('disconnected');
            } else {
                setStatus('reconnecting');
            }
            // If disconnected while streaming, clear state
            clearStreaming(conversationId);
            setLoading(conversationId, false);
        };

        const onReconnectAttempt = () => {
            setStatus('reconnecting');
        };

        const onReconnectFailed = () => {
            setStatus('disconnected');
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.io.on('reconnect_attempt', onReconnectAttempt);
        socket.io.on('reconnect_failed', onReconnectFailed);

        if (socket.connected) {
            socket.emit('join_conversation', { conversationId });
        }

        socket.on('joined_conversation', (data: { conversationId: string }) => {
            logger.info(`Joined conversation room: ${data.conversationId}`);
        });

        socket.on('message_start', (data: { conversationId: string }) => {
            logger.info(`Message streaming started for conversation ${data.conversationId}`);
            setStreamingContent(data.conversationId, '', null);
            setLoading(data.conversationId, true);
        });

        socket.on('message_token', (data: { conversationId: string; messageId: string; token: string }) => {
            const { conversationId: convId, token } = data;
            if (token && token.trim().length > 0) {
                setLoading(convId, false);
            }
            appendStreamingContent(convId, token);
        });

        socket.on('message_end', (data: { conversationId: string; messageId: string; message: Message }) => {
            const { conversationId: convId, message } = data;
            logger.info(`Message streaming completed for conversation ${convId}`);
            finalizeStreamingMessage(convId, message);
        });

        socket.on('error', (data: { conversationId?: string; message: string }) => {
            logger.error(`WebSocket error: ${data.message}`);
            if (data.conversationId) {
                clearStreaming(data.conversationId);
                setLoading(data.conversationId, false);
            }
        });

        return () => {
            if (conversationId) {
                socket.emit('leave_conversation', { conversationId });
            }
            
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.io.off('reconnect_attempt', onReconnectAttempt);
            socket.io.off('reconnect_failed', onReconnectFailed);
            socket.off('joined_conversation');
            socket.off('message_start');
            socket.off('message_token');
            socket.off('message_end');
            socket.off('error');
        };
    }, [conversationId, enabled, appendStreamingContent, clearStreaming, finalizeStreamingMessage, setLoading, setStreamingContent]);

    return {
        sendMessage,
        status,
        isConnected: status === 'connected',
    };
}


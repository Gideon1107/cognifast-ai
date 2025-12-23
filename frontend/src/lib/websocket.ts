/**
 * WebSocket Client Setup
 * Manages Socket.io connection for real-time chat streaming
 */

import { io, Socket } from 'socket.io-client';
import { createLogger } from '../utils/logger';

const logger = createLogger('WEBSOCKET');

// Get WebSocket URL from environment or default to backend URL
const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Get or create Socket.io connection
 */
export function getSocket(): Socket {
    if (!socket || !socket.connected) {
        logger.info(`Connecting to WebSocket server: ${WS_URL}`);
        
        socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            logger.info('WebSocket connected');
        });

        socket.on('disconnect', (reason) => {
            logger.info(`WebSocket disconnected: ${reason}`);
        });

        socket.on('connect_error', (error) => {
            logger.error(`WebSocket connection error: ${error.message}`);
        });

        socket.on('reconnect', (attemptNumber) => {
            logger.info(`WebSocket reconnected after ${attemptNumber} attempts`);
        });

        socket.on('reconnect_error', (error) => {
            logger.error(`WebSocket reconnection error: ${error.message}`);
        });

        socket.on('reconnect_failed', () => {
            logger.error('WebSocket reconnection failed');
        });
    }

    return socket;
}

/**
 * Disconnect Socket.io connection
 */
export function disconnectSocket(): void {
    if (socket) {
        logger.info('Disconnecting WebSocket');
        socket.disconnect();
        socket = null;
    }
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
    return socket?.connected || false;
}


import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWebSocket } from '../useWebSocket';
import { useChatStore } from '../../store';
import { getSocket } from '../../lib/websocket';

vi.mock('../../lib/websocket', () => ({
  getSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

// Mock Zustand store
vi.mock('../../store', () => {
  return {
    useChatStore: vi.fn(),
  };
});

describe('useWebSocket', () => {
  let mockSocket: any;
  let mockStore: any;

  beforeEach(() => {
    mockSocket = {
      connected: false,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      io: {
        on: vi.fn(),
        off: vi.fn(),
      },
    };

    (getSocket as any).mockReturnValue(mockSocket);

    mockStore = {
      setStreamingContent: vi.fn(),
      appendStreamingContent: vi.fn(),
      clearStreaming: vi.fn(),
      finalizeStreamingMessage: vi.fn(),
      setLoading: vi.fn(),
      clearLoadingState: vi.fn(),
    };

    (useChatStore as any).mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with disconnected status and connects', () => {
    const { result } = renderHook(() => useWebSocket({ conversationId: '123' }));
    
    expect(result.current.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);

    // Find the connect handler and simulate connection
    const connectCall = mockSocket.on.mock.calls.find((c: any) => c[0] === 'connect');
    act(() => {
      connectCall[1]();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversationId: '123' });
  });

  it('queues messages when disconnected and sends on reconnect', () => {
    const { result } = renderHook(() => useWebSocket({ conversationId: '123' }));
    
    act(() => {
      result.current.sendMessage('Hello');
      result.current.sendMessage('World');
    });

    // Should not emit since it's not connected
    expect(mockSocket.emit).not.toHaveBeenCalledWith('send_message', expect.anything());

    // Connect socket
    const connectCall = mockSocket.on.mock.calls.find((c: any) => c[0] === 'connect');
    act(() => {
      mockSocket.connected = true;
      connectCall[1]();
    });

    // Should now emit queued messages
    expect(mockSocket.emit).toHaveBeenCalledWith('send_message', { conversationId: '123', message: 'Hello' });
    expect(mockSocket.emit).toHaveBeenCalledWith('send_message', { conversationId: '123', message: 'World' });
  });

  it('handles disconnect and reconnect events properly', () => {
    const { result } = renderHook(() => useWebSocket({ conversationId: '123' }));
    
    // Connect first
    const connectCall = mockSocket.on.mock.calls.find((c: any) => c[0] === 'connect');
    act(() => {
      connectCall[1]();
    });
    
    expect(result.current.status).toBe('connected');

    // Simulate involuntary disconnect
    const disconnectCall = mockSocket.on.mock.calls.find((c: any) => c[0] === 'disconnect');
    act(() => {
      disconnectCall[1]('transport error');
    });

    expect(result.current.status).toBe('reconnecting');
    expect(mockStore.clearStreaming).toHaveBeenCalledWith('123');
    expect(mockStore.setLoading).toHaveBeenCalledWith('123', false);

    // Simulate reconnect attempt
    const reconnectAttemptCall = mockSocket.io.on.mock.calls.find((c: any) => c[0] === 'reconnect_attempt');
    act(() => {
      reconnectAttemptCall[1]();
    });
    expect(result.current.status).toBe('reconnecting');

    // Simulate reconnect failed
    const reconnectFailedCall = mockSocket.io.on.mock.calls.find((c: any) => c[0] === 'reconnect_failed');
    act(() => {
      reconnectFailedCall[1]();
    });
    expect(result.current.status).toBe('disconnected');
  });
});

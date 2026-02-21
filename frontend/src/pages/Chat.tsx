/**
 * Chat Page
 * 3-column layout: Sources (left) | Chat (center) | Studio (right)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { SourceUploadModal } from '../components/chat/SourceUploadModal';
import { SourcesPanel } from '../components/chat/SourcesPanel';
import { ChatPanel } from '../components/chat/ChatPanel';
import { StudioPanel } from '../components/studio/StudioPanel';
import {
  getConversation,
  startConversation
} from '../lib/api';
import { useChatStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Message } from '@shared/types';

const STUDIO_WIDTH_WHEN_QUIZ_OPEN = 35;

export function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [uploadInProgress, setUploadInProgress] = useState(false);

  // Panel resizing state
  const [widths, setWidths] = useState<{ sources: number; chat: number; studio: number }>(() => {
    const saved = localStorage.getItem('chat-panel-widths');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse widths from localStorage', e);
      }
    }
    return { sources: 20, chat: 50, studio: 30 };
  });

  const resizingRef = useRef<'sources' | 'studio' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResizing = (panel: 'sources' | 'studio') => {
    resizingRef.current = panel;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const stopResizing = () => {
    resizingRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      const mouseXPercent = (mouseX / containerWidth) * 100;

      const MIN_SOURCES = 15;
      const MIN_CHAT = 30;
      const MIN_STUDIO = 20;

      setWidths((prev) => {
        let newWidths = { ...prev };

        if (resizingRef.current === 'sources') {
          const newSourcesWidth = Math.max(MIN_SOURCES, Math.min(mouseXPercent, 100 - MIN_CHAT - prev.studio));
          newWidths = {
            ...prev,
            sources: newSourcesWidth,
            chat: 100 - newSourcesWidth - prev.studio,
          };
        } else if (resizingRef.current === 'studio') {
          const newStudioWidth = Math.max(MIN_STUDIO, Math.min(100 - mouseXPercent, 100 - MIN_CHAT - prev.sources));
          newWidths = {
            ...prev,
            studio: newStudioWidth,
            chat: 100 - prev.sources - newStudioWidth,
          };
        }

        return newWidths;
      });
    };

    const handleMouseUp = () => stopResizing();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('chat-panel-widths', JSON.stringify(widths));
  }, [widths]);

  const widthsBeforeQuizRef = useRef<{ sources: number; chat: number; studio: number } | null>(null);

  const widenStudioForQuiz = () => {
    setWidths((prev) => {
      widthsBeforeQuizRef.current = { ...prev };
      const newStudio = Math.min(STUDIO_WIDTH_WHEN_QUIZ_OPEN, 100 - prev.sources - 30);
      const newChat = 100 - prev.sources - newStudio;
      return { sources: prev.sources, chat: newChat, studio: newStudio };
    });
  };

  const restoreStudioWidth = () => {
    if (widthsBeforeQuizRef.current) {
      setWidths(widthsBeforeQuizRef.current);
      widthsBeforeQuizRef.current = null;
    }
  };

  const resetWidths = () => {
    setWidths({ sources: 20, chat: 50, studio: 30 });
  };

  // Zustand store
  const {
    getMessages,
    getConversation: getStoreConversation,
    setConversation,
    addMessages,
    addMessage,
    setCurrentConversation,
    removeMessage,
    isLoading,
  } = useChatStore();

  // WebSocket hook for real-time messaging
  const { sendMessage: sendMessageViaWebSocket } = useWebSocket({
    conversationId: conversationId || null,
    enabled: !!conversationId,
  });

  // Determine if modal should be shown
  const isNew = searchParams.get('new') === 'true';
  const showUploadModal = !conversationId && (isNew || true);

  // Set current conversation in store
  useEffect(() => {
    setCurrentConversation(conversationId || null);
  }, [conversationId, setCurrentConversation]);

  // Fetch conversation if conversationId exists
  const { data: conversationData, isLoading: isLoadingConversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
  });

  // Sync conversation data to store when it loads
  useEffect(() => {
    if (conversationData?.success && conversationData.conversation && conversationId) {
      setConversation(conversationData.conversation);

      if (conversationData.messages && conversationData.messages.length > 0) {
        addMessages(conversationId, conversationData.messages);
      }
    }
  }, [conversationData, conversationId, setConversation, addMessages]);

  // Get conversation and messages from store
  const conversation = conversationId ? getStoreConversation(conversationId) : null;
  const messages = conversationId ? getMessages(conversationId) : [];
  const isLoadingState = conversationId ? isLoading(conversationId) : false;

  const handleStartClassroom = async (sourceIds: string[], title: string) => {
    if (sourceIds.length === 0) return;

    setUploadInProgress(true);

    try {
      const response = await startConversation({
        sourceIds,
        title,
      });

      if (response.success && response.conversation) {
        setConversation(response.conversation);

        if (response.messages && response.messages.length > 0) {
          addMessages(response.conversation.id, response.messages);
        }

        navigate(`/chat/${response.conversation.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setUploadInProgress(false);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !conversationId) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content: message.trim(),
      createdAt: new Date().toISOString(),
    };

    const messageContent = message.trim();
    setMessage('');

    addMessage(conversationId, userMessage);

    try {
      sendMessageViaWebSocket(messageContent);
    } catch (error) {
      console.error('Failed to send message via WebSocket:', error);
      removeMessage(conversationId, userMessage.id!);
    }
  };

  // Get sources from conversation
  const sources = conversation?.sourceIds.map((sourceId, index) => ({
    id: sourceId,
    name: conversation.sourceNames?.[index] || `Source ${index + 1}`,
    type: conversation.sourceTypes?.[index] || 'pdf',
  })) || [];

  // Show loading state
  if (conversationId && isLoadingConversation) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading conversation...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden" style={{ position: 'relative' }}>
      <Navbar />

      {/* Source Upload Modal */}
      <SourceUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          if (!conversationId && !uploadInProgress) {
            navigate('/dashboard');
          }
        }}
        onStartClassroom={handleStartClassroom}
      />

      {/* 3-Column Layout */}
      <main id="main-content" tabIndex={-1} ref={containerRef} className="flex-1 flex overflow-hidden px-4 pt-2 pb-2">
        {/* Left Sidebar - Sources */}
        <div style={{ flex: `0 0 ${widths.sources}%`, minWidth: 0 }}>
          <SourcesPanel sources={sources} />
        </div>

        {/* Resize Handle Sources-Chat */}
        <div
          onMouseDown={() => startResizing('sources')}
          onDoubleClick={resetWidths}
          className="w-1 cursor-col-resize transition-colors shrink-0 flex items-center justify-center group"
        >
          <div className="w-0.5 h-8 bg-gray-200 group-hover:bg-blue-400 rounded-full transition-colors" />
        </div>

        {/* Center - Chat Interface */}
        <div style={{ flex: `0 0 ${widths.chat}%`, minWidth: 0 }}>
          <ChatPanel
            conversationId={conversationId || null}
            title={conversation?.title || 'New Classroom'}
            sourceCount={sources.length}
            messages={messages}
            message={message}
            setMessage={setMessage}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingState}
          />
        </div>

        {/* Resize Handle Chat-Studio */}
        <div
          onMouseDown={() => startResizing('studio')}
          onDoubleClick={resetWidths}
          className="w-1 cursor-col-resize transition-colors shrink-0 flex items-center justify-center group"
        >
          <div className="w-0.5 h-8 bg-gray-200 group-hover:bg-blue-400 rounded-full transition-colors" />
        </div>

        {/* Right Sidebar - Studio */}
        <div style={{ flex: `0 0 ${widths.studio}%`, minWidth: 0 }}>
          <StudioPanel
            conversationId={conversationId || null}
            conversationTitle={conversation?.title || 'Quiz'}
            sourceCount={sources.length}
            onSendMessage={sendMessageViaWebSocket}
            onStudioResizeForQuiz={widenStudioForQuiz}
            onQuizClose={restoreStudioWidth}
          />
        </div>
      </main>
    </div>
  );
}

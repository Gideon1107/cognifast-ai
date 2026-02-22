/**
 * Studio Panel - Right sidebar with navigation and view switching
 */

import { useEffect, useCallback } from 'react';
import { ChevronRight, PanelRight } from 'lucide-react';
import { useQuizStore } from '../../store/useQuizStore';
import { getQuizzesForConversation } from '../../lib/api';
import { StudioHome } from './StudioHome.tsx';
import { StudioQuizApp } from './StudioQuizApp.tsx';

interface StudioPanelProps {
  conversationId: string | null;
  conversationTitle: string;
  sourceCount: number;
  onSendMessage?: (message: string) => void;
  onStudioResizeForQuiz?: () => void;
  onQuizClose?: () => void;
}

export function StudioPanel({ 
  conversationId, 
  conversationTitle, 
  sourceCount,
  onSendMessage,
  onStudioResizeForQuiz,
  onQuizClose,
}: StudioPanelProps) {
  const {
    studioView,
    goToHome,
    setQuizList,
  } = useQuizStore();

  const loadQuizzes = useCallback(async (convId: string) => {
    try {
      const quizzes = await getQuizzesForConversation(convId);
      setQuizList(quizzes);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    }
  }, [setQuizList]);

  // Load quizzes when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadQuizzes(conversationId);
    }
  }, [conversationId, loadQuizzes]);

  // Get title for navigation breadcrumb
  const getViewTitle = () => {
    if (studioView === 'quiz') {
      return 'Quiz';
    }
    return null;
  };

  const viewTitle = getViewTitle();

  return (
    <div className="bg-white dark:bg-zinc-900 flex flex-col border border-gray-100 dark:border-zinc-900 rounded-xl overflow-hidden h-full">
      {/* Header with navigation */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-1 text-lg font-semibold text-gray-600 dark:text-gray-300 sansation-regular">
          {viewTitle ? (
            <>
              <button
                onClick={() => {
                  onQuizClose?.();
                  goToHome();
                }}
                className="hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Studio
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-900 dark:text-white">{viewTitle}</span>
            </>
          ) : (
            <span>Studio</span>
          )}
        </div>
        <button
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Collapse studio panel"
          title="Collapse Studio"
        >
          <PanelRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {studioView === 'home' && (
          <StudioHome
            conversationId={conversationId}
            conversationTitle={conversationTitle}
            sourceCount={sourceCount}
            onQuizGenerated={() => {
              if (conversationId) {
                loadQuizzes(conversationId);
              }
            }}
            onStudioResizeForQuiz={onStudioResizeForQuiz}
          />
        )}
        {studioView === 'quiz' && (
          <StudioQuizApp 
            conversationId={conversationId} 
            conversationTitle={conversationTitle}
            sourceCount={sourceCount}
            onSendMessage={onSendMessage}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Studio Panel - Right sidebar with navigation and view switching
 */

import { useEffect, useCallback } from 'react';
import { ChevronRight, PanelRight } from 'lucide-react';
import { useQuizStore } from '../../store/useQuizStore';
import { useChatStore } from '../../store';
import { getQuizzesForConversation, generateQuiz, createQuizAttempt } from '../../lib/api';
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

import { studioOptions } from './StudioHome.tsx';

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
    isGenerating,
    setGenerating,
    setActiveQuizId,
    startAttempt,
    addQuizToList,
    setError,
    goToQuiz,
  } = useQuizStore();

  const { isStudioCollapsed, toggleStudioCollapsed, setStudioCollapsed } = useChatStore();

  const handleStartQuiz = useCallback(async () => {
    if (!conversationId || isGenerating) return;

    try {
      setGenerating(true, sourceCount);
      setError(null);

      // 1. Generate quiz with default 10 questions
      const { quizId } = await generateQuiz(conversationId, 10);

      // Add to list
      const newQuiz = {
        id: quizId,
        createdAt: new Date().toISOString(),
        questionCount: 10,
      };
      addQuizToList(newQuiz);

      // Reload list
      const quizzes = await getQuizzesForConversation(conversationId);
      setQuizList(quizzes);

      // 2. Start attempt and get questions
      const attemptResponse = await createQuizAttempt(quizId);

      // 3. Go to quiz view
      setActiveQuizId(quizId);
      startAttempt(attemptResponse.attemptId, attemptResponse.questions);
      goToQuiz(quizId);
      onStudioResizeForQuiz?.();

    } catch (error) {
      console.error('Failed to start quiz:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate quiz');
      goToHome();
    } finally {
      setGenerating(false);
    }
  }, [conversationId, isGenerating, sourceCount, setGenerating, setError, addQuizToList, setQuizList, setActiveQuizId, startAttempt, goToQuiz, onStudioResizeForQuiz, goToHome]);

  const handleOptionClick = useCallback(async (optionId: string) => {
    setStudioCollapsed(false);
    if (optionId === 'quiz' && conversationId) {
      await handleStartQuiz();
    }
  }, [conversationId, handleStartQuiz, setStudioCollapsed]);

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

  if (isStudioCollapsed) {
    return (
      <div className="bg-white dark:bg-zinc-900 flex flex-col items-center border border-gray-100 dark:border-zinc-900 rounded-xl overflow-hidden h-full py-4 gap-4">
        <button
          onClick={toggleStudioCollapsed}
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Expand studio panel"
          title="Expand Studio"
        >
          <PanelRight className="w-5 h-5 text-gray-500 dark:text-gray-400 rotate-180" />
        </button>
        <div className="flex flex-col gap-4">
          {studioOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-blue-500 transition-all cursor-pointer group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                aria-label={`Open ${option.name}`}
                title={option.name}
              >
                <Icon className="w-6 h-6" />
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transform -translate-x-2 group-hover:translate-x-0 transition-all">
                  {option.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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
          onClick={toggleStudioCollapsed}
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
            onStudioResizeForQuiz={onStudioResizeForQuiz}
            handleOptionClick={handleOptionClick}
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

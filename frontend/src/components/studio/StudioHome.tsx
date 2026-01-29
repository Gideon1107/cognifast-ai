/**
 * Studio Home - Options grid and recent activity
 */

import { useState } from 'react';
import { Sparkles, BookOpen, ClipboardList, BarChart, FileText, RefreshCw, MoreVertical } from 'lucide-react';
import { useQuizStore, type QuizListItem } from '../../store/useQuizStore';
import { generateQuiz, createQuizAttempt } from '../../lib/api';

interface StudioHomeProps {
  conversationId: string | null;
  conversationTitle: string;
  sourceCount: number;
  onQuizGenerated?: () => void;
  onStudioResizeForQuiz?: () => void;
}

const DEFAULT_QUESTION_COUNT = 10;

const studioOptions = [
  { id: 'audio', name: 'Audio Overview', icon: Sparkles },
  { id: 'video', name: 'Video Overview', icon: Sparkles },
  { id: 'mindmap', name: 'Mind Map', icon: BarChart },
  { id: 'reports', name: 'Reports', icon: BookOpen },
  { id: 'flashcards', name: 'Flashcards', icon: FileText },
  { id: 'quiz', name: 'Quiz', icon: ClipboardList },
];

export function StudioHome({
  conversationId,
  conversationTitle,
  sourceCount,
  onQuizGenerated,
  onStudioResizeForQuiz,
}: StudioHomeProps) {
  const {
    quizList,
    isGenerating,
    generatingSourceCount,
    goToQuiz,
    goToHome,
    setGenerating,
    setActiveQuizId,
    startAttempt,
    addQuizToList,
    setError,
  } = useQuizStore();

  const [isStarting, setIsStarting] = useState(false);

  const handleOptionClick = async (optionId: string) => {
    if (optionId === 'quiz' && conversationId) {
      await handleStartQuiz();
    }
  };

  const handleStartQuiz = async () => {
    if (!conversationId || isGenerating) return;

    try {
      setIsStarting(true);
      setGenerating(true, sourceCount);
      setError(null);

      // 1. Generate quiz with default 10 questions
      const { quizId } = await generateQuiz(conversationId, DEFAULT_QUESTION_COUNT);

      // Add to list
      const newQuiz: QuizListItem = {
        id: quizId,
        createdAt: new Date().toISOString(),
        questionCount: DEFAULT_QUESTION_COUNT,
      };
      addQuizToList(newQuiz);
      onQuizGenerated?.();

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
      setIsStarting(true);
      setGenerating(false);
    }
  };

  const handleQuizClick = async (quiz: QuizListItem) => {
    if (!conversationId || isGenerating) return;

    try {
      setIsStarting(true);
      setError(null);

      // Start a new attempt for this quiz
      const attemptResponse = await createQuizAttempt(quiz.id);

      setActiveQuizId(quiz.id);
      startAttempt(attemptResponse.attemptId, attemptResponse.questions);
      goToQuiz(quiz.id);
      onStudioResizeForQuiz?.();

    } catch (error) {
      console.error('Failed to start quiz:', error);
      setError(error instanceof Error ? error.message : 'Failed to start quiz');
    } finally {
      setIsStarting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-4">
      {/* Options grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {studioOptions.map((option) => {
          const Icon = option.icon;
          const isDisabled = (!conversationId && option.id === 'quiz') || (option.id === 'quiz' && isGenerating);
          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              disabled={isDisabled}
              className={`flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer relative ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Icon className="w-6 h-6 text-gray-700 mb-2" />
              <span className="text-xs font-medium text-gray-900 text-center">{option.name}</span>
            </button>
          );
        })}
      </div>

      {/* Border separator */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Recent Activity */}
      <div className="space-y-2">
        {/* Generating state */}
        {isGenerating && (
          <div className="flex items-center gap-3 py-2">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 sansation-regular">Generating Quiz...</p>
              <p className="text-xs text-gray-500">
                based on {generatingSourceCount} source{generatingSourceCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Quiz list */}
        {quizList.length === 0 && !isGenerating ? (
          <p className="text-xs text-gray-500 py-2">No quizzes yet. Click Quiz above to create one.</p>
        ) : (
          quizList.map((quiz) => (
            <button
              key={quiz.id}
              onClick={() => handleQuizClick(quiz)}
              disabled={isStarting || isGenerating}
              className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
            >
              <ClipboardList className="w-6 h-6 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-700 transition-colors sansation-regular">
                  {conversationTitle ? `${conversationTitle} Quiz` : 'Quiz'}
                </p>
                <p className="text-xs text-gray-400">
                  {quiz.questionCount} questions • {sourceCount} source{sourceCount !== 1 ? 's' : ''} • {formatTimeAgo(quiz.createdAt)}
                </p>
              </div>
              <MoreVertical className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

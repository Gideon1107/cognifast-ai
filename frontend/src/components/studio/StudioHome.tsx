import { useState } from 'react';
import { AudioLines, MonitorPlay, BookOpen, ClipboardList, Network, Layers2, Brain, RefreshCw, MoreVertical } from 'lucide-react';
import { useQuizStore, type QuizListItem } from '../../store/useQuizStore';
import { createQuizAttempt } from '../../lib/api';

interface StudioHomeProps {
  conversationId: string | null;
  conversationTitle: string;
  sourceCount: number;
  onStudioResizeForQuiz?: () => void;
  handleOptionClick: (optionId: string) => Promise<void>;
}

export const studioOptions = [
  { id: 'audio', name: 'Audio Overview', icon: AudioLines },
  { id: 'video', name: 'Video Overview', icon: MonitorPlay },
  { id: 'mindmap', name: 'Mind Map', icon: Network },
  { id: 'knowledgegap', name: 'Knowledge Gap', icon: Brain },
  { id: 'reports', name: 'Reports', icon: BookOpen },
  { id: 'flashcards', name: 'Flashcards', icon: Layers2 },
  { id: 'quiz', name: 'Quiz', icon: ClipboardList },
];

export function StudioHome({
  conversationId,
  conversationTitle,
  sourceCount,
  onStudioResizeForQuiz,
  handleOptionClick,
}: StudioHomeProps) {
  const {
    quizList,
    isGenerating,
    generatingSourceCount,
    goToQuiz,
    setActiveQuizId,
    startAttempt,
    setError,
  } = useQuizStore();

  const [isStarting, setIsStarting] = useState(false);

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
              className={`flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer relative ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
            >
              <Icon className="w-6 h-6 text-gray-700 dark:text-gray-300 mb-2" />
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100 text-center">{option.name}</span>
            </button>
          );
        })}
      </div>

      {/* Border separator */}
      <div className="border-t border-gray-200 dark:border-zinc-700 my-4"></div>

      {/* Recent Activity */}
      <div className="space-y-2">
        {/* Generating state */}
        {isGenerating && (
          <div className="flex items-center gap-3 py-2">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 sansation-regular">Generating Quiz...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                based on {generatingSourceCount} source{generatingSourceCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Quiz list */}
        {quizList.length === 0 && !isGenerating ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 py-2">No quizzes yet. Click Quiz above to create one.</p>
        ) : (
          quizList.map((quiz) => (
            <button
              key={quiz.id}
              onClick={() => handleQuizClick(quiz)}
              disabled={isStarting || isGenerating}
              className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <ClipboardList className="w-6 h-6 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors sansation-regular">
                  {conversationTitle ? `${conversationTitle} Quiz` : 'Quiz'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {quiz.questionCount} questions • {sourceCount} source{sourceCount !== 1 ? 's' : ''} • {formatTimeAgo(quiz.createdAt)}
                </p>
              </div>
              <MoreVertical className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

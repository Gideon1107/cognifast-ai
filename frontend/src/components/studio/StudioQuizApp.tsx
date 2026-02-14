/**
 * Studio Quiz App - Quiz taking UI inside the Studio panel
 */

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Trophy, RotateCcw, Maximize2, MessageSquareDot } from 'lucide-react';
import { useQuizStore } from '../../store/useQuizStore';
import { useChatStore } from '../../store';
import { submitQuizAnswer } from '../../lib/api';
import { renderWithLatex } from '../../utils/latex';

interface StudioQuizAppProps {
  conversationId: string | null;
  conversationTitle: string;
  sourceCount: number;
  onSendMessage?: (message: string) => void;
}

export function StudioQuizApp({ 
  conversationId, 
  conversationTitle,
  sourceCount,
  onSendMessage 
}: StudioQuizAppProps) {
  const {
    questions,
    currentIndex,
    answered,
    attemptId,
    quizStep,
    summary,
    recordAnswer,
    nextQuestion,
    goToHome,
  } = useQuizStore();

  const { addMessage } = useChatStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuizExpanded, setIsQuizExpanded] = useState(false);

  const toggleQuizPanel = () => {
    setIsQuizExpanded((prev) => !prev);
  };

  const closeExpandedQuiz = () => {
    setIsQuizExpanded(false);
  };

  useEffect(() => {
    if (!isQuizExpanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsQuizExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuizExpanded]);

  // Summary view
  const containerClasses = isQuizExpanded
    ? 'fixed inset-4 z-50 bg-white rounded-xl border border-gray-200 shadow-2xl flex flex-col'
    : 'flex flex-col h-full';

  if (quizStep === 'summary' && summary) {
    return (
      <>
        {isQuizExpanded && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeExpandedQuiz}
            aria-label="Close expanded quiz panel backdrop"
            tabIndex={-1}
          />
        )}
        <div className={containerClasses}>
          <QuizSummaryView
            summary={summary}
            conversationTitle={conversationTitle}
            sourceCount={sourceCount}
            onRetake={() => goToHome()}
            onDone={() => goToHome()}
            isQuizExpanded={isQuizExpanded}
            onToggleExpand={toggleQuizPanel}
          />
        </div>
      </>
    );
  }

  // Question view
  const question = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const answer = question ? answered.get(question.id) : undefined;
  const hasAnswered = !!answer;

  if (!question) {
    return (
      <>
        {isQuizExpanded && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeExpandedQuiz}
            aria-label="Close expanded quiz panel backdrop"
            tabIndex={-1}
          />
        )}
        <div className={containerClasses}>
          <div className="p-6 text-center text-gray-500 text-sm">No question available</div>
        </div>
      </>
    );
  }

  const handleOptionClick = async (optionIndex: number) => {
    if (hasAnswered || isSubmitting || !attemptId) return;

    try {
      setIsSubmitting(true);
      const result = await submitQuizAnswer(attemptId, question.id, optionIndex);
      recordAnswer(question.id, result, optionIndex);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExplain = () => {
    if (!answer || answer.correct || !conversationId) return;

    const selectedOption = question.options[answer.selectedIndex];
    const correctOption = question.options[answer.correctIndex];

    const explainMessage = `I am taking a quiz on this material and was given this question: "${question.question}"

I chose this as the answer: "${selectedOption}"

That answer was incorrect. The correct answer is "${correctOption}"

Help me understand why my answer was incorrect.`;

    addMessage(conversationId, {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content: explainMessage,
      createdAt: new Date().toISOString(),
    });

    onSendMessage?.(explainMessage);
  };

  const getOptionStyles = (optionIndex: number) => {
    if (!hasAnswered) {
      return 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300';
    }

    const isSelected = answer.selectedIndex === optionIndex;
    const isCorrect = answer.correctIndex === optionIndex;
    // Vibrant red/green to match reference: clear medium-bright alert red and success green
    const wrongStyles = 'bg-red-50 border-2 border-red-500';
    const correctStyles = 'bg-green-50 border-2 border-green-500';

    if (isSelected && answer.correct) {
      return correctStyles;
    }
    if (isSelected && !answer.correct) {
      return wrongStyles;
    }
    if (isCorrect) {
      return correctStyles;
    }
    return 'bg-gray-50 border-gray-200 opacity-50';
  };

  // Render text with LaTeX
  const renderText = (text: string) => {
    const parts = renderWithLatex(text);
    return parts.map((part, idx) => 
      typeof part === 'string' ? <span key={idx}>{part}</span> : part
    );
  };

  return (
    <>
      {isQuizExpanded && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={closeExpandedQuiz}
          aria-label="Close expanded quiz panel backdrop"
          tabIndex={-1}
        />
      )}
      <div className={containerClasses}>
        {/* Quiz Header */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 sansation-regular">
                {conversationTitle ? `${conversationTitle} Quiz` : 'Quiz'}
              </h2>
              <p className="text-sm text-gray-500">
                Based on {sourceCount} source{sourceCount !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={toggleQuizPanel}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={isQuizExpanded ? 'Exit expanded quiz panel' : 'Expand quiz panel'}
              aria-pressed={isQuizExpanded}
              title={isQuizExpanded ? 'Exit expanded quiz panel' : 'Expand quiz panel'}
              type="button"
            >
              <Maximize2 className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Progress */}
          <p className="text-sm text-gray-500 mb-4">
            {currentIndex + 1} / {questions.length}
          </p>

          {/* Question */}
          <div className="text-gray-900 text-base leading-relaxed mb-6">
            {renderText(question.question)}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = hasAnswered && answer.selectedIndex === index;
              const isCorrectOption = hasAnswered && answer.correctIndex === index;

              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  disabled={hasAnswered || isSubmitting}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${getOptionStyles(index)} ${
                    !hasAnswered && !isSubmitting ? 'cursor-pointer' : 'cursor-default'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                >
                  <span className="shrink-0 text-gray-500 font-medium">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="flex-1 text-gray-900">{renderText(option)}</span>
                  {hasAnswered && (
                    <span className="shrink-0">
                      {isSelected && answer.correct && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {isSelected && !answer.correct && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      {!isSelected && isCorrectOption && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          {hasAnswered && (
            <div className="flex items-center justify-between mt-6">
              {!answer.correct ? (
                <button
                  onClick={handleExplain}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-full border border-blue-200 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <MessageSquareDot className="w-4 h-4" />
                  Explain
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={nextQuestion}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {isLastQuestion ? 'Done' : 'Next'}
              </button>
            </div>
          )}

          {/* Loading state */}
          {isSubmitting && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Summary sub-component
function QuizSummaryView({
  summary,
  conversationTitle,
  sourceCount,
  onRetake,
  onDone,
  isQuizExpanded,
  onToggleExpand,
}: {
  summary: { score: number; correctCount: number; wrongCount: number; total: number };
  conversationTitle: string;
  sourceCount: number;
  onRetake: () => void;
  onDone: () => void;
  isQuizExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const getMessage = () => {
    if (summary.score >= 90) return { text: 'Excellent!', color: 'text-green-600' };
    if (summary.score >= 70) return { text: 'Great job!', color: 'text-blue-600' };
    if (summary.score >= 50) return { text: 'Good effort!', color: 'text-yellow-600' };
    return { text: 'Keep learning!', color: 'text-orange-600' };
  };

  const message = getMessage();

  return (
    <div className="flex flex-col h-full">
      {/* Quiz Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {conversationTitle ? `${conversationTitle} Quiz` : 'Quiz'}
            </h2>
            <p className="text-sm text-gray-500">
              Based on {sourceCount} source{sourceCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onToggleExpand}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label={isQuizExpanded ? 'Exit expanded quiz panel' : 'Expand quiz panel'}
            aria-pressed={isQuizExpanded}
            title={isQuizExpanded ? 'Exit expanded quiz panel' : 'Expand quiz panel'}
            type="button"
          >
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Summary Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Trophy */}
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-yellow-600" />
        </div>

        {/* Message */}
        <h3 className={`text-xl font-bold mb-2 ${message.color} sansation-regular`}>
          {message.text}
        </h3>

        {/* Score */}
        <p className="text-4xl font-bold text-gray-900">{summary.score}%</p>
        <p className="text-sm text-gray-500 mb-6">Your Score</p>

        {/* Stats */}
        <div className="flex gap-8 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-lg font-medium text-gray-900">{summary.correctCount}</span>
            <span className="text-sm text-gray-500">correct</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-lg font-medium text-gray-900">{summary.wrongCount}</span>
            <span className="text-sm text-gray-500">wrong</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={onRetake}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <RotateCcw className="w-4 h-4" />
            New Quiz
          </button>
          <button
            onClick={onDone}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

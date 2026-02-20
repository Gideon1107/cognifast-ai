/**
 * Chat Panel - Center panel with messages and input
 */

import { useState, useRef, useEffect } from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import { CitationTooltip } from './CitationTooltip';
import { renderWithLatex } from '../../utils/latex';
import type { Message, MessageSource } from '@shared/types';

interface ChatPanelProps {
  conversationId: string | null;
  title: string;
  sourceCount: number;
  messages: Message[];
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  loadingMessage: string;
}

interface CitationState {
  source: MessageSource;
  position: { x: number; y: number };
  placement: 'above' | 'below';
}

export function ChatPanel({
  conversationId,
  title,
  sourceCount,
  messages,
  message,
  setMessage,
  onSendMessage,
  isLoading,
  loadingMessage,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const citationTimeoutRef = useRef<number | null>(null);
  const citationShowTimeoutRef = useRef<number | null>(null);

  // Citation tooltip state
  const [openCitation, setOpenCitation] = useState<CitationState | null>(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isLoading]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (citationTimeoutRef.current) {
        clearTimeout(citationTimeoutRef.current);
      }
      if (citationShowTimeoutRef.current) {
        clearTimeout(citationShowTimeoutRef.current);
      }
    };
  }, []);

  // Parse citations from text and return parts
  const parseCitations = (
    text: string,
    sources: MessageSource[] | undefined
  ): Array<{ type: 'text' | 'citation'; content: string; citationNumber?: number; source?: MessageSource }> => {
    if (!sources || sources.length === 0) {
      return [{ type: 'text', content: text }];
    }

    const citationRegex = /\[(\d+)\]/g;
    const parts: Array<{ type: 'text' | 'citation'; content: string; citationNumber?: number; source?: MessageSource }> = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }

      const citationNumber = parseInt(match[1], 10);
      const sourceIndex = citationNumber - 1;

      if (sourceIndex >= 0 && sourceIndex < sources.length) {
        const source = sources[sourceIndex];
        if (source && source.chunkText && source.chunkText.trim().length > 0) {
          parts.push({
            type: 'citation',
            content: match[0],
            citationNumber,
            source: source,
          });
        } else {
          parts.push({ type: 'text', content: match[0] });
        }
      } else {
        parts.push({ type: 'text', content: match[0] });
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  // Citation interaction handlers
  const showCitationTooltip = (
    target: HTMLElement,
    source: MessageSource,
    withDelay = false
  ) => {
    if (!source || !source.chunkText || source.chunkText.trim().length === 0) {
      return;
    }

    if (citationTimeoutRef.current) {
      clearTimeout(citationTimeoutRef.current);
      citationTimeoutRef.current = null;
    }
    if (citationShowTimeoutRef.current) {
      clearTimeout(citationShowTimeoutRef.current);
      citationShowTimeoutRef.current = null;
    }

    const rect = target.getBoundingClientRect();
    const tooltipHeight = 400;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placement: 'above' | 'below' = spaceBelow >= tooltipHeight ? 'below' :
                                          spaceAbove >= tooltipHeight ? 'above' :
                                          spaceBelow >= spaceAbove ? 'below' : 'above';

    const openTooltip = () => {
      setOpenCitation({
        source,
        position: {
          x: rect.left,
          y: placement === 'below' ? rect.bottom + 8 : rect.top - 8,
        },
        placement,
      });
      citationShowTimeoutRef.current = null;
    };

    if (withDelay) {
      citationShowTimeoutRef.current = window.setTimeout(openTooltip, 150);
      return;
    }

    openTooltip();
  };

  const handleCitationHover = (target: HTMLElement, source: MessageSource) => {
    showCitationTooltip(target, source, true);
  };

  const handleCitationFocus = (target: HTMLElement, source: MessageSource) => {
    showCitationTooltip(target, source);
  };

  const handleCitationLeave = () => {
    if (citationShowTimeoutRef.current) {
      clearTimeout(citationShowTimeoutRef.current);
      citationShowTimeoutRef.current = null;
    }

    citationTimeoutRef.current = window.setTimeout(() => {
      setOpenCitation(null);
    }, 200);
  };

  const handleTooltipEnter = () => {
    if (citationTimeoutRef.current) {
      clearTimeout(citationTimeoutRef.current);
    }
  };

  const handleTooltipLeave = () => {
    setOpenCitation(null);
  };

  // Format text helpers
  const formatBold = (text: string) => {
    return text.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  };

  const formatHeadings = (text: string) => {
    text = text.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    text = text.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    text = text.replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    return text;
  };

  // Render message content with citations and LaTeX
  const renderMessageContent = (msg: Message) => {
    const parts = parseCitations(msg.content, msg.sources);

    const renderParts = (): React.ReactElement[] => {
      const elements: React.ReactElement[] = [];
      let currentTextGroup: string[] = [];
      let currentTextIndices: number[] = [];

      const flushTextGroup = () => {
        if (currentTextGroup.length > 0) {
          let combinedText = currentTextGroup.join('');

          const latexPlaceholders: string[] = [];
          let placeholderIndex = 0;
          const latexRegex = /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)|\\\(([^)]+?)\\\)/g;

          combinedText = combinedText.replace(latexRegex, (match) => {
            let cleaned = match;
            cleaned = cleaned.replace(/^[*_]+/, '').replace(/[*_]+$/, '');
            const placeholder = `__LATEX_PLACEHOLDER_${placeholderIndex}__`;
            latexPlaceholders.push(cleaned);
            placeholderIndex++;
            return placeholder;
          });

          const withHeadings = formatHeadings(combinedText);
          const withBold = formatBold(withHeadings);

          let processedText = withBold;
          latexPlaceholders.forEach((latex, idx) => {
            const placeholder = `__LATEX_PLACEHOLDER_${idx}__`;
            processedText = processedText.replace(placeholder, latex);
          });

          const hasLatex = latexPlaceholders.length > 0;

          if (hasLatex) {
            const latexParts = renderWithLatex(processedText);
            latexParts.forEach((lp, idx) => {
              if (typeof lp === 'string') {
                elements.push(
                  <span
                    key={`text-group-${currentTextIndices[0]}-latex-${idx}`}
                    dangerouslySetInnerHTML={{ __html: lp }}
                  />
                );
              } else {
                elements.push(<span key={`text-group-${currentTextIndices[0]}-latex-${idx}`}>{lp}</span>);
              }
            });
          } else {
            elements.push(
              <span
                key={`text-group-${currentTextIndices[0]}`}
                dangerouslySetInnerHTML={{ __html: processedText }}
              />
            );
          }
          currentTextGroup = [];
          currentTextIndices = [];
        }
      };

      parts.forEach((part, partIdx) => {
        if (part.type === 'citation' && part.source) {
          flushTextGroup();
          elements.push(
            <button
              key={`citation-${partIdx}`}
              type="button"
              onMouseEnter={(e) => handleCitationHover(e.currentTarget, part.source!)}
              onFocus={(e) => handleCitationFocus(e.currentTarget, part.source!)}
              onMouseLeave={handleCitationLeave}
              onBlur={handleCitationLeave}
              className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[11px] font-medium text-blue-700 bg-blue-100 rounded border border-blue-200 hover:bg-blue-200 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              style={{
                display: 'inline-flex',
                verticalAlign: 'baseline',
                minWidth: '20px',
                height: '18px'
              }}
              title={`View source: ${part.source.sourceName}`}
              aria-label={`View citation ${part.citationNumber} from ${part.source.sourceName}`}
            >
              {part.citationNumber}
            </button>
          );
        } else {
          currentTextGroup.push(part.content);
          currentTextIndices.push(partIdx);
        }
      });

      flushTextGroup();
      return elements;
    };

    return renderParts();
  };

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden h-full">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex flex-row items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-600 sansation-regular">{title}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {sourceCount} source{sourceCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ minHeight: 0, maxHeight: '100%' }}>
        {messages.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm mt-2">Ask questions about your document</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id || `msg-${msg.createdAt}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ minWidth: 0, maxWidth: '100%' }}>
                <div
                  className={msg.role === 'user' ? 'w-fit min-w-0 shrink-0 grow-0' : 'max-w-3xl w-full'}
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    ...(msg.role === 'user'
                      ? { maxWidth: 'min(48rem, 85%)' }
                      : { maxWidth: '100%' }),
                  }}
                >
                  {msg.role === 'user' ? (
                    <div className="bg-gray-900 text-white px-4 py-3 rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl inline-block max-w-full">
                      <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="space-y-3" style={{ maxWidth: '100%', overflow: 'hidden', minWidth: 0 }}>
                      <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed whitespace-pre-wrap" style={{ maxWidth: '100%', overflowWrap: 'break-word', overflow: 'hidden', minWidth: 0 }}>
                        {renderMessageContent(msg)}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          aria-label="Copy message"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          aria-label="Mark message helpful"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          aria-label="Mark message unhelpful"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl w-full">
                  <div className="flex items-center gap-3 bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 px-5 py-4 rounded-2xl border border-blue-100/50 shadow-sm">
                    <div className="relative shrink-0 h-5 w-5">
                      <div
                        className="absolute inset-0 rounded-full animate-spin"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent, #3b82f6, #6366f1, #8b5cf6, #3b82f6, transparent)',
                          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
                          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))'
                        }}
                      ></div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 italic">{loadingMessage}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pb-4 px-4 pt-1">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-1 border border-gray-200 focus-within:border-blue-500 transition-colors">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              placeholder="Start typing..."
              disabled={!conversationId}
              className="flex-1 bg-transparent px-3 py-2 text-gray-900 placeholder-gray-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none rounded-xl"
              rows={1}
            />
            <button
              onClick={onSendMessage}
              disabled={!message.trim() || !conversationId}
              className="p-2 bg-gray-900 text-white rounded-full flex align-middle align-self-center items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Send message"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Citation Tooltip */}
      {openCitation && (
        <div
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
          style={{ position: 'fixed', zIndex: 50 }}
        >
          <CitationTooltip
            source={openCitation.source}
            isOpen={true}
            position={openCitation.position}
            placement={openCitation.placement}
          />
        </div>
      )}
    </div>
  );
}

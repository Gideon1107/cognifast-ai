/**
 * Chat Page
 * 3-column layout: Sources (left) | Chat (center) | Studio (right)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { SourceUploadModal } from '../components/chat/SourceUploadModal';
import { CitationTooltip } from '../components/chat/CitationTooltip';
import { FileText, Sparkles, BookOpen, ClipboardList, BarChart, Globe, PanelRight, PanelLeft, ArrowRight } from 'lucide-react';
import { 
  getConversation, 
  startConversation 
} from '../lib/api';
import { useChatStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';
import { renderWithLatex } from '../utils/latex';
import type { Message, MessageSource } from '@shared/types';

export function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const [openCitation, setOpenCitation] = useState<{ source: MessageSource; position: { x: number; y: number }; placement: 'above' | 'below' } | null>(null);

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
    getLoadingMessage,
  } = useChatStore();

  // WebSocket hook for real-time messaging
  const { sendMessage: sendMessageViaWebSocket } = useWebSocket({
    conversationId: conversationId || null,
    enabled: !!conversationId,
  });

  // Determine if modal should be shown
  const isNew = searchParams.get('new') === 'true';
  const showUploadModal = !conversationId && (isNew || true); // Show modal if no conversation ID

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
      
      // Sync messages to store
      if (conversationData.messages && conversationData.messages.length > 0) {
        addMessages(conversationId, conversationData.messages);
      }
    }
  }, [conversationData, conversationId, setConversation, addMessages]);

  // Get conversation and messages from store
  const conversation = conversationId ? getStoreConversation(conversationId) : null;
  const messages = conversationId ? getMessages(conversationId) : [];
  const isLoadingState = conversationId ? isLoading(conversationId) : false;
  const streamingContentMap = useChatStore((state) => state.streamingContent);
  const streamingContent = conversationId ? streamingContentMap.get(conversationId) : null;

  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Scroll to bottom when messages change, loading state changes, or streaming content updates
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isLoadingState, streamingContent?.content]);

  // Scroll to bottom when conversation loads
  useEffect(() => {
    if (conversationData?.success && conversationData.messages) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [conversationData]);

  const studioOptions = [
    { id: 'audio', name: 'Audio Overview', icon: Sparkles },
    { id: 'video', name: 'Video Overview', icon: Sparkles },
    { id: 'mindmap', name: 'Mind Map', icon: BarChart },
    { id: 'reports', name: 'Reports', icon: BookOpen },
    { id: 'flashcards', name: 'Flashcards', icon: FileText },
    { id: 'quiz', name: 'Quiz', icon: ClipboardList },
  ];

  const handleStartClassroom = async (sourceIds: string[], title: string) => {
    if (sourceIds.length === 0) return;

    setUploadInProgress(true);

    try {
      // Start conversation with uploaded sources and title
      const response = await startConversation({
        sourceIds,
        title,
      });

      if (response.success && response.conversation) {
        // Add conversation to store
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

    // Add user message to store
    addMessage(conversationId, userMessage);

    // Send message via WebSocket
    try {
      sendMessageViaWebSocket(messageContent);
    } catch (error) {
      console.error('Failed to send message via WebSocket:', error);
      removeMessage(conversationId, userMessage.id!);
    }
  };

  // Parse citations from text and return parts (text segments and citations)
  const parseCitations = (text: string, sources: MessageSource[] | undefined): Array<{ type: 'text' | 'citation'; content: string; citationNumber?: number; source?: MessageSource }> => {
    if (!sources || sources.length === 0) {
      return [{ type: 'text', content: text }];
    }

    const citationRegex = /\[(\d+)\]/g;
    const parts: Array<{ type: 'text' | 'citation'; content: string; citationNumber?: number; source?: MessageSource }> = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }

      // Add citation
      const citationNumber = parseInt(match[1], 10);
      const sourceIndex = citationNumber - 1; // [1] -> sources[0], [2] -> sources[1], etc.
      
      if (sourceIndex >= 0 && sourceIndex < sources.length) {
        const source = sources[sourceIndex];
        // Validate that source has required data
        if (source && source.chunkText && source.chunkText.trim().length > 0) {
          parts.push({
            type: 'citation',
            content: match[0],
            citationNumber,
            source: source,
          });
        } else {
          // Treat as text if no chunk text
          parts.push({ type: 'text', content: match[0] });
        }
      } else {
        // Invalid citation number, treat as text
        parts.push({ type: 'text', content: match[0] });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  // Handle citation hover with delay for smooth transition
  const citationTimeoutRef = useRef<number | null>(null);
  const citationShowTimeoutRef = useRef<number | null>(null);

  const handleCitationHover = (e: React.MouseEvent<HTMLSpanElement>, source: MessageSource) => {
    // Validate source has chunk text
    if (!source || !source.chunkText || source.chunkText.trim().length === 0) {
      return;
    }

    // Clear any existing timeouts
    if (citationTimeoutRef.current) {
      clearTimeout(citationTimeoutRef.current);
      citationTimeoutRef.current = null;
    }
    if (citationShowTimeoutRef.current) {
      clearTimeout(citationShowTimeoutRef.current);
      citationShowTimeoutRef.current = null;
    }

    // Capture rect immediately (before setTimeout) as e.currentTarget becomes null in async callback
    const rect = e.currentTarget.getBoundingClientRect();

    // Calculate if there's enough space below for tooltip (max-h-96 = 384px + padding)
    const tooltipHeight = 400;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Determine placement: prefer below, but use above if not enough space
    const placement: 'above' | 'below' = spaceBelow >= tooltipHeight ? 'below' : 
                                          spaceAbove >= tooltipHeight ? 'above' : 
                                          spaceBelow >= spaceAbove ? 'below' : 'above';

    // Add a slight delay before showing tooltip for smooth transition
    citationShowTimeoutRef.current = window.setTimeout(() => {
      setOpenCitation({
        source,
        position: {
          x: rect.left,
          y: placement === 'below' 
            ? rect.bottom + 8  // Position below citation with 8px gap
            : rect.top - 8,    // Position above citation with 8px gap (will be used as bottom offset)
        },
        placement,
      });
      citationShowTimeoutRef.current = null;
    }, 150); // 150ms delay before showing (reduced for better responsiveness)
  };

  const handleCitationLeave = () => {
    // Clear show timeout if leaving before tooltip appears
    if (citationShowTimeoutRef.current) {
      clearTimeout(citationShowTimeoutRef.current);
      citationShowTimeoutRef.current = null;
    }

    // Add a delay before closing to allow moving to tooltip
    citationTimeoutRef.current = window.setTimeout(() => {
      setOpenCitation(null);
    }, 200);
  };

  const handleTooltipEnter = () => {
    // Clear timeout if hovering over tooltip
    if (citationTimeoutRef.current) {
      clearTimeout(citationTimeoutRef.current);
    }
  };

  const handleTooltipLeave = () => {
    // Close immediately when leaving tooltip
    setOpenCitation(null);
  };

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

  // Get sources from conversation
  const sources = conversation?.sourceIds.map((sourceId, index) => ({
    id: sourceId,
    name: conversation.sourceNames?.[index] || `Source ${index + 1}`,
    type: conversation.sourceTypes?.[index] || 'pdf', // Default to 'pdf' if type not available
  })) || [];

  // Show loading state
  if (conversationId && isLoadingConversation) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading conversation...</p>
          </div>
        </div>
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
      <div className="flex-1 flex overflow-hidden justify-between px-4 pt-2 pb-4">
        {/* Left Sidebar - Sources */}
        <div className="flex-[0_0_19.5%] bg-white flex flex-col border border-gray-100 rounded-xl">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-600">Sources</h2>
            <button
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                aria-label="Collapse sources panel"
                title="Collapse Sources"
              >
                <PanelLeft className="w-4 h-4 text-gray-500" />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {sources.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-gray-400 opacity-50" />
                  <p className="text-sm font-medium">No sources yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload documents or add URLs to get started</p>
                </div>
              ) : (
                sources.map((source) => (
                  <div
                    key={source.id}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all duration-200"
                  >
                    <div className="shrink-0">
                      {source.type === 'url' ? (
                        <div className="w-10 h-10 rounded-lg  flex items-center justify-center">
                          <Globe className="w-5 h-5 " />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg  flex items-center justify-center">
                          <FileText className="w-5 h-5 " />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-gray-700 transition-colors">
                        {source.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
                        {source.type === 'url' ? 'Web Page' : source.type.toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center - Chat Interface */}
        <div className="flex-[0_0_49.5%] flex flex-col bg-white border border-gray-100 rounded-xl">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex flex-row items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-600">
              {conversation?.title || 'New Classroom'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ minHeight: 0, maxHeight: '100%' }}>
            {messages.length === 0 && (!conversationId || !isLoading(conversationId)) ? (
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
                    <div className={`max-w-3xl ${msg.role === 'user' ? 'w-auto' : 'w-full'}`} style={{ maxWidth: '100%', minWidth: 0, overflow: 'hidden' }}>
                      {msg.role === 'user' ? (
                        <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl">
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      ) : (
                        <div className="space-y-3" style={{ maxWidth: '100%', overflow: 'hidden', minWidth: 0 }}>
                          <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed whitespace-pre-wrap" style={{ maxWidth: '100%', overflowWrap: 'break-word', overflow: 'hidden', minWidth: 0 }}>
                            {(() => {
                              // Parse citations first
                              const parts = parseCitations(msg.content, msg.sources);

                              // Convert **text** to bold
                              const formatBold = (text: string) => {
                                return text.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
                              };

                              // Convert markdown headings to HTML headings
                              const formatHeadings = (text: string) => {
                                text = text.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
                                text = text.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
                                text = text.replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
                                return text;
                              };

                              // Group consecutive text parts and render with citations inline
                              const renderParts = (): React.ReactElement[] => {
                                const elements: React.ReactElement[] = [];
                                let currentTextGroup: string[] = [];
                                let currentTextIndices: number[] = [];

                                const flushTextGroup = () => {
                                  if (currentTextGroup.length > 0) {
                                    let combinedText = currentTextGroup.join('');
                                    
                                    // Step 1: Protect LaTeX expressions by replacing them with placeholders
                                    const latexPlaceholders: string[] = [];
                                    let placeholderIndex = 0;
                                    
                                    // Match all LaTeX expressions (inline $...$, block $$...$$, \[...\], \(...\))
                                    const latexRegex = /\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)|\\\(([^)]+?)\\\)/g;
                                    
                                    combinedText = combinedText.replace(latexRegex, (match) => {
                                      // Remove any markdown formatting around the LaTeX
                                      let cleaned = match;
                                      // Remove leading/trailing underscores, asterisks, or combinations
                                      cleaned = cleaned.replace(/^[*_]+/, '').replace(/[*_]+$/, '');
                                      
                                      const placeholder = `__LATEX_PLACEHOLDER_${placeholderIndex}__`;
                                      latexPlaceholders.push(cleaned);
                                      placeholderIndex++;
                                      return placeholder;
                                    });
                                    
                                    // Step 2: Now process markdown on text without LaTeX
                                    const withHeadings = formatHeadings(combinedText);
                                    const withBold = formatBold(withHeadings);
                                    
                                    // Step 3: Restore LaTeX placeholders and process LaTeX
                                    let processedText = withBold;
                                    latexPlaceholders.forEach((latex, idx) => {
                                      const placeholder = `__LATEX_PLACEHOLDER_${idx}__`;
                                      processedText = processedText.replace(placeholder, latex);
                                    });
                                    
                                    // Step 4: Check if we have LaTeX and render accordingly
                                    const hasLatex = latexPlaceholders.length > 0;
                                    
                                    if (hasLatex) {
                                      // Process LaTeX on the restored text
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
                                          // LaTeX elements - render as-is
                                          elements.push(<span key={`text-group-${currentTextIndices[0]}-latex-${idx}`}>{lp}</span>);
                                        }
                                      });
                                    } else {
                                      // No LaTeX - just render the processed markdown
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
                                    // Render citation as rounded box with smooth hover
                                    elements.push(
                                      <span
                                        key={`citation-${partIdx}`}
                                        onMouseEnter={(e) => handleCitationHover(e, part.source!)}
                                        onMouseLeave={handleCitationLeave}
                                        className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[11px] font-medium text-blue-700 bg-blue-100 rounded border border-blue-200 hover:bg-blue-200 transition-all duration-200 cursor-pointer"
                                        style={{ 
                                          display: 'inline-flex', 
                                          verticalAlign: 'baseline',
                                          minWidth: '20px',
                                          height: '18px'
                                        }}
                                        title={`Hover to view source: ${part.source.sourceName}`}
                                      >
                                        {part.citationNumber}
                                      </span>
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
                            })()}
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
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

                {/* Loading indicator - shows when loading and not streaming */}
                {conversationId && isLoading(conversationId) && (
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
                        <p className="text-sm font-medium text-gray-700 italic">{getLoadingMessage(conversationId)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Invisible element at the bottom to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className=" pb-4 px-4 pt-1">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-1 border border-gray-200 focus-within:border-blue-500 transition-colors">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Start typing..."
                  disabled={!conversationId}
                  className="flex-1 bg-transparent px-3 py-2 text-gray-900 placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={1}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || !conversationId}
                  className="p-2 bg-gray-900 text-white rounded-full flex align-middle align-self-center items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Studio */}
        <div className="flex-[0_0_29.5%] bg-white flex flex-col border border-gray-100 rounded-xl">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-600">Studio</h2>
            <button
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                aria-label="Collapse studio panel"
                title="Collapse Studio"
              >
                <PanelRight className="w-4 h-4 text-gray-500" />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {studioOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer relative"
                  >
                    <Icon className="w-6 h-6 text-gray-700 mb-2" />
                    <span className="text-xs font-medium text-gray-900 text-center">{option.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent Activity</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <ClipboardList className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Photosynthesis Quiz</p>
                    <p className="text-gray-600">1 source • 1d ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Citation Tooltip */}
      {openCitation && (
        <div
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
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

/**
 * Chat Page
 * 3-column layout: Sources (left) | Chat (center) | Studio (right)
 */

import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '../components/Navbar';
import { DocumentUploadModal } from '../components/chat/DocumentUploadModal';
import { FileText, Send, Sparkles, BookOpen, ClipboardList, BarChart } from 'lucide-react';
import { 
  getConversation, 
  sendMessage as sendMessageAPI, 
  startConversation 
} from '../lib/api';
import type { DocumentMetadata, Message, Conversation } from '@shared/types';

export function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [uploadInProgress, setUploadInProgress] = useState(false);

  // Determine if modal should be shown
  const isNew = searchParams.get('new') === 'true';
  const showUploadModal = !conversationId && (isNew || true); // Show modal if no conversation ID

  // Fetch conversation if conversationId exists
  const { data: conversationData, isLoading: isLoadingConversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversation(conversationId!),
    enabled: !!conversationId,
  });

  const conversation: Conversation | null = conversationData?.conversation || null;
  // Use conversation messages if available, otherwise use local messages (for optimistic updates)
  const baseMessages = conversationData?.messages || [];
  const messages: Message[] = baseMessages.length > 0 ? baseMessages : localMessages;

  const studioOptions = [
    { id: 'audio', name: 'Audio Overview', icon: Sparkles },
    { id: 'video', name: 'Video Overview', icon: Sparkles },
    { id: 'mindmap', name: 'Mind Map', icon: BarChart },
    { id: 'reports', name: 'Reports', icon: BookOpen },
    { id: 'flashcards', name: 'Flashcards', icon: FileText },
    { id: 'quiz', name: 'Quiz', icon: ClipboardList },
  ];

  const handleUploadSuccess = async (document: DocumentMetadata) => {
    if (!document.id) return;

    setUploadInProgress(true);

    try {
      // Start conversation with uploaded document (no initial message)
      const response = await startConversation({
        documentIds: [document.id],
      });

      if (response.success && response.conversation) {
        // Clear any local messages - conversation starts empty
        setLocalMessages([]);
        
        // Navigate to conversation URL (this will cause re-render and modal will close automatically)
        navigate(`/chat/${response.conversation.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setUploadInProgress(false);
      // Keep modal open on error - user can retry
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !conversationId) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content: message.trim(),
      createdAt: new Date().toISOString(),
    };

    // Optimistically add user message
    setLocalMessages((prev) => [...prev, userMessage]);
    setMessage('');

    try {
      const response = await sendMessageAPI(conversationId, message.trim());
      
      if (response.success && response.message) {
        // Replace optimistic message with real response
        setLocalMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== userMessage.id);
          return [...withoutTemp, userMessage, response.message];
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setLocalMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    }
  };

  // Get sources from conversation
  const sources = conversation?.documentIds.map((docId, index) => ({
    id: docId,
    name: conversation.documentNames?.[index] || `Document ${index + 1}`,
    selected: true,
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
    <div className="h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          // Only navigate back if user manually closes modal (not after successful upload)
          // After successful upload, handleUploadSuccess will navigate to conversation
          if (!conversationId && !uploadInProgress) {
            navigate('/dashboard');
          }
        }}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Sources */}
        <div className="flex-[0_0_15%] bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sources</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sources.length > 0 && (
              <button className="w-full text-left px-3 py-2 mb-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                Select all sources
              </button>
            )}
            
            <div className="space-y-2">
              {sources.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No sources yet</p>
                </div>
              ) : (
                sources.map((source) => (
                  <div
                    key={source.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      source.selected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-4 h-4 mt-0.5">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        source.selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {source.selected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate">{source.name}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Try Deep Research for sources
              </p>
            </div>
          </div>
        </div>

        {/* Center - Chat Interface */}
        <div className="flex-[0_0_55%] flex flex-col bg-white">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">
              {conversation?.title || 'New Classroom'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {sources.length} source{sources.length !== 1 ? 's' : ''} • {conversationId ? 'Active now' : 'Ready to start'}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Start a conversation</p>
                  <p className="text-sm mt-2">Ask questions about your document</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id || `msg-${msg.createdAt}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl ${msg.role === 'user' ? 'w-auto' : 'w-full'}`}>
                    {msg.role === 'user' ? (
                      <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl">
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-900 leading-relaxed">{msg.content}</p>
                        </div>
                        {msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <FileText className="w-3 h-3" />
                            <span>Sources: {msg.sources.map(s => s.documentName).join(', ')}</span>
                          </div>
                        )}
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
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end gap-2 bg-gray-50 rounded-2xl p-2 border border-gray-200 focus-within:border-blue-500 transition-colors">
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
                  className="p-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {sources.length} source{sources.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Studio */}
        <div className="flex-[0_0_30%] bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Studio</h2>
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
    </div>
  );
}

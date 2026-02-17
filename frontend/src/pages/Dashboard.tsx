/**
 * Dashboard Page
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, MoreVertical, X, BookOpen } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { getAllConversations, updateConversation, deleteConversation } from '../lib/api';
import { useChatStore } from '../store';

export function Dashboard() {
  const navigate = useNavigate();
  const { setConversations, conversations: storeConversations, setConversation, removeConversation } = useChatStore();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch conversations (classrooms)
  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getAllConversations,
  });

  // Store conversations in Zustand when they're fetched
  useEffect(() => {
    if (conversationsData?.success && conversationsData.conversations) {
      setConversations(conversationsData.conversations);
    }
  }, [conversationsData, setConversations]);

  // Prioritize store data to prevent flicker, then use fetched data as fallback
  const storeConversationsArray = Array.from(storeConversations.values());
  const rawConversations = storeConversationsArray.length > 0
    ? storeConversationsArray
    : conversationsData?.conversations || [];
  
  // Sort conversations by createdAt (most recent first)
  const conversations = [...rawConversations].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Descending order (newest first)
  });
  
  // Show loading only if we don't have store data AND we're still fetching
  const showLoading = isLoading && storeConversationsArray.length === 0;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking inside a menu dropdown or dialog
      if (target.closest('[data-menu-dropdown]') || target.closest('[role="dialog"]')) {
        return;
      }
      
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      // Use a small delay to allow button clicks to register first
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  // Handle menu button click
  const handleMenuClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation(); // Prevent card click
    e.preventDefault();
    setOpenMenuId(openMenuId === conversationId ? null : conversationId);
  };

  // Handle edit conversation name
  const handleEditClick = (conversationId: string) => {
    setOpenMenuId(null);
    // Small delay to ensure menu closes first
    setTimeout(() => {
      const conversation = storeConversations.get(conversationId) || conversations.find(c => c.id === conversationId);
      if (conversation) {
        setEditTitle(conversation.title || '');
        setEditingConversationId(conversationId);
      }
    }, 0);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingConversationId || !editTitle.trim()) {
      setUpdateError('Title cannot be empty');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await updateConversation(editingConversationId, editTitle.trim());
      
      if (response.success && response.conversation) {
        setConversation(response.conversation);
        setEditingConversationId(null);
        setEditTitle('');
      } else {
        setUpdateError(response.error || 'Failed to update conversation title');
      }
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Failed to update conversation title');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingConversationId(null);
    setEditTitle('');
    setUpdateError(null);
  };

  // Handle delete conversation
  const handleDeleteClick = (conversationId: string) => {
    setOpenMenuId(null);
    setUpdateError(null); // Clear any previous errors
    // Small delay to ensure menu closes first
    setTimeout(() => {
      setDeletingConversationId(conversationId);
    }, 0);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingConversationId) return;

    setIsDeleting(true);
    try {
      const response = await deleteConversation(deletingConversationId);
      
      if (response.success) {
        removeConversation(deletingConversationId);
        setDeletingConversationId(null);
      } else {
        setUpdateError(response.error || 'Failed to delete conversation');
      }
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Failed to delete conversation');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setDeletingConversationId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="px-8 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sansation-regular">My Classrooms</h1>
          <button
            onClick={() => navigate('/chat')}
            className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create new
          </button>
        </div>

        {/* Recent Classrooms */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 sansation-regular">Recent classrooms</h2>
            <button className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
              See all →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create New Card */}
            <div
              onClick={() => navigate('/chat')}
              className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all min-h-[200px]"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-base font-medium text-gray-900">Create new classroom</p>
            </div>

            {/* Loading Skeletons */}
            {showLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="bg-white rounded-2xl p-6 border border-gray-200 min-h-[280px] flex flex-col animate-pulse"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded mb-2 flex-1"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : (
              /* Recent Conversations */
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="group bg-gray-100 rounded-2xl p-5 cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 min-h-[240px] flex flex-col relative hover:-rotate-1"
                  onClick={() => navigate(`/chat/${conv.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-8 h-8 flex items-center justify-center text-blue-900">
                      <BookOpen className="w-26 h-26" />
                    </div>
                    <div className="relative" ref={menuRef}>
                      <button
                        onClick={(e) => handleMenuClick(e, conv.id)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-all opacity-50 hover:opacity-100 cursor-pointer"
                        type="button"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                      {openMenuId === conv.id && (
                        <div 
                          className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[180px]"
                          data-menu-dropdown
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleEditClick(conv.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDeleteClick(conv.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-4 pt-14 flex-1 leading-tight sansation-regular">
                    {conv.title || 'Untitled Classroom'}
                  </h3>
                  <div className="mt-auto">
                    <p className="text-gray-400 text-sm">
                      {new Date(conv.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })} • {conv.sourceNames && conv.sourceNames.length > 0 
                        ? `${conv.sourceNames.length} source${conv.sourceNames.length > 1 ? 's' : ''}`
                        : '0 sources'
                      }
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      {deletingConversationId && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancelDelete}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 sansation-regular">Delete Conversation</h2>
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>

              {updateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{updateError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Conversation Name Dialog */}
      {editingConversationId && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancelEdit}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 sansation-regular">Edit Conversation Name</h2>
              <button
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-900 mb-2">
                  Conversation Name
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter conversation name"
                  disabled={isUpdating}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUpdating && editTitle.trim()) {
                      handleSaveEdit();
                    }
                    if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  autoFocus
                />
              </div>

              {updateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{updateError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isUpdating || !editTitle.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

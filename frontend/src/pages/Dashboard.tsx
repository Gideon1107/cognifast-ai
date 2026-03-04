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
import { useInView } from '../hooks/useInView';

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

  const [gridRef, gridVisible] = useInView({ threshold: 0.05 });

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
    return dateB - dateA;
  });

  // Show loading only if we don't have store data AND we're still fetching
  const showLoading = isLoading && storeConversationsArray.length === 0;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-menu-dropdown]') || target.closest('[role="dialog"]')) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const handleMenuClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setOpenMenuId(openMenuId === conversationId ? null : conversationId);
  };

  const handleEditClick = (conversationId: string) => {
    setOpenMenuId(null);
    setTimeout(() => {
      const conversation = storeConversations.get(conversationId) || conversations.find(c => c.id === conversationId);
      if (conversation) {
        setEditTitle(conversation.title || '');
        setEditingConversationId(conversationId);
      }
    }, 0);
  };

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

  const handleCancelEdit = () => {
    setEditingConversationId(null);
    setEditTitle('');
    setUpdateError(null);
  };

  const handleDeleteClick = (conversationId: string) => {
    setOpenMenuId(null);
    setUpdateError(null);
    setTimeout(() => {
      setDeletingConversationId(conversationId);
    }, 0);
  };

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

  const handleCancelDelete = () => {
    setDeletingConversationId(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 overflow-x-hidden">
      {/* Subtle background orbs */}
      <div
        aria-hidden
        className="orb animate-pulse-orb fixed w-[500px] h-[500px] -top-32 -right-32 opacity-[0.12] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.6) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="orb animate-pulse-orb fixed w-[400px] h-[400px] bottom-0 -left-24 opacity-[0.10] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)',
          animationDelay: '3s',
        }}
      />

      <Navbar />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="relative z-10 px-8 py-10 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10 animate-fade-up">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white sansation-regular">
              My Classrooms
            </h1>
            {!showLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {conversations.length} classroom{conversations.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="inline-flex items-center gap-2 bg-linear-to-r from-emerald-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 hover:scale-[1.02] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Plus className="w-5 h-5" />
            New Classroom
          </button>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-6 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Recent classrooms</h2>
          <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            See all →
          </button>
        </div>

        {/* Grid */}
        <div
          ref={gridRef as React.Ref<HTMLDivElement>}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {/* Create New Card */}
          <div
            onClick={() => navigate('/chat')}
            className={`group relative rounded-2xl p-px cursor-pointer bg-linear-to-br from-emerald-500/25 via-blue-500/15 to-purple-500/25 hover:from-emerald-500/55 hover:via-blue-500/40 hover:to-purple-500/45 transition-all duration-300 animate-fade-up ${gridVisible ? '' : 'opacity-0'}`}
            style={{ animationDelay: '0ms' }}
          >
            <div className="glass rounded-[14px] flex flex-col items-center justify-center min-h-[220px] gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-emerald-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <p className="text-base font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                Create new classroom
              </p>
            </div>
          </div>

          {/* Loading Skeletons */}
          {showLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="glass rounded-2xl p-5 min-h-[220px] flex flex-col gap-4 animate-pulse"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-xl" />
                  <div className="w-8 h-8 bg-gray-200 dark:bg-zinc-700 rounded-lg" />
                </div>
                <div className="flex-1 space-y-2 pt-4">
                  <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2" />
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-gray-200 dark:bg-zinc-700 rounded-full" />
                  <div className="h-5 w-20 bg-gray-200 dark:bg-zinc-700 rounded-full" />
                </div>
              </div>
            ))
          ) : (
            conversations.map((conv, i) => (
              <div
                key={conv.id}
                className={`relative group glass glow-border rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all duration-300 min-h-[220px] flex flex-col animate-fade-up ${gridVisible ? '' : 'opacity-0'}`}
                style={{ animationDelay: `${(i + 1) * 60}ms` }}
                onClick={() => navigate(`/chat/${conv.id}`)}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/15 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={(e) => handleMenuClick(e, conv.id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700/60 rounded-lg transition-all opacity-40 group-hover:opacity-100 cursor-pointer"
                      type="button"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>

                    {openMenuId === conv.id && (
                      <div
                        className="absolute right-0 top-9 glass rounded-xl shadow-xl py-1.5 z-20 min-w-[160px] border border-gray-200/60 dark:border-zinc-700/60"
                        data-menu-dropdown
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleEditClick(conv.id); }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteClick(conv.id); }}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex-1 leading-snug sansation-regular line-clamp-3">
                  {conv.title || 'Untitled Classroom'}
                </h3>

                {/* Footer */}
                <div className="mt-4 space-y-2">
                  {conv.sourceNames && conv.sourceNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {conv.sourceNames.slice(0, 2).map((name) => (
                        <span
                          key={name}
                          className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 rounded-full px-2.5 py-0.5 truncate max-w-[140px]"
                        >
                          {name}
                        </span>
                      ))}
                      {conv.sourceNames.length > 2 && (
                        <span className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-500 rounded-full px-2.5 py-0.5">
                          +{conv.sourceNames.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(conv.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    · {conv.sourceNames && conv.sourceNames.length > 0
                      ? `${conv.sourceNames.length} source${conv.sourceNames.length > 1 ? 's' : ''}`
                      : '0 sources'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      {deletingConversationId && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancelDelete} />
          <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white sansation-regular">Delete Conversation</h2>
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
              {updateError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{updateError}</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCancelEdit} />
          <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white sansation-regular">Edit Conversation Name</h2>
              <button
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Conversation Name
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter conversation name"
                  disabled={isUpdating}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 disabled:dark:bg-zinc-700 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUpdating && editTitle.trim()) handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  autoFocus
                />
              </div>
              {updateError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{updateError}</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
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

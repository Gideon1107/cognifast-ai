/**
 * Dashboard Page
 * NotebookLM-style home with featured and recent classrooms
 */

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, MoreVertical } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { getAllConversations } from '../lib/api';

export function Dashboard() {
  const navigate = useNavigate();

  // Fetch conversations (classrooms)
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: getAllConversations,
  });

  const conversations = conversationsData?.conversations || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="px-8 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Classrooms</h1>
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
            <h2 className="text-2xl font-bold text-gray-900">Recent classrooms</h2>
            <button className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
              See all →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create New Card */}
            <div
              onClick={() => navigate('/chat')}
              className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all min-h-[280px]"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">Create new classroom</p>
            </div>

            {/* Recent Conversations */}
            {conversations.slice(0, 5).map((conv) => (
              <div
                key={conv.id}
                className="group bg-white rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all border border-gray-200 hover:border-gray-300 min-h-[280px] flex flex-col"
                onClick={() => navigate(`/chat/${conv.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                    📚
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded-lg transition-all">
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex-1">
                  {conv.title || 'Untitled Classroom'}
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm">
                    {conv.documentNames && conv.documentNames.length > 0 
                      ? `${conv.documentNames.length} source${conv.documentNames.length > 1 ? 's' : ''}`
                      : 'No sources'
                    }
                  </p>
                  <p className="text-gray-500 text-xs">
                    {new Date(conv.updatedAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}


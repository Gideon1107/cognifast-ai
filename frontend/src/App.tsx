/**
 * Main App Component
 * Sets up routing and React Query provider
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { Chat } from './pages/Chat';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:conversationId" element={<Chat />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

# Cognifast AI - Frontend

**React-based frontend for Cognifast AI - An Adaptive Learning Platform**

Modern, responsive frontend built with React, TypeScript, and Tailwind CSS, featuring real-time WebSocket streaming for AI chat interactions.

## 🎯 Overview

The frontend provides an intuitive user interface for:
- Document upload and management
- Real-time AI chat with token-by-token streaming
- Conversation management
- Dashboard for viewing all conversations

## ✨ Features

### 📄 Document Management
- **Drag & Drop Upload**: Easy document upload interface
- **File Type Support**: PDF, DOC, DOCX, TXT
- **Upload Progress**: Real-time upload progress indicators
- **Document List**: View all uploaded documents

### 💬 Real-Time AI Chat
- **Token-by-Token Streaming**: See AI responses stream in real-time as they're generated
- **Loading States**: Visual feedback during AI processing ("Looking for cues...", "Reviewing document...", "Generating response...")
- **Source Citations**: See which documents were used to answer your questions
- **Message History**: Full conversation history with proper formatting
- **Auto-Scroll**: Automatically scrolls to latest messages
- **Markdown Support**: Formatted responses with bold text, numbered lists, and proper paragraph breaks

### 🎨 Modern UI/UX
- **NotebookLM-Inspired Design**: Clean, modern interface inspired by Google's NotebookLM
- **Responsive Layout**: Works seamlessly on desktop and mobile
- **3-Column Chat Layout**: Sources (left) | Chat (center) | Studio (right)
- **Gradient Loading Indicators**: Beautiful animated loading states
- **Smooth Animations**: Polished user experience

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Backend API** running (see main README for backend setup)

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_WS_URL=http://localhost:3000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173 (Vite default port)

## 🛠️ Tech Stack

### Core
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework

### State Management
- **Zustand** - Lightweight state management for global chat state
- **React Query (@tanstack/react-query)** - Server state management and caching

### Real-Time Communication
- **Socket.io Client** - WebSocket client for real-time streaming
- **Token-by-Token Streaming** - Real-time AI response streaming

### Routing & Navigation
- **React Router DOM v7** - Client-side routing

### HTTP Client
- **Axios** - HTTP client for API requests

### UI Components
- **Lucide React** - Icon library
- **Custom Components** - Reusable UI components

### Type Safety
- **Shared Types** - Types shared with backend via `@shared/types`
- **TypeScript Path Aliases** - Clean imports with `@/` and `@shared/`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── chat/            # Chat-specific components
│   │   │   └── DocumentUploadModal.tsx
│   │   ├── landing/          # Landing page components
│   │   │   ├── FeatureCard.tsx
│   │   │   └── HeroSection.tsx
│   │   └── Navbar.tsx        # Navigation component
│   │
│   ├── hooks/                # Custom React hooks
│   │   └── useWebSocket.ts   # WebSocket connection and streaming hook
│   │
│   ├── lib/                  # Library/utility code
│   │   ├── api.ts            # API client (Axios)
│   │   ├── queryClient.ts    # React Query configuration
│   │   └── websocket.ts      # Socket.io client setup
│   │
│   ├── pages/                # Page components
│   │   ├── Chat.tsx          # Main chat interface
│   │   ├── Dashboard.tsx     # Dashboard/home page
│   │   ├── Documents.tsx    # Documents management page
│   │   └── Landing.tsx      # Landing page
│   │
│   ├── store/                # Zustand state management
│   │   ├── index.ts          # Store exports
│   │   ├── types.ts          # Store type definitions
│   │   └── useChatStore.ts   # Chat store implementation
│   │
│   ├── utils/                # Utility functions
│   │   └── logger.ts         # Frontend logging utility
│   │
│   ├── App.tsx               # Main app component with routing
│   ├── main.tsx              # App entry point
│   └── index.css             # Global styles and Tailwind imports
│
├── public/                   # Static assets
├── package.json
├── tsconfig.json             # TypeScript configuration
├── tsconfig.app.json         # App-specific TS config
├── vite.config.ts            # Vite configuration
└── README.md                 # This file
```

## 🔌 WebSocket Streaming

### How It Works

The frontend uses WebSocket (Socket.io) for real-time, token-by-token streaming of AI responses:

1. **Connection**: Automatically connects when a conversation is loaded
2. **Room Management**: Joins conversation-specific rooms for targeted messaging
3. **Token Streaming**: Receives tokens as they're generated by OpenAI
4. **State Management**: Zustand store manages streaming state reactively

### WebSocket Events

**Client → Server:**
- `join_conversation` - Join a conversation room
- `send_message` - Send a message and trigger AI response
- `leave_conversation` - Leave a conversation room

**Server → Client:**
- `joined_conversation` - Confirmation of room join
- `message_start` - AI processing started
- `loading_stage` - Loading state updates ("Looking for cues...", etc.)
- `message_token` - Individual tokens as they're generated
- `message_end` - Streaming complete with final message
- `error` - Error occurred

### Usage Example

```typescript
// In a component
const { sendMessage } = useWebSocket({
  conversationId: conversationId || null,
  enabled: !!conversationId,
});

// Send a message
sendMessage("What is photosynthesis?");
// Tokens will stream in automatically via WebSocket
```

## 📦 State Management

### Zustand Store (`useChatStore`)

Global state for chat functionality:

**State:**
- `conversations` - Map of all conversations
- `messages` - Map of messages by conversation ID
- `streamingContent` - Active streaming content
- `loadingState` - Loading indicators
- `currentConversationId` - Currently active conversation

**Actions:**
- `setConversation()` - Add/update conversation
- `addMessage()` - Add message to conversation
- `appendStreamingContent()` - Append token to streaming content
- `finalizeStreamingMessage()` - Convert streaming to permanent message
- `setLoadingState()` - Update loading indicator

### React Query

Used for server state:
- Conversation fetching
- Document fetching
- Automatic caching and refetching

## 🎨 Styling

### Tailwind CSS v4

- **Utility-First**: Rapid UI development with utility classes
- **Custom Configuration**: Extended with custom utilities
- **Responsive Design**: Mobile-first responsive breakpoints

### Custom Styles

- **Gradient Text**: `.text-gradient` utility class
- **Font Smoothing**: Optimized text rendering
- **Custom Components**: Styled components matching NotebookLM aesthetic

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Environment Variables

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

### TypeScript Path Aliases

```typescript
// Shared types
import type { Message, Conversation } from '@shared/types';

// Local imports
import { useChatStore } from '@/store';
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm test -- --watch
```

## 📱 Features in Detail

### Chat Interface

**3-Column Layout:**
- **Sources (15%)**: Shows documents attached to conversation
- **Chat (55%)**: Main conversation interface
- **Studio (30%)**: Future features (quiz, summaries, etc.)

**Message Display:**
- User messages: Right-aligned, dark background
- AI messages: Left-aligned, formatted with markdown
- Source citations: Shows which documents were referenced
- Streaming indicator: Shows when AI is generating response

### Document Upload

**Modal Interface:**
- Drag & drop support
- File picker fallback
- Progress indicator
- Success/error states
- Auto-navigation to chat after upload

### Loading States

**Visual Feedback:**
- Gradient spinner with animated rotation
- Stage-specific messages:
  - "Looking for cues..." (Router agent)
  - "Reviewing document..." (Retrieval agent)
  - "Generating response..." (Generator agent)
- Smooth transitions between states

## 🔐 Authentication

*Note: Authentication is planned for future implementation*

Currently, the app works without authentication. Future versions will include:
- User authentication
- Session management
- Protected routes

## 🚧 Roadmap

### Planned Features
- [ ] User authentication
- [ ] Quiz generation UI
- [ ] Document summarization UI
- [ ] Performance analytics
- [ ] Export conversations
- [ ] Dark mode
- [ ] Mobile app

## 📝 Code Style

### Component Structure
```typescript
// Functional components with TypeScript
export function ComponentName() {
  // Hooks
  const state = useStore();
  
  // Event handlers
  const handleAction = () => { ... };
  
  // Render
  return <div>...</div>;
}
```

### State Management Pattern
```typescript
// Use Zustand for global state
const { data, action } = useChatStore();

// Use React Query for server state
const { data, isLoading } = useQuery({ ... });
```

## 🐛 Troubleshooting

### WebSocket Connection Issues
- Check backend is running
- Verify `VITE_WS_URL` is correct
- Check browser console for connection errors

### API Errors
- Verify `VITE_API_BASE_URL` is correct
- Check backend logs for errors
- Ensure CORS is configured correctly

### Build Issues
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## 📄 License

MIT License

---

**Built with ❤️ for faster learning**

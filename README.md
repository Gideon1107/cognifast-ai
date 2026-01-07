# Cognifast AI

**An Adaptive Learning Platform for Faster Learning and Knowledge Evaluation**

Cognifast is an intelligent learning platform that helps users learn faster and evaluate their knowledge through AI-powered document analysis, interactive chat, and automated quiz generation.


https://github.com/user-attachments/assets/8f046bff-4917-4d31-80a5-9722d1843294


## 🎯 Overview

Cognifast transforms traditional learning by allowing users to upload documents and interact with an AI system that:
- Analyzes and understands document content
- Provides intelligent summaries and key insights
- Enables interactive Q&A about document topics
- Generates personalized quizzes to test knowledge
- Automatically scores and provides feedback on user performance

## ✨ Features

### 📄 Document Management
- **Upload Documents**: Support for various document formats (PDF, DOC, DOCX, TXT)
- **AI-Powered Processing**: Automatic document analysis and content extraction
- **Document Summarization**: Get concise summaries and key points from uploaded documents

### 💬 Interactive AI Chat
- **Context-Aware Conversations**: Chat with AI about topics from your uploaded documents
- **Intelligent Responses**: AI understands document context and provides relevant answers
- **Topic Exploration**: Ask questions, seek clarifications, and dive deeper into document content

### 📝 Quiz Generation & Assessment
- **Automated Quiz Creation**: AI generates quizzes based on document content
- **Multiple Question Types**: Multiple choice, true/false, and short answer questions
- **Adaptive Difficulty**: Choose difficulty levels (easy, medium, hard)
- **Automatic Scoring**: Instant feedback with detailed explanations
- **Performance Analytics**: Track your learning progress and knowledge gaps

### 🎓 Adaptive Learning
- **Personalized Experience**: Learning adapts to your needs and progress
- **Knowledge Evaluation**: Comprehensive assessment of your understanding
- **Learning Insights**: Identify areas that need more attention


## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL**  - for database
- **Supabase-PgVector** - (for document embeddings)
- **AI API Key** - OpenAI or Anthropic API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Cognifast-ai
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Database
   SUPABASE_URL=your-supabase-url
   SUPABASE_PASSWORD=your-supabase-password
   SUPABASE_KEY=your-supabase-service-key

   
   # AI Service
   OPENAI_PROJECT_ID=your-openai-project-id
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Start the development servers**
   ```bash
   # From root directory
   npm run dev
   ```
   
   Or run separately:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## 📖 Usage

### 1. Getting Started
- Visit the **Landing Page** to learn about Cognifast AI
- Click **"Try Cognifast AI"** to navigate to the Dashboard
- Or click **"Get Started"** in the navigation bar

### 2. Dashboard - My Classrooms
- View all your **classrooms** (conversations) in one place
- See recent classrooms with document information
- Click on any classroom card to open it in the Chat interface
- Click **"Create new"** button to start a new classroom

### 3. Create a New Classroom
- Click **"Create new"** from the Dashboard
- You'll be taken to the Chat interface with an upload modal
- **Upload a document**:
  - Drag and drop a file, or click to browse
  - Supported formats: PDF, DOCX, TXT (max 10MB)
  - Wait for upload and processing to complete
- Once uploaded, the modal closes and you're in the Chat UI with your document

### 4. Chat Interface
The Chat interface features a **3-column layout**:

- **Sources (Left - 15%)**: 
  - Displays the document(s) associated with the current classroom
  - Shows document names and metadata

- **Chat (Center - 55%)**:
  - Main conversation area
  - Type your questions in the input field
  - Send messages to get AI responses
  - **Real-time streaming**: Responses appear token-by-token as the AI generates them
  - **Loading states**: See progress messages like "Looking for cues...", "Reviewing document...", "Generating response..."
  - Messages are automatically saved and persist across page reloads

- **Studio (Right - 30%)**:
  - Reserved for future features (quizzes, analytics, etc.)
  - Currently displays placeholder content

### 5. Chatting with AI
- Type your question in the chat input
- Press **Enter** or click **Send** to submit
- The AI will:
  1. **Route** your query (determine if document retrieval is needed)
  2. **Retrieve** relevant document chunks (if needed)
  3. **Generate** a response with real-time token streaming
  4. **Evaluate** response quality (may retry if quality is poor)
- Responses are **context-aware** and grounded in your uploaded documents
- Bold text and lists in AI responses are automatically formatted

### 6. Documents Page
- Navigate to **Documents** from the navigation bar
- Document management features coming soon

### 7. Navigation
- Use the **Navbar** to navigate between:
  - **Dashboard**: View all classrooms
  - **Documents**: Manage documents (coming soon)
  - **Chat**: Direct access to chat interface

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety  
- **Supabase** - Authentication
- **RecursiveCharacterTextSplitter** - Text chunking
- **OpenAIEmbeddings** - Document embeddings
- **Supabase-PostgreSQL** - Database
- **Supabase-PgVector** - Document embeddings similarity search

### Shared
- **TypeScript Types** - Shared type definitions between frontend and backend
- **Path Aliases** - `@shared` for clean imports across the monorepo

### Database
- **ostgreSQL** - Database
- **Redis** - Caching
- **LangChain** - AI/ML framework
- **LangGraph** - Stateful agent orchestration
- **Supabase-pgvector** - Vector Database

### AI/ML
- **OpenAI/Anthropic** - LLM APIs
- **LangChain Agents** - AI agent orchestration
- **LangGraph** - Stateful multi-actor agent workflows




## 🧪 Development

### Running Tests
```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

### Building for Production
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build
```

## 📁 Project Structure

```
Cognifast-ai/
├── backend/                        # Backend API server
│   ├── src/
│   │   ├── agents/                 # LangGraph agents
│   │   │   └── chat/
│   │   │       ├── router.agent.ts      # Routes queries (retrieve/direct/clarify)
│   │   │       ├── retrieval.agent.ts   # Retrieves relevant document chunks
│   │   │       ├── generator.agent.ts   # Generates AI responses (streaming)
│   │   │       └── quality.agent.ts      # Evaluates response quality
│   │   ├── controllers/            # Request handlers
│   │   │   ├── chat.controller.ts
│   │   │   └── document.controller.ts
│   │   ├── db/                     # Database configuration
│   │   │   ├── dbConnection.ts
│   │   │   ├── schema.sql          # Database schema
│   │   │   ├── vector_search_function.sql  # Vector search RPC function
│   │   │   └── migrations/         # Database migrations
│   │   ├── graphs/                 # LangGraph state graphs
│   │   │   └── chat.graph.ts       # Chat workflow orchestration
│   │   ├── middleware/             # Express middleware
│   │   │   └── upload.middleware.ts
│   │   ├── routes/                 # API route definitions
│   │   │   ├── chat.routes.ts
│   │   │   └── document.routes.ts
│   │   ├── services/               # Business logic
│   │   │   ├── chat.service.ts           # Conversation management
│   │   │   ├── chat-stream.service.ts    # WebSocket streaming orchestration
│   │   │   ├── document.service.ts      # Document processing
│   │   │   ├── embedding.service.ts     # Embedding generation
│   │   │   ├── retrieval.service.ts     # Vector search
│   │   │   └── storage.service.ts       # File storage
│   │   ├── sockets/                # WebSocket handlers
│   │   │   └── chat.socket.ts      # Socket.io event handlers
│   │   ├── types/                  # Backend-only types (internal)
│   │   │   ├── chat.types.ts
│   │   │   ├── document.types.ts
│   │   │   ├── quiz.types.ts
│   │   │   └── summary.types.ts
│   │   ├── utils/                  # Utility functions
│   │   │   └── logger.ts           # Logging utility
│   │   └── index.ts                # Application entry point
│   ├── dist/                       # Compiled JavaScript (generated)
│   ├── uploads/                    # Temporary file storage
│   ├── package.json
│   ├── tsconfig.json               # TypeScript config with @shared path alias
│   └── README.md                   # Backend documentation
│
├── frontend/                       # React frontend
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── chat/
│   │   │   │   └── DocumentUploadModal.tsx
│   │   │   ├── landing/
│   │   │   │   ├── FeatureCard.tsx
│   │   │   │   └── HeroSection.tsx
│   │   │   └── Navbar.tsx
│   │   ├── hooks/                  # Custom React hooks
│   │   │   └── useWebSocket.ts     # WebSocket connection management
│   │   ├── lib/                    # Library utilities
│   │   │   ├── api.ts              # API client (Axios)
│   │   │   ├── queryClient.ts      # React Query client
│   │   │   └── websocket.ts        # Socket.io client setup
│   │   ├── pages/                  # Page components
│   │   │   ├── Chat.tsx            # Chat interface
│   │   │   ├── Dashboard.tsx       # Dashboard/home page
│   │   │   ├── Documents.tsx        # Documents page
│   │   │   └── Landing.tsx         # Landing page
│   │   ├── store/                  # State management (Zustand)
│   │   │   ├── index.ts            # Store exports
│   │   │   ├── types.ts            # Store type definitions
│   │   │   └── useChatStore.ts     # Chat store implementation
│   │   ├── utils/                  # Utility functions
│   │   │   └── logger.ts           # Frontend logging
│   │   ├── App.tsx                 # Root component
│   │   ├── main.tsx                # Application entry point
│   │   └── index.css               # Global styles
│   ├── public/                     # Static assets
│   ├── package.json
│   ├── tsconfig.json               # TypeScript config with @shared path alias
│   ├── vite.config.ts              # Vite configuration
│   └── README.md                   # Frontend documentation
│
├── shared/                         # Shared types and constants
│   ├── types/
│   │   ├── entities.ts             # Domain models (Message, Conversation, Document)
│   │   ├── api.ts                  # API request/response types
│   │   └── index.ts                # Central export
│   ├── constants/                  # Shared constants
│   ├── package.json
│   └── README.md                   # Documentation for shared types
│
├── ARCHITECTURE_FLOW.md            # Architecture flow diagram
├── .gitignore
└── README.md                       # This file
```

### Type Organization

**Shared Types** (`shared/types/`):
- API contracts (requests/responses)
- Domain entities used by both frontend and backend
- Imported using `@shared/types` in both frontend and backend

**Backend-Only Types** (`backend/src/types/`):
- Internal service layer types (`SendMessageResult`)
- LangGraph state types (`ConversationState`)
- Agent-specific types (`RouterDecision`, `ResponseQuality`)

## 🐳 Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down
```

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for faster learning**


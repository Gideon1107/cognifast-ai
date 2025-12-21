# Cognifast AI

**An Adaptive Learning Platform for Faster Learning and Knowledge Evaluation**

Cognifast is an intelligent learning platform that helps users learn faster and evaluate their knowledge through AI-powered document analysis, interactive chat, and automated quiz generation.

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
   PORT=3001
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
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 📖 Usage

### 1. Upload a Document
- Navigate to the Dashboard
- Click "Upload Document"
- Select a PDF, DOC, DOCX, or TXT file
- Wait for AI processing to complete

### 2. View Document Summary
- Open your uploaded document
- Navigate to the "Summary" tab
- Review AI-generated summary and key points

### 3. Chat with AI
- Open your document conversation
- Go to the "Chat" tab
- Ask questions about the document content
- Get intelligent, context-aware responses

### 4. Generate and Take Quiz
- Open your document
- Navigate to the "Quiz" tab
- Select difficulty level and number of questions
- Click "Generate Quiz"
- Answer the questions
- Submit to get instant feedback and scores

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
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── agents/         # LangGraph agents (Router, Retrieval, Generator, Quality)
│   │   ├── controllers/    # Request handlers
│   │   ├── db/             # Database schema and migrations
│   │   ├── graphs/         # LangGraph StateGraphs
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # Backend-only types (internal)
│   │   └── utils/          # Utilities
│   └── tsconfig.json       # TypeScript config with @shared path alias
│
├── frontend/               # React frontend
│   └── tsconfig.json       # TypeScript config with @shared path alias
│
├── shared/                 # Shared types and constants
│   ├── types/
│   │   ├── entities.ts     # Domain models (Message, Conversation, Document)
│   │   ├── api.ts          # API request/response types
│   │   └── index.ts        # Central export
│   ├── constants/          # Shared constants (to be added)
│   ├── package.json
│   └── README.md           # Documentation for shared types
│
└── README.md               # This file
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


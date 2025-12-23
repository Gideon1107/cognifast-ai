# Cognifast AI - Backend

**Backend API and WebSocket server for Cognifast AI learning platform**

The backend provides RESTful API endpoints for document management and chat functionality, along with real-time WebSocket streaming for AI responses using LangGraph and OpenAI.

## 🎯 Overview

The Cognifast backend is built with Node.js, Express, and TypeScript, providing:

- **Document Management**: Upload, process, and store documents with vector embeddings
- **AI Chat System**: Intelligent document-grounded conversations with streaming responses
- **Real-time Communication**: WebSocket-based token-by-token streaming
- **LangChain**: AI framework for building LLM applications with document processing and embeddings
- **LangGraph Orchestration**: Multi-agent workflow for routing, retrieval, generation, and quality assurance

## ✨ Features

### 📄 Document Management
- Upload documents (PDF, DOC, DOCX, TXT)
- Automatic text extraction and chunking
- Vector embedding generation
- Storage in Supabase with PgVector for semantic search

### 💬 AI Chat System
- **Multi-Agent Architecture**: Router, Retrieval, Generator, and Quality agents
- **Intelligent Routing**: Automatically determines if document retrieval is needed
- **Context-Aware Responses**: Uses retrieved document chunks for grounded answers
- **Quality Assurance**: Automatic response quality evaluation and retry mechanism
- **Streaming Responses**: Real-time token-by-token streaming via WebSocket

### 🔌 Real-time Communication
- Socket.io WebSocket server
- Token-by-token message streaming
- Loading stage updates (router, retrieval, generator)
- Conversation room management

## 🛠 Tech Stack

### Core
- **Node.js** 18+ with TypeScript
- **Express.js** - RESTful API framework
- **Socket.io** - WebSocket server for real-time communication

### AI/ML
- **LangChain** - AI framework for building LLM applications
- **LangGraph** - State graph for orchestrating multi-agent workflows
- **OpenAI API** - GPT-4o-mini for routing, GPT-4o for generation
- **OpenAI Embeddings** - text-embedding-3-small for vector embeddings

### Database & Storage
- **Supabase** - PostgreSQL database with PgVector extension
- **Supabase Storage** - File storage for uploaded documents

### Utilities
- **Multer** - File upload handling
- **pdf-parse** - PDF text extraction
- **mammoth** - DOCX text extraction
- **uuid** - Unique ID generation
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing

## 📁 Project Structure

```
backend/
├── src/
│   ├── agents/              # LangGraph agents
│   │   └── chat/
│   │       ├── router.agent.ts      # Routes queries (retrieve/direct/clarify)
│   │       ├── retrieval.agent.ts   # Retrieves relevant document chunks
│   │       ├── generator.agent.ts   # Generates AI responses (streaming)
│   │       └── quality.agent.ts     # Evaluates response quality
│   ├── controllers/         # Request handlers
│   │   ├── chat.controller.ts
│   │   └── document.controller.ts
│   ├── db/                  # Database configuration
│   │   ├── dbConnection.ts
│   │   ├── schema.sql
│   │   └── migrations/
│   ├── graphs/              # LangGraph state graphs
│   │   └── chat.graph.ts    # Chat workflow orchestration
│   ├── middleware/          # Express middleware
│   │   └── upload.middleware.ts
│   ├── routes/              # API route definitions
│   │   ├── chat.routes.ts
│   │   └── document.routes.ts
│   ├── services/            # Business logic
│   │   ├── chat.service.ts           # Conversation management
│   │   ├── chat-stream.service.ts    # WebSocket streaming orchestration
│   │   ├── document.service.ts       # Document processing
│   │   ├── embedding.service.ts      # Embedding generation
│   │   ├── retrieval.service.ts      # Vector search
│   │   └── storage.service.ts        # File storage
│   ├── sockets/             # WebSocket handlers
│   │   └── chat.socket.ts   # Socket.io event handlers
│   ├── types/               # TypeScript type definitions
│   │   ├── chat.types.ts
│   │   ├── document.types.ts
│   │   ├── quiz.types.ts
│   │   └── summary.types.ts
│   ├── utils/               # Utility functions
│   │   └── logger.ts        # Logging utility
│   └── index.ts             # Application entry point
├── dist/                    # Compiled JavaScript (generated)
├── uploads/                 # Temporary file storage
├── package.json
├── tsconfig.json
└── .env                     # Environment variables (not in repo)
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase Account** - PostgreSQL database with PgVector extension
- **OpenAI API Key** - For LLM and embeddings

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```env
   # Server
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # Supabase
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_KEY=your-supabase-service-role-key

   # OpenAI
   OPENAI_API_KEY=your-openai-api-key
   ```

3. **Set up database**
   
   Run the database schema and migrations:
   ```bash
   # Connect to your Supabase database and run:
   # - src/db/schema.sql (creates tables)
   # - src/db/vector_search_function.sql (creates vector search function)
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload (nodemon)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server (requires build first)

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Environment (development/production) | No | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | No | `http://localhost:5173` |
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_KEY` | Supabase service role key | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |

## 📡 API Endpoints

### Document Management

#### Upload Document
```http
POST /api/documents/upload
Content-Type: multipart/form-data

Body: { document: File }
```

**Response:**
```json
{
  "id": "uuid",
  "originalName": "document.pdf",
  "storedName": "uuid.pdf",
  "mimeType": "application/pdf",
  "size": 12345,
  "uploadedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get All Documents
```http
GET /api/documents
```

**Response:**
```json
[
  {
    "id": "uuid",
    "originalName": "document.pdf",
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Get Document by ID
```http
GET /api/documents/:id
```

### Chat Management

#### Start Conversation
```http
POST /api/chat/conversations
Content-Type: application/json

{
  "documentIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "id": "conversation-uuid",
  "documentIds": ["uuid1", "uuid2"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get All Conversations
```http
GET /api/chat/conversations
```

#### Get Conversation
```http
GET /api/chat/conversations/:conversationId
```

**Response:**
```json
{
  "conversation": {
    "id": "uuid",
    "documentIds": ["uuid1"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "messages": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "role": "user",
      "content": "Hello",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Send Message (REST - Non-streaming)
```http
POST /api/chat/conversations/:conversationId/messages
Content-Type: application/json

{
  "message": "What is this document about?"
}
```

**Response:**
```json
{
  "message": {
    "id": "uuid",
    "conversationId": "uuid",
    "role": "assistant",
    "content": "This document is about...",
    "sources": [
      {
        "chunkId": "uuid",
        "documentId": "uuid",
        "documentName": "document.pdf",
        "similarity": 0.95
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Delete Conversation
```http
DELETE /api/chat/conversations/:conversationId
```

## 🔌 WebSocket Events

### Client → Server

#### Join Conversation
```javascript
socket.emit('join_conversation', {
  conversationId: 'uuid'
});
```

#### Send Message
```javascript
socket.emit('send_message', {
  conversationId: 'uuid',
  message: 'What is this document about?'
});
```

#### Leave Conversation
```javascript
socket.emit('leave_conversation', {
  conversationId: 'uuid'
});
```

### Server → Client

#### Joined Confirmation
```javascript
socket.on('joined_conversation', (data) => {
  // data: { conversationId: 'uuid' }
});
```

#### Message Start
```javascript
socket.on('message_start', (data) => {
  // data: { conversationId: 'uuid' }
  // Streaming is about to begin
});
```

#### Loading Stage
```javascript
socket.on('loading_stage', (data) => {
  // data: {
  //   conversationId: 'uuid',
  //   stage: 'router' | 'retrieval' | 'generator',
  //   message: 'Looking for cues...' | 'Reviewing document...' | 'Generating response...'
  // }
});
```

#### Message Token (Streaming)
```javascript
socket.on('message_token', (data) => {
  // data: {
  //   conversationId: 'uuid',
  //   messageId: 'uuid',
  //   token: 'Hello'
  // }
  // Emitted for each token in the response
});
```

#### Message End
```javascript
socket.on('message_end', (data) => {
  // data: {
  //   conversationId: 'uuid',
  //   messageId: 'uuid',
  //   message: {
  //     id: 'uuid',
  //     role: 'assistant',
  //     content: 'Complete response...',
  //     sources: [...],
  //     createdAt: '2024-01-01T00:00:00.000Z'
  //   }
  // }
});
```

#### Error
```javascript
socket.on('error', (data) => {
  // data: {
  //   conversationId: 'uuid',
  //   message: 'Error message'
  // }
});
```

## 🤖 Agents & Services

### Router Agent
**File:** `src/agents/chat/router.agent.ts`

Analyzes user queries and determines the routing strategy:
- **`retrieve`**: Query needs document context → routes to Retrieval Agent
- **`direct_answer`**: Can answer without retrieval (greetings, thanks) → routes directly to Generator
- **`clarify`**: Query is unclear → routes to Generator for clarification

**Model:** GPT-4o-mini (fast, deterministic routing)

### Retrieval Agent
**File:** `src/agents/chat/retrieval.agent.ts`

Retrieves relevant document chunks using vector search:
- Calls `RetrievalService.retrieveRelevantChunks()`
- Returns top 5 most relevant chunks with similarity scores
- Only executed when Router Agent decides `retrieve`

### Generator Agent
**File:** `src/agents/chat/generator.agent.ts`

Generates AI responses with two modes:

1. **Streaming Mode** (when `onToken` callback exists):
   - Uses `llm.stream()` for token-by-token generation
   - Calls `onToken(token)` for each token
   - Provides real-time streaming to frontend

2. **Non-Streaming Mode** (REST API compatibility):
   - Uses `llm.invoke()` for complete response
   - Returns full message at once

**Model:** GPT-4o (high-quality responses)

**Prompt Types:**
- **RAG Prompt**: When retrieved chunks are available
- **Direct Answer Prompt**: For general queries
- **Clarification Prompt**: When query is unclear

### Quality Agent
**File:** `src/agents/chat/quality.agent.ts`

Evaluates response quality and triggers regeneration if needed:
- Returns `'good'` or `'poor'`
- If `'poor'` and `retryCount < 2`: routes back to Generator Agent
- If `'good'` or `retryCount >= 2`: ends workflow

**Model:** GPT-4o-mini (fast evaluation)

**Note:** Quality check is skipped for first message to improve response time.

### Chat Service
**File:** `src/services/chat.service.ts`

Manages conversations and messages:
- CRUD operations for conversations
- Message persistence
- Conversation-document relationships

### Chat Stream Service
**File:** `src/services/chat-stream.service.ts`

Orchestrates WebSocket streaming:
- Creates `onToken` callback for token-by-token streaming
- Streams LangGraph execution
- Emits WebSocket events (`message_start`, `loading_stage`, `message_token`, `message_end`)
- Saves final messages to database

### Retrieval Service
**File:** `src/services/retrieval.service.ts`

Performs vector similarity search:
- Generates query embeddings via `EmbeddingService`
- Calls Supabase `match_documents_chunks` RPC function
- Returns top K most relevant chunks with similarity scores
- Enriches chunks with document names

### Embedding Service
**File:** `src/services/embedding.service.ts`

Handles text embeddings:
- Generates embeddings using OpenAI `text-embedding-3-small`
- Chunks documents for processing
- Generates embeddings for document chunks and queries

### Document Service
**File:** `src/services/document.service.ts`

Manages document processing:
- Text extraction (PDF, DOCX, TXT)
- Document chunking
- Embedding generation and storage
- Document metadata management

## 🗄 Database Schema

### Tables

#### `documents`
- `id` (UUID, Primary Key)
- `original_name` (TEXT)
- `stored_name` (TEXT)
- `mime_type` (TEXT)
- `size` (BIGINT)
- `uploaded_at` (TIMESTAMP)

#### `document_chunks`
- `id` (UUID, Primary Key)
- `document_id` (UUID, Foreign Key → documents)
- `chunk_index` (INTEGER)
- `content` (TEXT)
- `embedding` (VECTOR(1536)) - PgVector
- `created_at` (TIMESTAMP)

#### `conversations`
- `id` (UUID, Primary Key)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `conversation_documents`
- `conversation_id` (UUID, Foreign Key → conversations)
- `document_id` (UUID, Foreign Key → documents)

#### `messages`
- `id` (UUID, Primary Key)
- `conversation_id` (UUID, Foreign Key → conversations)
- `role` (TEXT) - 'user' | 'assistant'
- `content` (TEXT)
- `sources` (JSONB) - Array of retrieved chunk references
- `created_at` (TIMESTAMP)

### Vector Search Function

The `match_documents_chunks` RPC function performs cosine similarity search:
```sql
SELECT * FROM match_documents_chunks(
  query_embedding VECTOR(1536),
  match_count INT,
  filter_document_ids UUID[]
)
```

## 🔄 LangGraph Workflow

The chat workflow is orchestrated by LangGraph:

```
START
  ↓
Router Agent (analyzes query)
  ↓
  ├─→ [retrieve] → Retrieval Agent → Generator Agent
  └─→ [direct_answer/clarify] → Generator Agent
  ↓
Quality Agent (evaluates response)
  ↓
  ├─→ [poor & retries < 2] → Generator Agent (retry)
  └─→ [good or max retries] → END
```

**State Graph:** `src/graphs/chat.graph.ts`

**State Structure:**
```typescript
{
  conversationId: string;
  documentIds: string[];
  messages: Message[];
  currentQuery: string;
  retrievedChunks: RetrievedChunk[];
  routerDecision: 'retrieve' | 'direct_answer' | 'clarify';
  responseQuality: 'good' | 'poor' | 'pending';
  retryCount: number;
  metadata: {
    startTime: number;
    isFirstMessage: boolean;
    onToken?: (token: string) => void; // For streaming
  };
}
```

## 🧪 Development

### Running in Development Mode

```bash
npm run dev
```

Uses `nodemon` for automatic restart on file changes.

### Building for Production

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

### Running in Production

```bash
npm start
```

Runs the compiled JavaScript from `dist/index.js`.

### Logging

The application uses a custom logger (`src/utils/logger.ts`):
- **Development**: Logs all levels (info, warn, error, debug)
- **Production**: Logs only errors

Log format: `[TIMESTAMP] [LEVEL] [CONTEXT] Message`

## 🐛 Troubleshooting

### Database Connection Issues

**Error:** `Invalid API key or authentication failed`
- **Solution:** Check `SUPABASE_KEY` in `.env` file

**Error:** `Network error` or `ENOTFOUND`
- **Solution:** Check `SUPABASE_URL` in `.env` file

### WebSocket Connection Issues

**Error:** `CORS policy blocked`
- **Solution:** Ensure `FRONTEND_URL` in `.env` matches your frontend URL

**Error:** `Socket not connected`
- **Solution:** Check that Socket.io server is running and frontend is connecting to correct port

### OpenAI API Issues

**Error:** `Invalid API key`
- **Solution:** Verify `OPENAI_API_KEY` in `.env` file

**Error:** `Rate limit exceeded`
- **Solution:** Check OpenAI API usage limits and implement rate limiting if needed

### Vector Search Issues

**Error:** `No chunks found`
- **Solution:** 
  - Verify documents have been processed and chunks exist in `document_chunks` table
  - Check that `match_documents_chunks` RPC function exists in database
  - Verify embeddings are generated correctly

### File Upload Issues

**Error:** `File too large`
- **Solution:** Check Multer configuration in `src/middleware/upload.middleware.ts`

**Error:** `Unsupported file type`
- **Solution:** Verify file extension is supported (PDF, DOC, DOCX, TXT)

## 📚 Additional Resources

- [LangChain Documentation](https://js.langchain.com/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## 📝 License

ISC

## 👤 Author

Gideon Ayeni


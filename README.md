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
- **MongoDB** (or PostgreSQL) - for database
- **Redis** - for caching and session management
- **Vector Database** - Pinecone, Weaviate, or Qdrant (for document embeddings)
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
   MONGODB_URI=mongodb://localhost:27017/cognifast
   
   # Redis
   REDIS_URL=redis://localhost:6379
   
   # JWT
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=7d
   
   # AI Service
   OPENAI_API_KEY=your-openai-api-key
   
   # Vector Database
   VECTOR_DB_URL=your-vector-db-url
   VECTOR_DB_API_KEY=your-vector-db-api-key
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
- Open your document
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
- **MongoDB/PostgreSQL** - Database
- **Redis** - Caching
- **LangChain** - AI/ML framework
- **LangGraph** - Stateful agent orchestration
- **Pinecone/Weaviate/Qdrant** - Vector Database
- **Vector Database** - Document embeddings

### AI/ML
- **OpenAI/Anthropic** - LLM APIs
- **Vector Embeddings** - Document similarity search
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


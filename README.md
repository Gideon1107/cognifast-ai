<div align="center">

# Cognifast AI: An Adaptive Learning Platform for Faster Learning and Knowledge Evaluation

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://www.langchain.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)

[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-green?style=for-the-badge)](https://github.com/Gideon1107/Cognifast-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

*Transform your learning experience with AI-powered document analysis, interactive chat, and intelligent knowledge evaluation*

[Features](#-features) • [Demo](#-demo) • [Getting Started](#-getting-started) • [Documentation](#-documentation) • [Tech Stack](#-tech-stack)

</div>

---

## Demo

<div align="center">

https://github.com/user-attachments/assets/8f046bff-4917-4d31-80a5-9722d1843294

*Watch Cognifast AI in action - Upload sources, chat with AI, and explore your documents with intelligent citations*

</div>

---

## 🎯 Overview

Cognifast AI is an intelligent learning platform that revolutionizes how you interact with educational content. Upload documents or web pages, chat with an AI assistant that understands your content, get instant answers with source citations, and test your knowledge with AI-generated quizzes.

### Key Capabilities

- **Multi-Source Support**: Upload PDFs, Word documents, text files, or web page URLs
- **Intelligent Chat**: Context-aware conversations grounded in your uploaded sources
- **Source Citations**: See exactly which parts of your sources were used to answer questions
- **Real-Time Streaming**: Watch AI responses generate token-by-token in real-time
- **Quiz Generation**: Automated quiz creation from your source content (Coming Soon)
- **LaTeX Support**: Perfect rendering of mathematical and chemical equations
- **Markdown Formatting**: Beautifully formatted responses with headings, lists, and emphasis

---

## ✨ Features

### 📄 Source Management

- **Multiple File Types**: Support for PDF, DOC, DOCX, TXT files
- **Web Page Support**: Upload and process web page URLs with automatic content extraction
- **Multiple Upload**: Upload multiple sources before starting a conversation
- **Smart Processing**: Automatic text extraction, chunking, and vector embedding generation
- **Source Organization**: View all sources associated with each classroom

### 💬 Interactive AI Chat

- **Real-Time Streaming**: Token-by-token response generation via WebSocket
- **Context-Aware Responses**: AI understands your uploaded sources and provides grounded answers
- **Intelligent Routing**: Automatically determines when to retrieve source content vs. direct answers
- **Multi-Stage Processing**: Visual feedback during AI processing stages
  - "Looking for cues..." (Query routing)
  - "Reviewing document..." (Content retrieval)
  - "Generating response..." (Response generation)
- **Quality Assurance**: Automatic response quality evaluation with retry mechanism

### 🔗 Source Citations

- **Numbered Citations**: Clean `[1]`, `[2]` citation format in responses
- **Hover Tooltips**: Hover over citations to see the exact source chunk text
- **Source Attribution**: Know exactly which source and section informed each answer
- **Visual Indicators**: Modern citation styling with smooth hover effects

### 🎨 Modern UI/UX

- **NotebookLM-Inspired Design**: Clean, modern interface inspired by Google's NotebookLM
- **3-Column Layout**: 
  - **Sources (20%)**: View all sources with type indicators
  - **Chat (50%)**: Main conversation interface
  - **Studio (30%)**: Reserved for future features (quizzes, analytics)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Smooth Animations**: Polished user experience with gradient loaders
- **Auto-Scroll**: Automatically scrolls to latest messages
- **Persistent State**: Conversations and messages persist across page reloads

### 📊 Conversation Management

- **Dashboard View**: See all your classrooms (conversations) in one place
- **Custom Titles**: Name your classrooms when creating them
- **Edit & Delete**: Manage conversation titles and remove conversations
- **Skeleton Loading**: Smooth loading states to prevent UI flicker
- **Recent Activity**: Conversations sorted by creation date

### 📝 Quiz Generation (Coming Soon)

- **Automated Quiz Creation**: AI generates quizzes based on your uploaded source content
- **Multiple Question Types**: 
  - Multiple choice questions with 4 options
  - True/False questions
  - Short answer questions
- **Adaptive Difficulty Levels**: Choose from Easy, Medium, or Hard difficulty
- **Source-Grounded Questions**: All questions are based on your uploaded sources
- **Automatic Grading**: Instant feedback with detailed explanations
- **Performance Tracking**: Track your quiz attempts and scores
- **Knowledge Gap Analysis**: Identify areas that need more attention
- **Studio Panel Integration**: Access quizzes from the Studio panel in the chat interface

### 🧮 Advanced Formatting

- **LaTeX Rendering**: Perfect display of mathematical and chemical equations
  - Block equations: `\[...\]` or `$$...$$`
  - Inline equations: `$...$` or `\(...\)`
- **Markdown Support**: 
  - **Bold text**: `**text**`
  - **Headings**: `#`, `##`, `###`
  - **Numbered lists**: `1.`, `2.`, `3.`
  - **Paragraphs**: Automatic paragraph breaks

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (via Supabase)
- **Supabase Account** with PgVector extension enabled
- **OpenAI API Key** (for GPT-4o and GPT-4o-mini)

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
   
   # Database (Supabase)
   SUPABASE_URL=your-supabase-url
   SUPABASE_PASSWORD=your-supabase-password
   SUPABASE_KEY=your-supabase-service-key
   
   # AI Service (OpenAI)
   OPENAI_PROJECT_ID=your-openai-project-id
   OPENAI_API_KEY=your-openai-api-key
   ```

   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_WS_URL=http://localhost:3000
   ```

4. **Set up the database**

   Run the SQL scripts on your Supabase database in the following order:
   
   **Initial Schema Setup:**
   - `backend/src/db/schema.sql` - Base database schema (run this first for new databases)
   
   **Migrations (if needed):**
   - `backend/src/db/migrations/003_rename_documents_to_sources.sql` - Main schema migration
   - `backend/src/db/migrations/003c_update_vector_search_functions.sql` - Vector search functions
   - `backend/src/db/migrations/003d_fix_file_type_constraint.sql` - Constraint fixes
   
   > **Note**: For a fresh database, start with `schema.sql`. If you're migrating from an older version, run the migration files in order.

5. **Start the development servers**
   ```bash
   # From root directory (runs both frontend and backend)
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

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

---

## 📖 Usage Guide

### 1. Create a New Classroom

1. Navigate to the **Dashboard** from the landing page
2. Click **"Create new"** button
3. You'll be taken to the Chat interface with an upload modal
4. **Upload sources**:
   - **File Upload**: Drag and drop files or click to browse
     - Supported formats: PDF, DOC, DOCX, TXT (max 10MB)
   - **URL Upload**: Switch to "Add URL" tab and paste a web page URL
   - Upload multiple sources before starting
5. Enter a **Classroom Name** (optional, defaults to "New Classroom")
6. Click **"Start Classroom"** to begin

### 2. Chat Interface

The Chat interface features a **3-column layout**:

#### Sources Panel
- Displays all sources (files and URLs) associated with the classroom
- Shows source type icons (file icon for documents, globe icon for URLs)
- Modern card-style design with source names and metadata

#### Chat Panel
- **Main conversation area** with message history
- **Input field** at the bottom for typing questions
- **Send button** (arrow icon) to submit messages
- **Real-time streaming**: Watch AI responses generate token-by-token
- **Loading indicators**: See progress during AI processing
- **Citations**: Hover over numbered citations `[1]`, `[2]` to see source chunks
- **Auto-scroll**: Automatically scrolls to latest messages

#### Studio Panel
- **Quiz Generation**: Create quizzes from your source content (Coming Soon)
  - Select difficulty level (Easy, Medium, Hard)
  - Generate questions based on your sources
  - Take quizzes and get instant feedback
- **Analytics & Insights**: Track your learning progress (Coming Soon)
- **Document Summaries**: AI-powered summaries of your sources (Coming Soon)

### 3. Chatting with AI

1. **Type your question** in the chat input field
2. **Press Enter** or click the **Send button** (arrow icon)
3. The AI will process your query through multiple stages:
   - **Routing**: Determines if source retrieval is needed
   - **Retrieval**: Finds relevant chunks from your sources (if needed)
   - **Generation**: Creates a response with real-time streaming
   - **Quality Check**: Evaluates response quality (may retry if needed)
4. **View citations**: Hover over citation numbers to see the source text used
5. **Continue the conversation**: Ask follow-up questions for deeper exploration

### 4. Managing Classrooms

#### Dashboard
- View all your classrooms in a grid layout
- See classroom titles, source counts, and creation dates
- Click any classroom card to open it in the Chat interface

#### Edit Classroom Title
1. Click the **three-dot menu** (⋮) on any classroom card
2. Select **"Edit"**
3. Enter a new title in the dialog
4. Click **"Save"**

#### Delete Classroom
1. Click the **three-dot menu** (⋮) on any classroom card
2. Select **"Delete"**
3. Confirm deletion in the dialog

### 5. Quiz Generation (Coming Soon)

1. **Open Studio Panel**: Navigate to a classroom and view the Studio panel (right side)
2. **Generate Quiz**: 
   - Click **"Generate Quiz"** button
   - Select difficulty level (Easy, Medium, Hard)
   - Choose number of questions
   - Click **"Create Quiz"**
3. **Take Quiz**: 
   - Answer questions one by one
   - View progress and timer
   - Submit when complete
4. **View Results**: 
   - See your score immediately
   - Review correct/incorrect answers
   - Read detailed explanations
   - Identify knowledge gaps

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI library with hooks and modern patterns |
| **TypeScript** | Type safety and better developer experience |
| **Vite** | Fast build tool and dev server |
| **React Router DOM** | Client-side routing |
| **Tailwind CSS** | Utility-first CSS framework |
| **Zustand** | Lightweight global state management with persistence |
| **Socket.io Client** | WebSocket client for real-time communication |
| **React Query** | Data fetching and caching |
| **Axios** | HTTP client for API requests |
| **KaTeX** | LaTeX rendering for mathematical equations |

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express** | Web framework for RESTful APIs |
| **TypeScript** | Type safety and better developer experience |
| **Socket.io** | WebSocket server for real-time streaming |
| **LangChain** | AI framework for building LLM applications |
| **LangGraph** | Stateful multi-agent workflow orchestration |
| **OpenAI API** | GPT-4o-mini (routing) and GPT-4o (generation) |
| **Supabase** | PostgreSQL database with PgVector extension |
| **RecursiveCharacterTextSplitter** | Text chunking for embeddings |
| **OpenAIEmbeddings** | Vector embedding generation |
| **Cheerio** | Web scraping and HTML parsing |

### Database

| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Relational database |
| **Supabase PgVector** | Vector similarity search for RAG |
| **Custom RPC Functions** | Efficient vector search queries |

### Architecture

- **Monorepo Structure**: Shared types between frontend and backend
- **Multi-Agent System**: Router, Retrieval, Generator, and Quality agents
- **WebSocket Streaming**: Real-time token-by-token response delivery
- **Vector Search**: Semantic similarity search for document retrieval

---

## 📁 Project Structure

```
Cognifast-ai/
├── backend/                        # Backend API server
│   ├── src/
│   │   ├── agents/                 # LangGraph agents
│   │   │   └── chat/
│   │   │       ├── router.agent.ts      # Routes queries (retrieve/direct/clarify)
│   │   │       ├── retrieval.agent.ts   # Retrieves relevant source chunks
│   │   │       ├── generator.agent.ts   # Generates AI responses (streaming)
│   │   │       └── quality.agent.ts     # Evaluates response quality
│   │   ├── controllers/            # Request handlers
│   │   │   ├── chat.controller.ts
│   │   │   └── source.controller.ts
│   │   ├── db/                     # Database configuration
│   │   │   ├── dbConnection.ts
│   │   │   ├── schema.sql          # Database schema
│   │   │   ├── vector_search_function.sql
│   │   │   └── migrations/         # Database migrations
│   │   ├── graphs/                 # LangGraph state graphs
│   │   │   └── chat.graph.ts       # Chat workflow orchestration
│   │   ├── routes/                 # API route definitions
│   │   │   ├── chat.routes.ts
│   │   │   └── source.routes.ts
│   │   ├── services/               # Business logic
│   │   │   ├── chat.service.ts           # Conversation management
│   │   │   ├── chat-stream.service.ts    # WebSocket streaming orchestration
│   │   │   ├── source.service.ts         # Source processing (files & URLs)
│   │   │   ├── embedding.service.ts      # Embedding generation
│   │   │   ├── retrieval.service.ts     # Vector search
│   │   │   └── web-scraper.service.ts   # Web page content extraction
│   │   ├── sockets/                # WebSocket handlers
│   │   │   └── chat.socket.ts      # Socket.io event handlers
│   │   └── index.ts                # Application entry point
│   └── README.md                   # Backend documentation
│
├── frontend/                       # React frontend
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── chat/
│   │   │   │   ├── SourceUploadModal.tsx
│   │   │   │   └── CitationTooltip.tsx
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
│   │   │   ├── Documents.tsx       # Documents page
│   │   │   └── Landing.tsx         # Landing page
│   │   ├── store/                  # State management (Zustand)
│   │   │   ├── index.ts            # Store exports
│   │   │   ├── types.ts            # Store type definitions
│   │   │   └── useChatStore.ts     # Chat store implementation
│   │   ├── utils/                  # Utility functions
│   │   │   ├── logger.ts           # Frontend logging
│   │   │   └── latex.tsx          # LaTeX rendering utility
│   │   └── index.css               # Global styles
│   └── README.md                   # Frontend documentation
│
├── shared/                         # Shared types and constants
│   ├── types/
│   │   ├── entities.ts             # Domain models (Message, Conversation, Source)
│   │   ├── api.ts                  # API request/response types
│   │   └── index.ts                # Central export
│   └── README.md                   # Documentation for shared types
│
├── ARCHITECTURE_FLOW.md            # Architecture flow diagram
└── README.md                       # This file
```

---

## 🔄 How It Works

### Architecture Flow

1. **User uploads sources** (files or URLs) → Backend processes and generates embeddings
2. **User sends a message** → Frontend sends via WebSocket
3. **Router Agent** → Determines if source retrieval is needed
4. **Retrieval Agent** (if needed) → Finds relevant chunks using vector similarity search
5. **Generator Agent** → Creates response with real-time token streaming
6. **Quality Agent** → Evaluates response quality (may trigger retry)
7. **Frontend** → Displays streaming response with citations

See [ARCHITECTURE_FLOW.md](./ARCHITECTURE_FLOW.md) for detailed flow diagrams.

### Key Components

- **Multi-Agent System**: LangGraph orchestrates Router, Retrieval, Generator, and Quality agents
- **Vector Search**: PgVector enables semantic similarity search across source chunks
- **Real-Time Streaming**: WebSocket delivers tokens as they're generated
- **State Management**: Zustand with persistence for conversations and messages
- **Citation System**: Numbered citations map to source chunks with hover tooltips

---

## 🧪 Development

### Running the Application

```bash
# Start both frontend and backend
npm run dev

# Or run separately
cd backend && npm run dev
cd frontend && npm run dev
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

### Database Migrations

**For a new database:**
1. Run `backend/src/db/schema.sql` first to create the base schema

**For existing databases (migrations):**
1. `003_rename_documents_to_sources.sql`
2. `003c_update_vector_search_functions.sql`
3. `003d_fix_file_type_constraint.sql` (if needed)

---

## 🚧 Roadmap

### Coming Soon

#### 📝 Quiz Generation (In Development)
- [ ] **Quiz Creation UI**: Generate quizzes from Studio panel
  - Select difficulty level (Easy, Medium, Hard)
  - Choose number of questions
  - Generate questions based on source content
- [ ] **Quiz Taking Interface**: Interactive quiz experience
  - Multiple choice question display
  - True/False question interface
  - Short answer input fields
  - Timer and progress tracking
- [ ] **Automatic Grading**: Instant feedback system
  - Correct/incorrect answer indicators
  - Detailed explanations for each question
  - Source citations for answers
- [ ] **Quiz Results & Analytics**: Performance tracking
  - Score calculation and display
  - Knowledge gap identification
  - Quiz attempt history
  - Performance trends over time

#### 📊 Other Upcoming Features
- [ ] **Document Summarization**: AI-powered summaries of uploaded sources
- [ ] **Performance Analytics Dashboard**: Track learning progress and knowledge gaps
- [ ] **User Authentication**: Secure user accounts and sessions
- [ ] **Export Conversations**: Download chat history as PDF or text
- [ ] **Dark Mode**: Theme switching for better accessibility
- [ ] **Mobile App**: Native mobile experience

### Under Consideration

- [ ] Multi-language support
- [ ] Collaborative classrooms
- [ ] Advanced search across all conversations
- [ ] Integration with learning management systems

---

## 📚 Documentation

- [Frontend README](./frontend/README.md) - Frontend architecture and features
- [Backend README](./backend/README.md) - Backend API and services
- [Architecture Flow](./ARCHITECTURE_FLOW.md) - System architecture diagrams

---

## 🤝 Contributing

Contributions are welcome! We're excited to have you contribute to Cognifast AI. This guide will help you get started.

### Getting Started

1. **Fork the repository**
   - Click the "Fork" button on the top right of the repository page
   - This creates a copy of the repository under your GitHub account

2. **Clone your fork** (not the original repository)
   ```bash
   git clone https://github.com/YOUR-USERNAME/Cognifast-ai.git
   cd Cognifast-ai
   ```

3. **Add upstream remote** (to sync with the original repository)
   ```bash
   git remote add upstream https://github.com/Gideon1107/Cognifast-ai.git
   ```

4. **Install dependencies**
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

5. **Set up environment variables**
   - Follow the [Getting Started](#-getting-started) section to configure your `.env` files
   - Make sure you have a Supabase database and OpenAI API key set up

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style and patterns
   - Add comments for complex logic
   - Update documentation if needed

3. **Test your changes**
   - Test the frontend: `cd frontend && npm run dev`
   - Test the backend: `cd backend && npm run dev`
   - Ensure all existing functionality still works
   - Test edge cases and error handling

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: commit message"
   # or
   git commit -m "fix: commit message"
   ```

   **Commit message guidelines:**
   - Use conventional commit format: `type: description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Keep descriptions concise and clear
   - Reference issue numbers if applicable: `feat: add dark mode (#21)`

5. **Keep your fork up to date**
   ```bash
   # Fetch latest changes from upstream
   git fetch upstream
   
   # Switch to main branch
   git checkout main
   
   # Merge upstream changes
   git merge upstream/main
   
   # Push to your fork
   git push origin main
   
   # Switch back to your feature branch
   git checkout feature/your-feature-name
   
   # Rebase on latest main (optional, keeps history clean)
   git rebase main
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template with:
     - Description of changes
     - Related issue number (if applicable)
     - Screenshots (for UI changes)
     - Testing instructions

### Code Style Guidelines

- **TypeScript**: Use TypeScript for all new code
- **Naming**: Use descriptive variable and function names
- **Formatting**: Code is formatted automatically (consider adding Prettier)
- **Imports**: Group imports (external, internal, relative)
- **Comments**: Add comments for complex logic, not obvious code
- **Error Handling**: Always handle errors appropriately
- **Type Safety**: Avoid `any` types; use proper TypeScript types

### Frontend Guidelines

- Use functional components with hooks
- Follow React best practices (avoid unnecessary re-renders)
- Use Tailwind CSS for styling
- Maintain responsive design
- Ensure accessibility (keyboard navigation, ARIA labels)

### Backend Guidelines

- Follow RESTful API conventions
- Add proper error handling and validation
- Use TypeScript types from `shared/types`
- Add logging for debugging (use the logger utility)
- Document complex algorithms or business logic

### Testing

- Test your changes thoroughly before submitting
- Test edge cases and error scenarios
- Ensure existing functionality isn't broken
- (Future) Add unit tests for new features

### Pull Request Guidelines

- **One feature per PR**: Keep PRs focused and manageable
- **Link issues**: Reference related issues in your PR description
- **Update documentation**: Update README or docs if needed
- **Screenshots**: Include screenshots for UI changes
- **Be responsive**: Address review comments promptly
- **Keep PRs updated**: Rebase or merge main branch if conflicts arise

### Getting Help

- Check existing [GitHub Issues](https://github.com/Gideon1107/Cognifast-ai/issues)
- Open a new issue for bugs or feature requests
- Ask questions in issue comments or discussions

### Recognition

Contributors will be recognized in the project. Thank you for helping make Cognifast AI better! 🎉

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📧 Contact & Support

For questions, issues, or support:
- Open an issue on [GitHub Issues](https://github.com/Gideon1107/Cognifast-ai/issues)
- Check the [Documentation](./docs) for detailed guides

---

<div align="center">

**Built with ❤️ for faster learning**

[⬆ Back to Top](#-cognifast-ai)

</div>

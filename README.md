<div align="center">

<img width="150" height="150" alt="cognifast_logo" src="https://github.com/user-attachments/assets/05380a0d-5b9f-4741-a672-302049898f56" /><br>
# Cognifast AI

**An AI-Powered Adaptive Learning Platform for Faster Learning and Knowledge Evaluation — upload sources, chat with your documents, take quizzes, and get answers with citations.**
 
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://www.langchain.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-green?style=for-the-badge)](https://github.com/Gideon1107/Cognifast-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

https://github.com/user-attachments/assets/8f046bff-4917-4d31-80a5-9722d1843294

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone](#1-clone)
  - [2. Start the database](#2-start-the-database)
  - [3. Install dependencies](#3-install-dependencies)
  - [4. Configure environment](#4-configure-environment)
  - [5. Run the app](#5-run-the-app)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Database](#database)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Cognifast AI lets you upload documents (PDF, DOCX, TXT) or web page URLs and have an AI conversation grounded in that content. Every answer includes numbered citations so you can verify where the information came from. You can also generate quizzes from your sources and test your knowledge with instant feedback.

Under the hood, two **multi-agent LangGraph pipelines** handle chat and quiz generation — routing queries, retrieving relevant chunks via pgvector similarity search, generating streaming responses, and evaluating quality, all in real time over WebSocket.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-source upload** | PDF, DOCX, TXT files and web page URLs. Upload multiple sources per classroom. |
| **Source-grounded chat** | AI answers are based on your uploaded content, not general knowledge. |
| **Numbered citations** | `[1]`, `[2]` references with hover tooltips showing the exact source text. |
| **Real-time streaming** | Token-by-token response delivery over WebSocket with stage indicators. |
| **Quiz generation** | AI generates multiple-choice and true/false questions from your sources. |
| **Quiz taking & scoring** | Answer questions, get instant correct/incorrect feedback, and see your final score. |
| **Explain wrong answers** | Click "Explain" on incorrect answers to have the AI explain in the chat. |
| **Multi-agent pipelines** | Chat: Router -> Retrieval -> Generator -> Quality. Quiz: ConceptExtractor -> QuestionGenerator -> Validator. |
| **LaTeX & Markdown** | Renders mathematical equations, headings, lists, and formatted text. |
| **Classroom management** | Create, rename, and delete classrooms from a dashboard. |
| **Local-first storage** | Files stored on local disk; database runs in Docker. No cloud dependencies except OpenAI. |

---

## Architecture

```
User ──> React (Vite) ──WebSocket──> Express / Socket.io
                                          |
                                    ┌─────┴─────┐
                                    |           |
                              Chat Graph    Quiz Graph
                              (LangGraph)   (LangGraph)
                                    |           |
                              ┌─────┴──┐   ┌───┴────┐
                              |        |   |        |
                           Router  Generator  ConceptExtractor
                              |        ^      |
                           Retrieval   |   QuestionGenerator
                              |        |      |
                           pgvector ───┘   Validator
                              |
                         PostgreSQL 17 (Docker)
```

### Chat pipeline
1. **Router** — classifies the query (`retrieve` / `direct_answer` / `clarify` / `identity_block`) using GPT-4o-mini.
2. **Retrieval** — embeds the query, runs vector similarity search against source chunks.
3. **Generator** — streams a cited answer token-by-token back to the client using GPT-4o.
4. **Quality** — evaluates the response; retries generation if quality is poor (max 2 retries).

### Quiz pipeline
1. **Concept Extractor** — pulls key concepts from the source chunks.
2. **Question Generator** — creates multiple-choice and true/false questions from those concepts.
3. **Validator** — checks question quality; triggers regeneration if needed.

See [`ARCHITECTURE_FLOW.md`](./ARCHITECTURE_FLOW.md) for the full Mermaid diagram.

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 | UI with hooks |
| TypeScript | Type safety |
| Vite 7 | Dev server & build |
| Tailwind CSS 4 | Styling |
| Zustand | Global state with persistence |
| React Query (TanStack) | Data fetching & caching |
| Socket.io Client | Real-time streaming |
| KaTeX | LaTeX equation rendering |
| Lucide React | Icons |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js / Express 5 | REST API |
| TypeScript | Type safety |
| Socket.io | WebSocket streaming |
| LangChain / LangGraph | Multi-agent orchestration (chat + quiz) |
| OpenAI API | GPT-4o (generation), GPT-4o-mini (routing/quality/quiz), text-embedding-3-small |
| Drizzle ORM | Type-safe database queries |
| pg (node-postgres) | PostgreSQL driver / connection pool |
| Cheerio | Web scraping |
| Multer | File upload handling |
| Mammoth / pdf-parse | DOCX and PDF text extraction |

### Database & Infrastructure

| Technology | Purpose |
|------------|---------|
| PostgreSQL 17 | Relational database |
| pgvector | Vector similarity search for RAG |
| Docker Compose | One-command database setup |
| Local file storage | Uploaded files served via Express static |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Docker** (for the PostgreSQL database)
- **OpenAI API key**

### 1. Clone

```bash
git clone https://github.com/Gideon1107/Cognifast-ai.git
cd Cognifast-ai
```

### 2. Start the database

The project uses Docker Compose to run PostgreSQL 17 with pgvector. The schema and vector search functions are applied automatically on first start.

```bash
npm run db:up
```

This runs `docker compose up -d`, which:
- Pulls the `pgvector/pgvector:pg17` image
- Creates the `cognifast_db` database
- Installs the `pgvector` extension
- Exposes Postgres on **port 5433** (to avoid conflicts with a local install)

> Migrations (tables, indexes, functions) are applied automatically when you run `npm run dev` for the first time.

Other database commands:

```bash
npm run db:logs      # Stream database logs
npm run db:health    # Check if the database is ready
npm run db:down      # Stop the database
npm run db:reset     # Destroy and recreate (wipes all data)
```

### 3. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### 4. Configure environment

**`backend/.env`**

```env
PORT=3000
NODE_ENV=development

# Docker Postgres (local dev)
DATABASE_URL="postgresql://cognifast:cognifast@localhost:5433/cognifast_db"

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

**`frontend/.env`**

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

### 5. Run the app

From the root directory:

```bash
# Start backend
cd backend && npm run dev    # http://localhost:3000

# Start frontend (separate terminal)
cd frontend && npm run dev   # http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) and start uploading sources.

---

## Project Structure

```
Cognifast-ai/
├── docker-compose.yml               # PostgreSQL 17 + pgvector
├── package.json                     # Root scripts (db:up, db:down, etc.)
│
├── backend/
│   ├── drizzle.config.ts            # Drizzle ORM config
│   └── src/
│       ├── agents/
│       │   ├── chat/                # Chat agents (router, retrieval, generator, quality)
│       │   └── quiz/                # Quiz agents (concept-extractor, question-generator, validator)
│       ├── controllers/             # Express request handlers (chat, source, quiz)
│       ├── db/
│       │   ├── dbConnection.ts      # Drizzle + pg Pool setup
│       │   ├── schema/              # Drizzle table definitions
│       │   ├── drizzle-migrations/  # Drizzle migration files (auto-applied on npm run dev)
│       │   └── init-extensions.sql  # Docker init: installs pgvector extension
│       ├── graphs/                  # LangGraph definitions (chat + quiz)
│       ├── routes/                  # REST route definitions (chat, source, quiz)
│       ├── services/                # Business logic (chat, embedding, retrieval, quiz, storage)
│       ├── sockets/                 # Socket.io event handlers
│       ├── types/                   # TypeScript type definitions
│       └── index.ts                 # Entry point
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── chat/                # ChatPanel, SourcesPanel, CitationTooltip, SourceUploadModal
│       │   ├── studio/              # StudioPanel, StudioHome, StudioQuizApp
│       │   └── landing/             # FeatureCard, HeroSection
│       ├── hooks/                   # useWebSocket
│       ├── lib/                     # API client, React Query, WebSocket setup
│       ├── pages/                   # Landing, Dashboard, Chat, Documents
│       ├── store/                   # Zustand stores (chat, quiz)
│       └── utils/                   # LaTeX renderer, logger
│
└── shared/
    └── types/                       # Shared TypeScript types (entities, API contracts)
```

---

## API Endpoints

### Sources

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sources/upload` | Upload a file (PDF, DOCX, TXT) |
| `POST` | `/api/sources/upload-url` | Upload a web page URL |
| `GET` | `/api/sources` | List all sources |
| `GET` | `/api/sources/:id` | Get source by ID |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/conversations` | Start a new conversation |
| `GET` | `/api/chat/conversations` | List all conversations |
| `GET` | `/api/chat/conversations/:id` | Get conversation with messages |
| `PATCH` | `/api/chat/conversations/:id` | Update conversation title |
| `DELETE` | `/api/chat/conversations/:id` | Delete a conversation |
| `POST` | `/api/chat/conversations/:id/messages` | Send a message (REST) |

Real-time chat uses **WebSocket** (`send_message`, `message_token`, `message_end` events).

### Quiz

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/quiz/generate` | Generate a quiz for a conversation |
| `GET` | `/api/quiz/conversation/:id` | List quizzes for a conversation |
| `POST` | `/api/quiz/:quizId/attempts` | Start an attempt (returns questions) |
| `POST` | `/api/quiz/attempts/:attemptId/answer` | Submit an answer |
| `GET` | `/api/quiz/attempts/:attemptId` | Get attempt summary / score |

---

## Database

PostgreSQL 17 with pgvector, running in Docker via `docker-compose.yml`.

| Table | Purpose |
|-------|---------|
| `sources` | Uploaded file / URL metadata |
| `source_chunks` | Text chunks with 1536-dim vector embeddings |
| `conversations` | Classroom / conversation metadata |
| `conversation_sources` | Many-to-many link between conversations and sources |
| `messages` | Chat history with citation JSONB |
| `quizzes` | Generated quiz questions (JSONB) |
| `quiz_attempts` | User answers, scores, and completion status |

Connection uses `DATABASE_URL` with Drizzle ORM and a raw `pg` Pool for vector search RPCs.

---

## Roadmap

### Studio Features
- [ ] Audio Overview — AI audio summary of uploaded sources
- [ ] Video Overview — Visual video summary of sources
- [ ] Mind Map — Interactive mind map of key concepts
- [ ] Knowledge Gap — Identifies gaps in your understanding
- [ ] Reports — Analytics and performance reports
- [ ] Flashcards — Spaced repetition flashcards from sources

### Platform
- [ ] User authentication and sessions
- [ ] Performance analytics dashboard
- [ ] Dark mode
- [ ] Export conversations as PDF
- [ ] Mobile app

---

## Contributing

Contributions are welcome. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for full guidelines. Short version:

1. **Fork** the repo and **clone** your fork.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Run the database: `npm run db:up`.
4. Follow existing code style (TypeScript, Tailwind, Drizzle, shared types).
5. Commit with [conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, etc.
6. Push and open a **Pull Request** against `dev`.

---

## License

[MIT](./LICENSE) -- Copyright (c) 2025 Gideon Ayeni

---

<div align="center">

**Built by [Gideon Ayeni](https://github.com/Gideon1107)**

[Back to top](#cognifast-ai)

</div>

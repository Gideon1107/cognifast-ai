-- Create documents table

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'docx', 'doc', 'txt')),
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

-- Enable Row Level Security (optional, for later when adding auth)
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VECTOR EMBEDDINGS SETUP
-- ============================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table for storing text chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small uses 1536 dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

-- Create index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Create index for document_id lookups
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id 
    ON document_chunks(document_id);

-- Create index for faster chunk retrieval
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_chunk 
    ON document_chunks(document_id, chunk_index);

-- ============================================
-- CHAT FEATURE TABLES
-- ============================================

-- Conversations table for chat feature
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT, -- Auto-generated from first message or manually set
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation-Document junction table (many-to-many relationship)
-- Enables conversations to have multiple documents as context
CREATE TABLE IF NOT EXISTS conversation_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_documents_conversation 
    ON conversation_documents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_documents_document 
    ON conversation_documents(document_id);

-- Messages table for chat history
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB, -- Retrieved chunk IDs and scores for citations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to update conversations.updated_at when messages are added
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- QUIZ FEATURE TABLES
-- ============================================

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    questions JSONB NOT NULL, -- Array of question objects with answers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz attempts table with partial progress tracking
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    answers JSONB NOT NULL, -- User's submitted answers
    score NUMERIC, -- Overall score (0-100)
    feedback JSONB, -- Detailed feedback per question
    status TEXT CHECK (status IN ('in_progress', 'completed', 'failed')), -- Track grading progress
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SUMMARY FEATURE TABLE
-- ============================================

-- Document summaries table
CREATE TABLE IF NOT EXISTS document_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    key_points JSONB, -- Array of key points with categories
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id) -- One summary per document
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Quizzes indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_document_id ON quizzes(document_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON quizzes(difficulty);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);

-- Quiz attempts indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts(created_at DESC);

-- Document summaries indexes
CREATE INDEX IF NOT EXISTS idx_document_summaries_document_id ON document_summaries(document_id);

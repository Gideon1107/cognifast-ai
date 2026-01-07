-- Migration: Rename Documents to Sources
-- This migration renames all document-related tables, columns, and constraints to "sources"
-- to reflect that we now support both file uploads and web page URLs

-- ============================================
-- STEP 1: Rename main documents table to sources
-- ============================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;

-- Rename table
ALTER TABLE documents RENAME TO sources;

-- Recreate trigger with new table name
CREATE TRIGGER update_sources_updated_at 
    BEFORE UPDATE ON sources 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Rename indexes
DROP INDEX IF EXISTS idx_documents_created_at;
CREATE INDEX IF NOT EXISTS idx_sources_created_at ON sources(created_at DESC);

DROP INDEX IF EXISTS idx_documents_file_type;
CREATE INDEX IF NOT EXISTS idx_sources_file_type ON sources(file_type);

-- ============================================
-- STEP 2: Add source_url column and update file_type constraint
-- ============================================

-- Add source_url column for storing original URLs
ALTER TABLE sources ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Drop old constraint and create new one with 'url' type
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_file_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_file_type_check 
    CHECK (file_type IN ('pdf', 'docx', 'doc', 'txt', 'url'));

-- ============================================
-- STEP 3: Rename document_chunks to source_chunks
-- ============================================

-- Drop non-vector indexes first
DROP INDEX IF EXISTS idx_document_chunks_document_id;
DROP INDEX IF EXISTS idx_document_chunks_document_chunk;

-- Rename table
ALTER TABLE document_chunks RENAME TO source_chunks;

-- Rename column
ALTER TABLE source_chunks RENAME COLUMN document_id TO source_id;

-- For the vector index: We'll drop the old one but NOT recreate it here
-- This avoids memory issues. Run migration 003b separately to create the new index.
-- If you have no data or very little data, you can uncomment the CREATE INDEX below.
DROP INDEX IF EXISTS idx_document_chunks_embedding;

-- Create vector index (commented out to avoid memory issues - run 003b separately if needed)
-- Uncomment below if you have permission to increase maintenance_work_mem or have little data
-- CREATE INDEX IF NOT EXISTS idx_source_chunks_embedding 
--     ON source_chunks USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_source_chunks_source_id 
    ON source_chunks(source_id);

CREATE INDEX IF NOT EXISTS idx_source_chunks_source_chunk 
    ON source_chunks(source_id, chunk_index);

-- Update unique constraint
ALTER TABLE source_chunks DROP CONSTRAINT IF EXISTS document_chunks_document_id_chunk_index_key;
ALTER TABLE source_chunks ADD CONSTRAINT source_chunks_source_id_chunk_index_key 
    UNIQUE(source_id, chunk_index);

-- Update foreign key constraint
ALTER TABLE source_chunks DROP CONSTRAINT IF EXISTS document_chunks_document_id_fkey;
ALTER TABLE source_chunks ADD CONSTRAINT source_chunks_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE;

-- ============================================
-- STEP 4: Rename conversation_documents to conversation_sources
-- ============================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_conversation_documents_conversation;
DROP INDEX IF EXISTS idx_conversation_documents_document;

-- Rename table
ALTER TABLE conversation_documents RENAME TO conversation_sources;

-- Rename column
ALTER TABLE conversation_sources RENAME COLUMN document_id TO source_id;

-- Recreate indexes with new names
CREATE INDEX IF NOT EXISTS idx_conversation_sources_conversation 
    ON conversation_sources(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_sources_source 
    ON conversation_sources(source_id);

-- Update unique constraint
ALTER TABLE conversation_sources DROP CONSTRAINT IF EXISTS conversation_documents_conversation_id_document_id_key;
ALTER TABLE conversation_sources ADD CONSTRAINT conversation_sources_conversation_id_source_id_key 
    UNIQUE(conversation_id, source_id);

-- Update foreign key constraints
ALTER TABLE conversation_sources DROP CONSTRAINT IF EXISTS conversation_documents_document_id_fkey;
ALTER TABLE conversation_sources ADD CONSTRAINT conversation_sources_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE;

-- ============================================
-- STEP 5: Update quizzes table
-- ============================================

-- Drop index first
DROP INDEX IF EXISTS idx_quizzes_document_id;

-- Rename column
ALTER TABLE quizzes RENAME COLUMN document_id TO source_id;

-- Recreate index with new name
CREATE INDEX IF NOT EXISTS idx_quizzes_source_id ON quizzes(source_id);

-- Update foreign key constraint
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_document_id_fkey;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE;

-- ============================================
-- STEP 6: Rename document_summaries to source_summaries
-- ============================================

-- Drop index first
DROP INDEX IF EXISTS idx_document_summaries_document_id;

-- Rename table
ALTER TABLE document_summaries RENAME TO source_summaries;

-- Rename column
ALTER TABLE source_summaries RENAME COLUMN document_id TO source_id;

-- Recreate index with new name
CREATE INDEX IF NOT EXISTS idx_source_summaries_source_id ON source_summaries(source_id);

-- Update unique constraint
ALTER TABLE source_summaries DROP CONSTRAINT IF EXISTS document_summaries_document_id_key;
ALTER TABLE source_summaries ADD CONSTRAINT source_summaries_source_id_key 
    UNIQUE(source_id);

-- Update foreign key constraint
ALTER TABLE source_summaries DROP CONSTRAINT IF EXISTS document_summaries_document_id_fkey;
ALTER TABLE source_summaries ADD CONSTRAINT source_summaries_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE;

-- ============================================
-- Migration complete!
-- All tables, columns, indexes, and constraints have been renamed from "document" to "source"
-- The sources table now supports 'url' as a file_type and has a source_url column
-- ============================================


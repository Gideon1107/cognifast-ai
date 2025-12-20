-- Migration: Multi-Document Context Support
-- This migration enables conversations to have multiple documents as context

-- Step 1: Create junction table for conversation-document relationships
CREATE TABLE IF NOT EXISTS conversation_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, document_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_conversation_documents_conversation 
    ON conversation_documents(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_documents_document 
    ON conversation_documents(document_id);

-- Step 2: Migrate existing conversations to use junction table
-- For each existing conversation with a document_id, create a junction table entry
INSERT INTO conversation_documents (conversation_id, document_id)
SELECT id, document_id 
FROM conversations 
WHERE document_id IS NOT NULL;

-- Step 3: Drop the document_id column from conversations table
ALTER TABLE conversations DROP COLUMN IF EXISTS document_id;

-- Migration complete!
-- All conversations now use the conversation_documents junction table
-- Single document conversations have 1 row in the junction table
-- Multi-document conversations have multiple rows


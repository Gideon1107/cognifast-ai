-- File type constraint on sources
-- (idempotent: silently skips if constraint already exists)
DO $$ BEGIN
    ALTER TABLE sources ADD CONSTRAINT sources_file_type_check
        CHECK (file_type IN ('pdf', 'docx', 'doc', 'txt', 'url'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Trigger function: auto-update the updated_at column on row changes
-- CREATE OR REPLACE means it is safe to run even if the function already exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
--> statement-breakpoint

-- Trigger on sources table
DROP TRIGGER IF EXISTS update_sources_updated_at ON sources;
CREATE TRIGGER update_sources_updated_at
    BEFORE UPDATE ON sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

-- Trigger on conversations table
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

-- IVFFlat index for fast vector cosine-similarity search
-- IF NOT EXISTS makes this safe to re-run
CREATE INDEX IF NOT EXISTS idx_source_chunks_embedding
    ON source_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
--> statement-breakpoint

-- Vector similarity search function
-- DROP IF EXISTS + CREATE OR REPLACE = fully idempotent
DROP FUNCTION IF EXISTS public.match_sources_chunks(vector(1536), integer, uuid[]);
CREATE OR REPLACE FUNCTION public.match_sources_chunks(
    query_embedding vector(1536),
    match_count integer DEFAULT 5,
    filter_source_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    source_id uuid,
    chunk_text text,
    chunk_index integer,
    similarity double precision
)
LANGUAGE sql
AS $$
    SELECT
        sc.id,
        sc.source_id,
        sc.chunk_text,
        sc.chunk_index,
        1 - (sc.embedding <=> query_embedding) AS similarity
    FROM public.source_chunks sc
    WHERE
        sc.embedding IS NOT NULL
        AND (filter_source_ids IS NULL OR sc.source_id = ANY(filter_source_ids))
    ORDER BY sc.embedding <=> query_embedding
    LIMIT match_count;
$$;

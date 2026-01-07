-- Migration: Update vector search function to use source_chunks instead of document_chunks
-- This updates the RPC function to match the new table structure
-- Using array version only - works for both single source (array with one ID) and multiple sources

-- ============================================
-- Drop old functions
-- ============================================

DROP FUNCTION IF EXISTS public.match_document_chunks(vector, integer, uuid);
DROP FUNCTION IF EXISTS public.match_document_chunks(vector(1536), integer, uuid);
DROP FUNCTION IF EXISTS public.match_documents_chunks(vector(1536), integer, uuid[]);

-- ============================================
-- Create/Update multi-source function (array version)
-- Works for both single source [uuid] and multiple sources [uuid1, uuid2, ...]
-- ============================================

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

-- ============================================
-- Migration complete!
-- Function updated:
-- - match_documents_chunks → match_sources_chunks (array version only)
-- All references to document_chunks and document_id updated to source_chunks and source_id
-- Note: Array version works for both single source [uuid] and multiple sources [uuid1, uuid2, ...]
-- ============================================


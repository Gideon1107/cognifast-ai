-- ============================================
-- VECTOR SEARCH FUNCTION for pgvector
-- ============================================
-- This function performs efficient vector similarity search

-- IMPORTANT:
-- - Schema-qualify `public.source_chunks` so the function always reads the intended table.
-- - Use LANGUAGE sql (simpler + matches the direct query behavior you validated).
-- - Keep vector(1536) to match OpenAI text-embedding-3-small.
-- - Array version works for both single source [uuid] and multiple sources [uuid1, uuid2, ...]

-- ============================================
-- Source Chunks Search Function (Array Version)
-- ============================================
-- Filter by an array of source IDs in Postgres (no "search everything then filter in Node").
-- Works for both single source (pass array with one ID) and multiple sources (pass array with multiple IDs).

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

-- Test the function (optional - you can remove this)
-- SELECT * FROM match_sources_chunks(
--     (SELECT embedding FROM source_chunks LIMIT 1),
--     5,
--     NULL
-- );

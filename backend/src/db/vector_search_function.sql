-- ============================================
-- VECTOR SEARCH FUNCTION for pgvector
-- ============================================
-- This function performs efficient vector similarity search

-- IMPORTANT:
-- - Schema-qualify `public.document_chunks` so the function always reads the intended table.
-- - Use LANGUAGE sql (simpler + matches the direct query behavior you validated).
-- - Keep vector(1536) to match OpenAI text-embedding-3-small.

DROP FUNCTION IF EXISTS public.match_document_chunks(vector, integer, uuid);
DROP FUNCTION IF EXISTS public.match_document_chunks(vector(1536), integer, uuid);


CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding vector(1536),
    match_count integer DEFAULT 5,
    filter_document_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    chunk_text text,
    chunk_index integer,
    similarity double precision
)
LANGUAGE sql
AS $$
    SELECT
        dc.id,
        dc.document_id,
        dc.chunk_text,
        dc.chunk_index,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE
        dc.embedding IS NOT NULL
        AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;


-- Multi-document version: filter by an array of document IDs in Postgres (no "search everything then filter in Node").
DROP FUNCTION IF EXISTS public.match_documents_chunks(vector(1536), integer, uuid[]);

CREATE OR REPLACE FUNCTION public.match_documents_chunks(
    query_embedding vector(1536),
    match_count integer DEFAULT 5,
    filter_document_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    chunk_text text,
    chunk_index integer,
    similarity double precision
)
LANGUAGE sql
AS $$
    SELECT
        dc.id,
        dc.document_id,
        dc.chunk_text,
        dc.chunk_index,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE
        dc.embedding IS NOT NULL
        AND (filter_document_ids IS NULL OR dc.document_id = ANY(filter_document_ids))
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Test the function (optional - you can remove this)
-- SELECT * FROM match_documents_chunks(
--     (SELECT embedding FROM document_chunks LIMIT 1),
--     5,
--     NULL
-- );


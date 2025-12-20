-- ============================================
-- VECTOR SEARCH FUNCTION for pgvector (v2)
-- ============================================
-- This version accepts TEXT and casts to vector internally
-- This works around Supabase JS client's inability to pass vector types

-- First, drop the old function to avoid overloading conflicts
DROP FUNCTION IF EXISTS match_document_chunks(vector, INT, UUID);
DROP FUNCTION IF EXISTS match_document_chunks(vector(1536), INT, UUID);

-- Now create the new function that accepts TEXT
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding TEXT,  -- Changed from vector(1536) to TEXT
    match_count INT DEFAULT 5,
    filter_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    chunk_text TEXT,
    chunk_index INT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
    query_vec vector(1536);
BEGIN
    -- Log what we received for debugging
    RAISE NOTICE 'Received query_embedding type: %', pg_typeof(query_embedding);
    RAISE NOTICE 'Received query_embedding length: %', length(query_embedding);
    RAISE NOTICE 'Received query_embedding sample: %', substring(query_embedding, 1, 100);
    
    -- Explicitly cast TEXT to vector with error handling
    BEGIN
        query_vec := query_embedding::vector;
        RAISE NOTICE 'Successfully cast to vector';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to cast embedding to vector: %. Input was: %', SQLERRM, substring(query_embedding, 1, 200);
    END;

    -- Return the query with the casted vector
    RETURN QUERY
    SELECT
        document_chunks.id,
        document_chunks.document_id,
        document_chunks.chunk_text,
        document_chunks.chunk_index,
        1 - (document_chunks.embedding <=> query_vec) AS similarity
    FROM document_chunks
    WHERE 
        document_chunks.embedding IS NOT NULL  -- Ensure embedding exists
        AND CASE 
            WHEN filter_document_id IS NOT NULL THEN document_chunks.document_id = filter_document_id
            ELSE TRUE
        END
    ORDER BY document_chunks.embedding <=> query_vec
    LIMIT match_count;
END;
$$;

-- Test the function
-- SELECT * FROM match_document_chunks(
--     '[0.1,0.2,0.3...]',  -- Now pass as TEXT string
--     5,
--     NULL
-- );


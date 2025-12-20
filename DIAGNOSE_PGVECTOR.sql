-- =============================================
-- COMPREHENSIVE PGVECTOR DIAGNOSIS
-- =============================================
-- Run these queries in Supabase SQL Editor one by one

-- Step 1: Check pgvector extension version
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';


-- Step 2: Check your document and chunks
SELECT 
    d.id,
    d.original_name,
    COUNT(dc.id) as chunk_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
WHERE d.id = 'ed5a04ca-f547-45c6-b38b-b13351802138'
GROUP BY d.id, d.original_name;


-- Step 3: Check if embeddings exist and are valid
-- We can't easily calculate magnitude with pgvector, so just check they exist
SELECT 
    id,
    chunk_index,
    CASE 
        WHEN embedding IS NOT NULL THEN 'Has Embedding'
        ELSE 'Missing Embedding'
    END as status,
    substring(embedding::text, 1, 50) as embedding_preview
FROM document_chunks
WHERE document_id = 'ed5a04ca-f547-45c6-b38b-b13351802138'
ORDER BY chunk_index;


-- Step 4: Test RPC with a known working embedding (from DB itself)
DO $$
DECLARE
    test_result RECORD;
    result_count INTEGER := 0;
BEGIN
    -- Test with the embedding from the database itself (should always work)
    FOR test_result IN 
        SELECT * FROM match_document_chunks(
            (SELECT embedding FROM document_chunks WHERE document_id = 'ed5a04ca-f547-45c6-b38b-b13351802138' LIMIT 1),
            10,
            NULL
        )
    LOOP
        result_count := result_count + 1;
    END LOOP;
    
    RAISE NOTICE 'RPC with DB embedding returned % results', result_count;
    
    IF result_count = 0 THEN
        RAISE WARNING 'RPC failed even with a DB embedding - this is a serious pgvector issue!';
    END IF;
END $$;


-- Step 5: Check if there are any NULL embeddings
SELECT 
    COUNT(*) as total_chunks,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as null_embeddings,
    COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as valid_embeddings
FROM document_chunks
WHERE document_id = 'ed5a04ca-f547-45c6-b38b-b13351802138';


-- Step 6: Try a direct cosine distance query (bypass RPC)
-- This tests if the pgvector operator works at all
SELECT 
    id,
    chunk_index,
    embedding <=> (SELECT embedding FROM document_chunks WHERE document_id = 'ed5a04ca-f547-45c6-b38b-b13351802138' LIMIT 1) as distance,
    1 - (embedding <=> (SELECT embedding FROM document_chunks WHERE document_id = 'ed5a04ca-f547-45c6-b38b-b13351802138' LIMIT 1)) as similarity
FROM document_chunks
WHERE document_id = 'ed5a04ca-f547-45c6-b38b-b13351802138'
ORDER BY embedding <=> (SELECT embedding FROM document_chunks WHERE document_id = 'ed5a04ca-f547-45c6-b38b-b13351802138' LIMIT 1)
LIMIT 10;


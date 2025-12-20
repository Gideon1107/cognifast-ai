-- ============================================
-- TEST VECTOR FUNCTION
-- ============================================
-- Run these queries in Supabase SQL Editor to debug the issue

-- Test 1: Check if embeddings exist and are valid
SELECT 
    id,
    document_id,
    chunk_index,
    embedding IS NOT NULL as has_embedding,
    pg_typeof(embedding) as embedding_type,
    array_length(embedding::text::json::text[]::float[], 1) as embedding_dimension
FROM document_chunks
LIMIT 3;

-- Expected: has_embedding = true, embedding_type = vector, embedding_dimension = 1536


-- Test 2: Get a sample embedding from the database
SELECT embedding::text as embedding_string
FROM document_chunks
LIMIT 1;

-- Copy the output (it will be like "[0.1,0.2,0.3,...]")


-- Test 3: Test the function with a real embedding from the database
-- Replace the embedding string below with the output from Test 2
SELECT * FROM match_document_chunks(
    (SELECT embedding::text FROM document_chunks LIMIT 1),  -- Use actual DB embedding
    5,
    NULL
);

-- Expected: Should return 5 chunks with high similarity


-- Test 4: Test with explicit TEXT casting
SELECT * FROM match_document_chunks(
    '[0.1,0.2,0.3]'::text,  -- Dummy short vector for testing
    5,
    NULL
);

-- This will likely fail if dimension doesn't match, which is good - means casting works!


-- Test 5: Check if the distance operator works
SELECT 
    id,
    chunk_text,
    1 - (embedding <=> (SELECT embedding FROM document_chunks LIMIT 1)) AS similarity
FROM document_chunks
ORDER BY embedding <=> (SELECT embedding FROM document_chunks LIMIT 1)
LIMIT 5;

-- Expected: Should return 5 chunks with similarity scores


-- Test 6: Test the TEXT to vector casting explicitly
SELECT 
    '[0.1,0.2]'::text::vector as test_cast;

-- If this fails, pgvector doesn't support TEXT::vector casting
-- If it works, the casting itself is fine


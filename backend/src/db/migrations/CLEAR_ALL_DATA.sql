-- ============================================
-- CLEAR ALL DATA FROM DATABASE
-- ============================================
-- WARNING: This script will delete ALL data from all tables!
-- Use only for development/testing/cleanup purposes.
-- ============================================

-- Disable foreign key checks temporarily (PostgreSQL doesn't support this directly,
-- but we'll delete in the correct order to respect foreign keys)

-- Delete in order of dependencies (child tables first, then parent tables)

-- 1. Delete quiz attempts (references quizzes)
TRUNCATE TABLE quiz_attempts CASCADE;

-- 2. Delete quizzes (references sources)
TRUNCATE TABLE quizzes CASCADE;

-- 3. Delete source summaries (references sources)
TRUNCATE TABLE source_summaries CASCADE;

-- 4. Delete messages (references conversations)
TRUNCATE TABLE messages CASCADE;

-- 5. Delete conversation_sources junction table (references both conversations and sources)
TRUNCATE TABLE conversation_sources CASCADE;

-- 6. Delete conversations
TRUNCATE TABLE conversations CASCADE;

-- 7. Delete source_chunks (references sources)
TRUNCATE TABLE source_chunks CASCADE;

-- 8. Delete sources (parent table - delete last)
TRUNCATE TABLE sources CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run these queries to verify all tables are empty:

-- SELECT 'sources' as table_name, COUNT(*) as row_count FROM sources
-- UNION ALL
-- SELECT 'source_chunks', COUNT(*) FROM source_chunks
-- UNION ALL
-- SELECT 'conversations', COUNT(*) FROM conversations
-- UNION ALL
-- SELECT 'conversation_sources', COUNT(*) FROM conversation_sources
-- UNION ALL
-- SELECT 'messages', COUNT(*) FROM messages
-- UNION ALL
-- SELECT 'quizzes', COUNT(*) FROM quizzes
-- UNION ALL
-- SELECT 'quiz_attempts', COUNT(*) FROM quiz_attempts
-- UNION ALL
-- SELECT 'source_summaries', COUNT(*) FROM source_summaries;


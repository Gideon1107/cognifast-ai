-- Migration: Update quiz tables for new quiz flow
-- - quizzes: drop source_id and difficulty, add conversation_id
-- - quiz_attempts: drop feedback, update status constraint

-- ============================================
-- QUIZZES TABLE UPDATES
-- ============================================

-- Drop old indexes first
DROP INDEX IF EXISTS idx_quizzes_source_id;
DROP INDEX IF EXISTS idx_quizzes_difficulty;

-- Add conversation_id column
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- Drop source_id column (quiz sources are now derived from conversation_sources)
ALTER TABLE quizzes DROP COLUMN IF EXISTS source_id;

-- Drop difficulty column
ALTER TABLE quizzes DROP COLUMN IF EXISTS difficulty;

-- Create new index for conversation_id
CREATE INDEX IF NOT EXISTS idx_quizzes_conversation_id ON quizzes(conversation_id);

-- ============================================
-- QUIZ_ATTEMPTS TABLE UPDATES
-- ============================================

-- Drop feedback column (Explain uses chat instead)
ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS feedback;

-- Update status constraint (remove 'failed' status)
ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_status_check;
ALTER TABLE quiz_attempts ADD CONSTRAINT quiz_attempts_status_check 
    CHECK (status IN ('in_progress', 'completed'));

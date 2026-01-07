-- Quick fix for file_type constraint to allow 'url'
-- Run this in Supabase SQL Editor if you're getting the constraint violation error

-- Drop both old and new constraint names
ALTER TABLE sources DROP CONSTRAINT IF EXISTS documents_file_type_check;
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_file_type_check;

-- Add new constraint with 'url' included
ALTER TABLE sources ADD CONSTRAINT sources_file_type_check 
    CHECK (file_type IN ('pdf', 'docx', 'doc', 'txt', 'url'));


ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "sources" DROP COLUMN IF EXISTS "conversation_id";

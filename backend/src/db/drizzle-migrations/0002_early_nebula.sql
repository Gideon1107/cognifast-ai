ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "conversation_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sources" ADD CONSTRAINT "sources_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
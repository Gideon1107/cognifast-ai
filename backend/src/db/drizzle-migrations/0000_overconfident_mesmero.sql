CREATE TABLE "conversation_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "conversation_sources_conversation_id_source_id_key" UNIQUE("conversation_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"role" text,
	"content" text NOT NULL,
	"sources" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid,
	"answers" jsonb NOT NULL,
	"score" numeric,
	"status" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"questions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"chunk_text" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "source_chunks_source_id_chunk_index_key" UNIQUE("source_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "source_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid,
	"summary" text NOT NULL,
	"key_points" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "source_summaries_source_id_key" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_type" varchar(10) NOT NULL,
	"file_size" bigint NOT NULL,
	"file_path" text NOT NULL,
	"source_url" text,
	"extracted_text" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "conversation_sources" ADD CONSTRAINT "conversation_sources_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_sources" ADD CONSTRAINT "conversation_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_summaries" ADD CONSTRAINT "source_summaries_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conversation_sources_conversation" ON "conversation_sources" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_sources_source" ON "conversation_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_created_at" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_id" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_messages_created_at" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_quiz_id" ON "quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_status" ON "quiz_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_created_at" ON "quiz_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_quizzes_conversation_id" ON "quizzes" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_quizzes_created_at" ON "quizzes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_source_chunks_source_id" ON "source_chunks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_source_chunks_source_chunk" ON "source_chunks" USING btree ("source_id","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_source_summaries_source_id" ON "source_summaries" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_sources_created_at" ON "sources" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_sources_file_type" ON "sources" USING btree ("file_type");
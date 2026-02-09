import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { conversations } from './conversations';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').references(
      () => conversations.id,
      { onDelete: 'cascade' }
    ),
    role: text('role'), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    sources: jsonb('sources'), // Retrieved chunk IDs and scores for citations
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_messages_conversation_id').on(table.conversationId),
    index('idx_messages_created_at').on(table.createdAt),
  ]
);

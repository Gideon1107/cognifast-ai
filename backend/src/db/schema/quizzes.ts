import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { conversations } from './conversations';

export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').references(
      () => conversations.id,
      { onDelete: 'cascade' }
    ),
    questions: jsonb('questions').notNull(), // Array of Question objects
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_quizzes_conversation_id').on(table.conversationId),
    index('idx_quizzes_created_at').on(table.createdAt),
  ]
);

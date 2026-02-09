import {
  pgTable,
  uuid,
  jsonb,
  numeric,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { quizzes } from './quizzes';

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id').references(() => quizzes.id, {
      onDelete: 'cascade',
    }),
    answers: jsonb('answers').notNull(), // Array of AttemptAnswer objects
    score: numeric('score'), // 0-100
    status: text('status'), // 'in_progress' | 'completed'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_quiz_attempts_quiz_id').on(table.quizId),
    index('idx_quiz_attempts_status').on(table.status),
    index('idx_quiz_attempts_created_at').on(table.createdAt),
  ]
);

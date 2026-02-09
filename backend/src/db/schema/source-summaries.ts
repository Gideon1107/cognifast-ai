import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { sources } from './sources';

export const sourceSummaries = pgTable(
  'source_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id').references(() => sources.id, {
      onDelete: 'cascade',
    }),
    summary: text('summary').notNull(),
    keyPoints: jsonb('key_points'), // Array of key points with categories
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('source_summaries_source_id_key').on(table.sourceId),
    index('idx_source_summaries_source_id').on(table.sourceId),
  ]
);

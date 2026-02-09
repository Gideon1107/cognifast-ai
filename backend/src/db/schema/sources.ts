import {
  pgTable,
  uuid,
  varchar,
  bigint,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

export const sources = pgTable(
  'sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    filename: varchar('filename', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    fileType: varchar('file_type', { length: 10 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    filePath: text('file_path').notNull(),
    sourceUrl: text('source_url'),
    extractedText: text('extracted_text'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_sources_created_at').on(table.createdAt),
    index('idx_sources_file_type').on(table.fileType),
  ]
);

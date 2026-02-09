import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  unique,
  customType,
} from 'drizzle-orm/pg-core';
import { sources } from './sources';

// Custom type for pgvector's vector(1536)
const vector = customType<{ data: number[]; driverValue: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    // Postgres returns vectors as "[0.1,0.2,...]"
    const str = typeof value === 'string' ? value : String(value);
    return str
      .replace(/[\[\]]/g, '')
      .split(',')
      .map(Number);
  },
});

export const sourceChunks = pgTable(
  'source_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    chunkText: text('chunk_text').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    embedding: vector('embedding'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('source_chunks_source_id_chunk_index_key').on(
      table.sourceId,
      table.chunkIndex
    ),
    index('idx_source_chunks_source_id').on(table.sourceId),
    index('idx_source_chunks_source_chunk').on(table.sourceId, table.chunkIndex),
  ]
);

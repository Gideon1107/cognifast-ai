/**
 * Shared retrieval types (RAG / vector search)
 */

import type { SourceType } from './entities';

/**
 * Retrieved chunk with similarity score (used by RAG and citations)
 */
export interface RetrievedChunk {
    id: string;
    sourceId: string;
    sourceName: string;
    sourceType?: SourceType;
    chunkText: string;
    chunkIndex: number;
    similarity: number; // 0-1, higher is more similar
}

/**
 * Row shape returned by match_sources_chunks PostgreSQL RPC
 */
export interface MatchChunkRow {
    id: string;
    source_id: string;
    chunk_text: string;
    chunk_index: number;
    similarity: number;
}

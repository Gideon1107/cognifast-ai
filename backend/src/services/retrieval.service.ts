import { db, pool } from '../db/dbConnection';
import { sources, sourceChunks } from '../db/schema';
import { inArray, eq, asc } from 'drizzle-orm';
import type { RetrievedChunk, MatchChunkRow, SourceType } from '@shared/types';
import { EmbeddingService } from './embedding.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('RETRIEVAL-SERVICE');

/**
 * Retrieval Service - Handles vector similarity search
 */
export class RetrievalService {
    private embeddingService: EmbeddingService;

    constructor() {
        this.embeddingService = new EmbeddingService();
    }

    /**
     * Retrieve relevant chunks using vector similarity search
     *
     * @param query - User's question or search query
     * @param sourceIds - Array of source IDs to search within
     * @param topK - Number of chunks to return (default: 5)
     * @returns Array of retrieved chunks with similarity scores
     */
    async retrieveRelevantChunks(
        query: string,
        sourceIds: string[],
        topK: number = 5
    ): Promise<RetrievedChunk[]> {
        try {
            logger.info(`Retrieving top ${topK} chunks for query: "${query.substring(0, 50)}..." from ${sourceIds.length} source(s)`);
            if (!sourceIds || sourceIds.length === 0) {
                throw new Error('sourceIds must be a non-empty array');
            }

            // Generate query embedding
            const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);
            logger.info(`Generated embedding of length: ${queryEmbedding.length}`);

            const hasNaN = queryEmbedding.some(v => isNaN(v));
            const hasInfinity = queryEmbedding.some(v => !isFinite(v));
            const allZeros = queryEmbedding.every(v => v === 0);

            if (hasNaN || hasInfinity || allZeros) {
                logger.error(`Invalid embedding detected!`, { hasNaN, hasInfinity, allZeros });
                throw new Error('Invalid embedding generated');
            }

            // Call match_sources_chunks PostgreSQL function with embedding and source filter
            const matchCount = topK;
            logger.debug(`=== RPC CALL DETAILS ===`);
            logger.debug(`Requested sourceIds: [${sourceIds.join(', ')}]`);
            logger.debug(`Match count: ${matchCount}, topK: ${topK}`);

            const embeddingStr = `[${queryEmbedding.join(',')}]`;

            let data: MatchChunkRow[] | null = null;
            try {
                const result = await pool.query<MatchChunkRow>(
                    'SELECT * FROM match_sources_chunks($1::vector, $2::integer, $3::uuid[])',
                    [embeddingStr, matchCount, sourceIds]
                );
                data = result.rows;
            } catch (rpcError: any) {
                logger.error(`RPC error: ${rpcError.message}`);
                logger.warn(`Falling back to direct search`);
                return await this.directSearch(queryEmbedding, sourceIds, topK);
            }

            logger.debug(`RPC returned ${data?.length ?? 0} total chunks`);
            if (data && data.length > 0) {
                const returnedSourceIds = [...new Set(data.map(d => d.source_id))];
                logger.debug(`RPC returned chunks from sources: [${returnedSourceIds.join(', ')}]`);
            }

            if (!data || data.length === 0) {
                logger.error(`RPC returned 0 chunks!`);
                
                const chunkRows = await db
                    .select({ sourceId: sourceChunks.sourceId })
                    .from(sourceChunks)
                    .where(inArray(sourceChunks.sourceId, sourceIds))
                    .limit(1);
                if (chunkRows.length > 0) {
                    logger.error(`Chunks exist in DB for these sources:`, chunkRows.length);
                    logger.warn(`Falling back to direct search`);
                    return await this.directSearch(queryEmbedding, sourceIds, topK);
                }
            }

            const topChunks = data.slice(0, topK);
            const enrichedChunks = await this.enrichWithSourceNames(topChunks);

            const avgSimilarity = enrichedChunks.reduce((sum, c) => sum + c.similarity, 0) / enrichedChunks.length;
            logger.info(`RPC SUCCESS: ${enrichedChunks.length} chunks, avg similarity: ${avgSimilarity.toFixed(3)}`);
            return enrichedChunks;
        } catch (error: any) {
            logger.error(`Error in retrieveRelevantChunks: ${error.message}`);
            throw new Error(`Failed to retrieve chunks: ${error.message}`);
        }
    }

    /**
     * Enrich chunks with source names and types from sources table
     */
    private async enrichWithSourceNames(chunks: MatchChunkRow[]): Promise<RetrievedChunk[]> {
        try {
            const sourceIds = [...new Set(chunks.map(c => c.source_id))];
            const sourceRows = await db
                .select({ id: sources.id, originalName: sources.originalName, fileType: sources.fileType })
                .from(sources)
                .where(inArray(sources.id, sourceIds));

            const sourceNameMap = new Map(sourceRows.map(s => [s.id, s.originalName]));
            const sourceTypeMap = new Map(
                sourceRows.map(s => [s.id, s.fileType as SourceType])
            );

            return chunks.map(chunk => ({
                id: chunk.id,
                sourceId: chunk.source_id,
                sourceName: sourceNameMap.get(chunk.source_id) ?? 'Unknown',
                sourceType: sourceTypeMap.get(chunk.source_id),
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: Number(chunk.similarity),
            }));
        } catch (error: any) {
            logger.error(`Error enriching with source names: ${error.message}`);
            return chunks.map(chunk => ({
                id: chunk.id,
                sourceId: chunk.source_id,
                sourceName: 'Unknown',
                sourceType: undefined,
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: Number(chunk.similarity),
            }));
        }
    }

    /**
     * Direct database search using manual cosine similarity when RPC fails or returns no rows
     */
    private async directSearch(
        queryEmbedding: number[],
        sourceIds: string[],
        topK: number
    ): Promise<RetrievedChunk[]> {
        try {
            logger.info(`Performing direct search for ${sourceIds.length} source(s)`);

            // Get chunks from specified sources 
            const chunkRows = await db
                .select({
                    id: sourceChunks.id,
                    sourceId: sourceChunks.sourceId,
                    chunkText: sourceChunks.chunkText,
                    chunkIndex: sourceChunks.chunkIndex,
                    embedding: sourceChunks.embedding,
                })
                .from(sourceChunks)
                .where(inArray(sourceChunks.sourceId, sourceIds))
                .limit(100);

            if (chunkRows.length === 0) return [];
            logger.info(`Retrieved ${chunkRows.length} chunks from database`);

            // Calculate cosine similarity manually for each chunk
            const chunksWithSimilarity: Array<{
                id: string;
                source_id: string;
                chunk_text: string;
                chunk_index: number;
                similarity: number;
            }> = [];

            for (const chunk of chunkRows) {
                try {
                    const emb = chunk.embedding;
                    if (!emb || !Array.isArray(emb)) {
                        logger.error(`Invalid embedding for chunk ${chunk.id}`);
                        continue;
                    }
                    const similarity = this.cosineSimilarity(queryEmbedding, emb);
                    chunksWithSimilarity.push({
                        id: chunk.id,
                        source_id: chunk.sourceId,
                        chunk_text: chunk.chunkText,
                        chunk_index: chunk.chunkIndex,
                        similarity,
                    });
                } catch (err: any) {
                    logger.error(`Error processing chunk ${chunk.id}: ${err.message}`);
                }
            }

            // Sort by similarity (highest first) and take top K
            chunksWithSimilarity.sort((a, b) => b.similarity - a.similarity);
            const topChunks = chunksWithSimilarity.slice(0, topK);

            logger.debug(`Direct search found ${chunksWithSimilarity.length} chunks total`);
            logger.info(`Returning ${topChunks.length} chunks, top similarity: ${topChunks[0]?.similarity.toFixed(3) ?? 'N/A'}`);

            // Add source names and types
            const enriched = topChunks.map(c => ({
                id: c.id,
                sourceId: c.source_id,
                chunkText: c.chunk_text,
                chunkIndex: c.chunk_index,
                similarity: c.similarity,
            }));
            const uniqueSourceIds = [...new Set(enriched.map(c => c.sourceId))];
            const sourceRows = await db
                .select({ id: sources.id, originalName: sources.originalName, fileType: sources.fileType })
                .from(sources)
                .where(inArray(sources.id, uniqueSourceIds));

            const sourceNameMap = new Map(sourceRows.map(s => [s.id, s.originalName]));
            const sourceTypeMap = new Map(sourceRows.map(s => [s.id, s.fileType as SourceType]));

            return enriched.map(chunk => ({
                ...chunk,
                sourceName: sourceNameMap.get(chunk.sourceId) ?? 'Unknown',
                sourceType: sourceTypeMap.get(chunk.sourceId),
            }));
        } catch (error: any) {
            logger.error(`Direct search failed: ${error.message}`);
            throw new Error(`Direct search failed: ${error.message}`);
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            logger.error(`Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
            throw new Error(`Vectors must have same length: ${vecA.length} vs ${vecB.length}`);
        }
        let dotProduct = 0, normA = 0, normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Get all chunks for a specific source (for summary generation)
     */
    async getAllChunksForSource(sourceId: string): Promise<RetrievedChunk[]> {
        try {
            logger.info(`Fetching all chunks for source: ${sourceId}`);

            const chunkRows = await db
                .select({
                    id: sourceChunks.id,
                    sourceId: sourceChunks.sourceId,
                    chunkText: sourceChunks.chunkText,
                    chunkIndex: sourceChunks.chunkIndex,
                })
                .from(sourceChunks)
                .where(eq(sourceChunks.sourceId, sourceId))
                .orderBy(asc(sourceChunks.chunkIndex));

            if (chunkRows.length === 0) {
                logger.warn(`No chunks found for source: ${sourceId}`);
                return [];
            }
            logger.info(`Retrieved ${chunkRows.length} chunks for source`);

            const [sourceRow] = await db
                .select({ originalName: sources.originalName, fileType: sources.fileType })
                .from(sources)
                .where(eq(sources.id, sourceId))
                .limit(1);

            const sourceName = sourceRow?.originalName ?? 'Unknown';
            const sourceType = sourceRow?.fileType as SourceType | undefined;

            return chunkRows.map(chunk => ({
                id: chunk.id,
                sourceId: chunk.sourceId,
                sourceName,
                sourceType,
                chunkText: chunk.chunkText,
                chunkIndex: chunk.chunkIndex,
                similarity: 1.0,
            }));
        } catch (error: any) {
            throw new Error(`Failed to get source chunks: ${error.message}`);
        }
    }

    /**
     * Get all chunks for multiple sources (for quiz generation)
     */
    async getAllChunksForSources(sourceIds: string[]): Promise<RetrievedChunk[]> {
        try {
            if (sourceIds.length === 0) return [];
            logger.info(`Fetching all chunks for ${sourceIds.length} source(s)`);

            const chunkRows = await db
                .select({
                    id: sourceChunks.id,
                    sourceId: sourceChunks.sourceId,
                    chunkText: sourceChunks.chunkText,
                    chunkIndex: sourceChunks.chunkIndex,
                })
                .from(sourceChunks)
                .where(inArray(sourceChunks.sourceId, sourceIds))
                .orderBy(asc(sourceChunks.chunkIndex));

            if (chunkRows.length === 0) {
                logger.warn(`No chunks found for sources: ${sourceIds.join(', ')}`);
                return [];
            }
            logger.info(`Retrieved ${chunkRows.length} total chunks for ${sourceIds.length} source(s)`);

            const uniqueSourceIds = [...new Set(chunkRows.map(c => c.sourceId))];
            const sourceRows = await db
                .select({ id: sources.id, originalName: sources.originalName, fileType: sources.fileType })
                .from(sources)
                .where(inArray(sources.id, uniqueSourceIds));

            const sourceNameMap = new Map(sourceRows.map(s => [s.id, s.originalName]));
            const sourceTypeMap = new Map(
                sourceRows.map(s => [s.id, s.fileType as SourceType])
            );

            return chunkRows.map(chunk => ({
                id: chunk.id,
                sourceId: chunk.sourceId,
                sourceName: sourceNameMap.get(chunk.sourceId) ?? 'Unknown',
                sourceType: sourceTypeMap.get(chunk.sourceId),
                chunkText: chunk.chunkText,
                chunkIndex: chunk.chunkIndex,
                similarity: 1.0,
            }));
        } catch (error: any) {
            logger.error(`Failed to get chunks for sources: ${error.message}`);
            throw new Error(`Failed to get chunks for sources: ${error.message}`);
        }
    }

    /**
     * Get a balanced random sample of chunks across multiple sources (for quiz generation).
     * Distributes the limit evenly across sources so every source is represented,
     * then randomises within each source so quizzes vary each time.
     *
     * @param sourceIds - Source IDs to sample from
     * @param limit - Total number of chunks to return (default 20)
     */
    async getBalancedRandomChunks(sourceIds: string[], limit: number = 20): Promise<RetrievedChunk[]> {
        try {
            if (sourceIds.length === 0) return [];

            const perSource = Math.ceil(limit / sourceIds.length);

            logger.info(
                `Fetching up to ${limit} balanced random chunks (${perSource}/source) for ${sourceIds.length} source(s)`
            );

            const result = await pool.query<{
                id: string;
                source_id: string;
                chunk_text: string;
                chunk_index: number;
            }>(
                `SELECT id, source_id, chunk_text, chunk_index
                 FROM (
                     SELECT id, source_id, chunk_text, chunk_index,
                            ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY RANDOM()) AS rn
                     FROM source_chunks
                     WHERE source_id = ANY($1::uuid[])
                 ) sub
                 WHERE rn <= $2
                 ORDER BY RANDOM()
                 LIMIT $3`,
                [sourceIds, perSource, limit]
            );

            const rowArray = result.rows;

            if (!rowArray || rowArray.length === 0) {
                logger.warn(`No chunks found for sources: ${sourceIds.join(', ')}`);
                return [];
            }

            logger.info(`Retrieved ${rowArray.length} balanced random chunks`);

            // Enrich with source names / types
            const uniqueSourceIds = [...new Set(rowArray.map(c => c.source_id))];
            const sourceRows = await db
                .select({ id: sources.id, originalName: sources.originalName, fileType: sources.fileType })
                .from(sources)
                .where(inArray(sources.id, uniqueSourceIds));

            const sourceNameMap = new Map(sourceRows.map(s => [s.id, s.originalName]));
            const sourceTypeMap = new Map(
                sourceRows.map(s => [s.id, s.fileType as SourceType])
            );

            return rowArray.map(chunk => ({
                id: chunk.id,
                sourceId: chunk.source_id,
                sourceName: sourceNameMap.get(chunk.source_id) ?? 'Unknown',
                sourceType: sourceTypeMap.get(chunk.source_id),
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: 1.0,
            }));
        } catch (error: any) {
            logger.error(`Failed to get balanced random chunks: ${error.message}`);
            throw new Error(`Failed to get balanced random chunks: ${error.message}`);
        }
    }

    /**
     * Get specific chunks by their IDs (for citation retrieval)
     */
    async getChunksByIds(chunkIds: string[]): Promise<RetrievedChunk[]> {
        try {
            if (chunkIds.length === 0) return [];

            const chunkRows = await db
                .select({
                    id: sourceChunks.id,
                    sourceId: sourceChunks.sourceId,
                    chunkText: sourceChunks.chunkText,
                    chunkIndex: sourceChunks.chunkIndex,
                })
                .from(sourceChunks)
                .where(inArray(sourceChunks.id, chunkIds));

            if (chunkRows.length === 0) return [];

            const sourceIds = [...new Set(chunkRows.map(c => c.sourceId))];
            const sourceRows = await db
                .select({ id: sources.id, originalName: sources.originalName, fileType: sources.fileType })
                .from(sources)
                .where(inArray(sources.id, sourceIds));

            const sourceNameMap = new Map(sourceRows.map(s => [s.id, s.originalName]));
            const sourceTypeMap = new Map(
                sourceRows.map(s => [s.id, s.fileType as SourceType])
            );

            return chunkRows.map(chunk => ({
                id: chunk.id,
                sourceId: chunk.sourceId,
                sourceName: sourceNameMap.get(chunk.sourceId) ?? 'Unknown',
                sourceType: sourceTypeMap.get(chunk.sourceId),
                chunkText: chunk.chunkText,
                chunkIndex: chunk.chunkIndex,
                similarity: 1.0,
            }));
        } catch (error: any) {
            logger.error(`Failed to get chunks by IDs: ${error.message}`);
            throw new Error(`Failed to get chunks by IDs: ${error.message}`);
        }
    }
}

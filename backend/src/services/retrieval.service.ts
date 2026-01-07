import supabase from '../db/dbConnection';
import { EmbeddingService } from './embedding.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('RETRIEVAL-SERVICE');

/**
 * Retrieved chunk with similarity score
 */
export interface RetrievedChunk {
    id: string;
    sourceId: string; 
    sourceName: string;
    chunkText: string;
    chunkIndex: number;
    similarity: number; // 0-1, higher is more similar
}

/**
 * Retrieval Service - Handles vector similarity search for RAG
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
     * @param sourceIds - Array of source IDs to search within (renamed from documentIds)
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

            // Step 1: Generate query embedding
            const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);
            logger.info(`Generated embedding of length: ${queryEmbedding.length}`);
            
            // Validate embedding
            const hasNaN = queryEmbedding.some(v => isNaN(v));
            const hasInfinity = queryEmbedding.some(v => !isFinite(v));
            const allZeros = queryEmbedding.every(v => v === 0);
            
            if (hasNaN || hasInfinity || allZeros) {
                logger.error(`Invalid embedding detected!`, {
                    hasNaN,
                    hasInfinity,
                    allZeros
                });
                throw new Error('Invalid embedding generated');
            }
            
            // Step 2: Call RPC with detailed diagnostics
            const matchCount = topK;
            
            logger.debug(`=== RPC CALL DETAILS ===`);
            logger.debug(`Requested sourceIds: [${sourceIds.join(', ')}]`);
            logger.debug(`Match count: ${matchCount}, topK: ${topK}`);
            
            const { data, error } = await supabase.rpc('match_sources_chunks', {
                query_embedding: queryEmbedding,
                match_count: matchCount,
                filter_source_ids: sourceIds
            });

            if (error) {
                logger.error(JSON.stringify(error, null, 2));
                logger.error(`RPC error: ${error.message}`);
                logger.warn(`Falling back to direct search`);
                return await this.directSearch(queryEmbedding, sourceIds, topK);
            }

            logger.debug(`RPC returned ${data?.length || 0} total chunks`);
            
            if (data && data.length > 0) {
                const returnedSourceIds = [...new Set(data.map((d: any) => d.source_id))];
                logger.debug(`RPC returned chunks from sources: [${returnedSourceIds.join(', ')}]`);
            }

            if (!data || data.length === 0) {
                logger.error(`⚠️ RPC returned 0 chunks!`);
                
                // Check if chunks exist for these source IDs
                const { data: chunkCount } = await supabase
                    .from('source_chunks')
                    .select('source_id', { count: 'exact' })
                    .in('source_id', sourceIds);
                
                logger.error(`Chunks exist in DB for these sources:`, chunkCount?.length || 0);
                logger.warn(`Falling back to direct search`);
                return await this.directSearch(queryEmbedding, sourceIds, topK);
            }

            const topChunks = data.slice(0, topK);

            const enrichedChunks = await this.enrichWithSourceNames(topChunks);
            
            // Filter out page markers and very short chunks (likely formatting artifacts)
            const filteredChunks = enrichedChunks.filter(chunk => {
                const text = chunk.chunkText.trim();
                // Filter out page markers like "-- 1 of 4 --" or "-- X of Y --"
                const isPageMarker = /^--\s*\d+\s+of\s+\d+\s*--$/i.test(text);
                // Filter out very short chunks (< 30 chars) that are likely formatting
                const isTooShort = text.length < 30;
                return !isPageMarker && !isTooShort;
            });

            // If we filtered out chunks, try to get more to reach topK
            let finalChunks = filteredChunks;
            if (filteredChunks.length < topK && data.length > topK) {
                logger.warn(`Only ${filteredChunks.length} chunks after filtering, trying to get more...`);
                // Get more chunks and filter them - expand search to up to 3x topK
                const additionalChunks = data.slice(topK, Math.min(topK * 3, data.length));
                const enrichedAdditional = await this.enrichWithSourceNames(additionalChunks);
                const filteredAdditional = enrichedAdditional.filter(chunk => {
                    const text = chunk.chunkText.trim();
                    const isPageMarker = /^--\s*\d+\s+of\s+\d+\s*--$/i.test(text);
                    const isTooShort = text.length < 30;
                    return !isPageMarker && !isTooShort;
                });
                finalChunks = [...filteredChunks, ...filteredAdditional].slice(0, topK);
                logger.info(`After getting more chunks: ${finalChunks.length} total`);
            }

            if (finalChunks.length === 0) {
                logger.error(`⚠️ All chunks were filtered out! Original: ${enrichedChunks.length}, After filter: 0`);
                // Return original chunks if all were filtered
                logger.warn(`Returning unfiltered chunks to avoid empty results`);
                return enrichedChunks.slice(0, topK);
            }

            const avgSimilarity = finalChunks.reduce((sum, c) => sum + c.similarity, 0) / finalChunks.length;
            logger.info(`✅ RPC SUCCESS: ${finalChunks.length} chunks (filtered from ${enrichedChunks.length}), avg similarity: ${avgSimilarity.toFixed(3)}`);

            return finalChunks;

        } catch (error: any) {
            logger.error(`Error in retrieveRelevantChunks: ${error.message}`);
            throw new Error(`Failed to retrieve chunks: ${error.message}`);
        }
    }

    /**
     * Enrich chunks with source names
     */
    private async enrichWithSourceNames(chunks: any[]): Promise<RetrievedChunk[]> {
        try {
            // Get unique source IDs
            const sourceIds = [...new Set(chunks.map((c: any) => c.source_id))];
            
            // Fetch source names
            const { data: sources, error } = await supabase
                .from('sources')
                .select('id, original_name')
                .in('id', sourceIds);
            
            if (error) throw error;
            
            // Create a map of source ID to source name
            const sourceMap = new Map(
                (sources || []).map((s: any) => [s.id, s.original_name])
            );
            
            // Map chunks with source names
            return chunks.map((chunk: any) => ({
                id: chunk.id,
                sourceId: chunk.source_id,
                sourceName: sourceMap.get(chunk.source_id) || 'Unknown',
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: Number(chunk.similarity)
            }));
        } catch (error: any) {
            logger.error(`Error enriching with source names: ${error.message}`);
            // Return chunks without names as fallback
            return chunks.map((chunk: any) => ({
                id: chunk.id,
                sourceId: chunk.source_id,
                sourceName: 'Unknown',
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: Number(chunk.similarity)
            }));
        }
    }

    /**
     * Direct database search using manual similarity calculation
     * More reliable than RPC for pgvector in Supabase JS client
     */
    private async directSearch(
        queryEmbedding: number[],
        sourceIds: string[],
        topK: number
    ): Promise<RetrievedChunk[]> {
        try {
            logger.info(`Performing direct search for ${sourceIds.length} source(s)`);

            // Get all chunks from specified sources
            const { data, error } = await supabase
                .from('source_chunks')
                .select('id, source_id, chunk_text, chunk_index, embedding')
                .in('source_id', sourceIds)
                .limit(100); // Get more chunks for manual filtering

            if (error) throw error;
            if (!data || data.length === 0) return [];

            logger.info(`Retrieved ${data.length} chunks from database`);

            // Calculate cosine similarity manually
            const chunksWithSimilarity: Array<{
                id: string;
                source_id: string;
                chunk_text: string;
                chunk_index: number;
                similarity: number;
            }> = [];

            for (const chunk of data) {
                try {
                    // Parse embedding
                    let chunkEmbedding: number[];
                    if (typeof chunk.embedding === 'string') {
                        // Remove brackets and parse
                        chunkEmbedding = JSON.parse(chunk.embedding);
                    } else if (Array.isArray(chunk.embedding)) {
                        chunkEmbedding = chunk.embedding;
                    } else {
                        logger.error(`Invalid embedding format for chunk ${chunk.id}`);
                        continue;
                    }

                    const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
                    chunksWithSimilarity.push({
                        id: chunk.id,
                        source_id: chunk.source_id,
                        chunk_text: chunk.chunk_text,
                        chunk_index: chunk.chunk_index,
                        similarity: similarity
                    });
                } catch (error: any) {
                    logger.error(`Error processing chunk ${chunk.id}: ${error.message}`);
                    // Skip this chunk and continue
                }
            }

            // Sort by similarity (highest first) and take top K
            chunksWithSimilarity.sort((a, b) => b.similarity - a.similarity);
            const topChunks = chunksWithSimilarity.slice(0, topK);

            logger.debug(`Direct search found ${chunksWithSimilarity.length} chunks total`);
            logger.debug(`Top 5 similarities:`, 
                chunksWithSimilarity.slice(0, 5).map(c => c.similarity.toFixed(3))
            );
            logger.info(`Returning ${topChunks.length} chunks, top similarity: ${topChunks[0]?.similarity.toFixed(3) || 'N/A'}`);

            // Enrich with source names (don't convert similarity, enrichWithSourceNames expects similarity as-is)
            const enriched = topChunks.map(c => ({
                id: c.id,
                sourceId: c.source_id,
                chunkText: c.chunk_text,
                chunkIndex: c.chunk_index,
                similarity: c.similarity // Already cosine similarity (0-1)
            }));

            // Filter out page markers and very short chunks
            const filteredEnriched = enriched.filter(c => {
                const text = c.chunkText.trim();
                const isPageMarker = /^--\s*\d+\s+of\s+\d+\s*--$/i.test(text);
                const isTooShort = text.length < 30;
                return !isPageMarker && !isTooShort;
            });

            // If we filtered out chunks, try to get more
            let finalEnriched = filteredEnriched;
            if (filteredEnriched.length < topK && chunksWithSimilarity.length > topK) {
                const additionalChunks = chunksWithSimilarity.slice(topK, Math.min(topK * 2, chunksWithSimilarity.length));
                const enrichedAdditional = additionalChunks.map(c => ({
                    id: c.id,
                    sourceId: c.source_id,
                    chunkText: c.chunk_text,
                    chunkIndex: c.chunk_index,
                    similarity: c.similarity
                }));
                const filteredAdditional = enrichedAdditional.filter(c => {
                    const text = c.chunkText.trim();
                    const isPageMarker = /^--\s*\d+\s+of\s+\d+\s*--$/i.test(text);
                    const isTooShort = text.length < 30;
                    return !isPageMarker && !isTooShort;
                });
                finalEnriched = [...filteredEnriched, ...filteredAdditional].slice(0, topK);
            }

            // Add source names
            const uniqueSourceIds = [...new Set(finalEnriched.map(c => c.sourceId))];
            const { data: sources } = await supabase
                .from('sources')
                .select('id, original_name')
                .in('id', uniqueSourceIds);
            
            const sourceMap = new Map((sources || []).map(s => [s.id, s.original_name]));
            
            const finalChunks = finalEnriched.map(chunk => ({
                ...chunk,
                sourceName: sourceMap.get(chunk.sourceId) || 'Unknown'
            }));

            return finalChunks;

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

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

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

            const { data, error } = await supabase
                .from('source_chunks')
                .select('id, source_id, chunk_text, chunk_index')
                .eq('source_id', sourceId)
                .order('chunk_index', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                logger.warn(`No chunks found for source: ${sourceId}`);
                return [];
            }

            logger.info(`Retrieved ${data.length} chunks for source`);

            // Fetch source name
            const { data: source } = await supabase
                .from('sources')
                .select('original_name')
                .eq('id', sourceId)
                .single();

            const sourceName = source?.original_name || 'Unknown';

            return data.map((chunk: any) => ({
                id: chunk.id,
                sourceId: chunk.source_id,
                sourceName: sourceName,
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: 1.0 // Not based on similarity for this query
            }));

        } catch (error: any) {
            throw new Error(`Failed to get source chunks: ${error.message}`);
        }
    }

    /**
     * Get specific chunks by their IDs (for citation retrieval)
     */
    async getChunksByIds(chunkIds: string[]): Promise<RetrievedChunk[]> {
        try {
            if (chunkIds.length === 0) return [];

            const { data, error } = await supabase
                .from('source_chunks')
                .select('id, source_id, chunk_text, chunk_index')
                .in('id', chunkIds);

            if (error) throw error;
            if (!data) return [];

            // Get unique source IDs
            const sourceIds = [...new Set(data.map((c: any) => c.source_id))];

            // Fetch source names
            const { data: sources } = await supabase
                .from('sources')
                .select('id, original_name')
                .in('id', sourceIds);

            const sourceMap = new Map(
                (sources || []).map((s: any) => [s.id, s.original_name])
            );

            return data.map((chunk: any) => ({
                id: chunk.id,
                sourceId: chunk.source_id,
                sourceName: sourceMap.get(chunk.source_id) || 'Unknown',
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: 1.0
            }));

        } catch (error: any) {
            logger.error(`Failed to get chunks by IDs: ${error.message}`);
            throw new Error(`Failed to get chunks by IDs: ${error.message}`);
        }
    }
}


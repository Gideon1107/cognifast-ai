import supabase from '../db/dbConnection';
import { EmbeddingService } from './embedding.service';

/**
 * Retrieved chunk with similarity score
 */
export interface RetrievedChunk {
    id: string;
    documentId: string;
    documentName: string; // Name of the document (e.g., "Resume.pdf")
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
     * @param documentIds - Array of document IDs to search within
     * @param topK - Number of chunks to return (default: 5)
     * @returns Array of retrieved chunks with similarity scores
     */
    async retrieveRelevantChunks(
        query: string,
        documentIds: string[],
        topK: number = 5
    ): Promise<RetrievedChunk[]> {
        try {
            console.log(`[INFO-[RETRIEVAL-SERVICE] Retrieving top ${topK} chunks for query: "${query.substring(0, 50)}..." from ${documentIds.length} document(s)`);

            // Step 1: Generate query embedding
            const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);
            console.log(`[INFO-[RETRIEVAL-SERVICE] Generated embedding of length: ${queryEmbedding.length}`);
            
            // Validate embedding
            const hasNaN = queryEmbedding.some(v => isNaN(v));
            const hasInfinity = queryEmbedding.some(v => !isFinite(v));
            const allZeros = queryEmbedding.every(v => v === 0);
            
            if (hasNaN || hasInfinity || allZeros) {
                console.error(`[ERROR-[RETRIEVAL-SERVICE] Invalid embedding detected!`, {
                    hasNaN,
                    hasInfinity,
                    allZeros
                });
                throw new Error('Invalid embedding generated');
            }
            
            // Step 2: Call RPC with detailed diagnostics
            const matchCount = topK * Math.max(documentIds.length, 2);
            
            console.log(`[DEBUG-[RETRIEVAL-SERVICE] === RPC CALL DETAILS ===`);
            console.log(`[DEBUG-[RETRIEVAL-SERVICE] Requested documentIds: [${documentIds.join(', ')}]`);
            console.log(`[DEBUG-[RETRIEVAL-SERVICE] Match count: ${matchCount}, topK: ${topK}`);
            
            const { data, error } = await supabase.rpc('match_document_chunks', {
                query_embedding: queryEmbedding,
                match_count: matchCount,
                filter_document_id: null
            });

            if (error) {
                console.log(JSON.stringify(error, null, 2));
                console.error(`[ERROR-[RETRIEVAL-SERVICE] RPC error: ${error.message}`);
                console.warn(`[WARN-[RETRIEVAL-SERVICE] Falling back to direct search`);
                return await this.directSearch(queryEmbedding, documentIds, topK);
            }

            console.log(`[DEBUG-[RETRIEVAL-SERVICE] RPC returned ${data?.length || 0} total chunks`);
            
            if (data && data.length > 0) {
                // Show what document IDs RPC actually returned
                const returnedDocIds = [...new Set(data.map((d: any) => d.document_id))];
                console.log(`[DEBUG-[RETRIEVAL-SERVICE] RPC returned chunks from documents: [${returnedDocIds.join(', ')}]`);
            }

            if (!data || data.length === 0) {
                console.error(`[ERROR-[RETRIEVAL-SERVICE] ⚠️ RPC returned 0 chunks!`);
                
                // Check if chunks exist for these document IDs
                const { data: chunkCount } = await supabase
                    .from('document_chunks')
                    .select('document_id', { count: 'exact' })
                    .in('document_id', documentIds);
                
                console.error(`[ERROR-[RETRIEVAL-SERVICE] Chunks exist in DB for these docs:`, chunkCount?.length || 0);
                console.warn(`[WARN-[RETRIEVAL-SERVICE] Falling back to direct search`);
                return await this.directSearch(queryEmbedding, documentIds, topK);
            }

            // Filter by requested documentIds
            const filteredData = data.filter((row: any) => 
                documentIds.includes(row.document_id)
            );
            
            console.log(`[DEBUG-[RETRIEVAL-SERVICE] After filtering: ${filteredData.length} chunks match requested documents`);

            if (filteredData.length === 0) {
                console.error(`[ERROR-[RETRIEVAL-SERVICE] ⚠️ DOCUMENT ID MISMATCH!`);
                console.error(`[ERROR-[RETRIEVAL-SERVICE] Requested: [${documentIds.join(', ')}]`);
                console.error(`[ERROR-[RETRIEVAL-SERVICE] RPC returned: [${[...new Set(data.map((d: any) => d.document_id))].join(', ')}]`);
                console.error(`[ERROR-[RETRIEVAL-SERVICE] This means conversation has WRONG document IDs!`);
                console.warn(`[WARN-[RETRIEVAL-SERVICE] Falling back to direct search`);
                return await this.directSearch(queryEmbedding, documentIds, topK);
            }
            
            const topChunks = filteredData.slice(0, topK);

            const enrichedChunks = await this.enrichWithDocumentNames(topChunks);
            const avgSimilarity = enrichedChunks.reduce((sum, c) => sum + c.similarity, 0) / enrichedChunks.length;
            console.log(`[INFO-[RETRIEVAL-SERVICE] ✅ RPC SUCCESS: ${enrichedChunks.length} chunks, avg similarity: ${avgSimilarity.toFixed(3)}`);

            return enrichedChunks;

        } catch (error: any) {
            console.error('[ERROR-[RETRIEVAL-SERVICE] Error in retrieveRelevantChunks:', error);
            throw new Error(`Failed to retrieve chunks: ${error.message}`);
        }
    }

    /**
     * Enrich chunks with document names
     */
    private async enrichWithDocumentNames(chunks: any[]): Promise<RetrievedChunk[]> {
        try {
            // Get unique document IDs
            const docIds = [...new Set(chunks.map((c: any) => c.document_id))];
            
            // Fetch document names
            const { data: documents, error } = await supabase
                .from('documents')
                .select('id, original_name')
                .in('id', docIds);
            
            if (error) throw error;
            
            // Create a map of document ID to document name
            const docMap = new Map(
                (documents || []).map((d: any) => [d.id, d.original_name])
            );
            
            // Map chunks with document names
            return chunks.map((chunk: any) => ({
                id: chunk.id,
                documentId: chunk.document_id,
                documentName: docMap.get(chunk.document_id) || 'Unknown',
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: 1 - chunk.similarity // Convert distance to similarity
            }));
        } catch (error: any) {
            console.error('[ERROR-[RETRIEVAL-SERVICE] Error enriching with document names:', error);
            // Return chunks without names as fallback
            return chunks.map((chunk: any) => ({
                id: chunk.id,
                documentId: chunk.document_id,
                documentName: 'Unknown',
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: 1 - chunk.similarity
            }));
        }
    }

    /**
     * Direct database search using manual similarity calculation
     * More reliable than RPC for pgvector in Supabase JS client
     */
    private async directSearch(
        queryEmbedding: number[],
        documentIds: string[],
        topK: number
    ): Promise<RetrievedChunk[]> {
        try {
            console.log(`[INFO-[RETRIEVAL-SERVICE] Performing direct search for ${documentIds.length} document(s)`);

            // Get all chunks from specified documents
            const { data, error } = await supabase
                .from('document_chunks')
                .select('id, document_id, chunk_text, chunk_index, embedding')
                .in('document_id', documentIds)
                .limit(100); // Get more chunks for manual filtering

            if (error) throw error;
            if (!data || data.length === 0) return [];

            console.log(`[INFO-[RETRIEVAL-SERVICE] Retrieved ${data.length} chunks from database`);

            // Calculate cosine similarity manually
            const chunksWithSimilarity: Array<{
                id: string;
                document_id: string;
                chunk_text: string;
                chunk_index: number;
                similarity: number;
            }> = [];

            for (const chunk of data) {
                try {
                    // Parse embedding - Supabase returns pgvector as string like "[0.1,0.2,...]"
                    let chunkEmbedding: number[];
                    if (typeof chunk.embedding === 'string') {
                        // Remove brackets and parse
                        chunkEmbedding = JSON.parse(chunk.embedding);
                    } else if (Array.isArray(chunk.embedding)) {
                        chunkEmbedding = chunk.embedding;
                    } else {
                        console.error(`[ERROR-[RETRIEVAL-SERVICE] Invalid embedding format for chunk ${chunk.id}`);
                        continue;
                    }

                    const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
                    chunksWithSimilarity.push({
                        id: chunk.id,
                        document_id: chunk.document_id,
                        chunk_text: chunk.chunk_text,
                        chunk_index: chunk.chunk_index,
                        similarity: similarity
                    });
                } catch (error: any) {
                    console.error(`[ERROR-[RETRIEVAL-SERVICE] Error processing chunk ${chunk.id}: ${error.message}`);
                    // Skip this chunk and continue
                }
            }

            // Sort by similarity (highest first) and take top K
            chunksWithSimilarity.sort((a, b) => b.similarity - a.similarity);
            const topChunks = chunksWithSimilarity.slice(0, topK);

            console.log(`[DEBUG-[RETRIEVAL-SERVICE] Direct search found ${chunksWithSimilarity.length} chunks total`);
            console.log(`[DEBUG-[RETRIEVAL-SERVICE] Top 5 similarities:`, 
                chunksWithSimilarity.slice(0, 5).map(c => c.similarity.toFixed(3))
            );
            console.log(`[INFO-[RETRIEVAL-SERVICE] Returning ${topChunks.length} chunks, top similarity: ${topChunks[0]?.similarity.toFixed(3) || 'N/A'}`);

            // Enrich with document names (don't convert similarity, enrichWithDocumentNames expects similarity as-is)
            const enriched = topChunks.map(c => ({
                id: c.id,
                documentId: c.document_id,
                chunkText: c.chunk_text,
                chunkIndex: c.chunk_index,
                similarity: c.similarity // Already cosine similarity (0-1)
            }));

            // Add document names
            const docIds = [...new Set(enriched.map(c => c.documentId))];
            const { data: documents } = await supabase
                .from('documents')
                .select('id, original_name')
                .in('id', docIds);
            
            const docMap = new Map((documents || []).map(d => [d.id, d.original_name]));
            
            return enriched.map(chunk => ({
                ...chunk,
                documentName: docMap.get(chunk.documentId) || 'Unknown'
            }));

        } catch (error: any) {
            console.error(`[ERROR-[RETRIEVAL-SERVICE] Direct search failed: ${error.message}`);
            throw new Error(`Direct search failed: ${error.message}`);
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            console.error(`[ERROR-[RETRIEVAL-SERVICE] Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
            throw new Error(`[ERROR-[RETRIEVAL-SERVICE] Vectors must have same length: ${vecA.length} vs ${vecB.length}`);
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
     * Get all chunks for a specific document (for summary generation)
     */
    async getAllChunksForDocument(documentId: string): Promise<RetrievedChunk[]> {
        try {
            console.log(`[INFO-[RETRIEVAL-SERVICE] Fetching all chunks for document: ${documentId}`);

            const { data, error } = await supabase
                .from('document_chunks')
                .select('id, document_id, chunk_text, chunk_index')
                .eq('document_id', documentId)
                .order('chunk_index', { ascending: true });

            if (error) throw error;
            if (!data || data.length === 0) {
                console.warn(`[WARN-[RETRIEVAL-SERVICE] No chunks found for document: ${documentId}`);
                return [];
            }

            console.log(`[INFO-[RETRIEVAL-SERVICE] Retrieved ${data.length} chunks for document`);

            // Fetch document name
            const { data: doc } = await supabase
                .from('documents')
                .select('original_name')
                .eq('id', documentId)
                .single();

            const documentName = doc?.original_name || 'Unknown';

            return data.map((chunk: any) => ({
                id: chunk.id,
                documentId: chunk.document_id,
                documentName: documentName,
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: 1.0 // Not based on similarity for this query
            }));

        } catch (error: any) {
            throw new Error(`[ERROR-[RETRIEVAL-SERVICE] Failed to get document chunks: ${error.message}`);
        }
    }

    /**
     * Get specific chunks by their IDs (for citation retrieval)
     */
    async getChunksByIds(chunkIds: string[]): Promise<RetrievedChunk[]> {
        try {
            if (chunkIds.length === 0) return [];

            const { data, error } = await supabase
                .from('document_chunks')
                .select('id, document_id, chunk_text, chunk_index')
                .in('id', chunkIds);

            if (error) throw error;
            if (!data) return [];

            // Get unique document IDs
            const docIds = [...new Set(data.map((c: any) => c.document_id))];

            // Fetch document names
            const { data: documents } = await supabase
                .from('documents')
                .select('id, original_name')
                .in('id', docIds);

            const docMap = new Map(
                (documents || []).map((d: any) => [d.id, d.original_name])
            );

            return data.map((chunk: any) => ({
                id: chunk.id,
                documentId: chunk.document_id,
                documentName: docMap.get(chunk.document_id) || 'Unknown',
                chunkText: chunk.chunk_text,
                chunkIndex: chunk.chunk_index,
                similarity: 1.0
            }));

        } catch (error: any) {
            throw new Error(`[ERROR-[RETRIEVAL-SERVICE] Failed to get chunks by IDs: ${error.message}`);
        }
    }
}


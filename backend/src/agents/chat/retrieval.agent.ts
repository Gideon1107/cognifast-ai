/**
 * Retrieval Agent - Retrieves relevant source chunks using vector search
 */

import { ConversationState } from '../../types/chat.types';
import { RetrievalService } from '../../services/retrieval.service';
import { createLogger } from '../../utils/logger';

const logger = createLogger('RETRIEVAL-AGENT');

export class RetrievalAgent {
    private retrievalService: RetrievalService;

    constructor() {
        this.retrievalService = new RetrievalService();
    }

    /**
     * Retrieve relevant chunks for the user's query
     */
    async execute(state: ConversationState): Promise<Partial<ConversationState>> {
        const startTime = Date.now();
        logger.info(`Retrieving chunks for: "${state.currentQuery}" from ${state.sourceIds.length} source(s) in current conversation`);

        try {
            // Use retrieval service to find relevant chunks from the current conversation's sources
            // Request more chunks to account for filtering (page markers, etc.)
            const retrievedChunks = await this.retrievalService.retrieveRelevantChunks(
                state.currentQuery,
                state.sourceIds, // Pass array of source IDs from current conversation
                5 // Top 5 chunks
            );
            
            // Warn if we got fewer chunks than expected
            if (retrievedChunks.length < 3) {
                logger.warn(`⚠️ Only ${retrievedChunks.length} chunks retrieved. Consider re-uploading documents to remove page markers.`);
            }

            
            const endTime = Date.now();
            logger.info(`Retrieval completed in ${endTime - startTime}ms`);

            if (retrievedChunks.length === 0) {
                logger.warn('No relevant chunks found');
            } else {
                logger.info(`Retrieved ${retrievedChunks.length} chunks`);
                
                // Log source distribution
                const sourceCounts = new Map<string, number>();
                retrievedChunks.forEach(chunk => {
                    const count = sourceCounts.get(chunk.sourceName) || 0;
                    sourceCounts.set(chunk.sourceName, count + 1);
                });
                logger.info(`Chunks by source:`, Object.fromEntries(sourceCounts));
                
                logger.info(`Average similarity: ${
                    (retrievedChunks.reduce((sum, c) => sum + c.similarity, 0) / retrievedChunks.length * 100).toFixed(1)
                }%`);
            }

            return {
                retrievedChunks: retrievedChunks
            };

        } catch (error: any) {
            logger.error(`Error: ${error.message}`);
            return {
                retrievedChunks: []
            };
        }
    }
}

// Export function for LangGraph node
export async function retrievalAgent(state: ConversationState): Promise<Partial<ConversationState>> {
    const agent = new RetrievalAgent();
    return await agent.execute(state);
}


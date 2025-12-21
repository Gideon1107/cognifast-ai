/**
 * Retrieval Agent - Retrieves relevant document chunks using vector search
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
        logger.info(`Retrieving chunks for: "${state.currentQuery}" from ${state.documentIds.length} document(s) in current conversation`);

        try {
            // Use retrieval service to find relevant chunks from the current conversation's documents
            const retrievedChunks = await this.retrievalService.retrieveRelevantChunks(
                state.currentQuery,
                state.documentIds, // Pass array of document IDs from current conversation
                5 // Top 5 chunks
            );

            
            const endTime = Date.now();
            logger.info(`Retrieval completed in ${endTime - startTime}ms`);

            if (retrievedChunks.length === 0) {
                logger.warn('No relevant chunks found');
            } else {
                logger.info(`Retrieved ${retrievedChunks.length} chunks`);
                
                // Log document distribution
                const docCounts = new Map<string, number>();
                retrievedChunks.forEach(chunk => {
                    const count = docCounts.get(chunk.documentName) || 0;
                    docCounts.set(chunk.documentName, count + 1);
                });
                logger.info(`Chunks by document:`, Object.fromEntries(docCounts));
                
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


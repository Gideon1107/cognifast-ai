import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { SourceChunk } from '@shared/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('EMBEDDING-SERVICE');

export class EmbeddingService {
    private embeddings: OpenAIEmbeddings;
    private textSplitter: RecursiveCharacterTextSplitter;

    constructor() {
        // Initialize OpenAI embeddings
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'text-embedding-3-small' // 1536 dimensions
        });

        // Initialize text splitter for chunking documents
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000, // characters per chunk
            chunkOverlap: 200, // overlap between chunks for context
            separators: ['\n\n', '\n', '. ', ' ', '']
        });
    }

    /**
     * Split text into chunks
     * Filters out page markers and very short chunks during chunking
     */
    async chunkText(text: string): Promise<SourceChunk[]> {
        try {
            const chunks = await this.textSplitter.splitText(text);
            
            // Filter out page markers and very short chunks
            const filteredChunks = chunks
                .map((chunk, index) => ({ text: chunk.trim(), originalIndex: index }))
                .filter(({ text }) => {
                    // Filter out page markers like "-- 1 of 4 --" or "-- X of Y --"
                    const isPageMarker = /^--\s*\d+\s+of\s+\d+\s*--$/i.test(text);
                    // Filter out very short chunks (< 30 chars) that are likely formatting artifacts
                    const isTooShort = text.length < 30;
                    // Filter out chunks that are only whitespace or special characters
                    const isOnlyFormatting = /^[\s\-_=*]+$/.test(text);
                    
                    return !isPageMarker && !isTooShort && !isOnlyFormatting;
                })
                .map(({ text, originalIndex }, filteredIndex) => ({
                    text,
                    index: filteredIndex // Re-index after filtering
                }));
            
            logger.info(`Chunked text: ${chunks.length} chunks → ${filteredChunks.length} chunks after filtering`);
            
            return filteredChunks;
        } catch (error: any) {
            throw new Error(`Failed to chunk text: ${error.message}`);
        }
    }

    /**
     * Generate embeddings for text chunks
     */
    async generateEmbeddings(chunks: SourceChunk[]): Promise<{ chunk: SourceChunk; embedding: number[] }[]> {
        try {
            logger.info(`Generating embeddings for ${chunks.length} chunks...`);
            
            // Extract just the text for embedding
            const texts = chunks.map(chunk => chunk.text);
            
            // Generate embeddings for all chunks
            const embeddings = await this.embeddings.embedDocuments(texts);
            
            logger.info(`Successfully generated ${embeddings.length} embeddings`);
            
            // Combine chunks with their embeddings
            return chunks.map((chunk, index) => ({
                chunk,
                embedding: embeddings[index]
            }));
        } catch (error: any) {
            throw new Error(`Failed to generate embeddings: ${error.message}`);
        }
    }

    /**
     * Generate embedding for a single query
     */
    async generateQueryEmbedding(query: string): Promise<number[]> {
        try {
            return await this.embeddings.embedQuery(query);
        } catch (error: any) {
            throw new Error(`Failed to generate query embedding: ${error.message}`);
        }
    }

    /**
     * Process source: chunk and generate embeddings
     */
    async processSource(text: string): Promise<{ chunk: SourceChunk; embedding: number[] }[]> {
        // Split text into chunks
        const chunks = await this.chunkText(text);
        logger.info(`Split source into ${chunks.length} chunks`);
        
        // Generate embeddings for all chunks
        return await this.generateEmbeddings(chunks);
    }
}


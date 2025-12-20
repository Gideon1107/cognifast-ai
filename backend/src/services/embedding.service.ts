import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createLogger } from '../utils/logger';

const logger = createLogger('EMBEDDING-SERVICE');

export interface DocumentChunk {
    text: string;
    index: number;
}

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
     */
    async chunkText(text: string): Promise<DocumentChunk[]> {
        try {
            const chunks = await this.textSplitter.splitText(text);
            return chunks.map((chunk, index) => ({
                text: chunk,
                index: index
            }));
        } catch (error: any) {
            throw new Error(`Failed to chunk text: ${error.message}`);
        }
    }

    /**
     * Generate embeddings for text chunks
     */
    async generateEmbeddings(chunks: DocumentChunk[]): Promise<{ chunk: DocumentChunk; embedding: number[] }[]> {
        try {
            console.log(`[INFO-[EMBEDDING-SERVICE] Generating embeddings for ${chunks.length} chunks...`);
            
            // Extract just the text for embedding
            const texts = chunks.map(chunk => chunk.text);
            
            // Generate embeddings for all chunks
            const embeddings = await this.embeddings.embedDocuments(texts);
            
            console.log(`[INFO-[EMBEDDING-SERVICE] Successfully generated ${embeddings.length} embeddings`);
            
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
     * Process document: chunk and generate embeddings
     */
    async processDocument(text: string): Promise<{ chunk: DocumentChunk; embedding: number[] }[]> {
        // Split text into chunks
        const chunks = await this.chunkText(text);
        console.log(`[INFO-[EMBEDDING-SERVICE] Split document into ${chunks.length} chunks`);
        
        // Generate embeddings for all chunks
        return await this.generateEmbeddings(chunks);
    }
}


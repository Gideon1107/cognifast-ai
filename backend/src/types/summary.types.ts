import { RetrievedChunk } from '../services/retrieval.service';

/**
 * Document size classification
 */
export type DocumentSize = 'small' | 'medium' | 'large';

/**
 * Key point importance level
 */
export type ImportanceLevel = 'high' | 'medium' | 'low';

/**
 * Single key point extracted from document
 */
export interface KeyPoint {
    point: string; // The key point text
    category: string; // Topic/category (e.g., "Introduction", "Methods")
    importance: ImportanceLevel;
    chunkIds?: string[]; // Source chunks for this point
}

/**
 * Document summary
 */
export interface DocumentSummary {
    id: string;
    documentId: string;
    summary: string; // 3-5 paragraph summary
    keyPoints: KeyPoint[];
    createdAt: string;
}

/**
 * Summary Generation State (for LangGraph)
 */
export interface SummaryGenerationState {
    documentId: string;
    documentChunks: RetrievedChunk[];
    documentSize: DocumentSize;
    chunkSummaries: string[]; // Individual chunk summaries (for large docs)
    combinedSummary: string; // Final summary
    keyPoints: KeyPoint[];
    summaryQuality: 'good' | 'poor' | 'pending';
    needsRegeneration: boolean;
    retryCount: number;
    metadata: {
        totalChunks: number;
        processingTime?: number;
        startTime?: number;
        endTime?: number;
        wordCount?: number;
    };
}

/**
 * Request/Response types for Summary API
 */
export interface GenerateSummaryRequest {
    documentId: string;
}

export interface GenerateSummaryResponse {
    success: boolean;
    summary: DocumentSummary;
    error?: string;
}

export interface GetSummaryResponse {
    success: boolean;
    summary: DocumentSummary;
    error?: string;
}

export interface RegenerateSummaryRequest {
    documentId: string;
    forceRegenerate?: boolean; // Delete existing summary first
}

export interface RegenerateSummaryResponse {
    success: boolean;
    summary: DocumentSummary;
    error?: string;
}


import { Request, Response } from 'express';
import supabase from '../db/dbConnection';
import { SourceService } from '../services/source.service';
import { EmbeddingService } from '../services/embedding.service';
import { StorageService } from '../services/storage.service';
import { SourceMetadata, SourceUploadResponse } from '../types/source.types';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('SOURCE-CONTROLLER');

export class SourceController {
    /**
     * Upload and process a source (file)
     */
    static async uploadSource(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                    error: 'Please provide a file to upload'
                } as SourceUploadResponse);
                return;
            }

            const file = req.file;
            const filePath = file.path;
            const originalName = file.originalname;
            const fileType = SourceService.getFileType(originalName);
            const fileSize = SourceService.getFileSize(filePath);

            // Extract text from the source
            logger.info(`Extracting text from ${originalName}...`);
            const extractedText = await SourceService.extractText(filePath, fileType);
            logger.info(`Extracted ${extractedText.length} characters from source`);

            // Upload to Supabase Storage
            logger.info('Uploading file to Supabase Storage...');
            const storageService = new StorageService();
            const { publicUrl, path: storagePath } = await storageService.uploadFile(filePath, originalName);
            logger.info(`File uploaded to Supabase: ${publicUrl}`);

            // Create source metadata
            const sourceData: SourceMetadata = {
                id: uuidv4(),
                filename: path.basename(filePath),
                originalName: originalName,
                fileType: fileType,
                fileSize: fileSize,
                filePath: storagePath, // Supabase storage path
                extractedText: extractedText,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Save to Supabase
            const { data, error } = await supabase
                .from('sources')
                .insert([{
                    id: sourceData.id,
                    filename: sourceData.filename,
                    original_name: sourceData.originalName,
                    file_type: sourceData.fileType,
                    file_size: sourceData.fileSize,
                    file_path: sourceData.filePath,
                    extracted_text: sourceData.extractedText,
                    created_at: sourceData.createdAt,
                    updated_at: sourceData.updatedAt
                }])
                .select()
                .single();

            if (error) {
                logger.error(`Error saving source to database: ${error.message}`);
                
                // Clean up: delete from Supabase Storage and local file
                try {
                    await storageService.deleteFile(storagePath);
                    fs.unlinkSync(filePath);
                } catch (cleanupError) {
                    logger.error(`Error during cleanup: ${cleanupError}`);
                }

                res.status(500).json({
                    success: false,
                    message: 'Failed to save source to database',
                    error: error.message
                } as SourceUploadResponse);
                return;
            }

            logger.info(`Source saved successfully: ${sourceData.id}`);

            // Clean up local file after successful database save
            try {
                fs.unlinkSync(filePath);
                logger.info('Local file cleaned up');
            } catch (cleanupError) {
                logger.error(`Error deleting local file: ${cleanupError}`);
            }

            // Process source: chunk and generate embeddings
            try {
                logger.info('Generating embeddings...');
                const embeddingService = new EmbeddingService();
                const chunksWithEmbeddings = await embeddingService.processSource(extractedText);
                
                logger.info(`Generated ${chunksWithEmbeddings.length} chunks with embeddings`);

                // Save chunks and embeddings to database
                const chunkInserts = chunksWithEmbeddings.map(({ chunk, embedding }) => ({
                    source_id: sourceData.id,
                    chunk_text: chunk.text,
                    chunk_index: chunk.index,
                    embedding: embedding
                }));

                const { error: chunkError } = await supabase
                    .from('source_chunks')
                    .insert(chunkInserts);

                if (chunkError) {
                    logger.error(`Error saving embeddings: ${chunkError}`);
                } else {
                    logger.info('Embeddings saved successfully');
                }
            } catch (embeddingError: any) {
                logger.error(`Error generating embeddings: ${embeddingError}`);
            }

            res.status(201).json({
                success: true,
                message: 'Source uploaded and processed successfully',
                source: {
                    id: sourceData.id,
                    filename: sourceData.filename,
                    originalName: sourceData.originalName,
                    fileType: sourceData.fileType,
                    fileSize: sourceData.fileSize,
                    filePath: sourceData.filePath,
                    createdAt: sourceData.createdAt,
                    updatedAt: sourceData.updatedAt
                }
            } as SourceUploadResponse);

        } catch (error: any) {
            logger.error(`Error uploading source: ${error.message}`);

            // Clean up uploaded file if processing fails
            if (req.file) {
                try {
                    fs.unlinkSync(req.file.path);
                    logger.info('Local file cleaned up after error');
                } catch (unlinkError) {
                    logger.error(`Error deleting local file: ${unlinkError}`);
                }
            }

            res.status(500).json({
                success: false,
                message: 'Failed to process source',
                error: error.message
            } as SourceUploadResponse);
        }
    }

    /**
     * Get all sources
     */
    static async getAllSources(req: Request, res: Response): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('sources')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch sources',
                    error: error.message
                });
                return;
            }

            res.status(200).json({
                success: true,
                sources: data || []
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sources',
                error: error.message
            });
        }
    }

    /**
     * Get a single source by ID
     */
    static async getSourceById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('sources')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                res.status(404).json({
                    success: false,
                    message: 'Source not found',
                    error: error.message
                });
                return;
            }

            res.status(200).json({
                success: true,
                source: data
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch source',
                error: error.message
            });
        }
    }
}


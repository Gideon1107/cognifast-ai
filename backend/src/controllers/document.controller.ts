import { Request, Response } from 'express';
import supabase from '../db/dbConnection';
import { DocumentService } from '../services/document.service';
import { EmbeddingService } from '../services/embedding.service';
import { StorageService } from '../services/storage.service';
import { DocumentMetadata, DocumentUploadResponse } from '../types/document.types';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('DOCUMENT-CONTROLLER');

export class DocumentController {
    /**
     * Upload and process a document
     */
    static async uploadDocument(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                    error: 'Please provide a file to upload'
                } as DocumentUploadResponse);
                return;
            }

            const file = req.file;
            const filePath = file.path;
            const originalName = file.originalname;
            const fileType = DocumentService.getFileType(originalName);
            const fileSize = DocumentService.getFileSize(filePath);

            // Extract text from the document
            logger.info(`Extracting text from ${originalName}...`);
            const extractedText = await DocumentService.extractText(filePath, fileType);
            logger.info(`Extracted ${extractedText.length} characters from document`);

            // Upload to Supabase Storage
            logger.info('Uploading file to Supabase Storage...');
            const storageService = new StorageService();
            const { publicUrl, path: storagePath } = await storageService.uploadFile(filePath, originalName);
            logger.info(`File uploaded to Supabase: ${publicUrl}`);

            // Create document metadata
            const documentData: DocumentMetadata = {
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
                .from('documents')
                .insert([{
                    id: documentData.id,
                    filename: documentData.filename,
                    original_name: documentData.originalName,
                    file_type: documentData.fileType,
                    file_size: documentData.fileSize,
                    file_path: documentData.filePath,
                    extracted_text: documentData.extractedText,
                    created_at: documentData.createdAt,
                    updated_at: documentData.updatedAt
                }])
                .select()
                .single();

            if (error) {
                logger.error(`Error saving document to database: ${error.message}`);
                
                // Clean up: delete from Supabase Storage and local file
                try {
                    await storageService.deleteFile(storagePath);
                    fs.unlinkSync(filePath);
                } catch (cleanupError) {
                    logger.error(`Error during cleanup: ${cleanupError}`);
                }

                res.status(500).json({
                    success: false,
                    message: 'Failed to save document to database',
                    error: error.message
                } as DocumentUploadResponse);
                return;
            }

            logger.info(`Document saved successfully: ${documentData.id}`);

            // Clean up local file after successful database save
            try {
                fs.unlinkSync(filePath);
                logger.info('Local file cleaned up');
            } catch (cleanupError) {
                logger.error(`Error deleting local file: ${cleanupError}`);
            }

            // Process document: chunk and generate embeddings
            try {
                logger.info('Generating embeddings...');
                const embeddingService = new EmbeddingService();
                const chunksWithEmbeddings = await embeddingService.processDocument(extractedText);
                
                logger.info(`Generated ${chunksWithEmbeddings.length} chunks with embeddings`);

                // Save chunks and embeddings to database
                const chunkInserts = chunksWithEmbeddings.map(({ chunk, embedding }) => ({
                    document_id: documentData.id,
                    chunk_text: chunk.text,
                    chunk_index: chunk.index,
                    embedding: embedding
                }));

                const { error: chunkError } = await supabase
                    .from('document_chunks')
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
                message: 'Document uploaded and processed successfully',
                document: {
                    id: documentData.id,
                    filename: documentData.filename,
                    originalName: documentData.originalName,
                    fileType: documentData.fileType,
                    fileSize: documentData.fileSize,
                    filePath: documentData.filePath,
                    createdAt: documentData.createdAt,
                    updatedAt: documentData.updatedAt
                }
            } as DocumentUploadResponse);

        } catch (error: any) {
            logger.error(`Error uploading document: ${error.message}`);

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
                message: 'Failed to process document',
                error: error.message
            } as DocumentUploadResponse);
        }
    }

    /**
     * Get all documents
     */
    static async getAllDocuments(req: Request, res: Response): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                res.status(500).json({
                    success: false,
                    message: 'Failed to fetch documents',
                    error: error.message
                });
                return;
            }

            res.status(200).json({
                success: true,
                documents: data || []
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch documents',
                error: error.message
            });
        }
    }

    /**
     * Get a single document by ID
     */
    static async getDocumentById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                res.status(404).json({
                    success: false,
                    message: 'Document not found',
                    error: error.message
                });
                return;
            }

            res.status(200).json({
                success: true,
                document: data
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch document',
                error: error.message
            });
        }
    }
}


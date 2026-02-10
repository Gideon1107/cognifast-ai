import { Request, Response } from 'express';
import { db } from '../db/dbConnection';
import { sources, sourceChunks } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { SourceService } from '../services/source.service';
import { EmbeddingService } from '../services/embedding.service';
import { StorageService } from '../services/storage.service';
import { SourceMetadata, SourceUploadResponse, SourceRow } from '../types/source.types';
import { UploadUrlRequest } from '@shared/types';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('SOURCE-CONTROLLER');

function sourceRowToApi(row: SourceRow) {
    return {
        id: row.id,
        filename: row.filename,
        originalName: row.originalName,
        fileType: row.fileType,
        fileSize: row.fileSize,
        filePath: row.filePath,
        sourceUrl: row.sourceUrl ?? undefined,
        extractedText: row.extractedText ?? undefined,
        createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
}

export class SourceController {
    static async uploadFileSource(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                    error: 'Please provide a file to upload',
                } as SourceUploadResponse);
                return;
            }

            const file = req.file;
            const filePath = file.path;
            const originalName = file.originalname;
            const fileType = SourceService.getFileType(originalName);
            const fileSize = SourceService.getFileSize(filePath);

            logger.info(`Extracting text from ${originalName}...`);
            const extractedText = await SourceService.extractText(filePath, fileType);
            logger.info(`Extracted ${extractedText.length} characters from source`);

            logger.info('Uploading file to local storage...');
            const storageService = new StorageService();
            await storageService.ensureBucketExists();
            const { path: storagePath } = await storageService.uploadFile(filePath, originalName);
            logger.info(`File uploaded: ${storagePath}`);

            const sourceId = uuidv4();
            const sourceData: SourceMetadata = {
                id: sourceId,
                filename: path.basename(filePath),
                originalName,
                fileType,
                fileSize,
                filePath: storagePath,
                extractedText,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            try {
                await db.insert(sources).values({
                    id: sourceId,
                    filename: sourceData.filename,
                    originalName: sourceData.originalName,
                    fileType: sourceData.fileType,
                    fileSize: sourceData.fileSize,
                    filePath: sourceData.filePath,
                    extractedText: sourceData.extractedText,
                });
            } catch (error: any) {
                logger.error(`Error saving source to database: ${error.message}`);
                try {
                    await storageService.deleteFile(storagePath);
                    fs.unlinkSync(filePath);
                } catch (cleanupError) {
                    logger.error(`Error during cleanup: ${cleanupError}`);
                }
                res.status(500).json({
                    success: false,
                    message: 'Failed to save source to database',
                    error: error.message,
                } as SourceUploadResponse);
                return;
            }

            logger.info(`Source saved successfully: ${sourceId}`);

            try {
                fs.unlinkSync(filePath);
                logger.info('Local file cleaned up');
            } catch (cleanupError) {
                logger.error(`Error deleting local file: ${cleanupError}`);
            }

            try {
                logger.info('Generating embeddings...');
                const embeddingService = new EmbeddingService();
                const chunksWithEmbeddings = await embeddingService.processSource(extractedText);
                logger.info(`Generated ${chunksWithEmbeddings.length} chunks with embeddings`);

                if (chunksWithEmbeddings.length > 0) {
                    await db.insert(sourceChunks).values(
                        chunksWithEmbeddings.map(({ chunk, embedding }) => ({
                            sourceId: sourceId,
                            chunkText: chunk.text,
                            chunkIndex: chunk.index,
                            embedding,
                        }))
                    );
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
                    updatedAt: sourceData.updatedAt,
                },
            } as SourceUploadResponse);
        } catch (error: any) {
            logger.error(`Error uploading source: ${error.message}`);
            if (req.file?.path) {
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
                error: error.message,
            } as SourceUploadResponse);
        }
    }

    static async getAllSources(req: Request, res: Response): Promise<void> {
        try {
            const rows = await db
                .select()
                .from(sources)
                .orderBy(desc(sources.createdAt));

            res.status(200).json({
                success: true,
                sources: rows.map(sourceRowToApi),
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sources',
                error: error.message,
            });
        }
    }

    static async getSourceById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const [row] = await db
                .select()
                .from(sources)
                .where(eq(sources.id, id))
                .limit(1);

            if (!row) {
                res.status(404).json({
                    success: false,
                    message: 'Source not found',
                    error: 'Source not found',
                });
                return;
            }

            res.status(200).json({
                success: true,
                source: sourceRowToApi(row),
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch source',
                error: error.message,
            });
        }
    }

    static async uploadUrlSource(req: Request, res: Response): Promise<void> {
        try {
            const { url } = req.body as UploadUrlRequest;

            if (!url || typeof url !== 'string' || url.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No URL provided',
                    error: 'Please provide a valid URL',
                } as SourceUploadResponse);
                return;
            }

            let validUrl: URL;
            try {
                validUrl = new URL(url);
                if (validUrl.protocol !== 'http:' && validUrl.protocol !== 'https:') {
                    throw new Error('Invalid protocol');
                }
            } catch {
                res.status(400).json({
                    success: false,
                    message: 'Invalid URL format',
                    error: 'Please provide a valid HTTP or HTTPS URL',
                } as SourceUploadResponse);
                return;
            }

            logger.info(`Getting page title for ${url}...`);
            const pageTitle = await SourceService.getUrlTitle(url);

            logger.info(`Extracting text from ${url}...`);
            const extractedText = await SourceService.extractText(url, 'url');
            logger.info(`Extracted ${extractedText.length} characters from URL`);

            const sourceId = uuidv4();
            const sourceData: SourceMetadata = {
                id: sourceId,
                filename: pageTitle || validUrl.hostname,
                originalName: pageTitle || validUrl.hostname,
                fileType: 'url',
                fileSize: 0,
                filePath: '',
                sourceUrl: url,
                extractedText,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            try {
                await db.insert(sources).values({
                    id: sourceId,
                    filename: sourceData.filename,
                    originalName: sourceData.originalName,
                    fileType: sourceData.fileType,
                    fileSize: sourceData.fileSize,
                    filePath: sourceData.filePath,
                    sourceUrl: sourceData.sourceUrl,
                    extractedText: sourceData.extractedText,
                });
            } catch (error: any) {
                logger.error(`Error saving source to database: ${error.message}`);
                res.status(500).json({
                    success: false,
                    message: 'Failed to save source to database',
                    error: error.message,
                } as SourceUploadResponse);
                return;
            }

            logger.info(`Source saved successfully: ${sourceId}`);

            try {
                logger.info('Generating embeddings...');
                const embeddingService = new EmbeddingService();
                const chunksWithEmbeddings = await embeddingService.processSource(extractedText);
                logger.info(`Generated ${chunksWithEmbeddings.length} chunks with embeddings`);

                if (chunksWithEmbeddings.length > 0) {
                    await db.insert(sourceChunks).values(
                        chunksWithEmbeddings.map(({ chunk, embedding }) => ({
                            sourceId,
                            chunkText: chunk.text,
                            chunkIndex: chunk.index,
                            embedding,
                        }))
                    );
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
                    sourceUrl: sourceData.sourceUrl,
                    createdAt: sourceData.createdAt,
                    updatedAt: sourceData.updatedAt,
                },
            } as SourceUploadResponse);
        } catch (error: any) {
            logger.error(`Error uploading URL source: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to process URL source',
                error: error.message,
            } as SourceUploadResponse);
        }
    }
}


import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('STORAGE-SERVICE');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

export class StorageService {
    private rootDir: string;

    constructor(rootDir: string = UPLOADS_DIR) {
        this.rootDir = rootDir;
    }

    /**
     * Upload file to local storage (copy from local path to storage root)
     */
    async uploadFile(localFilePath: string, filename: string): Promise<{ publicUrl: string; path: string }> {
        try {
            const relativePath = `${uuidv4()}/${filename}`;
            const fullPath = path.join(this.rootDir, relativePath);
            const dir = path.dirname(fullPath);

            await fs.promises.mkdir(dir, { recursive: true });
            await fs.promises.copyFile(localFilePath, fullPath);

            const publicUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/sources/files/${relativePath}`;
            logger.info(`File uploaded to local storage: ${relativePath}`);

            return {
                publicUrl,
                path: relativePath,
            };
        } catch (error: any) {
            logger.error(`Failed to upload file: ${error.message}`);
            throw new Error(`Failed to upload file: ${error.message}`);
        }
    }

    /**
     * Delete file from local storage
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            const fullPath = path.join(this.rootDir, filePath);
            await fs.promises.unlink(fullPath);
            logger.info(`File deleted from local storage: ${filePath}`);
        } catch (error: any) {
            logger.error(`Error deleting file: ${error.message}`);
            // Don't throw - deletion errors shouldn't break the flow
        }
    }

    /**
     * Download file from local storage (returns buffer)
     */
    async downloadFile(filePath: string): Promise<Buffer> {
        try {
            const fullPath = path.join(this.rootDir, filePath);
            return await fs.promises.readFile(fullPath);
        } catch (error: any) {
            throw new Error(`Failed to download file: ${error.message}`);
        }
    }

    /**
     * Get content type based on file extension (for serving)
     */
    getContentType(ext: string): string {
        const contentTypes: { [key: string]: string } = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
        };
        return contentTypes[ext.toLowerCase()] || 'application/octet-stream';
    }

    /**
     * Ensure storage root directory exists
     */
    async ensureBucketExists(): Promise<void> {
        try {
            await fs.promises.mkdir(this.rootDir, { recursive: true });
            logger.info(`Storage directory ready: ${this.rootDir}`);
        } catch (error: any) {
            logger.error(`Storage directory setup error: ${error.message}`);
        }
    }

    /**
     * Resolve full filesystem path for a stored relative path
     */
    resolvePath(relativePath: string): string {
        return path.join(this.rootDir, relativePath);
    }
}

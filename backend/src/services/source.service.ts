import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import type { SourceType } from '@shared/types';
import { SourceMetadata } from '../types/source.types';
import { WebScraperService } from './web-scraper.service';

// Import pdf-parse v2 - uses new API with PDFParse class
// const pdfParseLib = require('pdf-parse');
import { PDFParse } from 'pdf-parse';

export class SourceService {
    /**
     * Extract text from a file or URL based on its type
     */
    static async extractText(filePathOrUrl: string, fileType: string): Promise<string> {
        try {
            switch (fileType.toLowerCase()) {
                case 'pdf':
                    return await this.extractTextFromPDF(filePathOrUrl);
                case 'docx':
                case 'doc':
                    return await this.extractTextFromDOCX(filePathOrUrl);
                case 'txt':
                    return await this.extractTextFromTXT(filePathOrUrl);
                case 'url':
                    return await this.extractTextFromURL(filePathOrUrl);
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }
        } catch (error: any) {
            throw new Error(`Failed to extract text: ${error.message}`);
        }
    }

    /**
     * Extract text from PDF file
     */
    private static async extractTextFromPDF(filePath: string): Promise<string> {
        try {
            const parser = new PDFParse({ url: filePath });
            const result = await parser.getText();
            return result.text;
        } catch (error: any) {
            throw new Error(`PDF extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from DOCX/DOC file
     */
    private static async extractTextFromDOCX(filePath: string): Promise<string> {
        try {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } catch (error: any) {
            throw new Error(`DOCX extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from TXT file
     */
    private static async extractTextFromTXT(filePath: string): Promise<string> {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (error: any) {
            throw new Error(`TXT extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from URL using WebScraperService
     */
    private static async extractTextFromURL(url: string): Promise<string> {
        try {
            return await WebScraperService.scrapeUrl(url);
        } catch (error: any) {
            throw new Error(`URL extraction failed: ${error.message}`);
        }
    }

    /**
     * Determine file type from filename or URL
     */
    static getFileType(filenameOrUrl: string): SourceType {
        // Check if it's a URL
        if (filenameOrUrl.startsWith('http://') || filenameOrUrl.startsWith('https://')) {
            return 'url';
        }
        
        const ext = path.extname(filenameOrUrl).toLowerCase();
        switch (ext) {
            case '.pdf':
                return 'pdf';
            case '.docx':
                return 'docx';
            case '.doc':
                return 'doc';
            case '.txt':
                return 'txt';
            default:
                throw new Error(`Unsupported file extension: ${ext}`);
        }
    }

    /**
     * Get file size in bytes
     * For URLs, returns 0 (size is not applicable)
     */
    static getFileSize(filePathOrUrl: string): number {
        try {
            // URLs don't have a file size
            if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
                return 0;
            }
            const stats = fs.statSync(filePathOrUrl);
            return stats.size;
        } catch (error: any) {
            throw new Error(`Failed to get file size: ${error.message}`);
        }
    }

    /**
     * Get page title from URL
     * Returns the hostname if title cannot be retrieved
     */
    static async getUrlTitle(url: string): Promise<string> {
        try {
            return await WebScraperService.getPageTitle(url);
        } catch (error: any) {
            // Fallback to hostname if title retrieval fails
            try {
                return new URL(url).hostname;
            } catch {
                return url;
            }
        }
    }
}


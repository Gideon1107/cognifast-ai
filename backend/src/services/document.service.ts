import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { DocumentMetadata } from '../types/document.types';

// Import pdf-parse v2 - uses new API with PDFParse class
// const pdfParseLib = require('pdf-parse');
import { PDFParse } from 'pdf-parse';

export class DocumentService {
    /**
     * Extract text from a file based on its type
     */
    static async extractText(filePath: string, fileType: string): Promise<string> {
        try {
            switch (fileType.toLowerCase()) {
                case 'pdf':
                    return await this.extractTextFromPDF(filePath);
                case 'docx':
                case 'doc':
                    return await this.extractTextFromDOCX(filePath);
                case 'txt':
                    return await this.extractTextFromTXT(filePath);
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
     * Determine file type from filename
     */
    static getFileType(filename: string): 'pdf' | 'docx' | 'doc' | 'txt' {
        const ext = path.extname(filename).toLowerCase();
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
     */
    static getFileSize(filePath: string): number {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch (error: any) {
            throw new Error(`Failed to get file size: ${error.message}`);
        }
    }
}


export interface DocumentMetadata {
    id?: string;
    filename: string;
    originalName: string;
    fileType: 'pdf' | 'docx' | 'doc' | 'txt';
    fileSize: number;
    filePath: string;
    extractedText?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DocumentUploadResponse {
    success: boolean;
    message: string;
    document?: DocumentMetadata;
    error?: string;
}


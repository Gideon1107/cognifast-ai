import supabase from '../db/dbConnection';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
    private bucketName = 'documents';

    /**
     * Upload file to Supabase Storage
     */
    async uploadFile(localFilePath: string, filename: string): Promise<{ publicUrl: string; path: string }> {
        try {
            // Read file from local storage
            const fileBuffer = fs.readFileSync(localFilePath);
            
            // Determine content type based on file extension
            const ext = path.extname(filename).toLowerCase();
            const contentType = this.getContentType(ext);

            // Create unique path in bucket: documents/{uuid}/{filename}
            const filePath = `${uuidv4()}/${filename}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .upload(filePath, fileBuffer, {
                    contentType,
                    upsert: false
                });

            if (error) {
                throw new Error(`Supabase upload failed: ${error.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(this.bucketName)
                .getPublicUrl(filePath);

            console.log(`[STORAGE-SERVICE] File uploaded to Supabase: ${filePath}`);

            return {
                publicUrl,
                path: filePath
            };
        } catch (error: any) {
            throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
        }
    }

    /**
     * Delete file from Supabase Storage
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            const { error } = await supabase.storage
                .from(this.bucketName)
                .remove([filePath]);

            if (error) {
                throw new Error(`Failed to delete file: ${error.message}`);
            }

            console.log(`File deleted from Supabase: ${filePath}`);
        } catch (error: any) {
            console.error(`Error deleting file from Supabase: ${error.message}`);
            // Don't throw - deletion errors shouldn't break the flow
        }
    }

    /**
     * Download file from Supabase Storage
     */
    async downloadFile(filePath: string): Promise<Buffer> {
        try {
            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .download(filePath);

            if (error || !data) {
                throw new Error(`Failed to download file: ${error?.message || 'No data'}`);
            }

            // Convert Blob to Buffer
            const arrayBuffer = await data.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error: any) {
            throw new Error(`Failed to download from Supabase Storage: ${error.message}`);
        }
    }

    /**
     * Get content type based on file extension
     */
    private getContentType(ext: string): string {
        const contentTypes: { [key: string]: string } = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain'
        };

        return contentTypes[ext] || 'application/octet-stream';
    }

    /**
     * Ensure bucket exists and is configured
     */
    async ensureBucketExists(): Promise<void> {
        try {
            // Check if bucket exists
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();

            if (listError) {
                throw new Error(`Failed to list buckets: ${listError.message}`);
            }

            const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

            if (!bucketExists) {
                // Create bucket if it doesn't exist
                const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
                    public: true,
                    fileSizeLimit: 10485760 // 10MB
                });

                if (createError) {
                    throw new Error(`Failed to create bucket: ${createError.message}`);
                }

                console.log(`Created Supabase Storage bucket: ${this.bucketName}`);
            }
        } catch (error: any) {
            console.error(`Bucket setup error: ${error.message}`);
            // Don't throw - bucket might already exist or we might not have permission
        }
    }
}


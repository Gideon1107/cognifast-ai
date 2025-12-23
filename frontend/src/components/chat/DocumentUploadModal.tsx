/**
 * Document Upload Modal
 * Modal for uploading documents when creating a new classroom
 */

import { useState, useRef } from 'react';
import type { DragEvent } from 'react';
import { X, Upload, FileText, File, FileCheck, AlertCircle } from 'lucide-react';
import { uploadDocument } from '../../lib/api';
import type { DocumentMetadata } from '@shared/types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (document: DocumentMetadata) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export function DocumentUploadModal({ isOpen, onClose, onUploadSuccess }: DocumentUploadModalProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!acceptedFileTypes.includes(file.type)) {
      return 'Please upload a PDF, DOCX, or TXT file.';
    }
    if (file.size > maxFileSize) {
      return 'File size must be less than 10MB.';
    }
    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      // Simulate progress (since we don't have actual upload progress from API)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await uploadDocument(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.document) {
        setUploadStatus('success');
        setTimeout(() => {
          onUploadSuccess(response.document!);
          // Don't call handleClose() here - let the parent component handle navigation
          // The modal will close when showUploadModal becomes false
        }, 1500);
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload document. Please try again.';
      setErrorMessage(errorMessage);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleClose = () => {
    if (uploadStatus === 'uploading') return; // Prevent closing during upload
    
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage(null);
    setIsDragging(false);
    onClose();
  };

  const getFileIcon = () => {
    if (uploadStatus === 'success') {
      return <FileCheck className="w-16 h-16 text-green-500" />;
    }
    return <FileText className="w-16 h-16 text-blue-500" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Upload Document</h2>
          <button
            onClick={handleClose}
            disabled={uploadStatus === 'uploading'}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {uploadStatus === 'success' ? (
            <div className="text-center py-8">
              {getFileIcon()}
              <h3 className="text-xl font-semibold text-gray-900 mt-4">Upload Successful!</h3>
              <p className="text-gray-600 mt-2">Starting your classroom...</p>
            </div>
          ) : (
            <>
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : uploadStatus === 'uploading'
                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploadStatus === 'uploading'}
                />

                {uploadStatus === 'uploading' ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">Uploading...</p>
                      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{uploadProgress}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drag and drop your document here
                      </p>
                      <p className="text-sm text-gray-600 mt-2">or click to browse</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <File className="w-4 h-4" />
                        <span>PDF, DOCX, TXT</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">Max 10MB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {uploadStatus === 'error' && errorMessage && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">Upload Failed</p>
                    <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUploadStatus('idle');
                      setErrorMessage(null);
                    }}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


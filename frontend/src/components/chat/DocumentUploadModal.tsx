/**
 * Document Upload Modal
 * Modal for uploading documents when creating a new classroom
 */

import { useState, useRef } from 'react';
import type { DragEvent } from 'react';
import { X, Upload, FileText, File, FileCheck, AlertCircle, Trash2 } from 'lucide-react';
import { uploadDocument } from '../../lib/api';
import type { DocumentMetadata } from '@shared/types';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartClassroom: (documentIds: string[], title: string) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'error';

export function DocumentUploadModal({ isOpen, onClose, onStartClassroom }: DocumentUploadModalProps) {
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentMetadata[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [classroomName, setClassroomName] = useState('');
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
        // Add document to the list and keep modal open
        setUploadedDocuments((prev) => [...prev, response.document!]);
        setUploadStatus('idle');
        setUploadProgress(0);
        setErrorMessage(null);
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
    if (uploadStatus === 'uploading' || isStarting) return; // Prevent closing during upload or start
    
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage(null);
    setIsDragging(false);
    setUploadedDocuments([]); // Reset uploaded documents when closing
    onClose();
  };

  const handleRemoveDocument = (documentId: string) => {
    setUploadedDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  const handleStartClassroom = async () => {
    if (uploadedDocuments.length === 0) {
      setErrorMessage('Please upload at least one document to start a classroom.');
      return;
    }

    const documentIds = uploadedDocuments
      .map((doc) => doc.id)
      .filter((id): id is string => !!id);

    if (documentIds.length === 0) {
      setErrorMessage('Invalid document IDs. Please try uploading again.');
      return;
    }

    if (!classroomName.trim()) {
      setErrorMessage('Please enter a classroom name.');
      return;
    }

    setIsStarting(true);
    try {
      onStartClassroom(documentIds, classroomName.trim());
    } catch (error) {
      setIsStarting(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start classroom. Please try again.';
      setErrorMessage(errorMessage);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
          {/* Uploaded Documents List */}
          {uploadedDocuments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Uploaded Documents ({uploadedDocuments.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.originalName || doc.filename}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(doc.fileSize)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDocument(doc.id!)}
                      disabled={uploadStatus === 'uploading' || isStarting}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove document"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : uploadStatus === 'uploading' || isStarting
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
              disabled={uploadStatus === 'uploading' || isStarting}
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
                    {uploadedDocuments.length > 0
                      ? 'Add another document'
                      : 'Drag and drop your document here'}
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

          {/* Classroom Name Input */}
          {uploadedDocuments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div>
                <label htmlFor="classroom-name" className="block text-sm font-medium text-gray-900 mb-2">
                  Classroom Name
                </label>
                <input
                  id="classroom-name"
                  type="text"
                  value={classroomName}
                  onChange={(e) => setClassroomName(e.target.value)}
                  placeholder="Enter classroom name"
                  disabled={uploadStatus === 'uploading' || isStarting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Start Classroom Button */}
              <button
                onClick={handleStartClassroom}
                disabled={uploadStatus === 'uploading' || isStarting || !classroomName.trim()}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isStarting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Starting Classroom...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    <span>Start Classroom</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


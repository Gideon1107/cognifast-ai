/**
 * Source Upload Modal
 * Modal for uploading sources (files) when creating a new classroom
 */

import { useState, useRef } from 'react';
import type { DragEvent } from 'react';
import { X, Upload, FileText, File, FileCheck, AlertCircle, Trash2, Link } from 'lucide-react';
import { uploadSource, uploadUrlSource } from '../../lib/api';
import type { SourceMetadata } from '@shared/types';

interface SourceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartClassroom: (sourceIds: string[], title: string) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'error';
type UploadMode = 'file' | 'url';

export function SourceUploadModal({ isOpen, onClose, onStartClassroom }: SourceUploadModalProps) {
  const [uploadedSources, setUploadedSources] = useState<SourceMetadata[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [classroomName, setClassroomName] = useState('');
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [urlInput, setUrlInput] = useState('');
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

  const validateUrl = (url: string): string | null => {
    if (!url.trim()) {
      return 'Please enter a URL.';
    }
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return 'URL must start with http:// or https://';
      }
      return null;
    } catch {
      return 'Please enter a valid URL.';
    }
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

      const response = await uploadSource(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.source) {
        // Add source to the list and keep modal open
        setUploadedSources((prev) => [...prev, response.source!]);
        setUploadStatus('idle');
        setUploadProgress(0);
        setErrorMessage(null);
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload source. Please try again.';
      setErrorMessage(errorMessage);
      setUploadProgress(0);
    }
  };

  const handleUrlUpload = async (url: string) => {
    const validationError = validateUrl(url);
    if (validationError) {
      setErrorMessage(validationError);
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      // Simulate progress for URL scraping
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const response = await uploadUrlSource(url.trim());
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success && response.source) {
        // Add source to the list and keep modal open
        setUploadedSources((prev) => [...prev, response.source!]);
        setUploadStatus('idle');
        setUploadProgress(0);
        setErrorMessage(null);
        setUrlInput(''); // Clear URL input after successful upload
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload URL. Please try again.';
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
    setUploadedSources([]); // Reset uploaded sources when closing
    setUrlInput(''); // Clear URL input
    setUploadMode('file'); // Reset to file mode
    onClose();
  };

  const handleRemoveSource = (sourceId: string) => {
    setUploadedSources((prev) => prev.filter((source) => source.id !== sourceId));
  };

  const handleStartClassroom = async () => {
    if (uploadedSources.length === 0) {
      setErrorMessage('Please upload at least one source to start a classroom.');
      return;
    }

    const sourceIds = uploadedSources
      .map((source) => source.id)
      .filter((id): id is string => !!id);

    if (sourceIds.length === 0) {
      setErrorMessage('Invalid source IDs. Please try uploading again.');
      return;
    }

    if (!classroomName.trim()) {
      setErrorMessage('Please enter a classroom name.');
      return;
    }

    setIsStarting(true);
    try {
      onStartClassroom(sourceIds, classroomName.trim());
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
      <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-linear-to-br from-emerald-500/15 to-blue-500/15 rounded-xl flex items-center justify-center">
              <Upload className="w-4 h-4 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white sansation-regular">Upload Source</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={uploadStatus === 'uploading'}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="Close upload modal"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto">

          {/* Mode Tabs — sliding pill */}
          <div className="relative flex p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl mb-6">
            {/* Sliding background indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-zinc-700 shadow-sm transition-all duration-200 ease-in-out"
              style={{
                width: 'calc(50% - 6px)',
                left: uploadMode === 'file' ? '4px' : 'calc(50% + 2px)',
              }}
            />
            <button
              onClick={() => { setUploadMode('file'); setErrorMessage(null); }}
              disabled={uploadStatus === 'uploading' || isStarting}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                uploadMode === 'file' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <File className="w-4 h-4" />
              Upload File
            </button>
            <button
              onClick={() => { setUploadMode('url'); setErrorMessage(null); }}
              disabled={uploadStatus === 'uploading' || isStarting}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                uploadMode === 'url' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Link className="w-4 h-4" />
              Add URL
            </button>
          </div>

          {/* Uploaded Sources List */}
          {uploadedSources.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Sources added ({uploadedSources.length})
              </h3>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {uploadedSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200/80 dark:border-zinc-700/60 rounded-xl"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                        {source.fileType === 'url'
                          ? <Link className="w-4 h-4 text-blue-500" />
                          : <FileText className="w-4 h-4 text-blue-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {source.originalName || source.filename}
                        </p>
                        {source.fileType === 'url' ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate" title={source.sourceUrl}>
                            {source.sourceUrl}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{formatFileSize(source.fileSize)}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSource(source.id!)}
                      disabled={uploadStatus === 'uploading' || isStarting}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      title="Remove source"
                      aria-label={`Remove source ${source.originalName || source.filename}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload Mode */}
          {uploadMode === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
                  : uploadStatus === 'uploading' || isStarting
                  ? 'border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/40 cursor-not-allowed'
                  : 'border-gray-200 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10'
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
                  <div className="w-14 h-14 mx-auto flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
                  </div>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100">Uploading...</p>
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
                    <div
                      className="bg-linear-to-r from-emerald-500 to-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{uploadProgress}%</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-linear-to-br from-emerald-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Upload className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      {uploadedSources.length > 0 ? 'Add another source' : 'Drag and drop your file here'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse</p>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    <span>PDF, DOCX, TXT</span>
                    <span>·</span>
                    <span>Max 10 MB</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* URL Upload Mode */}
          {uploadMode === 'url' && (
            <div className="space-y-3">
              <label htmlFor="url-input" className="block text-sm font-medium text-gray-900 dark:text-white">
                Web Page URL
              </label>
              <div className="flex gap-2">
                <input
                  id="url-input"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !uploadStatus && urlInput.trim()) {
                      handleUrlUpload(urlInput);
                    }
                  }}
                  placeholder="https://example.com/article"
                  disabled={uploadStatus === 'uploading' || isStarting}
                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 disabled:dark:bg-zinc-700 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
                />
                <button
                  onClick={() => handleUrlUpload(urlInput)}
                  disabled={uploadStatus === 'uploading' || isStarting || !urlInput.trim()}
                  className="px-5 py-2.5 bg-linear-to-r from-emerald-500 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 shrink-0"
                >
                  {uploadStatus === 'uploading' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Scraping...</span>
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4" />
                      <span>Add URL</span>
                    </>
                  )}
                </button>
              </div>
              {uploadStatus === 'uploading' && (
                <div className="space-y-1.5">
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
                    <div
                      className="bg-linear-to-r from-emerald-500 to-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{uploadProgress}%</p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {uploadStatus === 'error' && errorMessage && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/60 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Upload Failed</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">{errorMessage}</p>
              </div>
              <button
                onClick={() => { setUploadStatus('idle'); setErrorMessage(null); }}
                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Classroom Name + Start */}
          {uploadedSources.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-zinc-800 space-y-4">
              <div>
                <label htmlFor="classroom-name" className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
                  Classroom Name
                </label>
                <input
                  id="classroom-name"
                  type="text"
                  value={classroomName}
                  onChange={(e) => setClassroomName(e.target.value)}
                  placeholder="Enter classroom name"
                  disabled={uploadStatus === 'uploading' || isStarting}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 disabled:dark:bg-zinc-700 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors"
                />
              </div>

              <button
                onClick={handleStartClassroom}
                disabled={uploadStatus === 'uploading' || isStarting || !classroomName.trim()}
                className="w-full bg-linear-to-r from-emerald-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 hover:scale-[1.01] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                {isStarting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
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

/**
 * Sources Panel - Left sidebar showing sources for the conversation
 */

import { FileText, Globe, PanelLeft } from 'lucide-react';

export interface Source {
  id: string;
  name: string;
  type: string;
}

interface SourcesPanelProps {
  sources: Source[];
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 flex flex-col border border-gray-100 dark:border-zinc-900 rounded-xl overflow-hidden h-full">
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-300 sansation-regular">Sources</h2>
        <button
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Collapse sources panel"
          title="Collapse Sources"
        >
          <PanelLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {sources.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-400 dark:text-gray-500 opacity-50" />
              <p className="text-sm font-medium">No sources yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Upload documents or add URLs to get started</p>
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 border border-transparent hover:border-gray-200 dark:hover:border-zinc-600 transition-all duration-200"
              >
                <div className="shrink-0">
                  {source.type === 'url' ? (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 dark:text-zinc-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 dark:text-zinc-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors sansation-regular">
                    {source.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">
                    {source.type === 'url' ? 'Web Page' : source.type.toUpperCase()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

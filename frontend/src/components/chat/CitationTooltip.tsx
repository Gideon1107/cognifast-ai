/**
 * Citation Tooltip Component
 * Displays chunk text when a citation is hovered
 */

import { useRef, useEffect } from 'react';
import { FileText } from 'lucide-react';
import type { MessageSource } from '@shared/types';

interface CitationTooltipProps {
  source: MessageSource;
  isOpen: boolean;
  position?: { x: number; y: number };
}

export function CitationTooltip({ source, isOpen, position }: CitationTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Keep tooltip open when hovering over it
  useEffect(() => {
    if (!isOpen || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    
    const handleMouseEnter = () => {
      // Keep tooltip open when hovering over it
    };

    const handleMouseLeave = () => {
      // Tooltip will close when mouse leaves (handled by parent)
    };

    tooltip.addEventListener('mouseenter', handleMouseEnter);
    tooltip.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      tooltip.removeEventListener('mouseenter', handleMouseEnter);
      tooltip.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-10000 bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-lg max-h-96 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        left: position?.x ? `${Math.min(position.x, window.innerWidth - 448)}px` : '50%',
        top: position?.y ? `${Math.min(position.y, window.innerHeight - 400)}px` : '50%',
        transform: position ? 'none' : 'translate(-50%, -50%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-tooltip-title"
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 bg-gray-50">
        <FileText className="w-4 h-4 text-blue-600" />
        <h3 id="citation-tooltip-title" className="text-sm font-semibold text-gray-900">
          {source.sourceName}
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-80">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {source.chunkText}
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Chunk {source.chunkIndex + 1}</span>
          <span>Similarity: {(source.similarity * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}


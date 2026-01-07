/**
 * Citation Tooltip Component
 * Displays chunk text when a citation is hovered
 */

import { FileText, Globe } from 'lucide-react';
import type { MessageSource } from '@shared/types';

interface CitationTooltipProps {
  source: MessageSource;
  isOpen: boolean;
  position?: { x: number; y: number };
  placement?: 'above' | 'below';
}

export function CitationTooltip({ source, isOpen, position, placement = 'below' }: CitationTooltipProps) {
  if (!isOpen) return null;

  // Calculate position - ensure tooltip doesn't go off screen horizontally
  const tooltipWidth = 448; // max-w-lg = 32rem = 512px, but we use slightly less
  const leftPos = position?.x 
    ? Math.max(8, Math.min(position.x, window.innerWidth - tooltipWidth - 8))
    : window.innerWidth / 2 - tooltipWidth / 2;

  // Animation class based on placement
  const animationClass = placement === 'above' 
    ? 'animate-in fade-in slide-in-from-top-2' 
    : 'animate-in fade-in slide-in-from-bottom-2';

  return (
    <div
      className={`fixed z-10000 bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-lg max-h-96 overflow-hidden duration-200 ${animationClass}`}
      style={{
        left: `${leftPos}px`,
        ...(placement === 'above' 
          ? { bottom: position?.y ? `${window.innerHeight - position.y}px` : '50%' }
          : { top: position?.y ? `${position.y}px` : '50%' }
        ),
        ...(position ? {} : { transform: 'translate(-50%, -50%)' }),
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-tooltip-title"
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 bg-gray-50">
        {source.sourceType === 'url' ? (
          <Globe className="w-4 h-4 text-blue-600" />
        ) : (
          <FileText className="w-4 h-4 text-blue-600" />
        )}
        <h3 id="citation-tooltip-title" className="text-sm font-semibold text-gray-900">
          {source.sourceName}
        </h3>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-80">
        <div className="text-sm text-gray-800 leading-7 " style={{ wordBreak: 'break-word' }}>
          {source.chunkText}
        </div>
      </div>
    </div>
  );
}


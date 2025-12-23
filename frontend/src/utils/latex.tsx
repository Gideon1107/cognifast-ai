/**
 * LaTeX Rendering Utility
 * Renders LaTeX/MathJax equations in text using KaTeX
 * 
 * Supports:
 * - Block equations: \[...\] or $$...$$
 * - Inline equations: \(...\) or $...$ (single dollar signs)
 */

import { type ReactElement } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders text with LaTeX equations
 * Processes the entire text, handling multi-line block equations
 */
export function renderWithLatex(text: string): (string | ReactElement)[] {
  if (!text) return [text];
  
  const parts: (string | ReactElement)[] = [];
  let key = 0;

  // Pattern for block equations: \[...\] or $$...$$
  // Use [\s\S] to match across newlines (non-greedy with ?)
  // Match \[...\] or $$...$$ (but not single $)
  const blockPattern = /(\\\[[\s\S]*?\\\])|(\$\$[\s\S]*?\$\$)/g;
  
  // Find all block equations first
  const blockMatches: Array<{ start: number; end: number; content: string; original: string }> = [];
  let match;
  
  // Reset regex lastIndex
  blockPattern.lastIndex = 0;
  while ((match = blockPattern.exec(text)) !== null) {
    const fullMatch = match[0];
    // Extract equation content (remove delimiters)
    let equation = '';
    if (fullMatch.startsWith('\\[') && fullMatch.endsWith('\\]')) {
      // Remove \[ at start and \] at end
      equation = fullMatch.slice(2, -2).trim();
    } else if (fullMatch.startsWith('$$') && fullMatch.endsWith('$$')) {
      // Remove $$ at start and $$ at end
      equation = fullMatch.slice(2, -2).trim();
    } else {
      // Fallback: try to extract anyway
      equation = fullMatch.replace(/^\\?\[|\\?\]$|^\$\$|\$\$$/g, '').trim();
    }
    
    if (equation) {
      blockMatches.push({
        start: match.index,
        end: match.index + fullMatch.length,
        content: equation,
        original: fullMatch
      });
    }
  }

  // If no block equations, process inline only
  if (blockMatches.length === 0) {
    return renderInlineLatex(text, 0);
  }

  // Process text, replacing block equations with rendered elements
  let lastIndex = 0;
  
  blockMatches.forEach((block) => {
    // Add text before this block equation
    if (block.start > lastIndex) {
      const beforeText = text.slice(lastIndex, block.start);
      if (beforeText) {
        parts.push(...renderInlineLatex(beforeText, key));
        key += 1000;
      }
    }

    // Render the block equation
    try {
      const html = katex.renderToString(block.content, {
        throwOnError: false,
        displayMode: true,
      });
      parts.push(
        <div 
          key={`block-${key++}`} 
          className="my-2"
          style={{ 
            maxWidth: '100%', 
            minWidth: 0,
            width: '100%',
            overflow: 'hidden',
            display: 'block',
            boxSizing: 'border-box',
            position: 'relative'
          }}
        >
          <div 
            className="text-center"
            style={{ 
              maxWidth: '100%', 
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center'
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      );
    } catch {
      // If rendering fails, show error
      parts.push(
        <div key={`block-${key++}`} className="my-4 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          LaTeX Error: {block.content.substring(0, 50)}...
        </div>
      );
    }

    lastIndex = block.end;
  });

  // Add remaining text after last block equation
  if (lastIndex < text.length) {
    const afterText = text.slice(lastIndex);
    if (afterText) {
      parts.push(...renderInlineLatex(afterText, key));
    }
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Renders inline LaTeX equations in text
 */
function renderInlineLatex(text: string, startKey: number): (string | ReactElement)[] {
  if (!text) return [text];
  
  const parts: (string | ReactElement)[] = [];
  let lastIndex = 0;
  let key = startKey;

  // Pattern for inline: $...$ or \(...\)
  // Avoid matching $$ (block equations)
  const inlinePattern = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)|\\\(([^)]+?)\\\)/g;
  let match;

  // Reset regex lastIndex
  inlinePattern.lastIndex = 0;
  while ((match = inlinePattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText) {
        parts.push(beforeText);
      }
    }

    // Extract equation (from either $...$ or \(...\))
    const equation = (match[1] || match[2] || '').trim();
    
    if (equation) {
      try {
        const html = katex.renderToString(equation, {
          throwOnError: false,
          displayMode: false,
        });
        parts.push(
          <span
            key={`inline-${key++}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        // If rendering fails, keep the original
        parts.push(`$${equation}$`);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

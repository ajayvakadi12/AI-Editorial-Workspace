import React, { useState } from 'react';
import * as Diff from 'diff';
import { Copy, Check, Eye, Columns, GitCompare, FileCheck, History } from 'lucide-react';

export default function DiffView({ originalDraft, currentDraft }) {
  const [viewMode, setViewMode] = useState('diff'); // 'diff' | 'side-by-side' | 'revised' | 'original'
  const [copied, setCopied] = useState(false);

  // Compute word-level diff using the 'diff' npm package
  const wordDiff = Diff.diffWordsWithSpace(originalDraft, currentDraft);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-xl p-5 sm:p-6 shadow-xs space-y-4 transition-all">
      {/* Diff Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-stone-100 gap-3">
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-stone-100/70 p-1 rounded-lg border border-stone-200/60">
          <button
            type="button"
            onClick={() => setViewMode('diff')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'diff' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-stone-500" />
            <span>Word Diff</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'side-by-side' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-stone-500" />
            <span>Side-by-Side</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('revised')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'revised' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-stone-500" />
            <span>Final Revised</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'original' ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-stone-500" />
            <span>Original Baseline</span>
          </button>
        </div>

        {/* Copy Revised Text Button */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-50 hover:bg-stone-100/90 active:bg-stone-200/60 border border-stone-200 text-stone-700 text-xs font-medium rounded-lg transition-colors self-start sm:self-auto shadow-2xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-800 font-semibold">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-stone-500" />
              <span>Copy Revised Draft</span>
            </>
          )}
        </button>
      </div>

      {/* Mode 1: Inline Word Diff View */}
      {viewMode === 'diff' && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-[11px] text-stone-500 font-mono px-1">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-500"></span>
              <span>Accepted additions</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-200 border border-rose-400"></span>
              <span>Accepted deletions</span>
            </span>
          </div>

          <div className="bg-[#FAF9F6] border border-stone-200 rounded-lg p-5 font-serif text-sm leading-relaxed text-stone-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-[520px] overflow-y-auto">
            {wordDiff.map((part, index) => {
              if (part.added) {
                return (
                  <span
                    key={index}
                    className="bg-emerald-100 text-emerald-950 font-medium px-0.5 rounded border-b border-emerald-600"
                    title="Added via accepted suggestion"
                  >
                    {part.value}
                  </span>
                );
              }
              if (part.removed) {
                return (
                  <span
                    key={index}
                    className="bg-rose-100 text-rose-950 line-through opacity-70 px-0.5 rounded"
                    title="Removed via accepted suggestion"
                  >
                    {part.value}
                  </span>
                );
              }
              return <span key={index}>{part.value}</span>;
            })}
          </div>
        </div>
      )}

      {/* Mode 2: Side-by-Side Comparison */}
      {viewMode === 'side-by-side' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-xs font-mono text-stone-500 px-1">
              <span className="font-semibold text-stone-600">Original Baseline (Immutable)</span>
              <span>{originalDraft.split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <div className="bg-stone-50/70 border border-stone-200 rounded-lg p-4 font-serif text-xs leading-relaxed text-stone-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] h-96 overflow-y-auto">
              {originalDraft}
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between text-xs font-mono text-stone-500 px-1">
              <span className="font-semibold text-emerald-700">Current Revised Draft</span>
              <span>{currentDraft.split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <div className="bg-white border border-stone-200 rounded-lg p-4 font-serif text-xs leading-relaxed text-stone-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere] h-96 overflow-y-auto shadow-2xs">
              {currentDraft}
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Clean Revised */}
      {viewMode === 'revised' && (
        <div className="bg-white border border-stone-200 rounded-lg p-5 font-serif text-sm leading-relaxed text-stone-900 whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-[520px] overflow-y-auto shadow-2xs">
          {currentDraft}
        </div>
      )}

      {/* Mode 4: Original Baseline Snapshot */}
      {viewMode === 'original' && (
        <div className="bg-stone-50/70 border border-stone-200 rounded-lg p-5 font-serif text-sm leading-relaxed text-stone-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-[520px] overflow-y-auto">
          {originalDraft}
        </div>
      )}
    </div>
  );
}

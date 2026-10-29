import React, { useRef } from 'react';
import { RotateCcw, Undo2, RefreshCw, Sparkles, ExternalLink, ShieldCheck, ChevronDown } from 'lucide-react';

export default function WritingEditor({
  draft,
  onChangeDraft,
  onReanalyze,
  isAnalyzing,
  onUndo,
  canUndo,
  onReset,
  canReset,
  selectedAngle,
  supportingClaims = [],
  activeIssueId,
  onSelectIssue,
  issues = [],
}) {
  const textareaRef = useRef(null);
  const wordCount = draft.split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-white border border-stone-200/90 rounded-xl p-5 sm:p-6 shadow-xs space-y-4 transition-all">
      {/* Editor Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-stone-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-stone-950 tracking-tight">
              Newsletter Draft Editor
            </h2>
            <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/60">
              {wordCount} words
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Original text is never auto-overwritten. Review, accept, edit, or reject suggestions individually.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 disabled:opacity-40 border border-stone-200 rounded-lg transition-colors"
            title="Undo last accepted edit"
          >
            <Undo2 className="w-3.5 h-3.5 text-stone-500" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={!canReset || isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 disabled:opacity-40 border border-stone-200 rounded-lg transition-colors"
            title="Reset to original unedited draft"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>Reset Draft</span>
          </button>

          <button
            type="button"
            onClick={onReanalyze}
            disabled={isAnalyzing || !draft.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-stone-950 text-stone-50 hover:bg-stone-800 disabled:opacity-40 text-xs font-semibold rounded-lg transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Draft...' : 'Re-run Feedback'}</span>
          </button>
        </div>
      </div>

      {/* Editorial Angle Outline Reference (if chosen from Research Assistant) */}
      {selectedAngle && (
        <details className="bg-stone-50/70 border border-stone-200/80 rounded-lg p-3 text-xs text-stone-700 group transition-all">
          <summary className="font-semibold text-stone-900 cursor-pointer flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Scaffold Outline: {selectedAngle.headline}</span>
            </div>
            <span className="text-[11px] font-mono text-stone-400 group-open:hidden">
              Click to view supporting claims & source URLs
            </span>
          </summary>

          <div className="mt-3 pt-3 border-t border-stone-200/70 space-y-2 text-xs leading-relaxed">
            <div>
              <span className="font-semibold text-stone-900">Thesis: </span>
              <span className="text-stone-800">{selectedAngle.thesis}</span>
            </div>
            <div>
              <span className="font-semibold text-stone-900">Counterpoint to address: </span>
              <span className="text-stone-700">{selectedAngle.counterpoint}</span>
            </div>
            <div>
              <span className="font-semibold text-stone-900">Key takeaway for readers: </span>
              <span className="text-stone-700">{selectedAngle.practicalImplication}</span>
            </div>

            {supportingClaims.length > 0 && (
              <div className="pt-2">
                <span className="font-semibold text-stone-900 block mb-1.5 font-mono text-[11px] uppercase tracking-wider text-stone-500">
                  Supporting Verified Evidence ({supportingClaims.length}):
                </span>
                <div className="space-y-1.5 pl-2">
                  {supportingClaims.map((claim) => (
                    <div key={claim.id} className="border-l-2 border-stone-300 pl-2.5 text-[11px] text-stone-600">
                      <span className="font-medium text-stone-900">{claim.text}</span>
                      {claim.sourceUrl && (
                        <a
                          href={claim.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-stone-400 hover:text-stone-900 inline-flex items-center gap-0.5 underline font-sans"
                        >
                          <span>{claim.sourceTitle || 'Source Article'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Main Prose Draft Textarea */}
      <div className="relative min-w-0 w-full">
        <textarea
          ref={textareaRef}
          rows={16}
          value={draft}
          onChange={(e) => onChangeDraft(e.target.value)}
          placeholder="Compose or paste your newsletter draft here..."
          className="w-full min-w-0 p-4 font-serif text-sm sm:text-base leading-relaxed text-stone-900 border border-stone-300/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900 bg-[#FCFCFB] transition-all resize-y"
          style={{ minHeight: '360px' }}
        />

        {/* Status indicator bar beneath textarea */}
        <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 pt-1.5 font-mono">
          <span>
            {draft.length} characters • {wordCount} words
          </span>
          <span>
            {issues.length} active issue{issues.length === 1 ? '' : 's'} in review panel
          </span>
        </div>
      </div>
    </div>
  );
}

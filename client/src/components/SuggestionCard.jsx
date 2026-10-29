import React, { useState } from 'react';
import { Check, X, Edit3, ShieldAlert, CornerDownRight, RotateCcw } from 'lucide-react';

export default function SuggestionCard({
  issue,
  onAccept,
  onReject,
  isSelected,
  onSelect,
}) {
  const [isEditing, setIsEditing] = useState(false);

  const isOmission = issue.type === 'filler_phrase' && issue.suggestion?.isOmission === true;
  const replacementText = issue.suggestion?.replacement;
  const hasReplacementText = typeof replacementText === 'string' && replacementText.trim().length > 0;
  const isPlaceholder = typeof replacementText === 'string' && /^\[.*\]$/.test(replacementText.trim());
  const canApplyAutomatically = (hasReplacementText && !isPlaceholder) || isOmission;

  const initialEditText = canApplyAutomatically && !isOmission
    ? replacementText
    : issue.original;

  const [customText, setCustomText] = useState(initialEditText);

  const severityColor = {
    strong: 'bg-rose-50 text-rose-800 border-rose-200/80',
    warn: 'bg-amber-50 text-amber-800 border-amber-200/80',
    info: 'bg-sky-50 text-sky-800 border-sky-200/80',
  }[issue.severity] || 'bg-stone-50 text-stone-700 border-stone-200';

  const typeLabels = {
    long_sentence: 'Long Sentence',
    hard_to_follow: 'Convoluted Clause',
    passive_voice: 'Passive Voice',
    filler_phrase: 'Filler Phrase',
    unexplained_acronym: 'Acronym on First Mention',
    jargon: 'Corporate Jargon',
    repetition: 'Repetitive Phrasing',
    dense_paragraph: 'Dense Paragraph',
  };

  const handleApply = (e) => {
    e.stopPropagation();
    if (customText.trim() === '' && !isOmission) {
      return;
    }
    onAccept(issue.id, customText);
    setIsEditing(false);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setIsEditing(false);
    setCustomText(initialEditText);
  };

  return (
    <div
      onClick={onSelect}
      className={`border rounded-xl p-4 transition-all text-xs cursor-pointer ${
        isSelected
          ? 'border-stone-950 bg-stone-50/70 shadow-xs ring-1 ring-stone-950/5'
          : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/30'
      }`}
    >
      {/* Header / Category & Severity */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border font-mono ${severityColor}`}>
            {issue.severity}
          </span>
          <span className="font-semibold text-stone-900 text-[11px]">
            {typeLabels[issue.type] || issue.type}
          </span>
        </div>
        <span className="text-[10px] font-mono text-stone-400">
          offsets {issue.start}–{issue.end}
        </span>
      </div>

      {/* Flagged passage in draft */}
      <div className="bg-stone-100/60 border-l-2 border-stone-400 p-2.5 rounded-r mb-2.5 space-y-0.5">
        <span className="text-[10px] uppercase font-bold text-stone-400 block font-mono">
          Flagged Passage
        </span>
        <p className="font-mono text-stone-800 text-[11px] leading-relaxed select-text">
          "{issue.original}"
        </p>
      </div>

      {/* Explanation */}
      <p className="text-stone-600 mb-3 leading-relaxed">
        {issue.explanation}
      </p>

      {/* Technical Integrity Warning (if LLM flagged potential entity drift) */}
      {issue.suggestion?.integrityWarning && (
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-md p-2 text-[11px] text-rose-900 flex items-start gap-1.5 mb-2.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
          <span>{issue.suggestion.integrityWarning}</span>
        </div>
      )}

      {/* Proposed Revision Display (when not in inline edit mode) */}
      {!isEditing && (
        <>
          {canApplyAutomatically ? (
            <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-2.5 mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono inline-flex items-center gap-1">
                  <CornerDownRight className="w-3 h-3 text-stone-400" />
                  Suggested Revision
                </span>
                {issue.suggestion?.rationale && (
                  <span className="text-[10px] text-stone-400 italic">
                    {issue.suggestion.rationale}
                  </span>
                )}
              </div>

              {isOmission ? (
                <p className="font-medium text-amber-900 text-xs break-words flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-semibold">Omit</span>
                  <span className="text-stone-600 font-normal">Remove filler word for tighter prose</span>
                </p>
              ) : (
                <p className="font-medium text-emerald-900 text-xs break-words font-mono">
                  "{replacementText}"
                </p>
              )}
            </div>
          ) : issue.suggestionError ? (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 mb-3 text-[11px] text-amber-900 space-y-0.5">
              <p className="font-medium">{issue.suggestionError}</p>
              <p className="text-amber-700 text-[10px]">Click Edit below to draft your preferred phrasing.</p>
            </div>
          ) : (
            <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-2.5 mb-3 text-[11px] text-stone-600 space-y-0.5">
              <p className="font-medium text-stone-700">Manual revision recommended</p>
              {issue.suggestion?.rationale && (
                <p className="text-stone-500 text-[10px]">{issue.suggestion.rationale}</p>
              )}
              <p className="text-stone-400 text-[10px]">Click Edit below to customize the flagged passage.</p>
            </div>
          )}
        </>
      )}

      {/* Inline Editor (when isEditing is true) */}
      {isEditing && (
        <div className="bg-stone-50 border border-stone-300 rounded-lg p-3 mb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 font-mono">
              Customize Revision
            </span>
            <span className="text-[10px] text-stone-400">
              Original draft remains untouched until applied
            </span>
          </div>

          <textarea
            rows={3}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Enter replacement text..."
            className="w-full text-xs p-2.5 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-900 font-mono leading-relaxed"
          />

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-950 text-white rounded-md text-xs font-medium hover:bg-stone-800 transition-colors shadow-2xs"
            >
              <Check className="w-3 h-3" />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-stone-600 hover:text-stone-900 text-xs font-medium rounded-md hover:bg-stone-200/60 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Controls (Standard View) */}
      {!isEditing && (
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <div className="flex items-center gap-1.5">
            {canApplyAutomatically && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept(issue.id, isOmission ? '' : replacementText);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-950 text-white rounded-md font-medium text-xs hover:bg-stone-800 active:bg-black transition-colors shadow-2xs"
                title="Apply proposed revision directly to draft"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Suggestion</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 text-stone-700 rounded-md font-medium text-xs hover:bg-stone-200 transition-colors"
              title="Edit or customize revision before applying"
            >
              <Edit3 className="w-3 h-3 text-stone-600" />
              <span>Edit</span>
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReject(issue.id);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-stone-400 hover:text-stone-700 transition-colors text-xs"
            title="Dismiss this suggestion without changing draft"
          >
            <X className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Check, AlertTriangle, ExternalLink, Quote, HelpCircle } from 'lucide-react';

export default function ClaimList({ claims, filterSourceId }) {
  const [showLimitationTooltip, setShowLimitationTooltip] = useState(false);

  if (!claims || claims.length === 0) return null;

  const displayClaims = filterSourceId
    ? claims.filter((c) => c.sourceId === filterSourceId)
    : claims;

  return (
    <div className="space-y-3">
      {/* Evidence Subheader */}
      <div className="flex items-center justify-between text-xs text-stone-500 pb-1">
        <div className="flex items-center gap-1.5 font-medium">
          <span>Extracted Claims & Evidence ({displayClaims.length})</span>
          <button
            type="button"
            onClick={() => setShowLimitationTooltip(!showLimitationTooltip)}
            className="text-stone-400 hover:text-stone-700"
            title="Evidence verification limitations"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[11px] font-mono text-stone-400 hidden sm:inline">
          Deterministic string-containment check
        </span>
      </div>

      {/* Tooltip on Verification Meaning */}
      {showLimitationTooltip && (
        <div className="bg-stone-900 text-stone-200 p-3 rounded-lg text-[11px] leading-relaxed space-y-1 border border-stone-800">
          <p className="font-semibold text-white">About Quote Verification:</p>
          <p className="text-stone-300">
            A green "Verified Quote" badge confirms that the quoted passage exists verbatim within the ingested source document. It proves textual grounding, but does not independently fact-check whether the underlying claim or statistic is objectively true.
          </p>
        </div>
      )}

      {/* Claims List */}
      <div className="grid grid-cols-1 gap-2.5">
        {displayClaims.map((claim) => {
          const isVerified = claim.verified === true;
          const typeBadge = {
            fact: 'bg-sky-50 text-sky-800 border-sky-200',
            analysis: 'bg-amber-50 text-amber-800 border-amber-200',
            speculation: 'bg-purple-50 text-purple-800 border-purple-200',
          }[claim.type] || 'bg-stone-50 text-stone-700 border-stone-200';

          return (
            <div
              key={claim.id}
              className={`p-3.5 rounded-lg border transition-all text-xs ${
                isVerified
                  ? 'bg-stone-50/40 border-stone-200/90'
                  : 'bg-amber-50/30 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${typeBadge}`}>
                    {claim.type}
                  </span>

                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Verified Quote</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded"
                      title={claim.verificationFailureReason || 'Quote string was not found verbatim in extracted source text'}
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>Unverified Quote</span>
                    </span>
                  )}
                </div>

                {claim.sourceTitle && (
                  <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                    <span className="truncate max-w-[180px] font-medium" title={claim.sourceTitle}>
                      {claim.sourceTitle}
                    </span>
                    {claim.sourceUrl && (
                      <a
                        href={claim.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-stone-400 hover:text-stone-800"
                        title="Open original source URL"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Claim Text */}
              <p className="font-medium text-stone-900 mb-2 leading-relaxed font-sans break-words">
                {claim.text}
              </p>

              {/* Verbatim Quoted Evidence */}
              {claim.evidenceQuote && (
                <div className="bg-white border-l-2 border-stone-400 p-2.5 rounded-r text-[11px] text-stone-700 italic flex items-start gap-2 shadow-2xs font-serif leading-relaxed break-words">
                  <Quote className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                  <span>"{claim.evidenceQuote}"</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

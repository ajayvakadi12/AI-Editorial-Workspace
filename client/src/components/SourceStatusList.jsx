import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, ExternalLink, Scissors, FileEdit, HelpCircle } from 'lucide-react';

export default function SourceStatusList({
  sourceStatuses,
  onSwitchToPaste,
}) {
  if (!sourceStatuses || sourceStatuses.length === 0) return null;

  const okCount = sourceStatuses.filter((s) => s.status === 'ok').length;
  const partialCount = sourceStatuses.filter((s) => s.status === 'partial').length;
  const failedCount = sourceStatuses.filter((s) => s.status === 'failed').length;

  return (
    <div className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-stone-100 gap-2">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold text-stone-900 tracking-tight">
            Source Ingestion Pipeline Status
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
              {okCount} OK
            </span>
            {partialCount > 0 && (
              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                {partialCount} Partial
              </span>
            )}
            {failedCount > 0 && (
              <span className="text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-medium">
                {failedCount} Excluded / Failed
              </span>
            )}
          </div>
        </div>

        <span className="text-[11px] text-stone-400 font-mono">
          SSRF Verified • Max 30k chars
        </span>
      </div>

      {/* Source Items */}
      <div className="divide-y divide-stone-100 mt-1">
        {sourceStatuses.map((source, idx) => {
          const isOk = source.status === 'ok';
          const isPartial = source.status === 'partial';
          const isFailed = source.status === 'failed';
          const vStats = source.verificationStats;

          return (
            <div
              key={source.id || idx}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs min-w-0"
            >
              <div className="space-y-1 max-w-full sm:max-w-xl min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {isOk && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  {isPartial && <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                  {isFailed && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}

                  <span className="font-semibold text-stone-900 truncate max-w-[200px] sm:max-w-md" title={source.title}>
                    {source.title || `Source #${idx + 1}`}
                  </span>

                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-400 hover:text-stone-700 inline-flex items-center gap-0.5 shrink-0"
                      title="Open source link"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <span className="font-mono text-[11px] text-stone-400 shrink-0">
                    ({source.textLength || 0} chars)
                  </span>

                  {source.truncated && (
                    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded text-[10px] font-mono border border-stone-200 shrink-0">
                      <Scissors className="w-2.5 h-2.5 text-stone-400" /> Truncated
                    </span>
                  )}
                </div>

                {source.reason && (
                  <p className={`text-[11px] pl-6 break-words ${isFailed ? 'text-red-700 font-medium' : 'text-amber-800'}`}>
                    {source.reason}
                  </p>
                )}
              </div>

              {/* Status & Actions on the right */}
              <div className="flex items-center gap-3 self-end sm:self-center pl-6 sm:pl-0">
                {vStats && vStats.totalClaims > 0 && (
                  <div className="text-right">
                    <span className="font-mono text-[11px] text-stone-600">
                      {vStats.verifiedClaims}/{vStats.totalClaims} verified quotes
                    </span>
                    <span
                      className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        vStats.verificationRate >= 80 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                      title="Percentage of claims backed by verbatim quote containment"
                    >
                      {vStats.verificationRate}%
                    </span>
                  </div>
                )}

                {isFailed && onSwitchToPaste && (
                  <button
                    type="button"
                    onClick={() => onSwitchToPaste(source.id || idx)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded-md border border-stone-300 transition-colors text-xs"
                  >
                    <FileEdit className="w-3 h-3 text-stone-600" />
                    <span>Paste text instead</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { Plus, Trash2, Globe, FileText, Sparkles, Loader2, Info } from 'lucide-react';

export default function SourceInput({
  sources,
  setSources,
  onSubmit,
  loading,
  onLoadSample,
}) {
  const addSource = () => {
    if (sources.length >= 8) return;
    setSources([
      ...sources,
      {
        id: `src-${Date.now()}`,
        type: 'url',
        value: '',
        label: '',
      },
    ]);
  };

  const removeSource = (index) => {
    if (sources.length <= 1) return;
    const updated = sources.filter((_, idx) => idx !== index);
    setSources(updated);
  };

  const updateSource = (index, field, value) => {
    const updated = [...sources];
    updated[index] = { ...updated[index], [field]: value };
    setSources(updated);
  };

  const validCount = sources.filter((s) => s.value.trim().length > 0).length;
  const canSubmit = validCount >= 3 && validCount <= 8 && !loading;

  return (
    <div className="bg-white border border-stone-200/90 rounded-xl shadow-xs overflow-hidden transition-all w-full min-w-0">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-semibold text-stone-950 tracking-tight">
              Ingest Primary Sources
            </h2>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded-md border font-medium shrink-0 ${
                validCount >= 3
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              {validCount} of 3–8 ready
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            Provide at least 3 distinct sources (technical announcements, independent reports, or pasted text).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {onLoadSample && (
            <button
              type="button"
              onClick={onLoadSample}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100/80 active:bg-stone-200/60 border border-stone-200 rounded-lg transition-colors"
              title="Preload 3 verified test sources"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load Sample Sources</span>
            </button>
          )}

          <button
            type="button"
            onClick={addSource}
            disabled={sources.length >= 8 || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 border border-stone-200 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Source Rows */}
      <div className="divide-y divide-stone-100 px-5 sm:px-6">
        {sources.map((source, index) => {
          const isUrl = source.type === 'url';
          const isTwitter = isUrl && /(twitter\.com|x\.com)/i.test(source.value);

          return (
            <div key={source.id || index} className="py-4 space-y-2.5 min-w-0">
              {/* Row Header & Mode Selector */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-semibold text-stone-400 w-6">
                    #{index + 1}
                  </span>

                  {/* Mode switch */}
                  <div className="inline-flex rounded-lg border border-stone-200 bg-stone-100/60 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => updateSource(index, 'type', 'url')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                        isUrl
                          ? 'bg-white text-stone-950 shadow-xs'
                          : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      <Globe className="w-3 h-3 text-stone-500" />
                      <span>URL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSource(index, 'type', 'text')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                        !isUrl
                          ? 'bg-white text-stone-950 shadow-xs'
                          : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      <FileText className="w-3 h-3 text-stone-500" />
                      <span>Pasted Text</span>
                    </button>
                  </div>
                </div>

                {/* Right controls: Optional title + Delete */}
                <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto justify-between sm:justify-end">
                  <input
                    type="text"
                    placeholder="Source label (optional)"
                    value={source.label || ''}
                    onChange={(e) => updateSource(index, 'label', e.target.value)}
                    className="text-xs px-2.5 py-1 bg-stone-50/50 border border-stone-200 rounded-md text-stone-800 placeholder-stone-400 w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all min-w-0"
                  />

                  {sources.length > 3 && (
                    <button
                      type="button"
                      onClick={() => removeSource(index)}
                      className="p-1 text-stone-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors shrink-0"
                      title="Remove source row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row Input (URL vs Textarea) */}
              {isUrl ? (
                <div className="min-w-0 w-full">
                  <input
                    type="url"
                    placeholder="https://example.com/research-report-or-announcement"
                    value={source.value}
                    onChange={(e) => updateSource(index, 'value', e.target.value)}
                    className="w-full min-w-0 text-xs sm:text-sm font-mono px-3 py-2 bg-stone-50/40 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white focus:border-stone-900 transition-all [overflow-wrap:anywhere]"
                  />
                  {isTwitter && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-md">
                      <span>X / Twitter links block direct scraping. Please switch to Pasted Text.</span>
                      <button
                        type="button"
                        onClick={() => updateSource(index, 'type', 'text')}
                        className="font-medium underline hover:text-amber-900 ml-2 shrink-0"
                      >
                        Switch to Paste
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-w-0 w-full">
                  <textarea
                    rows={4}
                    placeholder="Paste article body, press release, or post text (at least 50 chars, recommended 400+ for rich analysis)..."
                    value={source.value}
                    onChange={(e) => updateSource(index, 'value', e.target.value)}
                    className="w-full min-w-0 text-xs font-mono p-3 bg-stone-50/40 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white focus:border-stone-900 transition-all leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 mt-1 px-1">
                    <span>
                      {source.value.length} characters
                      {source.value.length > 0 && source.value.length < 50 && (
                        <span className="text-amber-600 ml-1.5 font-sans font-medium">(too short: min 50 required)</span>
                      )}
                      {source.value.length >= 50 && source.value.length < 400 && (
                        <span className="text-stone-500 ml-1.5 font-sans">(short extract: 400+ recommended)</span>
                      )}
                      {source.value.length >= 400 && (
                        <span className="text-emerald-700 ml-1.5 font-sans font-medium">✓ Adequate depth</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Submission Bar */}
      <div className="p-5 sm:p-6 bg-stone-50/50 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs text-stone-500">
          {!canSubmit ? (
            <span className="inline-flex items-center gap-1.5 text-stone-500">
              <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              Provide at least 3 non-empty sources to generate research brief.
            </span>
          ) : (
            <span className="text-stone-700 font-medium">
              Ready: {validCount} sources will be fetched, sanitized, and synthesized.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-stone-900 text-stone-50 text-xs sm:text-sm font-medium rounded-lg hover:bg-stone-800 active:bg-stone-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-stone-300" />
              <span>Analyzing & Synthesizing Sources...</span>
            </>
          ) : (
            <span>Generate Research Brief</span>
          )}
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { ArrowRight, CheckCircle2, Star, Sparkles, Layers, ShieldCheck } from 'lucide-react';

export default function AnglePicker({
  angles,
  recommendedAngle,
  allClaims,
  selectedAngleId,
  onSelectAngleId,
  onProceedToDraft,
}) {
  if (!angles || angles.length === 0) return null;

  const currentSelection = angles.find((a) => a.id === selectedAngleId) || angles[0];

  return (
    <div className="bg-white border border-stone-200/90 rounded-xl p-5 sm:p-6 shadow-xs space-y-5 transition-all">
      {/* Header */}
      <div className="pb-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-semibold text-stone-950 tracking-tight">
              Select Editorial Angle & Thesis
            </h3>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            Select a defensible angle for your newsletter story. The chosen angle, its thesis, counterpoints, and verified citations will directly scaffold the Writing Assistant.
          </p>
        </div>

        {recommendedAngle && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-xs text-amber-950 max-w-md shrink-0 flex items-start gap-2">
            <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-900">Recommended Framing: </span>
              <span className="text-stone-700">{recommendedAngle.reasoning}</span>
            </div>
          </div>
        )}
      </div>

      {/* Angle Selection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {angles.map((angle) => {
          const isSelected = (selectedAngleId || recommendedAngle?.angleId) === angle.id;
          const isRecommended = recommendedAngle?.angleId === angle.id;

          // Find claims supporting this angle
          const supportingClaims = (allClaims || []).filter((c) =>
            (angle.supportingClaimIds || []).includes(c.id)
          );

          return (
            <div
              key={angle.id}
              onClick={() => onSelectAngleId(angle.id)}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-stone-950 bg-stone-50/80 shadow-xs ring-1 ring-stone-950/5'
                  : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/30'
              }`}
            >
              <div>
                {/* Badge row */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold text-stone-400">
                      Angle #{angle.id}
                    </span>
                    {isRecommended && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300/60 px-2 py-0.5 rounded-full">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        Editor Recommendation
                      </span>
                    )}
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-stone-950 bg-stone-950 text-white'
                        : 'border-stone-300'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Headline */}
                <h4 className="text-base font-bold text-stone-900 leading-snug mb-3 break-words">
                  {angle.headline}
                </h4>

                {/* Editorial Fields */}
                <div className="space-y-2 text-xs text-stone-600 mb-4 break-words">
                  <div>
                    <span className="font-semibold text-stone-900">Thesis: </span>
                    <span className="text-stone-800">{angle.thesis}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900">Why Now: </span>
                    <span>{angle.whyNow}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900">Counterpoint: </span>
                    <span className="text-stone-700">{angle.counterpoint}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900">Reader Takeaway: </span>
                    <span className="text-stone-700">{angle.practicalImplication}</span>
                  </div>
                </div>
              </div>

              {/* Supporting evidence count footer */}
              <div className="pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs text-stone-500 gap-2">
                <span className="font-mono text-[11px] inline-flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-stone-400" />
                  {angle.supportingClaimIds?.length || 0} cited evidence claim(s)
                </span>
                <span className={`text-[11px] font-semibold shrink-0 ${isSelected ? 'text-stone-950 font-bold' : 'text-stone-400'}`}>
                  {isSelected ? '✓ Selected' : 'Click to select'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Action Button Bar */}
      <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="text-xs text-stone-600 min-w-0 truncate">
          Selected Angle: <span className="font-semibold text-stone-950">{currentSelection?.headline}</span>
        </div>

        <button
          type="button"
          onClick={() => onProceedToDraft(currentSelection)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-stone-950 hover:bg-stone-800 active:bg-black text-white font-medium text-xs sm:text-sm rounded-lg transition-all shadow-xs"
        >
          <span>Start Draft From This Angle</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

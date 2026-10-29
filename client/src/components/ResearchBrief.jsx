import React, { useState } from 'react';
import {
  ExternalLink,
  Layers,
  GitPullRequest,
  HelpCircle,
  CheckCircle,
  Users,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import ClaimList from './ClaimList.jsx';
import AnglePicker from './AnglePicker.jsx';

export default function ResearchBrief({
  brief,
  selectedAngleId,
  onSelectAngleId,
  onProceedToDraft,
}) {
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  if (!brief) return null;

  const { sourceAnalyses, synthesis, allClaims, sourceStatuses } = brief;
  const usableSources = (sourceStatuses || []).filter((s) => s.status === 'ok' || s.status === 'partial');
  const failedSources = (sourceStatuses || []).filter((s) => s.status === 'failed');

  // Compute key findings from developments for the executive research overview
  const primaryDev = synthesis?.developments?.[0];
  const totalVerifiedClaims = (allClaims || []).filter((c) => c.verified).length;

  return (
    <div className="space-y-6">
      {/* 1. High-Signal Research Overview Banner */}
      <div className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-stone-100 gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-stone-900" />
            <h3 className="text-base font-semibold text-stone-950 tracking-tight">
              Executive Research Brief
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
            <span className="bg-stone-100 px-2.5 py-0.5 rounded-full text-stone-700">
              {usableSources.length} sources synthesized
            </span>
            {failedSources.length > 0 && (
              <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                {failedSources.length} excluded
              </span>
            )}
            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              {totalVerifiedClaims} verified quotes
            </span>
          </div>
        </div>

        {/* Narrative & Opportunity summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          <div className="md:col-span-2 space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 block font-mono">
              Core Editorial Opportunity
            </span>
            <p className="text-sm font-medium text-stone-900 leading-relaxed">
              {primaryDev?.whatHappened || 'Multiple sources document shifting frontier model capabilities, agent infrastructure, and cost dynamics.'}
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              Synthesized across {usableSources.map((s) => s.title).filter(Boolean).slice(0, 3).join(', ')}.
            </p>
          </div>

          <div className="bg-stone-50/80 border border-stone-200/70 rounded-lg p-3.5 space-y-2 text-xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 block font-mono">
              Why Readers Care
            </span>
            <p className="text-stone-700 leading-relaxed">
              {primaryDev?.whoShouldCare ? `Essential for ${primaryDev.whoShouldCare}` : 'Actionable signal for AI founders, builders, and operational leaders.'}
            </p>
            {primaryDev?.whyItMatters?.founders && (
              <p className="text-stone-500 text-[11px] italic">
                "{primaryDev.whyItMatters.founders}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Editorial Angles (Decision Making) */}
      {synthesis?.newsletterAngles && (
        <AnglePicker
          angles={synthesis.newsletterAngles}
          recommendedAngle={synthesis.recommendedAngle}
          allClaims={allClaims}
          selectedAngleId={selectedAngleId}
          onSelectAngleId={onSelectAngleId}
          onProceedToDraft={onProceedToDraft}
        />
      )}

      {/* 3. Synthesized Developments */}
      {synthesis?.developments && synthesis.developments.length > 0 && (
        <div className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-xs space-y-6">
          <div className="pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-stone-700" />
              <h3 className="text-base font-semibold text-stone-950 tracking-tight">
                Synthesized Market & Technical Developments
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Cross-source narrative connecting evidence to concrete takeaways for founders, builders, and operators.
            </p>
          </div>

          <div className="space-y-6 divide-y divide-stone-100">
            {synthesis.developments.map((dev, idx) => (
              <div key={dev.id || idx} className={`${idx > 0 ? 'pt-6' : ''} space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <h4 className="text-base font-bold text-stone-900">
                    {dev.title}
                  </h4>
                  {dev.whoShouldCare && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full border border-stone-200 shrink-0">
                      <Users className="w-3 h-3 text-stone-500" />
                      <span>{dev.whoShouldCare}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-400 block">
                    What Happened
                  </span>
                  <p className="text-sm text-stone-800 leading-relaxed font-serif">
                    {dev.whatHappened}
                  </p>
                </div>

                {dev.whyItMatters && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-400 block">
                      Why It Matters by Audience
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-stone-50/70 border border-stone-200/80 rounded-lg p-3 text-xs space-y-1">
                        <span className="font-semibold text-stone-900 block">Founders & Execs</span>
                        <p className="text-stone-600 leading-relaxed">{dev.whyItMatters.founders}</p>
                      </div>
                      <div className="bg-stone-50/70 border border-stone-200/80 rounded-lg p-3 text-xs space-y-1">
                        <span className="font-semibold text-stone-900 block">Builders & Engineers</span>
                        <p className="text-stone-600 leading-relaxed">{dev.whyItMatters.builders}</p>
                      </div>
                      <div className="bg-stone-50/70 border border-stone-200/80 rounded-lg p-3 text-xs space-y-1">
                        <span className="font-semibold text-stone-900 block">Business Operators</span>
                        <p className="text-stone-600 leading-relaxed">{dev.whyItMatters.operators}</p>
                      </div>
                    </div>
                  </div>
                )}

                {dev.openUncertainties && dev.openUncertainties.length > 0 && (
                  <div className="bg-amber-50/50 border border-amber-200/70 rounded-lg p-3 text-xs text-amber-950">
                    <span className="font-semibold flex items-center gap-1.5 mb-1.5 text-amber-900">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Open Questions & Editorial Uncertainties</span>
                    </span>
                    <ul className="list-disc pl-5 space-y-1 text-stone-700">
                      {dev.openUncertainties.map((u, uIdx) => (
                        <li key={uIdx} className="leading-relaxed">{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Cross-Source Tensions & Alignment */}
      {synthesis?.tensions && (
        <div className="bg-white border border-stone-200/90 rounded-xl p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-stone-700" />
              <h3 className="text-base font-semibold text-stone-950 tracking-tight">
                Cross-Source Tensions & Alignment
              </h3>
            </div>
            <span className="text-[11px] font-mono text-stone-400">Deterministic synthesis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {synthesis.tensions.agreements?.length > 0 && (
              <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-lg p-4 space-y-2">
                <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Consensus & Agreements ({synthesis.tensions.agreements.length})</span>
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-stone-700 leading-relaxed">
                  {synthesis.tensions.agreements.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {synthesis.tensions.conflicts?.length > 0 && (
              <div className="bg-rose-50/40 border border-rose-200/80 rounded-lg p-4 space-y-2">
                <span className="font-semibold text-rose-900 flex items-center gap-1.5">
                  <GitPullRequest className="w-3.5 h-3.5 text-rose-600" />
                  <span>Conflicts & Contradictions ({synthesis.tensions.conflicts.length})</span>
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-stone-700 leading-relaxed">
                  {synthesis.tensions.conflicts.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {synthesis.tensions.gaps?.length > 0 && (
              <div className="bg-amber-50/40 border border-amber-200/80 rounded-lg p-4 space-y-2">
                <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Unanswered Research Gaps ({synthesis.tensions.gaps.length})</span>
                </span>
                <ul className="list-disc pl-4 space-y-1.5 text-stone-700 leading-relaxed">
                  {synthesis.tensions.gaps.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Per-Source Breakdown & Expandable Evidence */}
      <div className="bg-white border border-stone-200/90 rounded-xl shadow-xs overflow-hidden">
        <div
          onClick={() => setEvidenceExpanded(!evidenceExpanded)}
          className="p-5 sm:p-6 cursor-pointer hover:bg-stone-50/50 transition-colors flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h3 className="text-base font-semibold text-stone-950 tracking-tight">
                Source Evidence & Verifiable Claims
              </h3>
              <span className="font-mono text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                {allClaims?.length || 0} claims extracted
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Verbatim quotations matched deterministically against source texts. Expand to audit full quotes and source attributions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-600 hidden sm:inline">
              {evidenceExpanded ? 'Collapse Evidence' : 'Audit All Evidence'}
            </span>
            <div className="p-1 rounded-md bg-stone-100 text-stone-600">
              {evidenceExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {evidenceExpanded && (
          <div className="border-t border-stone-100 p-5 sm:p-6 space-y-6 bg-stone-50/30">
            {(sourceAnalyses || []).map((analysis) => {
              const statusInfo = (sourceStatuses || []).find((s) => s.id === analysis.sourceId);

              return (
                <div
                  key={analysis.sourceId}
                  className="border border-stone-200/80 bg-white rounded-xl p-5 space-y-4 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-stone-400 block mb-0.5">
                        {analysis.sourceId}
                      </span>
                      <h4 className="text-sm font-semibold text-stone-950">
                        {statusInfo?.title || 'Source Document'}
                      </h4>
                    </div>

                    {statusInfo?.url && (
                      <a
                        href={statusInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-950 font-medium underline"
                      >
                        <span>Open Source Article</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="text-xs text-stone-700 bg-stone-50/80 border border-stone-200/60 rounded-lg p-3 leading-relaxed">
                    <span className="font-semibold text-stone-900 block mb-1">Source Summary:</span>
                    {analysis.summary}
                  </div>

                  <ClaimList claims={analysis.claims} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

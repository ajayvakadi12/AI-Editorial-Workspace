import React, { useState } from 'react';
import SourceInput from '../components/SourceInput.jsx';
import SourceStatusList from '../components/SourceStatusList.jsx';
import ResearchBrief from '../components/ResearchBrief.jsx';
import { submitResearch } from '../services/api.js';
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

const SAMPLE_SOURCES = [
  {
    id: 'src-1',
    type: 'text',
    label: 'Anthropic Claude 3.5 Sonnet Technical Report',
    value: `Anthropic announced Claude 3.5 Sonnet, demonstrating major benchmark advances across coding, multi-step reasoning, and visual processing. According to the technical evaluation, the model sets new industry benchmarks on graduate-level reasoning (GPQA), undergraduate-level knowledge (MMLU), and coding proficiency (HumanEval). On the SWE-bench Verified coding benchmark, Claude 3.5 Sonnet resolved 49.2% of real-world GitHub software issues, outperforming previous frontier systems including GPT-4o. The release operates at twice the speed of Claude 3 Opus while matching middle-tier pricing.`,
  },
  {
    id: 'src-2',
    type: 'text',
    label: 'SWE-bench Verified: Independent Evaluation',
    value: `On the SWE-bench Verified coding benchmark, autonomous agent resolution rates climbed to unprecedented levels over the past quarter. SWE-bench Verified curates 500 human-validated pull request problems from popular open-source Python repositories, ensuring unit tests accurately reflect issue resolution rather than test flakiness. Independent evaluations showed significant gains in multi-file diff resolution when models are paired with scaffolded terminal tools and linting feedback loops. However, researchers noted that real-world enterprise repositories with sparse documentation still experience significantly lower first-pass pass rates.`,
  },
  {
    id: 'src-3',
    type: 'text',
    label: 'Inference Economics & Context Caching Analysis',
    value: `Prompt caching reduces API inference costs by up to 90 percent for repetitive large context workloads across frontier model providers. In continuous software engineering agents, passing full repository directory trees, language server protocol symbols, and conversational history previously led to runaway token consumption. By caching static system instructions and codebase snapshots, latency dropped by over 80 percent on subsequent agent iterations. Early adopters report massive savings on agentic loops, transforming autonomous engineering tools from expensive research demos into commercially viable developer subscriptions.`,
  },
];

export default function ResearchPage({
  onAngleSelectedForDraft,
  initialBrief,
  setSavedBrief,
}) {
  const [sources, setSources] = useState([
    { id: 'src-1', type: 'url', value: 'https://en.wikipedia.org/wiki/Claude_(language_model)', label: 'Claude Model Overview' },
    { id: 'src-2', type: 'url', value: 'https://en.wikipedia.org/wiki/Artificial_intelligence', label: 'AI History' },
    { id: 'src-3', type: 'text', value: SAMPLE_SOURCES[0].value, label: SAMPLE_SOURCES[0].label },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [brief, setBrief] = useState(initialBrief || null);
  const [selectedAngleId, setSelectedAngleId] = useState(null);

  const handleLoadSample = () => {
    setSources(SAMPLE_SOURCES);
    setError(null);
  };

  const handleSwitchToPaste = (sourceId) => {
    setSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, type: 'text', value: '' } : s))
    );
  };

  const handleRunResearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await submitResearch(sources);
      setBrief(result);
      if (setSavedBrief) setSavedBrief(result);
      if (result.synthesis?.recommendedAngle?.angleId) {
        setSelectedAngleId(result.synthesis.recommendedAngle.angleId);
      }
    } catch (err) {
      setError({
        code: err.code || 'RESEARCH_ERROR',
        message: err.message,
        sourceStatuses: err.sourceStatuses || [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToDraft = (angle) => {
    if (!brief || !angle) return;

    // Filter claims supporting this angle
    const supporting = (brief.allClaims || []).filter((c) =>
      (angle.supportingClaimIds || []).includes(c.id)
    );

    onAngleSelectedForDraft({
      angle,
      supportingClaims: supporting,
      allSources: brief.sourceStatuses || [],
      brief,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-7 w-full min-w-0">
      {/* Research Assistant Header Section with full vertical clearance and no clipping */}
      <header className="space-y-1.5 scroll-mt-24 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-stone-500 bg-stone-100 border border-stone-200/80 px-2 py-0.5 rounded">
            Stage 1 • Sources to Brief
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-950 leading-tight">
          Research Assistant
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
          Research smarter. Find the story. Write with evidence.
        </p>
      </header>

      {/* Error Alert with embedded source status list */}
      {error && (
        <div className="bg-rose-50/90 border border-rose-200 rounded-xl p-5 text-xs text-rose-900 space-y-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <h3 className="font-semibold text-rose-950 text-sm">Extraction or Synthesis Blocked</h3>
              <p className="leading-relaxed text-rose-800 break-words">{error.message}</p>
            </div>
          </div>

          {error.sourceStatuses && error.sourceStatuses.length > 0 && (
            <div className="pt-2">
              <SourceStatusList
                sourceStatuses={error.sourceStatuses}
                onSwitchToPaste={handleSwitchToPaste}
              />
            </div>
          )}
        </div>
      )}

      {/* Ingestion Input Form */}
      <SourceInput
        sources={sources}
        setSources={setSources}
        onSubmit={handleRunResearch}
        loading={loading}
        onLoadSample={handleLoadSample}
      />

      {/* Ingestion Pipeline Status when brief is present */}
      {brief && brief.sourceStatuses && (
        <SourceStatusList
          sourceStatuses={brief.sourceStatuses}
          onSwitchToPaste={handleSwitchToPaste}
        />
      )}

      {/* Synthesized Editorial Brief Output */}
      {brief && (
        <ResearchBrief
          brief={brief}
          selectedAngleId={selectedAngleId}
          onSelectAngleId={setSelectedAngleId}
          onProceedToDraft={handleProceedToDraft}
        />
      )}
    </div>
  );
}

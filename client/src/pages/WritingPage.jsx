import React, { useState, useEffect } from 'react';
import WritingEditor from '../components/WritingEditor.jsx';
import SuggestionCard from '../components/SuggestionCard.jsx';
import WritingMetrics from '../components/WritingMetrics.jsx';
import DiffView from '../components/DiffView.jsx';
import { analyzeDraft } from '../services/api.js';
import { ArrowLeft, CheckCircle2, AlertCircle, Edit3, GitCompare } from 'lucide-react';

export default function WritingPage({
  importedDraftData,
  onBackToResearch,
}) {
  // Generate initial draft outline if angle was chosen from research
  const generateInitialDraft = () => {
    if (!importedDraftData?.angle) {
      return `Frontier AI models are advancing rapidly, but enterprise adoption hinges on infrastructure economics rather than raw intelligence benchmarks.

It is important to note that autonomous agents can resolve complex multi-file pull requests on verified benchmarks in order to improve developer throughput. However, at the end of the day, running continuous loops without prompt caching can potentially create runaway inference expenses.

The SWE-bench benchmark was conducted by independent evaluators to measure problem resolution. To maintain velocity, engineering leaders must optimize context caching before deploying production coding bots.`;
    }

    const { angle, supportingClaims, allSources } = importedDraftData;
    const claimsSection = (supportingClaims || [])
      .map((c) => `- Claim: ${c.text}\n  Quote: "${c.evidenceQuote}"\n  Source: ${c.sourceUrl || c.sourceTitle || 'Verified Source'}`)
      .join('\n\n');

    return `# ${angle.headline}

## Editorial Thesis
${angle.thesis}

## Context & Timeliness
${angle.whyNow}

## Supporting Evidence & Verified Quotes
${claimsSection}

## Counterpoint & Risk
${angle.counterpoint}

## Practical Implication for Readers
${angle.practicalImplication}

---
[Start drafting your newsletter story below, expanding on the outline above...]
`;
  };

  const [initialDraft] = useState(generateInitialDraft());
  const [originalDraft, setOriginalDraft] = useState(initialDraft);
  const [currentDraft, setCurrentDraft] = useState(initialDraft);
  const [history, setHistory] = useState([]);
  const [issues, setIssues] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeIssueId, setActiveIssueId] = useState(null);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'diff'
  const [error, setError] = useState(null);

  // Trigger analysis on initial mount
  useEffect(() => {
    handleRunAnalysis(currentDraft);
  }, []);

  const handleRunAnalysis = async (textToAnalyze) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeDraft(textToAnalyze);
      setIssues(result.issues || []);
      setMetrics(result.metrics || null);
      if (result.issues?.length > 0) {
        setActiveIssueId(result.issues[0].id);
      }
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Accept / Apply a single suggestion with location validation and exact-text matching
  const handleAcceptSuggestion = (issueId, replacement) => {
    const targetIssue = issues.find((i) => i.id === issueId);
    if (!targetIssue) return;

    const rep = replacement !== undefined ? replacement : (targetIssue.suggestion?.replacement ?? '');
    const { original } = targetIssue;

    // Validate passage location in currentDraft
    let matchStart = -1;
    let matchEnd = -1;

    // 1. Direct offset check: Does currentDraft at [start, end] exactly match original?
    if (
      targetIssue.start >= 0 &&
      targetIssue.end <= currentDraft.length &&
      currentDraft.slice(targetIssue.start, targetIssue.end) === original
    ) {
      matchStart = targetIssue.start;
      matchEnd = targetIssue.end;
    } else if (original) {
      // 2. Exact-text search with closest occurrence selection
      const occurrences = [];
      let searchIdx = 0;
      while ((searchIdx = currentDraft.indexOf(original, searchIdx)) !== -1) {
        occurrences.push(searchIdx);
        searchIdx += original.length;
      }

      if (occurrences.length === 0) {
        setError(`Unable to apply revision: The passage "${original}" was modified or removed in the draft.`);
        return;
      }

      // Handle repeated occurrences safely: select the occurrence closest to targetIssue.start
      occurrences.sort((a, b) => Math.abs(a - targetIssue.start) - Math.abs(b - targetIssue.start));
      matchStart = occurrences[0];
      matchEnd = matchStart + original.length;
    } else {
      matchStart = targetIssue.start;
      matchEnd = targetIssue.end;
    }

    // Save history for undo
    setHistory((prev) => [...prev, currentDraft]);

    // Apply replacement strictly to currentDraft at the validated location
    const newDraft = currentDraft.slice(0, matchStart) + rep + currentDraft.slice(matchEnd);
    const delta = rep.length - (matchEnd - matchStart);

    setCurrentDraft(newDraft);
    setError(null);

    // Shift offsets for remaining issues safely
    const remaining = [];
    for (const issue of issues) {
      if (issue.id === issueId) continue; // remove accepted

      // If issue was completely inside the replaced range, drop it
      if (issue.start >= matchStart && issue.end <= matchEnd) {
        continue;
      }

      if (issue.start >= matchEnd) {
        remaining.push({
          ...issue,
          start: issue.start + delta,
          end: issue.end + delta,
        });
      } else {
        remaining.push(issue);
      }
    }

    setIssues(remaining);
    setActiveIssueId(remaining[0]?.id || null);

    // Silently re-analyze metrics for updated draft
    analyzeDraft(newDraft).then((res) => {
      if (res.metrics) setMetrics(res.metrics);
    }).catch(() => {});
  };

  // Reject / Dismiss a suggestion
  const handleRejectSuggestion = (issueId) => {
    const remaining = issues.filter((i) => i.id !== issueId);
    setIssues(remaining);
    if (activeIssueId === issueId) {
      setActiveIssueId(remaining[0]?.id || null);
    }
  };

  // Undo last accepted change
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCurrentDraft(previous);
    handleRunAnalysis(previous);
  };

  // Reset to original immutable draft
  const handleReset = () => {
    if (window.confirm('Reset draft to its original unedited baseline? All accepted changes will be reverted.')) {
      setHistory((prev) => [...prev, currentDraft]);
      setCurrentDraft(originalDraft);
      handleRunAnalysis(originalDraft);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200/80 gap-3 scroll-mt-24 pt-1">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToResearch}
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
              title="Return to Research Assistant"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Research</span>
            </button>
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-stone-500 bg-stone-100 border border-stone-200/80 px-2 py-0.5 rounded">
              Stage 2 • Hemingway Review
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-950 leading-tight">
            Writing Assistant
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
            Hemingway-style review. Writer-controlled edits with evidence links.
          </p>
        </div>

        {/* View Mode Switcher: Workspace vs Diff */}
        <div className="flex items-center gap-1 bg-stone-100/80 p-1 rounded-lg border border-stone-200/60 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'editor'
                ? 'bg-white text-stone-950 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-stone-500" />
            <span>Draft Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === 'diff'
                ? 'bg-white text-stone-950 shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-stone-500" />
            <span>Revision Diff</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {/* Readability & Prose Metrics Strip */}
      <WritingMetrics metrics={metrics} />

      {/* Mode 1: Main Two-Column Editorial Workspace */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Draft Editor (7 cols) */}
          <div className="lg:col-span-7 min-w-0 w-full">
            <WritingEditor
              draft={currentDraft}
              onChangeDraft={(val) => setCurrentDraft(val)}
              onReanalyze={() => handleRunAnalysis(currentDraft)}
              isAnalyzing={isAnalyzing}
              onUndo={handleUndo}
              canUndo={history.length > 0}
              onReset={handleReset}
              canReset={currentDraft !== originalDraft}
              selectedAngle={importedDraftData?.angle}
              supportingClaims={importedDraftData?.supportingClaims}
              activeIssueId={activeIssueId}
              onSelectIssue={setActiveIssueId}
              issues={issues}
            />
          </div>

          {/* Secondary Review & Suggestions Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-4 min-w-0 w-full">
            <div className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="text-sm font-semibold text-stone-950 flex items-center gap-2">
                  <span>Editorial Suggestions</span>
                  <span className="font-mono text-xs font-normal text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200/60">
                    {issues.length} flagged
                  </span>
                </h3>
                <span className="text-[11px] font-mono text-stone-400">
                  Writer-Controlled
                </span>
              </div>

              {issues.length === 0 ? (
                <div className="py-12 text-center text-stone-500 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-stone-900 text-sm">Clean, High-Clarity Draft</p>
                  <p className="text-stone-500 max-w-xs mx-auto leading-relaxed">
                    No long sentences, passive phrasing, filler words, or unexpanded acronyms detected in current pass.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mt-4 max-h-[680px] overflow-y-auto pr-1">
                  {issues.map((issue) => (
                    <SuggestionCard
                      key={issue.id}
                      issue={issue}
                      isSelected={issue.id === activeIssueId}
                      onSelect={() => setActiveIssueId(issue.id)}
                      onAccept={handleAcceptSuggestion}
                      onReject={handleRejectSuggestion}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Diff & Version Comparison Tab */}
      {activeTab === 'diff' && (
        <DiffView
          originalDraft={originalDraft}
          currentDraft={currentDraft}
        />
      )}
    </div>
  );
}

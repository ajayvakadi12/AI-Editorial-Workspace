import React, { useState } from 'react';
import { BookOpen, HelpCircle, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function WritingMetrics({ metrics }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  if (!metrics) return null;

  const {
    wordCount = 0,
    sentenceCount = 0,
    averageSentenceLength = 0,
    longestSentence = { words: 0, text: '' },
    estimatedReadingTimeMinutes = 0,
    passiveVoiceSharePercent = 0,
    fleschReadingEase = 100,
    fleschKincaidGrade = 0,
    readabilityCaveat,
    metricExplanations = {},
  } = metrics;

  const statCards = [
    {
      key: 'wordCount',
      label: 'Length',
      value: `${wordCount} words`,
      sub: `${sentenceCount} sentences`,
      status: wordCount >= 300 && wordCount <= 600 ? 'optimal' : 'neutral',
      info: metricExplanations.wordCount || {
        indicator: 'Total word count of the newsletter draft.',
        limitation: 'Newsletter formats typically perform best between 300 and 600 words for scanability.',
      },
    },
    {
      key: 'averageSentenceLength',
      label: 'Avg Sentence',
      value: `${averageSentenceLength} wps`,
      sub: 'Target: 14–18 words',
      status: averageSentenceLength <= 20 ? 'optimal' : 'warning',
      info: metricExplanations.averageSentenceLength || {
        indicator: 'Average number of words per sentence.',
        limitation: 'Technical clauses can skew averages without necessarily impairing comprehension.',
      },
    },
    {
      key: 'readingTime',
      label: 'Reading Time',
      value: `${estimatedReadingTimeMinutes} min`,
      sub: 'Paced at ~238 wpm',
      status: 'neutral',
      info: metricExplanations.estimatedReadingTimeMinutes || {
        indicator: 'Estimated silent reading time for typical industry executives.',
        limitation: 'Skimming speed varies widely based on technical familiarity.',
      },
    },
    {
      key: 'passiveVoice',
      label: 'Passive Voice',
      value: `${passiveVoiceSharePercent}%`,
      sub: 'Target: <10%',
      status: passiveVoiceSharePercent <= 10 ? 'optimal' : 'warning',
      info: metricExplanations.passiveVoiceSharePercent || {
        indicator: 'Percentage of sentences containing auxiliary passive constructions.',
        limitation: 'Some passive phrasing is legitimate when the object of the action is the focus.',
      },
    },
    {
      key: 'fleschReadingEase',
      label: 'Flesch Ease',
      value: fleschReadingEase,
      sub: fleschReadingEase >= 60 ? 'Standard English' : 'Dense / Technical',
      status: fleschReadingEase >= 55 ? 'optimal' : 'neutral',
      info: metricExplanations.fleschReadingEase || {
        indicator: 'Readability score from 0 (very difficult) to 100 (very easy).',
        limitation: 'Penalizes multi-syllable domain terms like "infrastructure" or "quantization".',
      },
    },
    {
      key: 'fleschKincaidGrade',
      label: 'Grade Level',
      value: `Grade ${fleschKincaidGrade}`,
      sub: 'Flesch-Kincaid scale',
      status: fleschKincaidGrade <= 13 ? 'optimal' : 'neutral',
      info: {
        indicator: 'Estimated US school grade required to comprehend the text.',
        limitation: 'Domain terminology automatically elevates grade levels regardless of prose clarity.',
      },
    },
  ];

  return (
    <div className="bg-white border border-stone-200/90 rounded-xl p-5 shadow-xs space-y-3.5 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-stone-700" />
          <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-stone-600">
            Readability & Prose Metrics
          </h3>
        </div>
        <span className="text-[11px] font-mono text-stone-400">
          Deterministic Rule Engine
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {statCards.map((stat) => (
          <div
            key={stat.key}
            className="p-3 bg-stone-50/70 border border-stone-200/80 rounded-lg relative flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-stone-500 text-[11px] mb-1">
                <span className="font-medium text-stone-600">{stat.label}</span>
                {stat.info && (
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === stat.key ? null : stat.key)}
                    className="text-stone-400 hover:text-stone-800 transition-colors"
                    title="View metric definition & limitations"
                  >
                    <HelpCircle className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="text-base font-bold text-stone-950 font-mono tracking-tight">
                {stat.value}
              </div>
            </div>

            <div className="text-[10px] text-stone-400 mt-1 truncate">
              {stat.sub}
            </div>

            {/* Interactive Tooltip Popover */}
            {activeTooltip === stat.key && (
              <div className="absolute z-30 top-full left-0 mt-1 w-64 bg-stone-950 text-stone-100 p-3 rounded-lg shadow-xl text-[11px] space-y-2 border border-stone-800">
                <div>
                  <span className="font-semibold text-stone-200 block">Metric Purpose:</span>
                  <p className="text-stone-400 leading-relaxed">{stat.info.indicator}</p>
                </div>
                <div>
                  <span className="font-semibold text-amber-300 block">Important Limitation:</span>
                  <p className="text-stone-400 leading-relaxed">{stat.info.limitation}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTooltip(null)}
                  className="text-[10px] text-stone-400 hover:text-white underline block pt-0.5"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Longest Sentence Insight (if present) */}
      {longestSentence.words > 0 && (
        <div className="text-xs bg-stone-50/60 border border-stone-200/70 rounded-lg p-2.5 flex items-start gap-2 text-stone-700">
          <span className="font-semibold text-stone-900 shrink-0 font-mono text-[11px]">
            Peak Sentence ({longestSentence.words} words):
          </span>
          <span className="italic text-stone-600 truncate font-serif">
            "{longestSentence.text}"
          </span>
        </div>
      )}

      {/* Editorial Disclaimer Alert */}
      <div className="bg-amber-50/60 border border-amber-200/70 rounded-lg p-2.5 text-xs text-amber-950 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-amber-900">Editorial Rule: </span>
          <span>
            {readabilityCaveat || 'Readability scores are heuristic signals, not definitive quality verdicts. Clear writing never compromises technical precision or author voice for the sake of an arbitrary score.'}
          </span>
        </div>
      </div>
    </div>
  );
}

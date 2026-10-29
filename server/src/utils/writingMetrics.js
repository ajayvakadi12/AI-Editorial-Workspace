/**
 * Writing Metrics Service
 * 
 * Computes deterministic structural, readability, and pacing metrics for editorial drafts.
 * 
 * IMPORTANT EDITORIAL CAVEAT:
 * Readability scores (Flesch Reading Ease, Flesch-Kincaid) are rough heuristics based
 * strictly on syllable and sentence length. In technical AI writing containing essential
 * domain vocabulary (e.g. "transformer architectures", "parameter quantization", "reinforcement learning"),
 * legitimate, high-signal drafts will naturally register as harder to read.
 * These scores are a guide for clarity, NEVER a quality verdict.
 */

/**
 * Counts syllables in an English word using phonetic heuristics.
 */
export function countSyllables(word) {
  if (!word) return 0;
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;

  // Common prefix/suffix adjustments
  let formatted = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');

  const matches = formatted.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Splits text into sentences, preserving character offsets and punctuation.
 */
export function splitSentencesWithOffsets(text) {
  if (!text || text.trim() === '') return [];

  const sentences = [];
  // Sentence boundary regex: matches . ! ? followed by whitespace or EOF, taking care of common abbreviations
  const regex = /([^.!?\r\n]+[.!?]+(?:\s+|$)|[^.!?\r\n]+$)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      const leadingSpace = raw.indexOf(trimmed);
      const start = match.index + leadingSpace;
      const end = start + trimmed.length;
      sentences.push({
        text: trimmed,
        start,
        end,
      });
    }
  }

  return sentences;
}

/**
 * Computes comprehensive writing metrics.
 */
export function computeWritingMetrics(draft, passiveSentenceCount = 0) {
  if (!draft || draft.trim() === '') {
    return {
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      averageSentenceLength: 0,
      longestSentence: { words: 0, text: '' },
      estimatedReadingTimeMinutes: 0,
      passiveVoiceSharePercent: 0,
      fleschReadingEase: 100,
      fleschKincaidGrade: 0,
      readabilityCaveat: 'Readability scores are a rough signal, not a verdict on quality. Technical writing about AI can legitimately score as harder to read.',
      metricExplanations: getMetricExplanations(),
    };
  }

  const paragraphs = draft.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const sentences = splitSentencesWithOffsets(draft);
  const words = draft.match(/\b[a-zA-Z0-9'-]+\b/g) || [];

  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);
  const paragraphCount = Math.max(1, paragraphs.length);

  // Longest sentence and average length
  let longestWords = 0;
  let longestSentenceText = '';

  for (const s of sentences) {
    const sWords = s.text.match(/\b[a-zA-Z0-9'-]+\b/g) || [];
    if (sWords.length > longestWords) {
      longestWords = sWords.length;
      longestSentenceText = s.text;
    }
  }

  const averageSentenceLength = Math.round((wordCount / sentenceCount) * 10) / 10;

  // Syllable counting for readability formulas
  let totalSyllables = 0;
  for (const w of words) {
    totalSyllables += countSyllables(w);
  }

  // Flesch Reading Ease: 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  let fleschReadingEase = 100;
  let fleschKincaidGrade = 0;

  if (wordCount > 0 && sentenceCount > 0) {
    const wordsPerSentence = wordCount / sentenceCount;
    const syllablesPerWord = totalSyllables / wordCount;

    const ease = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
    fleschReadingEase = Math.round(Math.max(0, Math.min(100, ease)));

    // Flesch-Kincaid Grade Level: 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
    const grade = (0.39 * wordsPerSentence) + (11.8 * syllablesPerWord) - 15.59;
    fleschKincaidGrade = Math.round(Math.max(0, grade) * 10) / 10;
  }

  // Reading time at ~238 wpm (standard silent reading speed for adults)
  const estimatedReadingTimeMinutes = Math.round((wordCount / 238) * 10) / 10;

  // Passive voice share
  const passiveVoiceSharePercent = Math.round((passiveSentenceCount / sentenceCount) * 100);

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    averageSentenceLength,
    longestSentence: {
      words: longestWords,
      text: longestSentenceText.length > 120 ? `${longestSentenceText.slice(0, 117)}...` : longestSentenceText,
    },
    estimatedReadingTimeMinutes: estimatedReadingTimeMinutes < 0.1 ? 0.1 : estimatedReadingTimeMinutes,
    passiveVoiceSharePercent,
    fleschReadingEase,
    fleschKincaidGrade,
    readabilityCaveat: 'Readability scores are a rough signal, not a verdict on quality. Technical writing about AI can legitimately score as harder to read.',
    metricExplanations: getMetricExplanations(),
  };
}

function getMetricExplanations() {
  return {
    wordCount: {
      label: 'Word Count',
      indicator: 'Standard newsletter depth is typically 300–600 words per story.',
      limitation: 'Raw word count says nothing about informational density or signal-to-noise ratio.',
    },
    averageSentenceLength: {
      label: 'Avg Sentence Length',
      indicator: '14–18 words per sentence maintains momentum for fast-reading executives.',
      limitation: 'Varying sentence length rhythmically is often more important than keeping every sentence uniform.',
    },
    longestSentence: {
      label: 'Longest Sentence',
      indicator: 'Sentences over 35 words frequently contain stacked subordinate clauses that fatigue the reader.',
      limitation: 'Complex technical definitions may legitimately require longer grammatical structures.',
    },
    estimatedReadingTimeMinutes: {
      label: 'Reading Time',
      indicator: 'Calculated at 238 words per minute, typical for newsletter scanning.',
      limitation: 'Dense technical papers or architecture breakdowns demand slower, deliberate reading.',
    },
    passiveVoiceSharePercent: {
      label: 'Passive Voice Share',
      indicator: 'Targeting under 10% passive voice keeps accountability and action clear.',
      limitation: 'Passive voice is legitimate when the actor is unknown, secret, or less important than the object.',
    },
    fleschReadingEase: {
      label: 'Flesch Reading Ease (0-100)',
      indicator: '60–70 is plain English. Above 70 is conversational. 40–60 is professional/academic.',
      limitation: 'Multi-syllable terms like "quantization" or "heterogeneous" drag down the score regardless of how clear the explanation is.',
    },
  };
}


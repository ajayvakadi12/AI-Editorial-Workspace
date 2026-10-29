import { splitSentencesWithOffsets } from './writingMetrics.js';

/**
 * Common English stopwords ignored during repetition checks.
 */
const STOPWORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
  'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
  'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
  'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
  'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your',
  'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
  'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'are', 'was', 'were', 'been', 'has',
]);

/**
 * Irregular past participles used for passive-voice heuristic.
 * 
 * FALSE-POSITIVE RISK NOTE:
 * Passive voice detection using regex heuristics can misidentify adjectives
 * ("they were prepared", "the model is qualified") as passive verbs.
 * To mitigate over-flagging, severity is modulated and suggestions prompt the writer
 * to assess if the actor is intentionally omitted.
 */
const IRREGULAR_PAST_PARTICIPLES = new Set([
  'built', 'written', 'seen', 'chosen', 'made', 'found', 'given', 'taken',
  'shown', 'known', 'run', 'read', 'set', 'put', 'held', 'brought', 'left',
  'kept', 'led', 'begun', 'drawn', 'spoken', 'spent', 'grown', 'sent',
  'broken', 'hit', 'cut', 'caught', 'bought', 'driven', 'released', 'deployed',
]);

/**
 * Curated filler phrases with high-conviction replacements.
 */
const FILLER_PHRASES = [
  { phrase: 'it is important to note that', replacement: 'Note that', rationale: 'Direct and saves 5 words.' },
  { phrase: 'in order to', replacement: 'to', rationale: '"To" delivers identical meaning with greater punch.' },
  { phrase: 'the fact that', replacement: 'that', rationale: 'Tightens phrasing without losing meaning.' },
  { phrase: 'at the end of the day', replacement: 'ultimately', rationale: 'Replaces a tired cliché with a precise adverb.' },
  { phrase: 'needless to say', replacement: '', rationale: 'If it is needless to say, delete it entirely.' },
  { phrase: 'a number of', replacement: 'several', rationale: '"Several" or "many" is crisper than "a number of".' },
  { phrase: 'can potentially', replacement: 'can', rationale: '"Can potentially" is a redundant double-hedge.' },
  { phrase: 'due to the fact that', replacement: 'because', rationale: '"Because" is cleaner and more direct.' },
  { phrase: 'for all intents and purposes', replacement: 'effectively', rationale: 'Cuts filler jargon.' },
  { phrase: 'at this point in time', replacement: 'currently', rationale: 'Eliminates verbose throat-clearing.' },
  { phrase: 'in terms of', replacement: 'for', rationale: 'Tightens weak relational phrasing.' },
  { phrase: 'very', replacement: '', rationale: 'Omit "very" or choose a more descriptive adjective.' },
  { phrase: 'really', replacement: '', rationale: 'Casual intensifier that dilutes authority.' },
  { phrase: 'basically', replacement: '', rationale: 'Filler word that weakens editorial conviction.' },
];

/**
 * Domain-specific acronyms that benefit from explicit expansion on first mention.
 */
const TECH_ACRONYMS = [
  { acronym: 'RAG', expansion: 'Retrieval-Augmented Generation' },
  { acronym: 'LLM', expansion: 'Large Language Model' },
  { acronym: 'MCP', expansion: 'Model Context Protocol' },
  { acronym: 'SWE-bench', expansion: 'Software Engineering Benchmark' },
  { acronym: 'RLHF', expansion: 'Reinforcement Learning from Human Feedback' },
  { acronym: 'MoE', expansion: 'Mixture of Experts' },
  { acronym: 'LoRA', expansion: 'Low-Rank Adaptation' },
  { acronym: 'CoT', expansion: 'Chain of Thought' },
  { acronym: 'DPO', expansion: 'Direct Preference Optimization' },
  { acronym: 'PEFT', expansion: 'Parameter-Efficient Fine-Tuning' },
];

/**
 * Empty buzzwords / corporate jargon.
 */
const JARGON_WORDS = [
  { word: 'synergy', explanation: 'Corporate buzzword. Specify the exact operational integration.' },
  { word: 'paradigm shift', explanation: 'Overused hyperbole. Describe the specific technical or business inflection.' },
  { word: 'boil the ocean', explanation: 'Tired idiom. State the actual scope issue directly.' },
];

/**
 * RULE 1: Long and hard-to-follow sentences.
 */
export function checkSentenceComplexity(draft) {
  const issues = [];
  const sentences = splitSentencesWithOffsets(draft);

  for (const s of sentences) {
    const words = s.text.match(/\b[a-zA-Z0-9'-]+\b/g) || [];
    const wordCount = words.length;

    // Check comma overload / nested clauses (3 or more commas)
    const commaCount = (s.text.match(/,/g) || []).length;

    if (wordCount > 40) {
      issues.push({
        id: `long-sentence-${s.start}`,
        type: 'long_sentence',
        severity: 'strong',
        start: s.start,
        end: s.end,
        original: s.text,
        explanation: `This sentence is ${wordCount} words long. Sentences over 40 words create high cognitive load for busy newsletter readers.`,
        confidence: 0.95,
      });
    } else if (wordCount > 30) {
      issues.push({
        id: `long-sentence-${s.start}`,
        type: 'long_sentence',
        severity: 'warn',
        start: s.start,
        end: s.end,
        original: s.text,
        explanation: `This sentence is ${wordCount} words long. Consider breaking it into two crisp thoughts.`,
        confidence: 0.9,
      });
    } else if (commaCount >= 3) {
      issues.push({
        id: `nested-clause-${s.start}`,
        type: 'hard_to_follow',
        severity: 'warn',
        start: s.start,
        end: s.end,
        original: s.text,
        explanation: `Sentence contains ${commaCount} commas with nested clauses. It may read as convoluted.`,
        confidence: 0.85,
      });
    }
  }

  return issues;
}

/**
 * RULE 2: Passive voice detection with false-positive mitigation.
 */
export function checkPassiveVoice(draft) {
  const issues = [];
  const sentences = splitSentencesWithOffsets(draft);

  // Matches: be-verb + optional adverb + past participle (-ed or irregular)
  const beVerbs = 'am|is|are|was|were|been|being|be';
  const passiveRegex = new RegExp(`\\b(${beVerbs})\\s+(?:[a-zA-Z]+ly\\s+)?([a-zA-Z]+ed|[a-zA-Z]+)\\b`, 'gi');

  for (const s of sentences) {
    let match;
    while ((match = passiveRegex.exec(s.text)) !== null) {
      const secondWord = match[2].toLowerCase();
      const isPastParticiple = secondWord.endsWith('ed') || IRREGULAR_PAST_PARTICIPLES.has(secondWord);

      if (isPastParticiple) {
        const spanStart = s.start + match.index;
        const spanEnd = spanStart + match[0].length;
        const matchedPhrase = match[0];

        // Editorial rule: Check if "by [agent]" is present to suggest active inversion
        const byMatch = s.text.slice(match.index).match(/\bby\s+([A-Z][a-zA-Z0-9\s]+|[a-z\s]+)/i);

        let suggestion;
        if (byMatch && byMatch[1]) {
          const actor = byMatch[1].trim();
          const verb = match[2];
          suggestion = {
            replacement: `${actor} ${verb}`,
            rationale: `Active voice names "${actor}" as the subject and adds authority.`,
          };
        }

        issues.push({
          id: `passive-${spanStart}`,
          type: 'passive_voice',
          severity: 'warn',
          start: spanStart,
          end: spanEnd,
          original: matchedPhrase,
          explanation: `Passive construction ("${matchedPhrase}"). Who is performing this action? If the actor is important, consider active voice.`,
          suggestion,
          confidence: 0.82,
        });
      }
    }
  }

  return issues;
}

/**
 * RULE 3: Filler phrases.
 */
export function checkFillerPhrases(draft) {
  const issues = [];
  const lowerDraft = draft.toLowerCase();

  for (const item of FILLER_PHRASES) {
    let searchIndex = 0;
    while ((searchIndex = lowerDraft.indexOf(item.phrase, searchIndex)) !== -1) {
      // Ensure word boundary
      const beforeChar = searchIndex > 0 ? draft[searchIndex - 1] : ' ';
      const afterChar = searchIndex + item.phrase.length < draft.length ? draft[searchIndex + item.phrase.length] : ' ';

      if (/[\s,.!?;:()"-]/.test(beforeChar) && /[\s,.!?;:()"-]/.test(afterChar)) {
        const start = searchIndex;
        const end = start + item.phrase.length;
        const original = draft.slice(start, end);

        const isOmission = item.replacement === '';
        issues.push({
          id: `filler-${start}`,
          type: 'filler_phrase',
          severity: item.phrase === 'very' || item.phrase === 'really' ? 'info' : 'warn',
          start,
          end,
          original,
          explanation: isOmission
            ? `"${original}" is weak filler that can be omitted for crisper editorial impact.`
            : `"${original}" is wordy filler that can be condensed to "${item.replacement}".`,
          suggestion: {
            replacement: item.replacement,
            rationale: item.rationale,
            isOmission,
          },
          confidence: 0.98,
        });
      }

      searchIndex += item.phrase.length;
    }
  }

  return issues;
}

/**
 * RULE 4: Jargon and unexplained acronyms on first use.
 */
export function checkJargonAndAcronyms(draft) {
  const issues = [];
  const lowerDraft = draft.toLowerCase();

  // 1. Acronym checks
  for (const { acronym, expansion } of TECH_ACRONYMS) {
    const acronymRegex = new RegExp(`\\b${acronym}\\b`, 'g');
    const firstMatch = acronymRegex.exec(draft);

    if (firstMatch) {
      const idx = firstMatch.index;
      // Check if text already provides the expansion nearby (within 100 characters before or after)
      const surroundingSnippet = draft.slice(Math.max(0, idx - 80), Math.min(draft.length, idx + 80)).toLowerCase();
      const hasExpansion = surroundingSnippet.includes(expansion.toLowerCase());

      if (!hasExpansion) {
        issues.push({
          id: `acronym-${idx}`,
          type: 'unexplained_acronym',
          severity: 'info',
          start: idx,
          end: idx + acronym.length,
          original: acronym,
          explanation: `"${acronym}" appears without an upfront definition. For new readers, consider defining it on first mention: "${expansion} (${acronym})". Never remove technical terms.`,
          suggestion: {
            replacement: `${expansion} (${acronym})`,
            rationale: 'Clarifies domain terminology on first mention for broader audience appeal.',
          },
          confidence: 0.88,
        });
      }
    }
  }

  // 2. Corporate jargon checks
  for (const { word, explanation } of JARGON_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(draft)) !== null) {
      issues.push({
        id: `jargon-${match.index}`,
        type: 'jargon',
        severity: 'warn',
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        explanation,
        confidence: 0.92,
      });
    }
  }

  return issues;
}

/**
 * Technical terms and proper nouns that should never be blindly flagged as repetitive echo.
 */
const TECHNICAL_PROPER_NOUNS = new Set([
  'claude', 'anthropic', 'openai', 'gpt', 'google', 'meta', 'llama',
  'gemini', 'python', 'github', 'swe-bench', 'rag', 'context', 'api',
  'microsoft', 'nvidia', 'amazon', 'bedrock', 'kubernetes', 'docker',
  'typescript', 'javascript', 'react', 'node', 'linux', 'aws', 'azure',
  'gpu', 'cuda', 'llms', 'vllm', 'sglang',
]);

/**
 * Common contextual synonyms for non-proper-noun repetitive phrasing.
 */
const COMMON_SYNONYMS = {
  rapidly: 'swiftly',
  significant: 'notable',
  massive: 'substantial',
  transforming: 'converting',
  previously: 'earlier',
  conducted: 'performed',
  optimize: 'refine',
  optimizer: 'engine',
  improve: 'enhance',
  automate: 'streamline',
  automated: 'streamlined',
  automating: 'streamlining',
  critical: 'essential',
  primary: 'key',
  problem: 'issue',
  resolution: 'solving',
  benchmark: 'evaluation',
  throughput: 'velocity',
  expensive: 'costly',
  complex: 'intricate',
  leverage: 'harness',
  implement: 'deploy',
  robust: 'resilient',
  scalable: 'extensible',
};

export function isProperNounOrTechnicalTerm(word, offset, draft) {
  if (!word) return false;
  const lower = word.toLowerCase();
  if (TECHNICAL_PROPER_NOUNS.has(lower)) return true;

  // Hyphenated compound terms that include technical terms (e.g. swe-bench)
  if (lower.includes('-')) {
    const parts = lower.split('-');
    if (parts.some((p) => TECHNICAL_PROPER_NOUNS.has(p))) return true;
  }

  // Capitalized word that is NOT at the start of a sentence
  if (/^[A-Z][a-zA-Z0-9'-]*$/.test(word)) {
    const textBefore = draft.slice(0, offset).trim();
    const lastChar = textBefore.slice(-1);
    // If not preceded by sentence-ending punctuation or line break
    if (textBefore.length > 0 && !/[.!?\n]/.test(lastChar)) {
      return true; // Capitalized mid-sentence proper noun
    }
  }

  return false;
}

export function getContextualSynonym(word) {
  if (!word) return '';
  const lower = word.toLowerCase();
  const match = COMMON_SYNONYMS[lower];
  if (match) {
    if (word[0] === word[0].toUpperCase()) {
      return match.charAt(0).toUpperCase() + match.slice(1);
    }
    return match;
  }
  return '';
}

/**
 * Extracts the complete surrounding sentence around a given character span.
 */
export function getSentenceAroundOffset(draft, start, end) {
  if (!draft) return '';
  const clampedStart = Math.max(0, Math.min(start, draft.length));
  const clampedEnd = Math.max(clampedStart, Math.min(end, draft.length));

  // Find start of sentence: look backwards for [.!?\n]
  let sStart = clampedStart;
  while (sStart > 0 && !/[.!?\n]/.test(draft[sStart - 1])) {
    sStart--;
  }

  // Find end of sentence: look forwards for [.!?\n]
  let sEnd = clampedEnd;
  while (sEnd < draft.length && !/[.!?\n]/.test(draft[sEnd])) {
    sEnd++;
  }
  if (sEnd < draft.length && /[.!?]/.test(draft[sEnd])) {
    sEnd++;
  }

  return draft.slice(sStart, sEnd).trim();
}

/**
 * RULE 5: Repetition (close word repetition and repeated sentence openers).
 */
export function checkRepetition(draft) {
  const issues = [];
  const sentences = splitSentencesWithOffsets(draft);

  // A. Repeated sentence openers
  for (let i = 0; i < sentences.length - 1; i++) {
    const s1 = sentences[i];
    const s2 = sentences[i + 1];

    // Do NOT flag sentence openers across different paragraphs
    const intervening = draft.slice(s1.end, s2.start);
    if (intervening.includes('\n\n') || intervening.includes('\r\n\r\n')) {
      continue;
    }

    const s1FirstWord = (s1.text.match(/^[A-Za-z0-9'-]+/)?.[0] || '').toLowerCase();
    const s2FirstWord = (s2.text.match(/^[A-Za-z0-9'-]+/)?.[0] || '').toLowerCase();

    if (s1FirstWord && s2FirstWord && s1FirstWord === s2FirstWord && s1FirstWord.length > 2) {
      issues.push({
        id: `opener-repeat-${s2.start}`,
        type: 'repetition',
        severity: 'info',
        start: s2.start,
        end: s2.start + (s2.text.match(/^[A-Za-z0-9'-]+/)?.[0] || '').length,
        original: s2.text.slice(0, Math.min(s2.text.length, 30)),
        explanation: `Consecutive sentences both begin with "${s1FirstWord}". Varying sentence starters improves editorial rhythm.`,
        suggestion: {
          replacement: `Additionally, ${s2.text.slice(s2FirstWord.length).trimStart()}`,
          rationale: `Vary sentence opener to avoid repeating "${s1FirstWord}".`,
        },
        confidence: 0.9,
      });
    }
  }

  // B. Significant word repetition within short windows (same paragraph)
  const wordRegex = /\b[A-Za-z0-9'-]{5,}\b/g;
  const wordsWithOffsets = [];
  let m;
  while ((m = wordRegex.exec(draft)) !== null) {
    const raw = m[0];
    const w = raw.toLowerCase();
    if (!STOPWORDS.has(w)) {
      wordsWithOffsets.push({ word: w, start: m.index, end: m.index + m[0].length, raw });
    }
  }

  const seenPositions = new Set();
  for (let i = 0; i < wordsWithOffsets.length - 1; i++) {
    const cur = wordsWithOffsets[i];

    // Look ahead up to 10 words or 150 characters
    for (let j = i + 1; j < Math.min(wordsWithOffsets.length, i + 10); j++) {
      const next = wordsWithOffsets[j];
      if ((next.start - cur.end) > 150) break;

      // Do NOT flag repetition if words appear in different paragraphs!
      const betweenText = draft.slice(cur.end, next.start);
      if (betweenText.includes('\n\n') || betweenText.includes('\r\n\r\n')) {
        continue;
      }

      // Do NOT flag proper nouns or technical terms (e.g. Claude, Context, Anthropic, Python, SWE-bench)
      if (isProperNounOrTechnicalTerm(cur.raw, cur.start, draft) || isProperNounOrTechnicalTerm(next.raw, next.start, draft)) {
        continue;
      }

      if (cur.word === next.word && !seenPositions.has(next.start)) {
        seenPositions.add(next.start);
        const suggestedSynonym = getContextualSynonym(next.raw);
        const sentenceContext = getSentenceAroundOffset(draft, next.start, next.end);

        const issue = {
          id: `word-repeat-${next.start}`,
          type: 'repetition',
          severity: 'info',
          start: next.start,
          end: next.end,
          original: next.raw,
          sentenceContext,
          explanation: `"${next.raw}" is repeated in close proximity within the same paragraph. Consider using a synonym or refactoring to avoid echo.`,
          confidence: 0.85,
        };

        // Attach deterministic suggestion only if a safe synonym exists.
        // Never output an empty string or placeholder. Context-dependent rewrites are delegated to LLM enrichment.
        if (suggestedSynonym) {
          issue.suggestion = {
            replacement: suggestedSynonym,
            rationale: `Replace repeated word "${next.raw}" with "${suggestedSynonym}" to eliminate echo.`,
          };
        }

        issues.push(issue);
      }
    }
  }

  return issues;
}

/**
 * RULE 6: Dense paragraphs.
 */
export function checkDenseParagraphs(draft) {
  const issues = [];
  if (!draft) return issues;

  const paragraphRegex = /([^\r\n]+(?:\r?\n[^\r\n]+)*)/g;
  let match;

  while ((match = paragraphRegex.exec(draft)) !== null) {
    const text = match[0].trim();
    if (text.length === 0) continue;

    const words = text.match(/\b[a-zA-Z0-9'-]+\b/g) || [];
    const wordCount = words.length;
    const start = match.index;
    const end = start + text.length;

    // Check for >120 words
    if (wordCount > 120) {
      issues.push({
        id: `dense-para-${start}`,
        type: 'dense_paragraph',
        severity: 'warn',
        start,
        end,
        original: text.slice(0, 80) + '...',
        explanation: `Paragraph is ${wordCount} words long (>120 words). In newsletters, readers scan on mobile; dense walls of text cause drop-off.`,
        suggestion: {
          replacement: undefined,
          rationale: 'Split into two focused paragraphs or introduce bullet points.',
        },
        confidence: 0.95,
      });
    }
  }

  return issues;
}

/**
 * Runs all 6 deterministic writing rules and returns deduplicated issues sorted by start offset.
 */
export function runAllWritingRules(draft) {
  if (!draft || draft.trim() === '') return [];

  const rawIssues = [
    ...checkSentenceComplexity(draft),
    ...checkPassiveVoice(draft),
    ...checkFillerPhrases(draft),
    ...checkJargonAndAcronyms(draft),
    ...checkRepetition(draft),
    ...checkDenseParagraphs(draft),
  ];

  // Sort by start position
  rawIssues.sort((a, b) => a.start - b.start || b.end - a.end);

  return rawIssues;
}

/**
 * Updates text and recalculates remaining issue offsets after an edit is accepted.
 * Validates passage location against current text using exact-text matching to prevent
 * accidental misreplacements or corrupted offsets.
 */
export function applyEditAndRemapOffsets(draft, issueId, replacement, currentIssues) {
  const targetIssue = currentIssues.find((i) => i.id === issueId);
  if (!targetIssue) {
    return { newDraft: draft, updatedIssues: currentIssues, success: false, error: 'Issue not found' };
  }

  const { original } = targetIssue;
  const isIntentionalOmission = targetIssue.type === 'filler_phrase' && targetIssue.suggestion?.isOmission === true;
  const rep = replacement !== undefined ? replacement : (targetIssue.suggestion?.replacement ?? '');

  if (rep === '' && !isIntentionalOmission) {
    return {
      newDraft: draft,
      updatedIssues: currentIssues,
      success: false,
      error: `Cannot apply empty replacement to "${original}". Use Edit to customize revision.`,
    };
  }

  if (typeof rep === 'string' && /^\[.*\]$/.test(rep.trim())) {
    return {
      newDraft: draft,
      updatedIssues: currentIssues,
      success: false,
      error: `Cannot apply placeholder "${rep}". Use Edit to customize revision.`,
    };
  }

  let matchStart = -1;
  let matchEnd = -1;

  // 1. Direct offset check
  if (
    targetIssue.start >= 0 &&
    targetIssue.end <= draft.length &&
    draft.slice(targetIssue.start, targetIssue.end) === original
  ) {
    matchStart = targetIssue.start;
    matchEnd = targetIssue.end;
  } else if (original) {
    // 2. Safe exact-text matching with closest occurrence selection
    const occurrences = [];
    let searchIdx = 0;
    while ((searchIdx = draft.indexOf(original, searchIdx)) !== -1) {
      occurrences.push(searchIdx);
      searchIdx += original.length;
    }

    if (occurrences.length === 0) {
      return {
        newDraft: draft,
        updatedIssues: currentIssues,
        success: false,
        error: `Passage "${original}" was modified or removed from draft.`,
      };
    }

    // Pick occurrence closest to original targetIssue.start
    occurrences.sort((a, b) => Math.abs(a - targetIssue.start) - Math.abs(b - targetIssue.start));
    matchStart = occurrences[0];
    matchEnd = matchStart + original.length;
  } else {
    matchStart = targetIssue.start;
    matchEnd = targetIssue.end;
  }

  const newDraft = draft.slice(0, matchStart) + rep + draft.slice(matchEnd);
  const delta = rep.length - (matchEnd - matchStart);

  // Update remaining issues
  const updatedIssues = [];
  for (const issue of currentIssues) {
    if (issue.id === issueId) continue; // remove the accepted issue

    // If an issue was completely inside or overlapping the edited range, drop it
    if (issue.start >= matchStart && issue.end <= matchEnd) {
      continue;
    }

    if (issue.start >= matchEnd) {
      // Shift downstream issue offsets
      updatedIssues.push({
        ...issue,
        start: issue.start + delta,
        end: issue.end + delta,
      });
    } else {
      // Upstream issue unaffected
      updatedIssues.push(issue);
    }
  }

  return { newDraft, updatedIssues, success: true };
}

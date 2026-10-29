/**
 * Quote Verifier Service
 * 
 * Verifies that quotes cited by the LLM as evidence for claims actually exist
 * within the source text.
 * 
 * IMPORTANT LIMITATION:
 * Verification proves that the string appears in the source document.
 * It does NOT prove that the quoted claim is factually true, that the source
 * is reputable, or that the quote was not taken out of context.
 */

/**
 * Normalizes text for comparison by standardizing quotes, dashes, whitespace, and case.
 */
export function normalizeTextForComparison(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")       // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"')       // Smart double quotes
    .replace(/[\u2013\u2014]/g, '-')       // En/Em dashes
    .replace(/\u2026/g, '...')             // Ellipsis
    .replace(/[\r\n\t]+/g, ' ')            // Whitespace collapse
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips all punctuation and spaces for strict alpha-numeric sequence matching.
 */
export function toAlphaNumericOnly(str) {
  return str.replace(/[^a-z0-9]/g, '');
}

/**
 * Calculates similarity between two word arrays using Jaccard / word overlap coefficient.
 */
function calculateWordOverlap(wordsA, wordsB) {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setB = new Set(wordsB);
  let matches = 0;
  for (const w of wordsA) {
    if (setB.has(w)) matches++;
  }
  return matches / Math.max(wordsA.length, wordsB.length);
}

/**
 * Performs sliding window fuzzy search over source tokens.
 * Threshold is set to 0.90 (90% similarity).
 */
export function slidingWindowFuzzyMatch(normalizedQuote, normalizedSource, threshold = 0.88) {
  const quoteWords = normalizedQuote.split(' ').filter(Boolean);
  const sourceWords = normalizedSource.split(' ').filter(Boolean);

  if (quoteWords.length === 0 || sourceWords.length === 0) {
    return { matched: false, confidence: 0 };
  }

  const qLen = quoteWords.length;
  // If quote is very short (e.g. 1-2 words), require exact alphanumeric containment
  if (qLen <= 2) {
    const cleanQuote = toAlphaNumericOnly(normalizedQuote);
    const cleanSource = toAlphaNumericOnly(normalizedSource);
    const matched = cleanSource.includes(cleanQuote);
    return { matched, confidence: matched ? 1.0 : 0 };
  }

  // Check sliding window across source words
  let bestScore = 0;
  const windowSizes = [qLen, qLen - 1, qLen + 1, qLen + 2].filter((s) => s > 0 && s <= sourceWords.length);

  for (const winSize of windowSizes) {
    for (let i = 0; i <= sourceWords.length - winSize; i++) {
      const windowWords = sourceWords.slice(i, i + winSize);
      const score = calculateWordOverlap(quoteWords, windowWords);
      if (score > bestScore) {
        bestScore = score;
        if (bestScore >= 0.98) break; // Early exit on near-exact match
      }
    }
    if (bestScore >= threshold) break;
  }

  return {
    matched: bestScore >= threshold,
    confidence: Math.round(bestScore * 100) / 100,
  };
}

/**
 * Verifies a single quote against a source text.
 * 
 * @param {string} evidenceQuote 
 * @param {string} sourceText 
 * @param {number} [fuzzyThreshold=0.88]
 * @returns {{ verified: boolean, matchMethod: 'exact'|'normalized'|'alphanumeric'|'fuzzy'|'none', confidence: number }}
 */
export function verifyQuoteAgainstSource(evidenceQuote, sourceText, fuzzyThreshold = 0.88) {
  if (!evidenceQuote || !sourceText) {
    return { verified: false, matchMethod: 'none', confidence: 0 };
  }

  // 1. Exact raw containment
  if (sourceText.includes(evidenceQuote)) {
    return { verified: true, matchMethod: 'exact', confidence: 1.0 };
  }

  // 2. Normalized whitespace / quotes / case containment
  const normQuote = normalizeTextForComparison(evidenceQuote);
  const normSource = normalizeTextForComparison(sourceText);

  if (normSource.includes(normQuote)) {
    return { verified: true, matchMethod: 'normalized', confidence: 1.0 };
  }

  // 3. Alphanumeric sequence containment (handles edge punctuation/formatting differences)
  const alphaQuote = toAlphaNumericOnly(normQuote);
  const alphaSource = toAlphaNumericOnly(normSource);

  if (alphaQuote.length >= 15 && alphaSource.includes(alphaQuote)) {
    return { verified: true, matchMethod: 'alphanumeric', confidence: 0.95 };
  }

  // 4. Sliding window token overlap match (threshold ≥ 0.88)
  const fuzzy = slidingWindowFuzzyMatch(normQuote, normSource, fuzzyThreshold);
  if (fuzzy.matched) {
    return { verified: true, matchMethod: 'fuzzy', confidence: fuzzy.confidence };
  }

  return { verified: false, matchMethod: 'none', confidence: fuzzy.confidence };
}

/**
 * Verifies all claims against their corresponding sources, tagging each claim
 * and calculating per-source verification statistics.
 * 
 * @param {Array} sourceAnalyses - List of source analysis objects with claims
 * @param {Array} extractedSources - List of raw extracted source documents
 * @returns {{ enrichedAnalyses: Array, verificationStats: Object }}
 */
export function verifyAllClaims(sourceAnalyses, extractedSources) {
  const sourceMap = new Map();
  for (const src of extractedSources) {
    sourceMap.set(src.id, src);
  }

  const verificationStats = {};

  const enrichedAnalyses = sourceAnalyses.map((analysis) => {
    const srcDoc = sourceMap.get(analysis.sourceId);
    const sourceText = srcDoc ? srcDoc.text : '';
    const sourceUrl = srcDoc ? srcDoc.url : null;
    const sourceTitle = srcDoc ? srcDoc.title : 'Source';

    let verifiedCount = 0;
    const totalClaims = (analysis.claims || []).length;

    const enrichedClaims = (analysis.claims || []).map((claim, idx) => {
      const verification = verifyQuoteAgainstSource(claim.evidenceQuote, sourceText);
      if (verification.verified) {
        verifiedCount++;
      }

      return {
        ...claim,
        id: claim.id || `${analysis.sourceId}-claim-${idx + 1}`,
        sourceId: analysis.sourceId,
        sourceUrl,
        sourceTitle,
        verified: verification.verified,
        verificationMethod: verification.matchMethod,
        verificationMatchRatio: verification.confidence,
      };
    });

    const rate = totalClaims > 0 ? Math.round((verifiedCount / totalClaims) * 100) : 0;
    verificationStats[analysis.sourceId] = {
      sourceId: analysis.sourceId,
      totalClaims,
      verifiedClaims: verifiedCount,
      verificationRate: rate,
    };

    return {
      ...analysis,
      claims: enrichedClaims,
      verificationStats: verificationStats[analysis.sourceId],
    };
  });

  return { enrichedAnalyses, verificationStats };
}


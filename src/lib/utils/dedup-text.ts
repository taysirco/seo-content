/**
 * Smart text deduplication — removes near-duplicate paragraphs across competitor texts.
 * Uses paragraph-level fingerprinting to detect boilerplate (cookie notices, nav text, etc.)
 * that appears in multiple competitors.
 */

/** Normalize a paragraph for fingerprinting (lowercase, collapse whitespace, strip punctuation) */
function fingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deduplicates an array of competitor texts.
 * Paragraphs appearing in 3+ sources are considered boilerplate and removed.
 * Returns cleaned texts in the same order.
 */
export function deduplicateCompetitorTexts(
  texts: string[],
  threshold = 3,
): string[] {
  if (texts.length < threshold) return texts;

  // Count paragraph fingerprint frequency across all sources
  const freqMap = new Map<string, number>();
  const allParagraphs = texts.map(t =>
    t.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 30)
  );

  for (const paragraphs of allParagraphs) {
    const seen = new Set<string>();
    for (const p of paragraphs) {
      const fp = fingerprint(p);
      if (fp.length < 20) continue; // Skip very short fingerprints
      if (!seen.has(fp)) {
        seen.add(fp);
        freqMap.set(fp, (freqMap.get(fp) || 0) + 1);
      }
    }
  }

  // Identify boilerplate fingerprints (appear in threshold+ sources)
  const boilerplate = new Set<string>();
  for (const [fp, count] of freqMap) {
    if (count >= threshold) boilerplate.add(fp);
  }

  if (boilerplate.size === 0) return texts;

  // Filter out boilerplate paragraphs from each text
  return allParagraphs.map(paragraphs =>
    paragraphs
      .filter(p => !boilerplate.has(fingerprint(p)))
      .join('\n\n')
  );
}

/**
 * Truncate text to approximate token count.
 * Gemini uses ~1.5 chars per token for Arabic, ~4 chars per token for English.
 * Language-aware: uses different ratios based on detected script.
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  // Detect if text is primarily Arabic/CJK (denser per token)
  const arabicCJKRatio = (text.match(/[\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF]/g) || []).length / Math.max(text.length, 1);
  const approxCharsPerToken = arabicCJKRatio > 0.3 ? 2 : 4;
  const maxChars = maxTokens * approxCharsPerToken;
  if (text.length <= maxChars) return text;
  // Cut at last complete sentence before maxChars
  const cut = text.slice(0, maxChars);
  // Try multiple sentence endings (., !, ?, Arabic period)
  const sentenceEnders = ['.', '!', '?', '\u06D4', '\u3002'];
  let bestCut = -1;
  for (const ender of sentenceEnders) {
    const idx = cut.lastIndexOf(ender);
    if (idx > bestCut) bestCut = idx;
  }
  return bestCut > maxChars * 0.7 ? cut.slice(0, bestCut + 1) : cut;
}

/**
 * Sentence-level deduplication — removes near-duplicate sentences within a single text.
 * Useful for cleaning AI-generated content that may repeat ideas.
 */
export function deduplicateSentences(text: string, similarityThreshold = 0.85): string {
  const sentences = text.split(/(?<=[.!?\u06D4\u3002])\s+/).filter(s => s.trim().length > 10);
  if (sentences.length <= 1) return text;

  const kept: string[] = [sentences[0]];
  for (let i = 1; i < sentences.length; i++) {
    const current = fingerprint(sentences[i]);
    const isDuplicate = kept.some(k => {
      const kFp = fingerprint(k);
      return jaccardSimilarity(current.split(' '), kFp.split(' ')) >= similarityThreshold;
    });
    if (!isDuplicate) {
      kept.push(sentences[i]);
    }
  }

  return kept.join(' ');
}

/** Jaccard similarity between two token sets (0-1) */
export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a.filter(t => t.length > 2));
  const setB = new Set(b.filter(t => t.length > 2));
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

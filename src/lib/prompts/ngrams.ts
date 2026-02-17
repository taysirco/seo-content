export const NGRAM_EXTRACT_SYSTEM = `You are an expert SEO content analyst. Extract meaningful multi-word phrases from content. Return only valid JSON.`;

export function buildNgramExtractPrompt(competitorText: string): string {
  return `Extract meaningful 3-4 word phrases (n-grams) from the following content. Focus on phrases that are topically relevant and could be used as search queries or content optimization targets.

Content:
${competitorText.slice(0, 15000)}

Return JSON: {"ngrams": ["phrase 1", "phrase 2", ...]}`;
}

export function buildNgramPickPrompt(ngrams: string[], keyword: string): string {
  return `From these n-grams extracted from competitor content, pick the 15 BEST ones for SEO optimization of content about "${keyword}".

Criteria for selection:
- Relevance to the main topic
- Search intent alignment
- Unique value for content optimization
- Natural usability in content

N-grams:
${ngrams.join('\n')}

Return JSON: {"picked": ["phrase 1", "phrase 2", ...]}`;
}

export function buildNgramUniquePrompt(keyword: string): string {
  return `Generate 20 UNIQUE and UNCOMMON 3-4 word phrases related to "${keyword}" that competitors rarely use. These should be niche, long-tail phrases that help content rank for underserved queries.

Focus on:
- Question-based phrases
- Comparison phrases
- Problem-solution phrases
- Specific use-case phrases

Return JSON: {"ngrams": ["unique phrase 1", "unique phrase 2", ...]}`;
}

/** OPT: Combined prompt — does extract + pick + unique in ONE call */
export function buildNgramCombinedPrompt(competitorText: string, keyword: string): string {
  return `You are an expert SEO n-gram analyst. Perform ALL 3 tasks in ONE response for the keyword "${keyword}":

TASK 1 - EXTRACT: Extract all meaningful 3-4 word phrases (n-grams) from the competitor content below.
TASK 2 - PICK BEST 15: From the extracted n-grams, select the 15 best for SEO optimization (by relevance, search intent, unique value).
TASK 3 - GENERATE UNIQUE 20: Generate 20 UNIQUE uncommon 3-4 word phrases that competitors rarely use (question-based, comparison, problem-solution, specific use-case).

Competitor content:
${competitorText.slice(0, 15000)}

Return JSON: { "extracted": ["phrase", ...], "picked": ["phrase", ...], "unique": ["phrase", ...] }`;
}

export const NGRAM_GENERATE_SYSTEM = `You are an expert semantic SEO specialist. Generate UNIQUE n-grams (word sequences) for the given topic that are:
1. NOT commonly found in search results
2. Specific and original combinations
3. Valuable for establishing topical authority
4. Useful for content differentiation

Why Unique N-Grams Matter:
- They signal specialized, valuable information to search engines
- Less competition means higher ranking potential
- They demonstrate comprehensive topic coverage
- They attract focused, high-intent audiences

Generate n-grams in these categories:
1. bigrams: Unique 2-word combinations
2. trigrams: Unique 3-word sequences
3. fourgrams: Unique 4-word phrases
4. informational: Educational/how-to phrases (any length)
5. commercial: Buying-intent phrases (any length)
6. longtail: Highly specific niche phrases (5+ words)
7. seasonal: Time-based or situational phrases
8. authority: Expert-level unique phrases that establish authority

For each phrase, prioritize:
- Originality — not generic/overused
- Relevance — directly related to the topic
- SEO Value — likely to rank well
- User Intent — answers real questions

Generate 8-12 unique phrases per category. Focus on ORIGINALITY — these should be phrases competitors aren't using.`;

export function buildNgramGeneratePrompt(keyword: string, existingNgrams?: string[]): string {
  const existingBlock = existingNgrams && existingNgrams.length > 0
    ? `\n\nExisting n-grams already in content (avoid generating similar ones):\n${existingNgrams.slice(0, 30).map(n => `"${n}"`).join(', ')}`
    : '';

  return `Generate unique n-grams for: "${keyword}"

Create original, uncommon word sequences that would help content stand out and establish authority.${existingBlock}

Return valid JSON:
{
  "term": "${keyword}",
  "bigrams": ["phrase 1", "phrase 2"],
  "trigrams": ["phrase 1", "phrase 2"],
  "fourgrams": ["phrase 1", "phrase 2"],
  "informational": ["phrase 1", "phrase 2"],
  "commercial": ["phrase 1", "phrase 2"],
  "longtail": ["phrase 1", "phrase 2"],
  "seasonal": ["phrase 1", "phrase 2"],
  "authority": ["phrase 1", "phrase 2"]
}`;
}

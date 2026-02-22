export const NLP_KEYWORDS_SYSTEM = `You are an elite SEO and NLP analyst who helps content rank #1 on Google. Perform keyword analysis identifying what's present and what's CRITICALLY missing.

SECTION 1: FOUND IN CONTENT
Keywords ACTUALLY in the text (exact matches or close variations). Include occurrence count. Focus on terms Google uses for ranking signals.

SECTION 2: SUGGESTED TO ADD (CRITICAL FOR RANKING)
MISSING keywords that competitors use but this content lacks. These are the GAP between current content and Position 1. Include priority based on:
- high = appears in 70%+ of top-10 results for this topic
- medium = appears in 40-70% of top-10 results
- low = nice-to-have for comprehensive coverage

RULES:
- primaryKeywords: exact match and close variations of the main topic (3-5)
- secondaryKeywords: supporting topics that Google co-ranks (10-15)
- lsiKeywords: Latent Semantic Indexing terms Google uses to understand topical depth (15-20)
- technicalTerms: industry jargon that signals expertise (E-E-A-T)
- longTailPhrases: 4+ word phrases people actually search for
- questionPhrases: "People Also Ask" style questions Google shows for this topic`;

export function buildNlpKeywordsPrompt(competitorText: string): string {
  return `Analyze this content and identify:
1. Keywords that ARE in the content (with occurrence count)
2. Keywords that SHOULD BE ADDED (with priority)

Content:
${competitorText.slice(0, 15000)}

Return JSON with this exact structure:
{
  "topic": "Main topic of the content",
  "foundInContent": {
    "primaryKeywords": [{"term": "keyword", "count": 5}],
    "secondaryKeywords": [{"term": "keyword", "count": 3}],
    "lsiKeywords": [{"term": "keyword", "count": 2}],
    "technicalTerms": [{"term": "term", "count": 1}],
    "longTailPhrases": [{"term": "phrase", "count": 1}],
    "questionPhrases": [{"term": "how to...", "count": 1}]
  },
  "suggestedToAdd": {
    "primaryKeywords": [{"term": "keyword", "priority": "high"}],
    "secondaryKeywords": [{"term": "keyword", "priority": "medium"}],
    "lsiKeywords": [{"term": "keyword", "priority": "high"}],
    "technicalTerms": [{"term": "term", "priority": "low"}],
    "longTailPhrases": [{"term": "phrase", "priority": "medium"}],
    "questionPhrases": [{"term": "how to...", "priority": "high"}]
  },
  "contentScore": 75,
  "seoTips": ["tip1", "tip2", "tip3"],
  "criticalGaps": ["major missing topic 1", "major missing topic 2"]
}`;
}

export const NLP_KEYWORDS_MERGE_SYSTEM = `You are an elite SEO and NLP analyst. Your goal is to take multiple individual NLP keyword analyses from the top 10 competitors and MERGE them into one MASTER analysis that represents the industry standard.

RULES FOR MERGING:
1. Combine duplicate keywords and sum their occurrence counts.
2. For "suggestedToAdd", prioritize keywords that appear across MULTIPLE competitors. If 3+ competitors suggest adding "crm software", it becomes "high" priority.
3. Maintain the exact JSON structure.
4. Calculate an average contentScore.
5. Deduplicate seoTips and criticalGaps, keeping only the most unique and valuable ones.`;

export function buildNlpKeywordsMergePrompt(analyses: string[]): string {
  return `Merge these individual competitor NLP analyses into one master combined analysis:

ANALYSES TO MERGE:
${analyses.map((a, i) => `--- COMPETITOR ${i + 1} ---\n${a}`).join('\n\n')}

Return JSON with this exact structure:
{
  "topic": "Main topic",
  "foundInContent": {
    "primaryKeywords": [{"term": "keyword", "count": 5}],
    "secondaryKeywords": [{"term": "keyword", "count": 3}],
    "lsiKeywords": [{"term": "keyword", "count": 2}],
    "technicalTerms": [{"term": "term", "count": 1}],
    "longTailPhrases": [{"term": "phrase", "count": 1}],
    "questionPhrases": [{"term": "how to...", "count": 1}]
  },
  "suggestedToAdd": {
    "primaryKeywords": [{"term": "keyword", "priority": "high"}],
    "secondaryKeywords": [{"term": "keyword", "priority": "medium"}],
    "lsiKeywords": [{"term": "keyword", "priority": "high"}],
    "technicalTerms": [{"term": "term", "priority": "low"}],
    "longTailPhrases": [{"term": "phrase", "priority": "medium"}],
    "questionPhrases": [{"term": "how to...", "priority": "high"}]
  },
  "contentScore": 75,
  "seoTips": ["tip1", "tip2", "tip3"],
  "criticalGaps": ["major missing topic 1", "major missing topic 2"]
}`;
}

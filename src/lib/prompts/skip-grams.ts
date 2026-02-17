export const SKIP_GRAMS_SYSTEM = `You are an expert in computational linguistics and NLP, specializing in Skip-Gram models and semantic analysis. Generate comprehensive skip-gram dominant words for the given term.

For each category, provide detailed and useful results:

1. word_sense_disambiguation: Identify different meanings/senses of the word and provide dominant co-occurring words for EACH sense. Structure as an array of objects with "sense" (the meaning) and "dominant_words" (array of co-occurring words).

Example for "bank":
[
  {"sense": "Financial institution", "dominant_words": ["money", "loan", "account", "deposit", "interest", "savings", "credit", "ATM"]},
  {"sense": "River edge", "dominant_words": ["water", "stream", "shore", "fishing", "river", "sand", "flood"]}
]

2. document_summarization: Provide dominant words that would help summarize documents about this topic. Include key concepts, actions, and descriptors.

3. keyword_extraction: Provide technical and research-oriented keywords that would appear in academic or professional content about this topic.

Be thorough and include at least 2-4 senses for disambiguation if the word has multiple meanings. For single-meaning words, still provide one sense with rich dominant words.`;

export function buildSkipGramsPrompt(keyword: string, competitorContext?: string): string {
  const contextBlock = competitorContext
    ? `\n\nHere is a sample of competitor content for semantic context (use it to extract REAL co-occurring words from top-ranking content):\n"${competitorContext.slice(0, 2000)}"`
    : '';

  return `Generate comprehensive skip-gram dominant words for: "${keyword}"

Include:
1. Word sense disambiguation with different meanings and their co-occurring dominant words
2. Document summarization keywords for creating summaries
3. Keyword extraction for research/technical content${contextBlock}

Return a valid JSON object:
{
  "term": "${keyword}",
  "word_sense_disambiguation": [
    {"sense": "Meaning 1", "dominant_words": ["word1", "word2", "word3"]},
    {"sense": "Meaning 2", "dominant_words": ["word4", "word5", "word6"]}
  ],
  "document_summarization": ["topic1", "topic2", "concept1", "action1"],
  "keyword_extraction": ["technical_term1", "research_keyword1", "methodology1"],
  "skipGrams": ["word1 + word2", "word3 + word4"]
}

The "skipGrams" array should contain 20-30 topic-defining non-adjacent word pairs derived from the dominant words above.`;
}

export const GRAMMAR_SYSTEM = `You are an expert linguist and semantic SEO specialist. Generate comprehensive grammatical and semantic word relationships for the given term. For each category, provide 8-15 relevant terms that are genuinely useful for SEO content creation. Categories to fill:

1. proper_nouns: Specific brand names, product names, company names, famous people associated with the topic
2. common_nouns: General category words, everyday terms related to the topic
3. synonyms: Words with similar meanings that can be used interchangeably
4. antonyms: Words with opposite meanings
5. hyponyms: More specific types/examples (e.g., for "fruit": apple, banana)
6. hypernyms: Broader category terms (e.g., for "apple": fruit, food)
7. homonyms: Words spelled the same but with different meanings
8. meronyms: Parts/components of the concept (e.g., for "car": wheel, engine)
9. holonyms: Larger wholes that contain this concept (e.g., for "wheel": car)
10. polysemy: Different but related meanings of the same term

Be thorough and include only relevant, accurate terms.
If a category doesn't apply well, include an empty array.`;

export function buildGrammarPrompt(keyword: string): string {
  return `Generate comprehensive grammatical and semantic relationships for: "${keyword}"

Include proper nouns (brands, products), common nouns, synonyms, antonyms, hyponyms (more specific), hypernyms (more general), homonyms, meronyms (parts), holonyms (wholes), and polysemy (multiple meanings).

Return JSON with this exact structure:
{
  "term": "${keyword}",
  "proper_nouns": ["Brand1", "Product1", "Company1"],
  "common_nouns": ["noun1", "noun2"],
  "synonyms": ["syn1", "syn2"],
  "antonyms": ["ant1", "ant2"],
  "hyponyms": ["specific1", "specific2"],
  "hypernyms": ["general1", "general2"],
  "homonyms": ["homonym1"],
  "meronyms": ["part1", "part2"],
  "holonyms": ["whole1", "whole2"],
  "polysemy": ["meaning1: explanation", "meaning2: explanation"]
}`;
}

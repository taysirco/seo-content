export const AUTO_SUGGEST_SYSTEM = `You are an SEO keyword research expert. Return only valid JSON arrays.`;

export function buildAutoSuggestFilterPrompt(keyword: string, suggestions: string[]): string {
  return `You are an SEO expert. Given this base keyword "${keyword}" and the following Google autocomplete suggestions, select the 20-30 most relevant keywords for SEO content optimization.

Criteria:
- Relevance to the main topic
- Search volume potential
- Content optimization value
- User intent alignment

Suggestions:
${suggestions.join('\n')}

Return JSON: {"keywords": ["keyword 1", "keyword 2", ...]}`;
}

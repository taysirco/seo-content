export const ENTITY_MERGE_SYSTEM = `You are an expert semantic SEO analyst. Combine and deduplicate entities from multiple sources.

RULES:
1. Merge similar entities (e.g., "Google" and "Google Inc." = "Google").
2. Remove duplicates across sources.
3. Keep the most specific/complete version of each entity.
4. Organize by relevance/importance (most mentioned first).
5. Add a "relevance" score (1-10) based on how often an entity appears across sources.`;

export function buildEntityMergePrompt(entitySources: string[]): string {
  const formatted = entitySources.map((s, i) => `--- Source ${i + 1} ---\n${s}`).join('\n\n');

  return `Combine and deduplicate these entities from multiple sources:

${formatted}

Return JSON with this exact structure:
{
  "entities": {
    "people": [{"name": "Person Name", "relevance": 8}],
    "organizations": [{"name": "Org Name", "relevance": 10}],
    "locations": [{"name": "Place", "relevance": 5}],
    "products": [{"name": "Product", "relevance": 7}],
    "concepts": [{"name": "Concept", "relevance": 9}],
    "events": [{"name": "Event", "relevance": 4}],
    "technologies": [{"name": "Tech", "relevance": 8}],
    "other": [{"name": "Entity", "relevance": 3}]
  },
  "summary": "Brief description of the main topic based on entities",
  "totalUnique": 25
}`;
}

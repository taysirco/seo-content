export const ENTITY_ANALYSIS_SYSTEM = `You are an elite semantic SEO analyst specializing in Google's Knowledge Graph optimization. Analyze content and identify entities that Google uses to understand topical authority.

SECTION 1: FOUND IN CONTENT
Entities ACTUALLY PRESENT in the text. Must be exact matches or close variations. Include occurrence count. Focus on entities Google would recognize as Knowledge Graph entries.

SECTION 2: SUGGESTED TO ADD
MISSING entities that MUST BE ADDED for topical completeness. These are entities that Google expects to see in authoritative content on this topic. Prioritize by SEO impact.

KEY RULES:
- Prefer SPECIFIC entities over generic ones (e.g., "ChatGPT" not "أداة ذكاء اصطناعي").
- Include entity relationships: if entity A is mentioned, what related entities B,C does Google expect?
- Include entity names in the content's language AND English where relevant for international recognition.
- Focus on entities that appear in Google's "People Also Ask" and Knowledge Panels for this topic.

Categories: people, organizations, locations, products, concepts, events, technologies, other.`;

export function buildEntityAnalysisPrompt(competitorText: string): string {
  return `Analyze this content and identify:
1. Entities that ARE in the content (with occurrence count)
2. Entities that SHOULD BE ADDED (with priority)

Content:
${competitorText.slice(0, 5000)}

Return JSON with this exact structure:
{
  "title": "Main topic/title of the content",
  "foundInContent": {
    "people": [{"name": "person", "count": 3}],
    "organizations": [{"name": "org", "count": 2}],
    "locations": [{"name": "place", "count": 1}],
    "products": [{"name": "product", "count": 1}],
    "concepts": [{"name": "concept", "count": 2}],
    "events": [{"name": "event", "count": 1}],
    "technologies": [{"name": "tech", "count": 1}],
    "other": [{"name": "entity", "count": 1}]
  },
  "suggestedToAdd": {
    "people": [{"name": "expert", "priority": "high"}],
    "organizations": [{"name": "org", "priority": "medium"}],
    "locations": [{"name": "place", "priority": "low"}],
    "products": [{"name": "product", "priority": "high"}],
    "concepts": [{"name": "concept", "priority": "high"}],
    "events": [{"name": "event", "priority": "low"}],
    "technologies": [{"name": "tech", "priority": "medium"}],
    "other": [{"name": "entity", "priority": "low"}]
  },
  "contentScore": 75,
  "criticalGaps": ["major missing entity 1", "major missing entity 2"]
}`;
}

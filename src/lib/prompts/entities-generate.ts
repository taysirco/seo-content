export const ENTITY_GENERATE_SYSTEM = `You are an expert SEO analyst specializing in semantic SEO and entity optimization. Given a keyword, generate a list of related entities that should be mentioned in content to optimize for that keyword.

Rules:
1. Provide 10-20 highly relevant entities.
2. Focus on entities that Google associates with this topic.
3. Categorize entities into: people, organizations, concepts, products, and locations.`;

export function buildEntityGeneratePrompt(keyword: string): string {
  return `Generate SEO entities for the keyword: "${keyword}"

Return JSON with this exact structure:
{
  "entities": ["entity1", "entity2", "entity3"],
  "entityTypes": {
    "people": ["relevant people/experts"],
    "organizations": ["relevant companies/brands"],
    "concepts": ["related concepts/topics"],
    "products": ["related products/tools"],
    "locations": ["relevant locations if applicable"]
  }
}`;
}

/**
 * Topic Cluster Engine — Maps topical authority structure for a keyword,
 * identifies the pillar topic, cluster subtopics, and internal linking opportunities.
 */

export const TOPIC_CLUSTER_SYSTEM = `You are an elite SEO topical authority strategist. Given a keyword and optional domain context, map the complete topic cluster structure that Google uses to evaluate topical authority.

Return JSON with this EXACT schema:
{
  "pillarTopic": "The broad pillar topic this keyword belongs to",
  "pillarKeyword": "The ideal pillar page keyword",
  "currentKeywordRole": "pillar" | "cluster" | "supporting",
  "clusterKeywords": [
    {
      "keyword": "related subtopic keyword",
      "relationship": "subtopic" | "prerequisite" | "related" | "comparison" | "use_case",
      "searchVolumeTier": "high" | "medium" | "low",
      "priority": "critical" | "high" | "medium"
    }
  ],
  "internalLinkSuggestions": [
    {
      "anchorText": "descriptive anchor text",
      "targetKeyword": "the keyword this should link to",
      "placement": "intro" | "body" | "conclusion" | "faq"
    }
  ],
  "topicalAuthorityGaps": [
    "Subtopic that must be covered for full topical authority"
  ],
  "contentSiloStructure": {
    "pillar": "Main pillar page topic",
    "clusters": ["Cluster 1", "Cluster 2", "Cluster 3"],
    "supporting": ["Supporting article 1", "Supporting article 2"]
  },
  "competitiveAdvantage": "What unique angle or depth would give this content an edge"
}

RULES:
- clusterKeywords should include 10-20 related keywords that form the topic cluster
- internalLinkSuggestions should be actionable — real anchor text + target pages
- topicalAuthorityGaps are subtopics NO competitor covers well
- Think like Google's topical authority algorithm: what related content must exist for this keyword to rank?`;

export function buildTopicClusterPrompt(
  keyword: string,
  lang: string = 'en',
  existingKeywords?: string[],
  domain?: string,
): string {
  const existingBlock = existingKeywords && existingKeywords.length > 0
    ? `\n\nEXISTING CONTENT ON THIS DOMAIN:\n${existingKeywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}\nConsider these when suggesting internal links.`
    : '';

  const domainBlock = domain
    ? `\nDOMAIN: ${domain}`
    : '';

  return `Map the complete topic cluster structure for this keyword.

KEYWORD: "${keyword}"
CONTENT LANGUAGE: ${lang}${domainBlock}${existingBlock}

Analyze:
1. What pillar topic does this keyword belong to?
2. What are the 10-20 cluster/subtopic keywords that form a complete topical authority map?
3. What internal links should this article include (with anchor text)?
4. What subtopics are gaps that no competitor covers well?
5. What content silo structure would establish topical authority?

Return your JSON analysis.`;
}

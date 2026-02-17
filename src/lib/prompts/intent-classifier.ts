/**
 * Search Intent Classifier — Analyzes keyword + SERP data to classify search intent
 * and recommend optimal content format, length, and SERP feature targets.
 */

export const INTENT_CLASSIFIER_SYSTEM = `You are an elite SEO strategist who specializes in search intent analysis. Given a keyword and competitor data, classify the search intent and recommend the optimal content strategy.

Return JSON with this EXACT schema:
{
  "intent": "informational" | "transactional" | "navigational" | "commercial_investigation",
  "intentConfidence": 0-100,
  "contentFormat": "comprehensive_guide" | "listicle" | "comparison" | "how_to" | "review" | "definition" | "news" | "landing_page",
  "recommendedLength": {
    "min": 1500,
    "max": 5000,
    "optimal": 3000
  },
  "serpFeatureTargets": ["featured_snippet", "people_also_ask", "knowledge_panel", "local_pack", "video", "image_pack"],
  "featuredSnippetType": "paragraph" | "list" | "table" | "none",
  "contentAngle": "Brief description of the best angle to take for this keyword",
  "topicalDepthRequired": "shallow" | "moderate" | "deep" | "exhaustive",
  "competitorInsights": {
    "avgWordCount": 0,
    "dominantFormat": "guide" | "listicle" | "comparison" | "other",
    "contentGap": "What top competitors are missing"
  }
}

RULES:
- informational = user wants to learn/understand (what, how, why, guide, tutorial)
- transactional = user wants to buy/sign up/download (buy, price, discount, order, download)  
- navigational = user wants a specific website/page (brand name, login, specific product)
- commercial_investigation = user is comparing before buying (best, vs, review, top 10, comparison)
- contentFormat must match the intent — don't recommend a guide for a transactional keyword
- recommendedLength must be realistic for the intent and format
- serpFeatureTargets should only include features that are achievable for this keyword`;

export function buildIntentClassifierPrompt(
  keyword: string,
  competitorTitles: string[],
  competitorSnippets: string[],
  lang: string = 'en',
): string {
  const competitorContext = competitorTitles
    .map((title, i) => `${i + 1}. "${title}" — ${competitorSnippets[i] || ''}`)
    .slice(0, 10)
    .join('\n');

  return `Classify the search intent for this keyword and recommend the optimal content strategy.

KEYWORD: "${keyword}"
CONTENT LANGUAGE: ${lang}

TOP GOOGLE RESULTS FOR THIS KEYWORD:
${competitorContext || 'No competitor data available — analyze based on keyword alone.'}

Based on:
1. The keyword structure and modifiers
2. The types of pages Google is ranking (guides? product pages? comparisons?)
3. What format would best serve the searcher's actual goal

Return your JSON analysis.`;
}

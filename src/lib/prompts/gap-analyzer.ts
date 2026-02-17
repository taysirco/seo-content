/**
 * E2: Information Gain Engine — Gap Analyzer prompt.
 * Analyzes the merged outline and identifies blind spots that all competitors missed,
 * suggesting 2-3 new H2 headings that provide exclusive information gain.
 */

export const GAP_ANALYZER_SYSTEM = `You are an elite SEO strategist specializing in "Information Gain" — the Google ranking signal that rewards content which adds NEW, UNIQUE information not found in competing articles. Your analysis directly determines whether content reaches Position 1.

Your job: Given a merged outline representing everything competitors cover, identify BLIND SPOTS AND DEPTH GAPS.

Return JSON with this exact schema:
{
  "blindSpots": [
    {
      "heading": "Suggested new H2 heading",
      "rationale": "Why this angle is missing and how it adds exclusive value",
      "searchIntent": "The search intent this section answers",
      "suggestedSubHeadings": ["Sub-heading 1", "Sub-heading 2"]
    }
  ],
  "depthAnalysis": {
    "currentH2Count": 0,
    "currentH3Count": 0,
    "recommendedH2Count": 0,
    "recommendedH3Count": 0,
    "depthScore": 0,
    "shallowSections": ["H2 heading that needs more depth"],
    "suggestedSubSections": [
      { "parentH2": "Parent section heading", "newH3": "Suggested sub-heading" }
    ]
  },
  "missingQuestions": ["Deep question 1 competitors ignored", "Question 2"],
  "uniqueAngles": ["Unique angle 1", "Unique angle 2"],
  "informationGainScore": 0-100
}

IMPORTANT: All suggested headings, questions, and angles MUST be in the SAME LANGUAGE as the outline headings provided.`;

export function buildGapAnalyzerPrompt(keyword: string, outlineHeadings: string[] | { level: number; text: string }[], competitorCount: number, lang: string = 'ar'): string {
  // W9-3: Accept either plain strings or heading objects with levels
  const formattedHeadings = outlineHeadings.map((h, i) => {
    if (typeof h === 'string') return `${i + 1}. ${h}`;
    return `${i + 1}. ${'  '.repeat(h.level - 2)}[H${h.level}] ${h.text}`;
  }).join('\n');

  return `Target keyword: "${keyword}"
Content language: ${lang}
Competitors analyzed: ${competitorCount}

Current merged outline (represents everything competitors wrote):
${formattedHeadings}

Your task:
1. Analyze this outline deeply — what angles and deep questions did ALL competitors miss?
2. Suggest 2-3 completely NEW H2 headings that provide exclusive "Information Gain" no competitor has.
3. Identify deep questions that nobody answered.
4. Rate the potential information gain score (0-100).
5. Depth analysis (depthAnalysis): count current H2s and H3s. Recommend the outline be at least 40% deeper. Identify shallow sections (H2 without H3 sub-sections) and suggest H3 sub-headings.

Rules:
- Suggested headings MUST be in the same language as the existing outline (${lang}).
- Do NOT repeat what already exists — only suggest what is truly missing.
- Focus on angles that real searchers want but cannot find answers to.
- depthScore: 100 if outline is 40%+ deeper than competitors, 50 if equal, 0 if shallower.`;
}

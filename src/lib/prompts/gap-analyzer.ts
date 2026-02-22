/**
 * E2: Information Gain Engine — Gap Analyzer prompt.
 * Analyzes the merged outline and identifies blind spots that all competitors missed,
 * suggesting 2-3 new H2 headings that provide exclusive information gain.
 */

export const GAP_ANALYZER_SYSTEM = `You are an elite SEO strategist specializing in "Information Gain" — the Google ranking signal that rewards content which adds NEW, UNIQUE information not found in competing articles. Your analysis directly determines whether content reaches Position 1.

Your job: Given a merged outline representing everything competitors cover, identify BLIND SPOTS AND DEPTH GAPS.

CRITICAL: You must extract the "Deep Intent" or "Hidden Objections" (الفجوة النفسية أو الاعتراضات الخفية) that the searcher has but no one talks about. For example, if the keyword is "hair transplant", the hidden fear is "does it look fake in the sun?". You MUST suggest an H2 heading to address this fear head-on.

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
  "hiddenObjections": [
    {
      "fearOrObjection": "The psychological fear or unasked question",
      "suggestedH2": "An H2 heading that tackles this fear directly (e.g. 'لماذا تفشل معظم الحلول؟')"
    }
  ],
  "counterNarrative": {
    "standardAdvice": "The generic, consensus advice everybody else is giving.",
    "contrarianTake": "A powerful counter-narrative or caveat that challenges the standard advice.",
    "suggestedH2": "An H2 heading that explicitly challenges this advice."
  },
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
6. [NEW] Reveal the Hidden Objections (الفجوة النفسية): What are the unspoken fears or real problems the searcher has regarding this topic that no one addresses directly? Suggest a specific H2 mapping for it.
7. [WEAPON 6] Inject a Counter-Narrative (The Contrarian Take): Identify the "Standard Industry Advice" that all competitors regurgitate. Provide a "Contrarian Take" that challenges this advice or adds a major caveat. Suggest an H2 heading to explicitly challenge it.

Rules:
- Suggested headings MUST be in the same language as the existing outline (${lang}).
- Do NOT repeat what already exists — only suggest what is truly missing.
- Focus on angles that real searchers want but cannot find answers to.
- depthScore: 100 if outline is 40%+ deeper than competitors, 50 if equal, 0 if shallower.`;
}

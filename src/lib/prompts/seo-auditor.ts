/**
 * G1: Ruthless SEO Auditor Agent — Temperature 0.0 quality gate.
 * Reviews generated article against all SEO data and returns
 * a structured pass/fail verdict with specific rewrite commands.
 */

export function getSeoAuditorSystem(lang?: string): string {
  const langLabel = lang === 'ar' ? 'Arabic' : lang === 'en' ? 'English' : lang === 'fr' ? 'French' : lang === 'es' ? 'Spanish' : lang === 'de' ? 'German' : 'multilingual';
  return `You are a ruthless SEO quality auditor. You review ${langLabel} articles with ZERO tolerance for mediocrity.
Your job: analyze the article against the provided SEO checklist and return a brutally honest JSON verdict.

Return JSON with this EXACT schema:
{
  "verdict": "pass" | "fail",
  "overallScore": 0-100,
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "cliches" | "density" | "structure" | "entities" | "thin_content" | "coherence" | "aeo" | "semantic",
      "sectionHeading": "Section heading or null",
      "description": "Problem description",
      "fix": "Required fix"
    }
  ],
  "clichesFound": ["forbidden phrase 1", "forbidden phrase 2"],
  "keywordDensityActual": 0.0,
  "entityCoveragePercent": 0,
  "sectionsAnalysis": [
    {
      "heading": "Section heading",
      "wordCount": 0,
      "quality": "excellent" | "good" | "weak" | "failing",
      "note": "Brief note"
    }
  ]
}

RULES:
- verdict = "fail" if ANY critical issue exists OR overallScore < 70.
- A section with < 150 words is ALWAYS a critical issue.
- Any forbidden cliché found is ALWAYS a critical issue.
- Keyword density outside 0.5-2.5% range is a warning.
- Missing outline headings is a critical issue.
- Be specific: name the exact section and the exact problem.
- sectionsAnalysis is MANDATORY — you MUST analyze every H2 section individually.
- keywordDensityActual is MANDATORY — calculate it precisely.
- entityCoveragePercent is MANDATORY — count how many provided entities appear in the text.`;
}

/** Legacy export for backward compatibility */
export const SEO_AUDITOR_SYSTEM = getSeoAuditorSystem('ar');

export function buildAuditPrompt(
  keyword: string,
  articleHtml: string,
  outlineHeadings: string[],
  entities: string[],
  forbiddenPhrases: string[],
  activeRuleIds: string[] = [],
): string {
  const plainText = articleHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  // Build conditional checks based on active rules
  const conditionalChecks: string[] = [];
  let checkNum = 8;
  if (activeRuleIds.includes('aeo-tldr')) {
    conditionalChecks.push(`${checkNum++}. AEO BOXES — verify <div class="quick-answer"> exists after the H1 and after major H2 headings.`);
  }
  if (activeRuleIds.includes('sge-bait')) {
    conditionalChecks.push(`${checkNum++}. SGE BAIT BOXES — verify <div class="sge-bait-box"> exists after the H1 and after EVERY H2. Each must contain ~45 words with a summary label.`);
  }
  if (activeRuleIds.includes('comparison-tables')) {
    conditionalChecks.push(`${checkNum++}. COMPARISON TABLE — verify at least one <table class="comparison-table"> or <table> with 3+ rows and 3+ columns exists.`);
  }
  if (activeRuleIds.includes('mermaid-diagrams')) {
    conditionalChecks.push(`${checkNum++}. MERMAID DIAGRAMS — verify at least one <div class="mermaid-diagram"> or <pre class="mermaid"> exists.`);
  }
  if (activeRuleIds.includes('featured-snippet')) {
    conditionalChecks.push(`${checkNum++}. FEATURED SNIPPET — verify at least one section has a concise definition (40-60 words) or numbered step list suitable for Google Featured Snippets.`);
  }
  // Semantic writing rule compliance checks
  if (activeRuleIds.includes('be-certain')) {
    conditionalChecks.push(`${checkNum++}. CERTAINTY — scan for hedging language: "might", "could", "maybe", "possibly", "perhaps", "it is believed". Each instance is a warning (category: "semantic").`);
  }
  if (activeRuleIds.includes('no-back-reference')) {
    conditionalChecks.push(`${checkNum++}. NO BACK-REFERENCES — scan for phrases like "as stated before", "as mentioned earlier", "as explained above", "as we discussed". Each is a warning (category: "semantic").`);
  }
  if (activeRuleIds.includes('cut-fluff')) {
    conditionalChecks.push(`${checkNum++}. FLUFF DETECTION — identify sentences that add zero information value (pure filler, vague generalizations without data). Flag top 3 worst offenders (category: "semantic").`);
  }
  if (activeRuleIds.includes('no-analogies')) {
    conditionalChecks.push(`${checkNum++}. NO ANALOGIES — scan for analogies ("like a", "similar to", "think of it as", "imagine"). Each is a warning (category: "semantic").`);
  }
  if (activeRuleIds.includes('bold-answer')) {
    conditionalChecks.push(`${checkNum++}. BOLD ANSWERS — verify that <strong> tags are used to highlight answers, not just keywords. If keyword is bolded but the answer isn't, flag it (category: "semantic").`);
  }

  return `AUDIT this SEO article about "${keyword}" (${wordCount} words).

ARTICLE HTML:
${articleHtml.slice(0, 25000)}

CHECKLIST:
1. FORBIDDEN CLICHÉS — scan for these EXACT phrases: [${forbiddenPhrases.join(', ')}]
2. KEYWORD PROMINENCE — CRITICAL: primary keyword "${keyword}" MUST appear within the first 100 words of the text.
3. KEYWORD DENSITY — primary keyword "${keyword}" must appear at 0.5-2.5% density.
4. OUTLINE COVERAGE — ALL these H2 headings must exist: [${outlineHeadings.join(' | ')}]
5. ENTITY COVERAGE — these entities should appear: [${entities.slice(0, 30).join(', ')}]
6. SECTION DEPTH & UX — every H2 section must have ≥150 words. A section exceeding 300 words without breaking down (H3, Lists, Tables) is a "Wall of Text" penalty.
7. USER INTENT ALIGNMENT — Assess if the overall tone actually solves the implicit problem of "${keyword}" or if it just fluffs around it.
8. COHERENCE — transitions between sections should be natural, no abrupt topic jumps.
9. BURSTINESS — sentences should vary in length (mix of short 5-word and long 25-word sentences).
10. ANSWER FIRST — CRITICAL: The first sentence after every H2 must answer the heading's implied question directly (Start with Subject + Verb).
11. AUTHORITY & DATA — CRITICAL: The article must contain at least 3 distinct statistical data points (numbers, percentages, dates) or citations.
12. SEMANTIC HARMONY — Verify that the start of each section logically follows the end of the previous one.
${conditionalChecks.join('\n')}

Return your JSON verdict.`;
}

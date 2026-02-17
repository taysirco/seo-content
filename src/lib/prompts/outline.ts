export const OUTLINE_MERGE_SYSTEM = `You are an elite SEO content strategist specializing in creating outlines that OUTRANK every competitor. Your task is to analyze multiple article outlines and create the MOST comprehensive, best-structured combined outline possible.

CRITICAL RULES:
1. ONLY use headings that exist in the provided outlines—do NOT generate new topics.
2. OUTPUT EXACTLY ONE H1—choose the most relevant, keyword-rich title from all sources.
3. Combine similar headings that cover the same topic into one stronger heading.
4. Organize headings in a LOGICAL FLOW: intro context → core concepts → practical application → advanced topics → conclusion.
5. Maintain STRICT hierarchy (H1 > H2 > H3 > H4). Every H2 should have 2-4 H3 sub-sections for depth.
6. Remove duplicates while keeping the most informative, specific version.
7. DEPTH IS KING: The merged outline must have MORE H2 sections than any single competitor, and each H2 should have H3 sub-sections.
8. Ensure every H2 heading is specific and actionable—avoid vague or generic headings. Replace with the most specific version from any source.
9. ORDER BY SEARCH INTENT: Put "what is" and definition sections first, then "how to" and practical sections, then comparisons and alternatives, then advanced/niche topics, then FAQ.`;

export function buildOutlineMergePrompt(outlines: { url: string; headings: { level: number; text: string }[] }[]): string {
  const formattedOutlines = outlines.map((o, i) => {
    const headingsList = o.headings
      .map(h => `${'  '.repeat(h.level - 1)}${'#'.repeat(h.level)} ${h.text}`)
      .join('\n');
    return `--- Source ${i + 1} (${o.url}) ---\n${headingsList}`;
  }).join('\n\n');

  return `Combine these article outlines into one comprehensive outline.
ONLY use headings from the provided sources:

${formattedOutlines}

Create a merged outline that covers all unique topics from these sources.
Return JSON with this exact structure:
{
  "title": "Combined article title",
  "headings": [
    { "level": 1, "text": "Main Title" },
    { "level": 2, "text": "Section heading" },
    { "level": 3, "text": "Subsection heading" }
  ],
  "summary": "Brief 1-sentence description of the combined outline coverage"
}`;
}

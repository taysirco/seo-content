/**
 * P6-3: Self-Healing SEO Engine
 * Analyzes page-2 keywords from GSC data and generates content expansion prompts.
 * The engine identifies keywords that are "almost ranking" (positions 11-20)
 * and creates targeted H2/H3 sections to push them to page 1.
 */

import type { PageKeyword } from '@/lib/search-console-client';

export interface ExpansionTarget {
  keyword: string;
  currentPosition: number;
  impressions: number;
  suggestedHeading: string;
  headingLevel: 'h2' | 'h3';
  priority: 'critical' | 'high' | 'medium';
  rationale: string;
}

export interface HealingPlan {
  url: string;
  analyzedAt: string;
  totalPage2Keywords: number;
  expansionTargets: ExpansionTarget[];
  estimatedImpact: string;
}

/**
 * Analyze page-2 keywords and generate an expansion plan.
 * Prioritizes keywords by: impressions (demand) × (20 - position) (proximity to page 1).
 */
export function buildHealingPlan(
  url: string,
  page2Keywords: PageKeyword[],
  existingHeadings: string[],
): HealingPlan {
  if (page2Keywords.length === 0) {
    return {
      url,
      analyzedAt: new Date().toISOString(),
      totalPage2Keywords: 0,
      expansionTargets: [],
      estimatedImpact: 'No page-2 keywords found — article is performing well.',
    };
  }

  // Score each keyword: higher impressions + closer to page 1 = higher priority
  const scored = page2Keywords.map(kw => ({
    ...kw,
    score: kw.impressions * (21 - kw.position),
  })).sort((a, b) => b.score - a.score);

  // Filter out keywords already covered by existing headings
  const existingLower = existingHeadings.map(h => h.toLowerCase());
  const uncoveredKeywords = scored.filter(kw =>
    !existingLower.some(h => h.includes(kw.query.toLowerCase()) || kw.query.toLowerCase().includes(h))
  );

  // Take top 5 uncovered keywords for expansion
  const targets: ExpansionTarget[] = uncoveredKeywords.slice(0, 5).map(kw => {
    const priority: ExpansionTarget['priority'] =
      kw.position <= 13 ? 'critical' :  // Very close to page 1
      kw.position <= 16 ? 'high' :
      'medium';

    // Determine heading level: if the keyword is a long-tail (4+ words), use H3 under closest H2
    const headingLevel: 'h2' | 'h3' = kw.query.split(/\s+/).length >= 4 ? 'h3' : 'h2';

    return {
      keyword: kw.query,
      currentPosition: Math.round(kw.position * 10) / 10,
      impressions: kw.impressions,
      suggestedHeading: kw.query,
      headingLevel,
      priority,
      rationale: `Position: ${kw.position.toFixed(1)} — ${kw.impressions} impressions — ${priority === 'critical' ? 'Very close to page 1' : priority === 'high' ? 'Strong opportunity' : 'Good opportunity'}`,
    };
  });

  const criticalCount = targets.filter(t => t.priority === 'critical').length;
  const totalImpact = targets.reduce((sum, t) => sum + t.impressions, 0);

  return {
    url,
    analyzedAt: new Date().toISOString(),
    totalPage2Keywords: page2Keywords.length,
    expansionTargets: targets,
    estimatedImpact: `${targets.length} expansion opportunities (${criticalCount} critical) — potential impressions: ${totalImpact.toLocaleString()}`,
  };
}

/**
 * Build a prompt for the AI to generate expansion content for a specific keyword.
 */
export function buildExpansionPrompt(
  articleKeyword: string,
  target: ExpansionTarget,
  existingArticleSnippet: string,
  lang: string = 'ar',
): string {
  const tag = target.headingLevel === 'h2' ? 'H2' : 'H3';

  if (lang === 'ar') {
    return `أنت كاتب محتوى SEO محترف. مطلوب منك كتابة قسم جديد (${tag}) لمقال موجود عن "${articleKeyword}".

السبب: Google Search Console أظهر أن هذا المقال يظهر في الصفحة الثانية (الموقع ${target.currentPosition}) للكلمة البحثية "${target.keyword}" مع ${target.impressions} ظهور. نحتاج قسماً مخصصاً لدفع هذه الكلمة للصفحة الأولى.

مقتطف من المقال الحالي (للسياق):
"${existingArticleSnippet.slice(0, 500)}"

المطلوب:
1. اكتب <${target.headingLevel}> بعنوان يتضمن "${target.keyword}" بشكل طبيعي.
2. اكتب 200-350 كلمة تجيب مباشرة على نية البحث وراء "${target.keyword}".
3. ضمّن الكلمة المفتاحية 2-3 مرات بشكل طبيعي.
4. ابدأ بإجابة مباشرة (لاقتناص Featured Snippet).
5. استخدم HTML: <${target.headingLevel}>, <p>, <ul>/<ol>, <strong>.
6. لا تستخدم كليشيهات (في الختام، مما لا شك فيه، في عالمنا المتسارع).
7. نوّع في أطوال الجمل (5 كلمات و 25 كلمة).

اكتب فقط HTML القسم الجديد — لا تكتب أي شيء آخر.`;
  }

  return `You are a professional SEO content writer. Write a new section (${tag}) for an existing article about "${articleKeyword}".

Reason: Google Search Console shows this article ranks on page 2 (position ${target.currentPosition}) for "${target.keyword}" with ${target.impressions} impressions. We need a dedicated section to push this keyword to page 1.

Existing article snippet (for context):
"${existingArticleSnippet.slice(0, 500)}"

Requirements:
1. Write a <${target.headingLevel}> with a heading that naturally includes "${target.keyword}".
2. Write 200-350 words that directly answer the search intent behind "${target.keyword}".
3. Include the keyword 2-3 times naturally.
4. Start with a direct answer (to capture Featured Snippet).
5. Use HTML: <${target.headingLevel}>, <p>, <ul>/<ol>, <strong>.
6. Avoid clichés ("in conclusion", "it goes without saying", "in today's fast-paced world").
7. Vary sentence lengths (5 words and 25 words).

Write ONLY the HTML for the new section — nothing else.`;
}

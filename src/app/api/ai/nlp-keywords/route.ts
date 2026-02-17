import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { NLP_KEYWORDS_SYSTEM } from '@/lib/prompts/nlp-keywords';
import { validateNLPKeywords } from '@/lib/ai-response-validator';
import { deduplicateCompetitorTexts } from '@/lib/utils/dedup-text';
import { startRequestLog } from '@/lib/request-logger';

export async function POST(req: NextRequest) {
  const log = startRequestLog('/api/ai/nlp-keywords');
  try {
    const { contents } = await req.json() as {
      keyword?: string;
      contents: { url: string; text: string }[];
    };

    if (!contents || contents.length === 0) {
      return NextResponse.json({ error: 'No content to analyze' }, { status: 400 });
    }

    // PERF: Deduplicate boilerplate paragraphs across competitors
    const rawTexts = contents.map(c => c.text);
    const cleanTexts = deduplicateCompetitorTexts(rawTexts);

    // OPT-2: Batch ALL competitors + combined into ONE Gemini call
    const batchPrompt = contents.map((c, i) =>
      `=== COMPETITOR ${i + 1} (${c.url}) ===\n${(cleanTexts[i] || c.text).slice(0, 6000)}`
    ).join('\n\n');

    const batchResult = await callGemini({
      systemInstruction: NLP_KEYWORDS_SYSTEM + `\n\nIMPORTANT: You are analyzing ${contents.length} competitor texts at once. Return a JSON object with TWO keys:
1. "perCompetitor": an array of ${contents.length} keyword analyses (one per competitor, in order)
2. "combined": a single combined analysis merging all competitor data together`,
      userPrompt: `Analyze these ${contents.length} competitor texts:\n\n${batchPrompt}\n\nReturn JSON: { "perCompetitor": [ { "topic": "...", "foundInContent": {...}, "suggestedToAdd": {...}, "contentScore": N, "seoTips": [...], "criticalGaps": [...] }, ... ], "combined": { same structure but merged from all } }`,
      temperature: 0.3,
      maxOutputTokens: 8192,
    });

    const parsed = JSON.parse(batchResult);

    const perCompetitor = (parsed.perCompetitor || [parsed]).map((r: unknown) => {
      try { return validateNLPKeywords(r as Record<string, unknown>); }
      catch { return { topic: '', foundInContent: { primaryKeywords: [], secondaryKeywords: [], lsiKeywords: [], technicalTerms: [], longTailPhrases: [], questionPhrases: [] }, suggestedToAdd: { primaryKeywords: [], secondaryKeywords: [], lsiKeywords: [], technicalTerms: [], longTailPhrases: [], questionPhrases: [] }, contentScore: 0, seoTips: [], criticalGaps: [] }; }
    });

    // Pad if needed
    while (perCompetitor.length < contents.length) {
      perCompetitor.push({ topic: '', foundInContent: { primaryKeywords: [], secondaryKeywords: [], lsiKeywords: [], technicalTerms: [], longTailPhrases: [], questionPhrases: [] }, suggestedToAdd: { primaryKeywords: [], secondaryKeywords: [], lsiKeywords: [], technicalTerms: [], longTailPhrases: [], questionPhrases: [] }, contentScore: 0, seoTips: [], criticalGaps: [] });
    }

    let combined;
    try { combined = validateNLPKeywords(parsed.combined || parsed); }
    catch { combined = perCompetitor[0] || { topic: '', foundInContent: { primaryKeywords: [], secondaryKeywords: [], lsiKeywords: [], technicalTerms: [], longTailPhrases: [], questionPhrases: [] }, suggestedToAdd: { primaryKeywords: [], secondaryKeywords: [], lsiKeywords: [], technicalTerms: [], longTailPhrases: [], questionPhrases: [] }, contentScore: 0, seoTips: [], criticalGaps: [] }; }

    log.success(200, { competitors: contents.length });
    return NextResponse.json({ perCompetitor, combined });
  } catch (error) {
    log.error(error);
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

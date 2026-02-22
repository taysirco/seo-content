import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini, extractJSON } from '@/lib/ai-client';
import { NLP_KEYWORDS_SYSTEM, buildNlpKeywordsPrompt, NLP_KEYWORDS_MERGE_SYSTEM, buildNlpKeywordsMergePrompt } from '@/lib/prompts/nlp-keywords';
import { validateNLPKeywords } from '@/lib/ai-response-validator';
import { deduplicateCompetitorTexts } from '@/lib/utils/dedup-text';
import { startRequestLog } from '@/lib/request-logger';

export async function POST(req: NextRequest) {
  const log = startRequestLog('/api/ai/nlp-keywords');
  try {
    const { mode, contents, keyword, results } = await req.json() as {
      mode?: 'extract' | 'merge';
      keyword?: string;
      contents?: { url: string; text: string }[];
      results?: any[];
    };

    const currentMode = mode || 'extract';

    // ==========================================
    // EXTRACT MODE: Analyze individual competitors
    // ==========================================
    if (currentMode === 'extract') {
      if (!contents || contents.length === 0) {
        return NextResponse.json({ error: 'No content to analyze' }, { status: 400 });
      }

      // PERF: Deduplicate boilerplate paragraphs across competitors
      const rawTexts = contents.map(c => c.text);
      const cleanTexts = deduplicateCompetitorTexts(rawTexts);

      const perCompetitor = await Promise.all(
        contents.map(async (c, i) => {
          const textToAnalyze = cleanTexts[i] || c.text;
          if (!textToAnalyze || textToAnalyze.trim().length < 50) {
            return validateNLPKeywords({}); // Return empty structure
          }

          try {
            const result = await callGemini({
              systemInstruction: NLP_KEYWORDS_SYSTEM,
              userPrompt: buildNlpKeywordsPrompt(`URL: ${c.url}\n\n${textToAnalyze}`) + '\n\nIMPORTANT: Return ONLY a valid JSON object enclosed in ```json ... ``` markdown.',
              temperature: 0.3,
              jsonMode: false,
            });
            const parsed = JSON.parse(extractJSON(result));
            return validateNLPKeywords(parsed);
          } catch (e) {
            console.error(`Failed to analyze NLP for ${c.url}`, e);
            return validateNLPKeywords({}); // Return empty structure on failure
          }
        })
      );

      log.success(200, { mode: 'extract', competitors: contents.length });
      return NextResponse.json({ perCompetitor });
    }

    // ==========================================
    // MERGE MODE: Combine all extracted keyword results
    // ==========================================
    if (currentMode === 'merge') {
      if (!results || results.length === 0) {
        return NextResponse.json({ error: 'No results to merge' }, { status: 400 });
      }

      const mergeResult = await callGemini({
        systemInstruction: NLP_KEYWORDS_MERGE_SYSTEM,
        userPrompt: buildNlpKeywordsMergePrompt(results.map(r => JSON.stringify(r))) + '\n\nIMPORTANT: Return ONLY a valid JSON object enclosed in ```json ... ``` markdown.',
        temperature: 0.2, // Low temp for precise merging
        jsonMode: false,
      });

      let combined;
      try {
        const parsed = JSON.parse(extractJSON(mergeResult));
        combined = validateNLPKeywords(parsed);
      } catch (e) {
        console.error("Merge failed, falling back to first result", e);
        combined = validateNLPKeywords(results[0]);
      }

      log.success(200, { mode: 'merge', itemsMerged: results.length });
      return NextResponse.json({ combined });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    log.error(error);
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

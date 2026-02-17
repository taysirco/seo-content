import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { ENTITY_ANALYSIS_SYSTEM, buildEntityAnalysisPrompt } from '@/lib/prompts/entities-analysis';
import { ENTITY_MERGE_SYSTEM, buildEntityMergePrompt } from '@/lib/prompts/entities-merge';
import { ENTITY_GENERATE_SYSTEM, buildEntityGeneratePrompt } from '@/lib/prompts/entities-generate';
import { validateEntityAnalysis, validateMergedEntities, validateAIEntities } from '@/lib/ai-response-validator';
import type { EntityAnalysisResult } from '@/types/pipeline';
import { deduplicateCompetitorTexts } from '@/lib/utils/dedup-text';
// apiKeyPool used internally by callGemini for key rotation
import { startRequestLog } from '@/lib/request-logger';

const EMPTY_ANALYSIS: EntityAnalysisResult = {
  title: '', foundInContent: { people: [], organizations: [], locations: [], products: [], concepts: [], events: [], technologies: [], other: [] },
  suggestedToAdd: { people: [], organizations: [], locations: [], products: [], concepts: [], events: [], technologies: [], other: [] },
  contentScore: 0, criticalGaps: ['Analysis failed'],
};

/** Analyze a batch of 1-3 competitors in ONE AI call */
async function analyzeBatch(
  items: { url: string; text: string; index: number }[],
): Promise<EntityAnalysisResult[]> {
  const count = items.length;
  const batchPrompt = items.map((item, i) =>
    `=== COMPETITOR ${i + 1} (${item.url}) ===\n${item.text.slice(0, 4000)}`
  ).join('\n\n');

  const systemExt = count === 1
    ? ENTITY_ANALYSIS_SYSTEM
    : ENTITY_ANALYSIS_SYSTEM + `\n\nYou are analyzing ${count} competitor texts. Return a JSON object: { "results": [analysis1, analysis2${count > 2 ? ', analysis3' : ''}] } where each analysis has: title, foundInContent, suggestedToAdd, contentScore, criticalGaps.`;

  const userPrompt = count === 1
    ? buildEntityAnalysisPrompt(items[0].text)
    : `Analyze these ${count} competitors and return per-competitor entity analysis:\n\n${batchPrompt}\n\nReturn JSON: { "results": [{title, foundInContent:{people:[{name,count}],...}, suggestedToAdd:{...}, contentScore:N, criticalGaps:[...]}, ...] }`;

  try {
    const result = await callGemini({
      systemInstruction: systemExt,
      userPrompt,
      temperature: 0.3,
      maxOutputTokens: 8192,
    });
    const parsed = JSON.parse(result);

    if (count === 1) {
      return [validateEntityAnalysis(parsed)];
    }

    const rawArr = parsed.results || parsed.perCompetitor || (Array.isArray(parsed) ? parsed : [parsed]);
    const validated = rawArr.map((r: unknown) => {
      try { return validateEntityAnalysis(r as Record<string, unknown>); }
      catch { return { ...EMPTY_ANALYSIS }; }
    });
    // Pad if AI returned fewer
    while (validated.length < count) validated.push({ ...EMPTY_ANALYSIS, title: `Competitor ${validated.length + 1}` });
    return validated;
  } catch (err) {
    console.warn(`[entities] Batch of ${count} failed:`, err);
    return items.map(item => ({
      ...EMPTY_ANALYSIS,
      title: item.url.replace(/^https?:\/\//, '').split('/')[0] || `Competitor ${item.index + 1}`,
    }));
  }
}

export async function POST(req: NextRequest) {
  const log = startRequestLog('/api/ai/entities');
  try {
    const body = await req.json();
    const { mode, keyword } = body as { mode: 'competitors' | 'generate' | 'merge'; keyword: string };

    if (mode === 'generate') {
      const result = await callGemini({
        systemInstruction: ENTITY_GENERATE_SYSTEM,
        userPrompt: buildEntityGeneratePrompt(keyword),
        temperature: 0.4,
        maxOutputTokens: 4096,
      });
      const aiEntities = validateAIEntities(JSON.parse(result));
      return NextResponse.json({ aiEntities });
    }

    if (mode === 'merge') {
      const { entitySources } = body as { entitySources: string[] };
      if (!entitySources || entitySources.length === 0) {
        return NextResponse.json({ error: 'No entity data to merge' }, { status: 400 });
      }
      const mergeResult = await callGemini({
        systemInstruction: ENTITY_MERGE_SYSTEM,
        userPrompt: buildEntityMergePrompt(entitySources),
        temperature: 0.3,
        maxOutputTokens: 4096,
      });
      const merged = validateMergedEntities(JSON.parse(mergeResult));
      return NextResponse.json({ merged });
    }

    // ─── Competitors mode — parallel per-competitor calls + merge ───
    const { contents } = body as { contents: { url: string; text: string }[] };
    if (!contents || contents.length === 0) {
      return NextResponse.json({ error: 'No content to analyze' }, { status: 400 });
    }

    // PERF: Deduplicate boilerplate across competitors
    const cleanTexts = deduplicateCompetitorTexts(contents.map(c => c.text));

    // Phase 1: Batch competitors in groups of 3 — fewer AI calls, faster
    const BATCH_SIZE = 3;
    const allItems = contents.map((c, i) => ({ url: c.url, text: cleanTexts[i] || c.text, index: i }));
    const perCompetitor: EntityAnalysisResult[] = [];
    for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
      const batch = allItems.slice(i, i + BATCH_SIZE);
      const results = await analyzeBatch(batch);
      perCompetitor.push(...results);
    }

    // Phase 2: Merge successful per-competitor results in ONE call
    const entitySources = perCompetitor
      .filter((r: EntityAnalysisResult) => r.contentScore > 0 || Object.values(r.foundInContent).some((arr: unknown[]) => arr.length > 0))
      .map((r: EntityAnalysisResult) => JSON.stringify(r.foundInContent));
    let merged = null;
    if (entitySources.length > 0) {
      try {
        const mergeResult = await callGemini({
          systemInstruction: ENTITY_MERGE_SYSTEM,
          userPrompt: buildEntityMergePrompt(entitySources),
          temperature: 0.3,
          maxOutputTokens: 8192,
        });
        merged = validateMergedEntities(JSON.parse(mergeResult));
      } catch (mergeErr) {
        console.warn('[entities] Merge failed, returning perCompetitor only:', mergeErr);
      }
    }

    log.success(200, { mode, competitors: contents.length });
    return NextResponse.json({ perCompetitor, merged });
  } catch (error) {
    log.error(error);
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

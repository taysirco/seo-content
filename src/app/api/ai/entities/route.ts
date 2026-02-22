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

async function analyzeSingleCompetitor(item: { url: string; text: string; index: number }): Promise<EntityAnalysisResult> {
  const userPrompt = buildEntityAnalysisPrompt(item.text.slice(0, 4000));

  try {
    const result = await callGemini({
      systemInstruction: ENTITY_ANALYSIS_SYSTEM,
      userPrompt,
      temperature: 0.3,
      maxOutputTokens: 2048,
    });
    const parsed = JSON.parse(result);
    const validated = validateEntityAnalysis(parsed);
    validated.title = validated.title || item.url.replace(/^https?:\/\//, '').split('/')[0] || `Competitor ${item.index + 1}`;
    return validated;
  } catch (err) {
    console.warn(`[entities] Failed for competitor ${item.index + 1}:`, err);
    return {
      ...EMPTY_ANALYSIS,
      title: item.url.replace(/^https?:\/\//, '').split('/')[0] || `Competitor ${item.index + 1}`,
    };
  }
}

export async function POST(req: NextRequest) {
  const log = startRequestLog('/api/ai/entities');
  try {
    const body = await req.json();
    const { mode, keyword } = body as { mode: 'competitors' | 'generate' | 'merge' | 'extract'; keyword: string };

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

    // Phase 1: Process competitors concurrently in batches of 4
    // Using individual AI calls per competitor guarantees no dropped data and is faster
    const BATCH_SIZE = 4;
    const allItems = contents.map((c, i) => ({ url: c.url, text: cleanTexts[i] || c.text, index: i }));
    const perCompetitor: EntityAnalysisResult[] = [];

    for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
      const batch = allItems.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(item => analyzeSingleCompetitor(item)));
      perCompetitor.push(...results);

      // Slight delay between chunks if we have more to process
      if (i + BATCH_SIZE < allItems.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Phase 2: Merge successful per-competitor results in ONE call
    if (mode === 'extract') {
      log.success(200, { mode, competitors: contents.length });
      return NextResponse.json({ perCompetitor, merged: null });
    }

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

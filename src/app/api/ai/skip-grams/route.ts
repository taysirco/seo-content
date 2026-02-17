import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { SKIP_GRAMS_SYSTEM, buildSkipGramsPrompt } from '@/lib/prompts/skip-grams';
import { validateSkipGrams } from '@/lib/ai-response-validator';

export async function POST(req: NextRequest) {
  try {
    const { keyword, competitorContext } = await req.json() as { keyword: string; competitorContext?: string };

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const result = await callGemini({
      systemInstruction: SKIP_GRAMS_SYSTEM,
      userPrompt: buildSkipGramsPrompt(keyword, competitorContext),
      temperature: 0.4,
      maxOutputTokens: 4096,
    });

    const validated = validateSkipGrams(JSON.parse(result));
    return NextResponse.json(validated);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

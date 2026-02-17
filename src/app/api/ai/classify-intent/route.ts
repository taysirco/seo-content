import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { INTENT_CLASSIFIER_SYSTEM, buildIntentClassifierPrompt } from '@/lib/prompts/intent-classifier';

export async function POST(req: NextRequest) {
  try {
    const { keyword, competitors, lang } = await req.json() as {
      keyword: string;
      competitors?: { title: string; snippet: string }[];
      lang?: string;
    };

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const titles = (competitors || []).map(c => c.title);
    const snippets = (competitors || []).map(c => c.snippet);

    const result = await callGemini({
      systemInstruction: INTENT_CLASSIFIER_SYSTEM,
      userPrompt: buildIntentClassifierPrompt(keyword, titles, snippets, lang || 'en'),
      temperature: 0.2,
      maxOutputTokens: 2048,
    });

    const parsed = JSON.parse(result);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

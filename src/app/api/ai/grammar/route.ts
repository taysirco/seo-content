import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { GRAMMAR_SYSTEM, buildGrammarPrompt } from '@/lib/prompts/grammar';
import { validateGrammar } from '@/lib/ai-response-validator';

export async function POST(req: NextRequest) {
  try {
    const { keyword } = await req.json() as { keyword: string };

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const result = await callGemini({
      systemInstruction: GRAMMAR_SYSTEM,
      userPrompt: buildGrammarPrompt(keyword),
      temperature: 0.4,
    });

    const grammar = validateGrammar(JSON.parse(result));
    return NextResponse.json({ grammar });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

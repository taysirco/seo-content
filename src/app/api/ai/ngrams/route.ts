import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { NGRAM_EXTRACT_SYSTEM, buildNgramCombinedPrompt, NGRAM_GENERATE_SYSTEM, buildNgramGeneratePrompt } from '@/lib/prompts/ngrams';

export async function POST(req: NextRequest) {
  try {
    const { keyword, contents, mode } = await req.json() as { keyword: string; contents?: string[]; mode?: 'extract' | 'generate' };

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // Mode: generate — 8-category n-gram generation from keyword only
    if (mode === 'generate' || !contents || contents.length === 0) {
      const result = await callGemini({
        systemInstruction: NGRAM_GENERATE_SYSTEM,
        userPrompt: buildNgramGeneratePrompt(keyword),
        temperature: 0.6,
        maxOutputTokens: 4096,
      });
      const parsed = JSON.parse(result);
      const toArr = (k: string) => Array.isArray(parsed[k]) ? parsed[k] as string[] : [];
      return NextResponse.json({
        extracted: [],
        picked: [],
        unique: [...toArr('bigrams'), ...toArr('trigrams'), ...toArr('fourgrams')],
        generated: {
          bigrams: toArr('bigrams'),
          trigrams: toArr('trigrams'),
          fourgrams: toArr('fourgrams'),
          informational: toArr('informational'),
          commercial: toArr('commercial'),
          longtail: toArr('longtail'),
          seasonal: toArr('seasonal'),
          authority: toArr('authority'),
        },
      });
    }

    // Mode: extract — combined extract + pick + unique from competitor content
    const combinedText = contents.join('\n\n').slice(0, 15000);
    const result = await callGemini({
      systemInstruction: NGRAM_EXTRACT_SYSTEM,
      userPrompt: buildNgramCombinedPrompt(combinedText, keyword),
      temperature: 0.6,
      maxOutputTokens: 4096,
    });

    const parsed = JSON.parse(result);
    const extracted: string[] = Array.isArray(parsed.extracted) ? parsed.extracted : [];
    const picked: string[] = Array.isArray(parsed.picked) ? parsed.picked : [];
    const unique: string[] = Array.isArray(parsed.unique) ? parsed.unique : [];

    return NextResponse.json({ extracted, picked, unique });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

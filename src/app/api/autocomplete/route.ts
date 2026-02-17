import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { AUTO_SUGGEST_SYSTEM, buildAutoSuggestFilterPrompt } from '@/lib/prompts/auto-suggest';
import { getLanguageConfig } from '@/lib/language-config';
import { startRequestLog } from '@/lib/request-logger';

export async function POST(req: NextRequest) {
  const log = startRequestLog('/api/autocomplete');
  try {
    const { keyword, lang } = await req.json() as { keyword: string; lang?: string };

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    // Get language-specific letter set for autocomplete expansion
    const langConfig = getLanguageConfig(lang || 'ar');
    const letters = langConfig.autocompleteLetters;
    const hlParam = langConfig.code;

    // Base query + all language-specific letters
    const queries = [
      keyword,
      ...letters.map(letter => `${keyword} ${letter}`),
    ];

    // OPT: Fetch ALL suggestions in parallel (~3s instead of ~30s)
    const results = await Promise.allSettled(
      queries.map(async (q) => {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}&hl=${hlParam}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) && Array.isArray(data[1]) ? data[1] as string[] : [];
      })
    );
    const allSuggestions: string[] = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    const uniqueSuggestions = [...new Set(allSuggestions)].filter(s => s !== keyword);

    if (uniqueSuggestions.length === 0) {
      return NextResponse.json({ keywords: [] });
    }

    // AI filter
    const result = await callGemini({
      systemInstruction: AUTO_SUGGEST_SYSTEM,
      userPrompt: buildAutoSuggestFilterPrompt(keyword, uniqueSuggestions),
      temperature: 0.3,
      maxOutputTokens: 2048,
    });

    const parsed = JSON.parse(result);
    const keywords: string[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.keywords)
        ? parsed.keywords
        : [];
    log.success(200, { keyword, rawCount: uniqueSuggestions.length, filtered: keywords.length });
    return NextResponse.json({ keywords, rawCount: uniqueSuggestions.length });
  } catch (error) {
    log.error(error);
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

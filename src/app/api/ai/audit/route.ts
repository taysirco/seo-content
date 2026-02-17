import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { getSeoAuditorSystem, buildAuditPrompt } from '@/lib/prompts/seo-auditor';
import { getForbiddenPhrasesForLang } from '@/lib/forbidden-phrases';

export async function POST(req: NextRequest) {
  try {
    const { keyword, articleHtml, outlineHeadings, entities, activeRuleIds, lang } = await req.json() as {
      keyword: string;
      articleHtml: string;
      outlineHeadings: string[];
      entities: string[];
      activeRuleIds?: string[];
      lang?: string;
    };

    if (!keyword || !articleHtml) {
      return NextResponse.json({ error: 'Missing required data / البيانات المطلوبة غير مكتملة' }, { status: 400 });
    }

    const contentLang = lang || 'ar';
    const forbiddenPhrases = getForbiddenPhrasesForLang(contentLang);

    const result = await callGemini({
      systemInstruction: getSeoAuditorSystem(contentLang),
      userPrompt: buildAuditPrompt(keyword, articleHtml, outlineHeadings || [], entities || [], forbiddenPhrases, activeRuleIds || []),
      temperature: 0,
      maxOutputTokens: 4096,
      jsonMode: true,
    });

    // callGemini with jsonMode:true already handles JSON extraction (7 strategies)
    const audit = JSON.parse(result);
    return NextResponse.json({ audit });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

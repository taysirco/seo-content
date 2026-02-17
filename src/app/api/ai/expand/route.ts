import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { buildExpansionPrompt } from '@/lib/self-healing-engine';
import type { ExpansionTarget } from '@/lib/self-healing-engine';

/**
 * P6-4: Content Expansion API Route
 * Generates new H2/H3 sections for page-2 keywords discovered by GSC.
 * Returns HTML that can be injected into the existing article.
 */

export async function POST(req: NextRequest) {
  try {
    const { articleKeyword, target, existingArticleSnippet, lang } = await req.json() as {
      articleKeyword: string;
      target: ExpansionTarget;
      existingArticleSnippet: string;
      lang?: string;
    };

    if (!articleKeyword || !target?.keyword) {
      return NextResponse.json({ error: 'Missing required data (articleKeyword and target.keyword)' }, { status: 400 });
    }

    const prompt = buildExpansionPrompt(articleKeyword, target, existingArticleSnippet || '');

    const html = await callGemini({
      systemInstruction: `You are an expert ${lang === 'ar' ? 'Arabic' : lang === 'en' ? 'English' : lang === 'fr' ? 'French' : lang === 'es' ? 'Spanish' : lang === 'de' ? 'German' : 'multilingual'} SEO content writer. You write targeted content sections to improve keyword rankings. Output ONLY clean HTML. No markdown, no code blocks, just raw HTML tags. Write in the SAME language as the keyword.`,
      userPrompt: prompt,
      temperature: 0.7,
      jsonMode: false,
      maxOutputTokens: 4096,
    });

    // Clean up any markdown artifacts
    const cleanHtml = html
      .replace(/```html?\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    return NextResponse.json({
      html: cleanHtml,
      target,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

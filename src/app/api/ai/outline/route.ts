import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { callGemini } from '@/lib/ai-client';
import { extractHeadings } from '@/lib/content-extractor';
import { OUTLINE_MERGE_SYSTEM, buildOutlineMergePrompt } from '@/lib/prompts/outline';
import { GAP_ANALYZER_SYSTEM, buildGapAnalyzerPrompt } from '@/lib/prompts/gap-analyzer';
import type { CompetitorOutline, HeadingItem } from '@/types/pipeline';
import { validateMergedOutline } from '@/lib/ai-response-validator';
import { startRequestLog } from '@/lib/request-logger';

// F8: Parse markdown headings from Jina AI output
function parseMarkdownHeadings(markdown: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const lines = markdown.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = Math.min(match[1].length, 6) as HeadingItem['level'];
      headings.push({ level, text: match[2].trim() });
    }
  }
  return headings;
}

// F8: Try Jina AI first for heading extraction (handles JS/Cloudflare)
async function extractHeadingsViaJina(url: string): Promise<HeadingItem[] | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    let text = await res.text();
    if (!text || text.length < 200) return null;
    // P8: Strip Jina metadata block (Title:, URL:, Markdown Content:, etc.)
    text = text.replace(/^Title:.*\n/i, '').replace(/^URL Source:.*\n/i, '').replace(/^Markdown Content:.*\n/i, '').replace(/^Published Time:.*\n/i, '').replace(/^---[\s\S]*?---\n/m, '');
    const headings = parseMarkdownHeadings(text);
    return headings.length > 0 ? headings : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const log = startRequestLog('/api/ai/outline');
  try {
    const { urls, keyword, lang } = await req.json() as { urls: string[]; keyword?: string; lang?: string };

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    // Extract headings from each URL — ALL in parallel for speed
    const fetchResults = await Promise.allSettled(
      urls.map(async (url): Promise<CompetitorOutline> => {
        try {
          // F8: Try Jina first (10s timeout)
          const jinaHeadings = await extractHeadingsViaJina(url);
          if (jinaHeadings && jinaHeadings.length > 0) {
            return { url, headings: jinaHeadings };
          }
          // Fallback: direct HTML fetch + Cheerio
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml',
            },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const html = await res.text();
            return { url, headings: extractHeadings(html) };
          }
          return { url, headings: [] };
        } catch {
          return { url, headings: [] };
        }
      })
    );
    const outlines: CompetitorOutline[] = fetchResults.map(r =>
      r.status === 'fulfilled' ? r.value : { url: '', headings: [] }
    );

    const validOutlines = outlines.filter(o => o.headings.length > 0);

    if (validOutlines.length === 0) {
      return NextResponse.json({ error: 'No headings extracted from competitors' }, { status: 400 });
    }

    // Merge outlines via AI (with fallback if AI fails)
    let merged;
    try {
      const result = await callGemini({
        systemInstruction: OUTLINE_MERGE_SYSTEM,
        userPrompt: buildOutlineMergePrompt(validOutlines),
      });
      merged = validateMergedOutline(JSON.parse(result));
    } catch (mergeErr) {
      console.warn('[outline] AI merge failed, building fallback from raw headings:', mergeErr);
      // Fallback: combine all unique headings from competitors
      const seen = new Set<string>();
      const allHeadings: { level: number; text: string }[] = [];
      for (const o of validOutlines) {
        for (const h of o.headings) {
          const key = `${h.level}:${h.text.toLowerCase().trim()}`;
          if (!seen.has(key)) {
            seen.add(key);
            allHeadings.push(h);
          }
        }
      }
      merged = { title: keyword || 'Merged Outline', headings: allHeadings, summary: 'Fallback merge (AI unavailable)' };
    }

    // E2: Information Gain — Gap Analysis (when keyword available)
    let gapAnalysis = null;
    if (keyword && merged.headings.length > 0) {
      try {
        const gapResult = await callGemini({
          systemInstruction: GAP_ANALYZER_SYSTEM,
          userPrompt: buildGapAnalyzerPrompt(keyword, merged.headings, validOutlines.length, lang || 'ar'),
          temperature: 0.5,
          maxOutputTokens: 4096,
        });
        gapAnalysis = JSON.parse(gapResult);
      } catch {
        // Gap analysis is optional — don't block on failure
      }
    }

    log.success(200, { urls: urls.length, validOutlines: validOutlines.length, hasGap: !!gapAnalysis });
    return NextResponse.json({ outlines, merged, gapAnalysis });
  } catch (error) {
    log.error(error);
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

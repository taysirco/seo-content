import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { extractContent } from '@/lib/content-extractor';
import { startRequestLog } from '@/lib/request-logger';
import type { CompetitorContent } from '@/types/pipeline';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// ─── Jina AI Reader (handles JS-rendered + Cloudflare-protected sites) ───
async function fetchViaJina(url: string): Promise<{ text: string } | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    let text = await res.text();
    if (!text || text.length < 200) return null;
    // X1: Strip Jina metadata block (Title:, URL Source:, etc.)
    text = text.replace(/^Title:.*\n/i, '').replace(/^URL Source:.*\n/i, '').replace(/^Markdown Content:.*\n/i, '').replace(/^Published Time:.*\n/i, '').replace(/^---[\s\S]*?---\n/m, '').trim();
    if (text.length > 200) return { text };
    return null;
  } catch {
    return null;
  }
}

// ─── Direct fetch with Cheerio fallback ───
async function fetchWithRetry(url: string): Promise<{ html: string } | { error: string }> {
  for (let i = 0; i < USER_AGENTS.length; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENTS[i],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });

      if (res.ok) {
        // H6: Detect charset from Content-Type header for non-UTF-8 sites
        const contentType = res.headers.get('content-type') || '';
        const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
        const charset = charsetMatch?.[1]?.toLowerCase();
        let html: string;
        if (charset && charset !== 'utf-8' && charset !== 'utf8') {
          const buffer = await res.arrayBuffer();
          const decoder = new TextDecoder(charset, { fatal: false });
          html = decoder.decode(buffer);
        } else {
          html = await res.text();
        }
        return { html };
      }

      if (res.status === 403 || res.status === 429) {
        // Backoff before trying next UA
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }

      return { error: `HTTP ${res.status}` };
    } catch (err) {
      if (i === USER_AGENTS.length - 1) {
        return { error: err instanceof Error ? err.message : 'Connection failed' };
      }
    }
  }
  return { error: 'All retry attempts failed' };
}

export async function POST(req: NextRequest) {
  const log = startRequestLog('/api/extract');
  try {
    const { urls } = await req.json() as { urls: string[] };

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    // OPT: Parallel extraction — all URLs at once
    const results = await Promise.allSettled(
      urls.map(async (url): Promise<CompetitorContent> => {
        // Strategy: Try Jina AI first (handles JS/Cloudflare), fallback to Cheerio
        const jinaResult = await fetchViaJina(url);
        if (jinaResult) {
          const wordCount = jinaResult.text.split(/\s+/).filter(Boolean).length;
          return { url, text: jinaResult.text, wordCount, extractedAt: new Date().toISOString() };
        }

        // Fallback: direct fetch + Cheerio extraction
        const result = await fetchWithRetry(url);
        if ('error' in result) {
          return { url, text: `[Failed to fetch page: ${result.error}]`, wordCount: 0, extractedAt: new Date().toISOString() };
        }

        const text = extractContent(result.html);
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        return {
          url,
          text: wordCount > 10 ? text : `[Insufficient content — only ${wordCount} words]`,
          wordCount,
          extractedAt: new Date().toISOString(),
        };
      })
    );

    const contents: CompetitorContent[] = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { url: urls[i], text: '[Extraction failed]', wordCount: 0, extractedAt: new Date().toISOString() }
    );

    const successCount = contents.filter(c => c.wordCount > 10).length;
    log.success(200, { urls: urls.length, extracted: successCount });
    return NextResponse.json({ contents });
  } catch (error) {
    log.error(error);
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

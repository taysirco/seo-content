import { NextRequest, NextResponse } from 'next/server';

/**
 * G6: IndexNow Instant Indexing API
 * Sends a URL to Bing/Yandex for instant crawling.
 * IndexNow is free — no API key billing required.
 * The key is self-generated and just needs to be consistent.
 */

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || crypto.randomUUID();

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json() as { url: string };

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const host = new URL(url).hostname;
    const results: { engine: string; status: string; code?: number }[] = [];

    // IndexNow endpoints (Bing, Yandex, Seznam, Naver)
    const endpoints = [
      { engine: 'Bing', url: 'https://www.bing.com/indexnow' },
      { engine: 'Yandex', url: 'https://yandex.com/indexnow' },
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(
          `${endpoint.url}?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}&keyLocation=${encodeURIComponent(`https://${host}/${INDEXNOW_KEY}.txt`)}`,
          { method: 'GET', signal: AbortSignal.timeout(10000) }
        );
        results.push({
          engine: endpoint.engine,
          status: res.ok || res.status === 202 ? 'success' : 'failed',
          code: res.status,
        });
      } catch {
        results.push({ engine: endpoint.engine, status: 'timeout' });
      }
    }

    // Google Indexing API (requires service account — optional)
    const googleKey = process.env.GOOGLE_INDEXING_KEY;
    if (googleKey) {
      try {
        const res = await fetch(
          'https://indexing.googleapis.com/v3/urlNotifications:publish',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${googleKey}`,
            },
            body: JSON.stringify({ url, type: 'URL_UPDATED' }),
            signal: AbortSignal.timeout(10000),
          }
        );
        results.push({
          engine: 'Google',
          status: res.ok ? 'success' : 'failed',
          code: res.status,
        });
      } catch {
        results.push({ engine: 'Google', status: 'timeout' });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    return NextResponse.json({
      results,
      summary: `${successCount}/${results.length} search engines notified successfully`,
      host,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

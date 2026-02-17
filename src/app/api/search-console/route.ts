import { NextRequest, NextResponse } from 'next/server';
import { fetchPagePerformance, isGSCConfigured } from '@/lib/search-console-client';

/**
 * P6-2: Search Console API Route
 * Fetches ranking data for a specific page URL.
 * Returns all keywords, with page-2 keywords highlighted for expansion.
 */

export async function POST(req: NextRequest) {
  try {
    if (!isGSCConfigured()) {
      return NextResponse.json({
        error: 'Google Search Console not configured. Add GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL to .env.local',
        configured: false,
      }, { status: 400 });
    }

    const { pageUrl, days } = await req.json() as { pageUrl: string; days?: number };

    if (!pageUrl) {
      return NextResponse.json({ error: 'Page URL is required' }, { status: 400 });
    }

    const performance = await fetchPagePerformance(pageUrl, days || 28);

    return NextResponse.json({
      performance,
      summary: {
        totalKeywords: performance.keywords.length,
        page1Count: performance.page1Keywords.length,
        page2Count: performance.page2Keywords.length,
        avgPosition: Math.round(performance.avgPosition * 10) / 10,
        totalImpressions: performance.totalImpressions,
        expansionOpportunities: performance.page2Keywords.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

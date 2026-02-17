import { NextRequest, NextResponse } from 'next/server';
import { fetchPagePerformance, isGSCConfigured } from '@/lib/search-console-client';
import { buildHealingPlan, buildExpansionPrompt } from '@/lib/self-healing-engine';
import { callGemini } from '@/lib/ai-client';
import { apiKeyPool } from '@/lib/api-key-pool';

/**
 * P6-5: Self-Healing SEO Cron Job
 * Runs periodically (e.g. every 10 days) to:
 * 1. Fetch GSC data for monitored URLs
 * 2. Identify page-2 keywords (positions 11-20)
 * 3. Generate expansion content for each keyword
 * 4. Return the healing plan + generated HTML for manual or auto injection
 * 
 * Trigger: Vercel Cron or manual POST request
 * Auth: CRON_SECRET header for security
 */

export async function POST(req: NextRequest) {
  try {
    // Security: verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-reset daily API key exhaustion flags on cron trigger
    apiKeyPool.resetDailyExhaustion();

    if (!isGSCConfigured()) {
      return NextResponse.json({
        error: 'GSC not configured',
        configured: false,
      }, { status: 400 });
    }

    const { urls, articleKeyword, existingHeadings, existingArticleSnippet } = await req.json() as {
      urls: string[];
      articleKeyword: string;
      existingHeadings?: string[];
      existingArticleSnippet?: string;
    };

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'No pages to monitor' }, { status: 400 });
    }

    const results = [];

    for (const url of urls.slice(0, 5)) {
      try {
        // Step 1: Fetch GSC performance data
        const performance = await fetchPagePerformance(url, 28);

        // Step 2: Build healing plan
        const plan = buildHealingPlan(url, performance.page2Keywords, existingHeadings || []);

        // Step 3: Generate expansion content for top 3 targets
        const expansions = [];
        for (const target of plan.expansionTargets.slice(0, 3)) {
          try {
            const prompt = buildExpansionPrompt(
              articleKeyword || '',
              target,
              existingArticleSnippet || '',
            );

            const html = await callGemini({
              systemInstruction: 'You are an expert SEO content writer. Output ONLY clean HTML. Write in the SAME language as the keyword.',
              userPrompt: prompt,
              temperature: 0.7,
              jsonMode: false,
              maxOutputTokens: 4096,
            });

            expansions.push({
              target,
              html: html.replace(/```html?\n?/gi, '').replace(/```\n?/g, '').trim(),
              generatedAt: new Date().toISOString(),
            });
          } catch {
            expansions.push({
              target,
              html: null,
              error: 'Content generation failed',
            });
          }
        }

        results.push({
          url,
          performance: {
            totalKeywords: performance.keywords.length,
            page1Count: performance.page1Keywords.length,
            page2Count: performance.page2Keywords.length,
            avgPosition: Math.round(performance.avgPosition * 10) / 10,
          },
          plan,
          expansions,
        });
      } catch (err) {
        results.push({
          url,
          error: err instanceof Error ? err.message : 'Data fetch error',
        });
      }
    }

    // W10-6: Auto-ping IndexNow for URLs that got expansion content
    const indexNowResults: { url: string; status: string }[] = [];
    for (const r of results) {
      if ('expansions' in r && Array.isArray(r.expansions) && r.expansions.some((e: { html?: string | null }) => e.html)) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
          if (baseUrl) {
            const pingRes = await fetch(`${baseUrl}/api/indexnow`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: r.url }),
            });
            indexNowResults.push({ url: r.url, status: pingRes.ok ? 'pinged' : 'failed' });
          }
        } catch {
          indexNowResults.push({ url: r.url, status: 'error' });
        }
      }
    }

    return NextResponse.json({
      executedAt: new Date().toISOString(),
      results,
      indexNowResults,
      summary: `Analyzed ${results.length} pages — ${results.filter(r => !('error' in r && !('plan' in r))).length} successful — ${indexNowResults.length} pinged`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET handler for Vercel Cron — resets daily quotas and reports status
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Always reset daily API key exhaustion on cron trigger
  apiKeyPool.resetDailyExhaustion();

  return NextResponse.json({
    status: 'ok',
    configured: isGSCConfigured(),
    dailyQuotaReset: true,
    poolSize: apiKeyPool.size,
    message: 'Daily quota reset complete. Use POST with { urls, articleKeyword } to trigger full self-healing.',
  });
}

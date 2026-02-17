import { NextRequest, NextResponse } from 'next/server';
import { friendlyError } from '@/lib/api-error';
import { buildGoogleSerpUrl } from '@/lib/serp-url-builder';
import type { Location, CompetitorResult } from '@/types/pipeline';

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export async function POST(req: NextRequest) {
  try {
    const { keyword, location, mode } = await req.json() as {
      keyword: string;
      location: Location;
      mode: 'auto' | 'manual';
    };

    if (!keyword || !location) {
      return NextResponse.json({ error: 'Keyword and location are required' }, { status: 400 });
    }

    if (mode === 'auto') {
      const serperKey = process.env.SERPER_API_KEY;
      if (!serperKey) {
        return NextResponse.json({ error: 'SERPER_API_KEY not set. Add it to .env.local' }, { status: 500 });
      }

      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: keyword,
          gl: location.country.toLowerCase(),
          hl: location.lang,
          num: 10,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.organic) {
        return NextResponse.json(
          { error: data.message || 'Failed to fetch results from Serper.dev' },
          { status: 500 }
        );
      }

      const competitors: CompetitorResult[] = (data.organic as SerperOrganicResult[])
        .slice(0, 10)
        .map((r: SerperOrganicResult, i: number) => {
          let domain = '';
          try { domain = new URL(r.link).hostname; } catch { domain = r.link; }
          return {
            position: i + 1,
            url: r.link,
            title: r.title || '',
            metaDescription: r.snippet || '',
            domain,
            selected: true,
          };
        });

      // Phase 3B: Competitor Strength Scoring — estimate domain type from URL patterns
      const competitorStrength = competitors.map((c: CompetitorResult) => {
        const d = c.domain.toLowerCase();
        let domainType = 'blog';
        if (/wikipedia|britannica|gov\.|\.gov|\.edu|\.ac\./.test(d)) domainType = 'authority';
        else if (/amazon|ebay|aliexpress|shopify|etsy|noon\.com/.test(d)) domainType = 'ecommerce';
        else if (/reddit|quora|stackexchange|stackoverflow/.test(d)) domainType = 'forum';
        else if (/bbc|cnn|aljazeera|reuters|nytimes|alarabiya|skynews/.test(d)) domainType = 'news';
        else if (/youtube|tiktok|instagram|twitter|facebook/.test(d)) domainType = 'social';
        else if (/forbes|entrepreneur|inc\.com|hubspot|moz\.com|semrush|ahrefs/.test(d)) domainType = 'authority';
        return { domain: c.domain, position: c.position, domainType, title: c.title };
      });

      // Phase 2B: Extract SERP features for content intelligence
      const serpFeatures: Record<string, unknown> = {};
      serpFeatures.competitorStrength = competitorStrength;

      // People Also Ask questions
      if (Array.isArray(data.peopleAlsoAsk)) {
        serpFeatures.peopleAlsoAsk = (data.peopleAlsoAsk as { question: string; snippet?: string }[])
          .map((p: { question: string; snippet?: string }) => ({
            question: p.question,
            snippet: p.snippet || '',
          }));
      }

      // Related Searches
      if (Array.isArray(data.relatedSearches)) {
        serpFeatures.relatedSearches = (data.relatedSearches as { query: string }[])
          .map((r: { query: string }) => r.query);
      }

      // Knowledge Graph
      if (data.knowledgeGraph) {
        const kg = data.knowledgeGraph as Record<string, unknown>;
        serpFeatures.knowledgeGraph = {
          title: kg.title || '',
          type: kg.type || '',
          description: kg.description || '',
        };
      }

      // Detect which SERP features are present
      const detectedFeatures: string[] = [];
      if (serpFeatures.peopleAlsoAsk) detectedFeatures.push('people_also_ask');
      if (serpFeatures.relatedSearches) detectedFeatures.push('related_searches');
      if (serpFeatures.knowledgeGraph) detectedFeatures.push('knowledge_panel');
      if (data.answerBox) detectedFeatures.push('featured_snippet');
      if (data.images) detectedFeatures.push('image_pack');
      if (data.videos) detectedFeatures.push('video');
      if (data.places) detectedFeatures.push('local_pack');
      serpFeatures.detected = detectedFeatures;

      return NextResponse.json({ competitors, serpFeatures });
    }

    // Manual mode: return the constructed SERP URL
    const serpUrl = buildGoogleSerpUrl(keyword, location);
    return NextResponse.json({ serpUrl });
  } catch (error) {
    return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
  }
}

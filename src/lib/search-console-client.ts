/**
 * P6-1: Google Search Console API Client
 * Fetches search performance data for monitored URLs.
 * Uses Service Account authentication (no OAuth2 user consent needed).
 * 
 * Required env vars:
 *   GSC_CLIENT_EMAIL  — Service account email
 *   GSC_PRIVATE_KEY   — Service account private key (PEM format)
 *   GSC_SITE_URL      — Property URL (e.g. https://example.com or sc-domain:example.com)
 */

interface GSCRow {
  keys: string[];   // [query] or [query, page]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCResponse {
  rows?: GSCRow[];
  responseAggregationType?: string;
}

export interface PageKeyword {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PagePerformance {
  url: string;
  keywords: PageKeyword[];
  page2Keywords: PageKeyword[];  // position 11-20 — ripe for expansion
  page1Keywords: PageKeyword[];  // position 1-10 — already ranking
  totalImpressions: number;
  avgPosition: number;
}

// ─── JWT Token Generation (no external library needed) ───

async function createJWT(clientEmail: string, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Import the private key and sign
  const keyData = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryKey = Buffer.from(keyData, 'base64');
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );

  const sig = Buffer.from(signature).toString('base64url');
  return `${unsignedToken}.${sig}`;
}

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('GSC_CLIENT_EMAIL and GSC_PRIVATE_KEY must be set in .env.local');
  }

  const jwt = await createJWT(clientEmail, privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get GSC access token: ${err}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ─── Search Console Data Fetching ───

/**
 * Fetch search performance for a specific page URL.
 * Returns all queries the page appeared for in the last N days.
 */
export async function fetchPagePerformance(
  pageUrl: string,
  days = 28,
): Promise<PagePerformance> {
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error('GSC_SITE_URL must be set in .env.local');

  const accessToken = await getAccessToken();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const body = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    dimensions: ['query'],
    dimensionFilterGroups: [{
      filters: [{
        dimension: 'page',
        operator: 'equals',
        expression: pageUrl,
      }],
    }],
    rowLimit: 500,
    startRow: 0,
  };

  const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC API error: ${err}`);
  }

  const data = await res.json() as GSCResponse;
  const rows = data.rows || [];

  const keywords: PageKeyword[] = rows.map(r => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));

  // Sort by impressions descending
  keywords.sort((a, b) => b.impressions - a.impressions);

  const page2Keywords = keywords.filter(k => k.position >= 11 && k.position <= 20);
  const page1Keywords = keywords.filter(k => k.position >= 1 && k.position <= 10);

  const totalImpressions = keywords.reduce((sum, k) => sum + k.impressions, 0);
  const avgPosition = keywords.length > 0
    ? keywords.reduce((sum, k) => sum + k.position, 0) / keywords.length
    : 0;

  return {
    url: pageUrl,
    keywords,
    page2Keywords,
    page1Keywords,
    totalImpressions,
    avgPosition,
  };
}

/**
 * Check if GSC credentials are configured.
 */
export function isGSCConfigured(): boolean {
  return !!(process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY && process.env.GSC_SITE_URL);
}

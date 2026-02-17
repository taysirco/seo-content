import { Location } from '@/types/pipeline';
import { encodeUULE } from './uule-encoder';

export function buildGoogleSerpUrl(keyword: string, location: Location): string {
  const params = new URLSearchParams({
    q: keyword,
    gl: location.country,
    hl: location.lang,
    pws: '0',
    num: '10',
    uule: encodeUULE(location.lat, location.lng),
  });

  const tld = location.googleTld || 'google.com';
  return `https://www.${tld}/search?${params.toString()}`;
}

export function buildSerpApiUrl(keyword: string, location: Location): string {
  const params = new URLSearchParams({
    engine: 'google',
    q: keyword,
    location: location.city,
    gl: location.country,
    hl: location.lang,
    num: '10',
  });

  return `https://serpapi.com/search.json?${params.toString()}`;
}

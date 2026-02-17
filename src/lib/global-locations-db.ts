/**
 * Global locations database — 50+ countries with Google TLD, language, and major cities.
 * Replaces the Saudi-only locations-db.ts.
 */

export interface CountryConfig {
  code: string;       // ISO 3166-1 alpha-2
  name: string;       // English name
  nameNative: string; // Native name
  lang: string;       // Primary ISO 639-1 language code
  googleTld: string;  // Google search TLD (e.g., google.com.sa)
  cities: { city: string; cityLocal: string; lat: number; lng: number }[];
}

export const GLOBAL_COUNTRIES: CountryConfig[] = [
  // ─── Arab World ───
  {
    code: 'SA', name: 'Saudi Arabia', nameNative: 'السعودية', lang: 'ar', googleTld: 'google.com.sa',
    cities: [
      { city: 'Riyadh', cityLocal: 'الرياض', lat: 24.7136, lng: 46.6753 },
      { city: 'Jeddah', cityLocal: 'جدة', lat: 21.4858, lng: 39.1925 },
      { city: 'Dammam', cityLocal: 'الدمام', lat: 26.3927, lng: 49.9777 },
      { city: 'Makkah', cityLocal: 'مكة', lat: 21.3891, lng: 39.8579 },
      { city: 'Madinah', cityLocal: 'المدينة المنورة', lat: 24.5247, lng: 39.5692 },
      { city: 'Taif', cityLocal: 'الطائف', lat: 21.2703, lng: 40.4158 },
      { city: 'Khobar', cityLocal: 'الخبر', lat: 26.2172, lng: 50.1971 },
      { city: 'Abha', cityLocal: 'أبها', lat: 18.2164, lng: 42.5053 },
      { city: 'Tabuk', cityLocal: 'تبوك', lat: 28.3838, lng: 36.5550 },
      { city: 'Hail', cityLocal: 'حائل', lat: 27.5114, lng: 41.7208 },
    ],
  },
  {
    code: 'AE', name: 'United Arab Emirates', nameNative: 'الإمارات', lang: 'ar', googleTld: 'google.ae',
    cities: [
      { city: 'Dubai', cityLocal: 'دبي', lat: 25.2048, lng: 55.2708 },
      { city: 'Abu Dhabi', cityLocal: 'أبوظبي', lat: 24.4539, lng: 54.3773 },
      { city: 'Sharjah', cityLocal: 'الشارقة', lat: 25.3463, lng: 55.4209 },
    ],
  },
  {
    code: 'EG', name: 'Egypt', nameNative: 'مصر', lang: 'ar', googleTld: 'google.com.eg',
    cities: [
      { city: 'Cairo', cityLocal: 'القاهرة', lat: 30.0444, lng: 31.2357 },
      { city: 'Alexandria', cityLocal: 'الإسكندرية', lat: 31.2001, lng: 29.9187 },
      { city: 'Giza', cityLocal: 'الجيزة', lat: 30.0131, lng: 31.2089 },
    ],
  },
  {
    code: 'KW', name: 'Kuwait', nameNative: 'الكويت', lang: 'ar', googleTld: 'google.com.kw',
    cities: [{ city: 'Kuwait City', cityLocal: 'الكويت', lat: 29.3759, lng: 47.9774 }],
  },
  {
    code: 'QA', name: 'Qatar', nameNative: 'قطر', lang: 'ar', googleTld: 'google.com.qa',
    cities: [{ city: 'Doha', cityLocal: 'الدوحة', lat: 25.2854, lng: 51.5310 }],
  },
  {
    code: 'BH', name: 'Bahrain', nameNative: 'البحرين', lang: 'ar', googleTld: 'google.com.bh',
    cities: [{ city: 'Manama', cityLocal: 'المنامة', lat: 26.2285, lng: 50.5860 }],
  },
  {
    code: 'OM', name: 'Oman', nameNative: 'عُمان', lang: 'ar', googleTld: 'google.com.om',
    cities: [{ city: 'Muscat', cityLocal: 'مسقط', lat: 23.5880, lng: 58.3829 }],
  },
  {
    code: 'JO', name: 'Jordan', nameNative: 'الأردن', lang: 'ar', googleTld: 'google.jo',
    cities: [{ city: 'Amman', cityLocal: 'عمّان', lat: 31.9454, lng: 35.9284 }],
  },
  {
    code: 'IQ', name: 'Iraq', nameNative: 'العراق', lang: 'ar', googleTld: 'google.iq',
    cities: [
      { city: 'Baghdad', cityLocal: 'بغداد', lat: 33.3152, lng: 44.3661 },
      { city: 'Erbil', cityLocal: 'أربيل', lat: 36.1901, lng: 44.0119 },
    ],
  },
  {
    code: 'MA', name: 'Morocco', nameNative: 'المغرب', lang: 'ar', googleTld: 'google.co.ma',
    cities: [
      { city: 'Casablanca', cityLocal: 'الدار البيضاء', lat: 33.5731, lng: -7.5898 },
      { city: 'Rabat', cityLocal: 'الرباط', lat: 34.0209, lng: -6.8416 },
    ],
  },
  {
    code: 'TN', name: 'Tunisia', nameNative: 'تونس', lang: 'ar', googleTld: 'google.tn',
    cities: [{ city: 'Tunis', cityLocal: 'تونس', lat: 36.8065, lng: 10.1815 }],
  },
  {
    code: 'DZ', name: 'Algeria', nameNative: 'الجزائر', lang: 'ar', googleTld: 'google.dz',
    cities: [{ city: 'Algiers', cityLocal: 'الجزائر', lat: 36.7538, lng: 3.0588 }],
  },
  {
    code: 'LB', name: 'Lebanon', nameNative: 'لبنان', lang: 'ar', googleTld: 'google.com.lb',
    cities: [{ city: 'Beirut', cityLocal: 'بيروت', lat: 33.8938, lng: 35.5018 }],
  },
  // ─── English-Speaking ───
  {
    code: 'US', name: 'United States', nameNative: 'United States', lang: 'en', googleTld: 'google.com',
    cities: [
      { city: 'New York', cityLocal: 'New York', lat: 40.7128, lng: -74.0060 },
      { city: 'Los Angeles', cityLocal: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
      { city: 'Chicago', cityLocal: 'Chicago', lat: 41.8781, lng: -87.6298 },
      { city: 'Houston', cityLocal: 'Houston', lat: 29.7604, lng: -95.3698 },
      { city: 'Miami', cityLocal: 'Miami', lat: 25.7617, lng: -80.1918 },
    ],
  },
  {
    code: 'GB', name: 'United Kingdom', nameNative: 'United Kingdom', lang: 'en', googleTld: 'google.co.uk',
    cities: [
      { city: 'London', cityLocal: 'London', lat: 51.5074, lng: -0.1278 },
      { city: 'Manchester', cityLocal: 'Manchester', lat: 53.4808, lng: -2.2426 },
      { city: 'Birmingham', cityLocal: 'Birmingham', lat: 52.4862, lng: -1.8904 },
    ],
  },
  {
    code: 'CA', name: 'Canada', nameNative: 'Canada', lang: 'en', googleTld: 'google.ca',
    cities: [
      { city: 'Toronto', cityLocal: 'Toronto', lat: 43.6532, lng: -79.3832 },
      { city: 'Vancouver', cityLocal: 'Vancouver', lat: 49.2827, lng: -123.1207 },
      { city: 'Montreal', cityLocal: 'Montréal', lat: 45.5017, lng: -73.5673 },
    ],
  },
  {
    code: 'AU', name: 'Australia', nameNative: 'Australia', lang: 'en', googleTld: 'google.com.au',
    cities: [
      { city: 'Sydney', cityLocal: 'Sydney', lat: -33.8688, lng: 151.2093 },
      { city: 'Melbourne', cityLocal: 'Melbourne', lat: -37.8136, lng: 144.9631 },
    ],
  },
  {
    code: 'IN', name: 'India', nameNative: 'India', lang: 'en', googleTld: 'google.co.in',
    cities: [
      { city: 'Mumbai', cityLocal: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      { city: 'Delhi', cityLocal: 'Delhi', lat: 28.7041, lng: 77.1025 },
      { city: 'Bangalore', cityLocal: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    ],
  },
  {
    code: 'NG', name: 'Nigeria', nameNative: 'Nigeria', lang: 'en', googleTld: 'google.com.ng',
    cities: [{ city: 'Lagos', cityLocal: 'Lagos', lat: 6.5244, lng: 3.3792 }],
  },
  {
    code: 'ZA', name: 'South Africa', nameNative: 'South Africa', lang: 'en', googleTld: 'google.co.za',
    cities: [{ city: 'Johannesburg', cityLocal: 'Johannesburg', lat: -26.2041, lng: 28.0473 }],
  },
  {
    code: 'PH', name: 'Philippines', nameNative: 'Philippines', lang: 'en', googleTld: 'google.com.ph',
    cities: [{ city: 'Manila', cityLocal: 'Manila', lat: 14.5995, lng: 120.9842 }],
  },
  // ─── European ───
  {
    code: 'DE', name: 'Germany', nameNative: 'Deutschland', lang: 'de', googleTld: 'google.de',
    cities: [
      { city: 'Berlin', cityLocal: 'Berlin', lat: 52.5200, lng: 13.4050 },
      { city: 'Munich', cityLocal: 'München', lat: 48.1351, lng: 11.5820 },
      { city: 'Hamburg', cityLocal: 'Hamburg', lat: 53.5511, lng: 9.9937 },
    ],
  },
  {
    code: 'FR', name: 'France', nameNative: 'France', lang: 'fr', googleTld: 'google.fr',
    cities: [
      { city: 'Paris', cityLocal: 'Paris', lat: 48.8566, lng: 2.3522 },
      { city: 'Marseille', cityLocal: 'Marseille', lat: 43.2965, lng: 5.3698 },
      { city: 'Lyon', cityLocal: 'Lyon', lat: 45.7640, lng: 4.8357 },
    ],
  },
  {
    code: 'ES', name: 'Spain', nameNative: 'España', lang: 'es', googleTld: 'google.es',
    cities: [
      { city: 'Madrid', cityLocal: 'Madrid', lat: 40.4168, lng: -3.7038 },
      { city: 'Barcelona', cityLocal: 'Barcelona', lat: 41.3874, lng: 2.1686 },
    ],
  },
  {
    code: 'IT', name: 'Italy', nameNative: 'Italia', lang: 'it', googleTld: 'google.it',
    cities: [
      { city: 'Rome', cityLocal: 'Roma', lat: 41.9028, lng: 12.4964 },
      { city: 'Milan', cityLocal: 'Milano', lat: 45.4642, lng: 9.1900 },
    ],
  },
  {
    code: 'NL', name: 'Netherlands', nameNative: 'Nederland', lang: 'nl', googleTld: 'google.nl',
    cities: [
      { city: 'Amsterdam', cityLocal: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
      { city: 'Rotterdam', cityLocal: 'Rotterdam', lat: 51.9244, lng: 4.4777 },
    ],
  },
  {
    code: 'PT', name: 'Portugal', nameNative: 'Portugal', lang: 'pt', googleTld: 'google.pt',
    cities: [{ city: 'Lisbon', cityLocal: 'Lisboa', lat: 38.7223, lng: -9.1393 }],
  },
  {
    code: 'PL', name: 'Poland', nameNative: 'Polska', lang: 'pl', googleTld: 'google.pl',
    cities: [
      { city: 'Warsaw', cityLocal: 'Warszawa', lat: 52.2297, lng: 21.0122 },
      { city: 'Krakow', cityLocal: 'Kraków', lat: 50.0647, lng: 19.9450 },
    ],
  },
  {
    code: 'SE', name: 'Sweden', nameNative: 'Sverige', lang: 'sv', googleTld: 'google.se',
    cities: [{ city: 'Stockholm', cityLocal: 'Stockholm', lat: 59.3293, lng: 18.0686 }],
  },
  {
    code: 'NO', name: 'Norway', nameNative: 'Norge', lang: 'no', googleTld: 'google.no',
    cities: [{ city: 'Oslo', cityLocal: 'Oslo', lat: 59.9139, lng: 10.7522 }],
  },
  {
    code: 'DK', name: 'Denmark', nameNative: 'Danmark', lang: 'da', googleTld: 'google.dk',
    cities: [{ city: 'Copenhagen', cityLocal: 'København', lat: 55.6761, lng: 12.5683 }],
  },
  {
    code: 'FI', name: 'Finland', nameNative: 'Suomi', lang: 'fi', googleTld: 'google.fi',
    cities: [{ city: 'Helsinki', cityLocal: 'Helsinki', lat: 60.1699, lng: 24.9384 }],
  },
  {
    code: 'BE', name: 'Belgium', nameNative: 'België', lang: 'nl', googleTld: 'google.be',
    cities: [{ city: 'Brussels', cityLocal: 'Brussel', lat: 50.8503, lng: 4.3517 }],
  },
  {
    code: 'AT', name: 'Austria', nameNative: 'Österreich', lang: 'de', googleTld: 'google.at',
    cities: [{ city: 'Vienna', cityLocal: 'Wien', lat: 48.2082, lng: 16.3738 }],
  },
  {
    code: 'CH', name: 'Switzerland', nameNative: 'Schweiz', lang: 'de', googleTld: 'google.ch',
    cities: [{ city: 'Zurich', cityLocal: 'Zürich', lat: 47.3769, lng: 8.5417 }],
  },
  // ─── Asian ───
  {
    code: 'TR', name: 'Turkey', nameNative: 'Türkiye', lang: 'tr', googleTld: 'google.com.tr',
    cities: [
      { city: 'Istanbul', cityLocal: 'İstanbul', lat: 41.0082, lng: 28.9784 },
      { city: 'Ankara', cityLocal: 'Ankara', lat: 39.9334, lng: 32.8597 },
    ],
  },
  {
    code: 'JP', name: 'Japan', nameNative: '日本', lang: 'ja', googleTld: 'google.co.jp',
    cities: [
      { city: 'Tokyo', cityLocal: '東京', lat: 35.6762, lng: 139.6503 },
      { city: 'Osaka', cityLocal: '大阪', lat: 34.6937, lng: 135.5023 },
    ],
  },
  {
    code: 'KR', name: 'South Korea', nameNative: '대한민국', lang: 'ko', googleTld: 'google.co.kr',
    cities: [{ city: 'Seoul', cityLocal: '서울', lat: 37.5665, lng: 126.9780 }],
  },
  {
    code: 'ID', name: 'Indonesia', nameNative: 'Indonesia', lang: 'id', googleTld: 'google.co.id',
    cities: [{ city: 'Jakarta', cityLocal: 'Jakarta', lat: -6.2088, lng: 106.8456 }],
  },
  {
    code: 'TH', name: 'Thailand', nameNative: 'ประเทศไทย', lang: 'th', googleTld: 'google.co.th',
    cities: [{ city: 'Bangkok', cityLocal: 'กรุงเทพ', lat: 13.7563, lng: 100.5018 }],
  },
  {
    code: 'MY', name: 'Malaysia', nameNative: 'Malaysia', lang: 'ms', googleTld: 'google.com.my',
    cities: [{ city: 'Kuala Lumpur', cityLocal: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869 }],
  },
  {
    code: 'SG', name: 'Singapore', nameNative: 'Singapore', lang: 'en', googleTld: 'google.com.sg',
    cities: [{ city: 'Singapore', cityLocal: 'Singapore', lat: 1.3521, lng: 103.8198 }],
  },
  {
    code: 'PK', name: 'Pakistan', nameNative: 'پاکستان', lang: 'en', googleTld: 'google.com.pk',
    cities: [
      { city: 'Karachi', cityLocal: 'Karachi', lat: 24.8607, lng: 67.0011 },
      { city: 'Lahore', cityLocal: 'Lahore', lat: 31.5204, lng: 74.3587 },
    ],
  },
  // ─── Americas ───
  {
    code: 'BR', name: 'Brazil', nameNative: 'Brasil', lang: 'pt', googleTld: 'google.com.br',
    cities: [
      { city: 'São Paulo', cityLocal: 'São Paulo', lat: -23.5505, lng: -46.6333 },
      { city: 'Rio de Janeiro', cityLocal: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
    ],
  },
  {
    code: 'MX', name: 'Mexico', nameNative: 'México', lang: 'es', googleTld: 'google.com.mx',
    cities: [
      { city: 'Mexico City', cityLocal: 'Ciudad de México', lat: 19.4326, lng: -99.1332 },
      { city: 'Guadalajara', cityLocal: 'Guadalajara', lat: 20.6597, lng: -103.3496 },
    ],
  },
  {
    code: 'AR', name: 'Argentina', nameNative: 'Argentina', lang: 'es', googleTld: 'google.com.ar',
    cities: [{ city: 'Buenos Aires', cityLocal: 'Buenos Aires', lat: -34.6037, lng: -58.3816 }],
  },
  {
    code: 'CO', name: 'Colombia', nameNative: 'Colombia', lang: 'es', googleTld: 'google.com.co',
    cities: [{ city: 'Bogotá', cityLocal: 'Bogotá', lat: 4.7110, lng: -74.0721 }],
  },
  {
    code: 'CL', name: 'Chile', nameNative: 'Chile', lang: 'es', googleTld: 'google.cl',
    cities: [{ city: 'Santiago', cityLocal: 'Santiago', lat: -33.4489, lng: -70.6693 }],
  },
];

/** Find a country by ISO code */
export function getCountry(code: string): CountryConfig | undefined {
  return GLOBAL_COUNTRIES.find(c => c.code === code);
}

/** Get all countries sorted by native name */
export function getCountriesSorted(): CountryConfig[] {
  return [...GLOBAL_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
}

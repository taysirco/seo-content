import * as cheerio from 'cheerio';

export interface ContentMetadata {
  title: string;
  description: string;
  wordCount: number;
  language: string;
  hasStructuredData: boolean;
  publishDate: string | null;
}

const MIN_USEFUL_WORDS = 50;

const STRIP_SELECTORS = [
  'script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'iframe',
  'svg', 'form', 'button', 'input', 'select', 'textarea',
  '[class*="ad"]', '[id*="ad"]',
  '[class*="sidebar"]', '[id*="sidebar"]',
  '[class*="comment"]', '[id*="comment"]',
  '[class*="social"]', '[id*="social"]',
  '[class*="share"]', '[id*="share"]',
  '[class*="related"]', '[id*="related"]',
  '[class*="widget"]', '[id*="widget"]',
  '[class*="menu"]', '[id*="menu"]',
  '[class*="nav"]', '[id*="nav"]',
  '[class*="footer"]', '[id*="footer"]',
  '[class*="header"]', '[id*="header"]',
  '[class*="cookie"]', '[id*="cookie"]',
  '[class*="popup"]', '[id*="popup"]',
  '[class*="modal"]', '[id*="modal"]',
  '[class*="breadcrumb"]', '[id*="breadcrumb"]',
  '[class*="newsletter"]', '[id*="newsletter"]',
  '[class*="search"]', '[id*="search"]',
  '[class*="subscribe"]', '[id*="subscribe"]',
  '[class*="author-bio"]', '[class*="author-box"]',
  '[class*="tag-cloud"]', '[class*="categories"]',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '[aria-hidden="true"]',
].join(', ');

/** Clean extracted text — normalize whitespace, strip URLs, remove noise */
function cleanText(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/g, '')        // Strip URLs
    .replace(/[\t\r]+/g, ' ')                  // Normalize tabs/CR
    .replace(/ {3,}/g, '  ')                    // Collapse excessive spaces
    .replace(/\n{4,}/g, '\n\n\n')               // Max 3 consecutive newlines
    .replace(/^\s*[\|\-]{3,}\s*$/gm, '')        // Strip table/hr separators
    .trim();
}

const CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.content', '#content',
  '.article', '#article',
  '.post', '#post',
  '.entry', '#entry',
  '.post-content', '.entry-content',
  '.article-content', '.article-body',
];

export function extractContent(html: string): string {
  const $ = cheerio.load(html);
  
  $(STRIP_SELECTORS).remove();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let container: any = null;

  for (const selector of CONTENT_SELECTORS) {
    const el = $(selector);
    if (el.length > 0) {
      container = el.first();
      break;
    }
  }

  if (!container || $(container).text().trim().length < 200) {
    let maxLen = 0;
    $('div').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > maxLen) {
        maxLen = text.length;
        container = $(el);
      }
    });
  }

  if (!container || $(container).text().trim().length < 100) {
    const paragraphs: string[] = [];
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) {
        paragraphs.push(text);
      }
    });
    const result = paragraphs.join('\n\n');
    return wordCount(result) >= MIN_USEFUL_WORDS ? result : '';
  }

  const text = $(container)
    .find('p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, pre')
    .map((_, el) => {
      const tag = el.type === 'tag' ? el.tagName?.toLowerCase() : '';
      const t = $(el).text().trim();
      // Preserve heading structure for better downstream extraction
      if (tag && tag.match(/^h[1-6]$/)) return `\n## ${t}\n`;
      return t;
    })
    .get()
    .filter((t: string) => t.length > 0)
    .join('\n\n');

  const cleaned = cleanText(text || $(container).text().trim());
  // Guard: reject content that's too thin to be useful
  return wordCount(cleaned) >= MIN_USEFUL_WORDS ? cleaned : '';
}

/** Extract page metadata — title, description, language, structured data presence */
export function extractMetadata(html: string): ContentMetadata {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() || '';
  const description = $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() || '';
  const language = $('html').attr('lang')?.trim() || '';
  const hasStructuredData = $('script[type="application/ld+json"]').length > 0;
  const publishDate = $('meta[property="article:published_time"]').attr('content')?.trim() ||
    $('time[datetime]').first().attr('datetime')?.trim() || null;
  const content = extractContent(html);

  return { title, description, wordCount: wordCount(content), language, hasStructuredData, publishDate };
}

/** Count words in text (supports Latin + Arabic/CJK) */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

export interface ExtractedHeading {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

/** Extract headings with duplicate detection */
export function extractHeadings(html: string): ExtractedHeading[] {
  const $ = cheerio.load(html);
  const headings: ExtractedHeading[] = [];

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tagName = el.type === 'tag' ? el.tagName.toLowerCase() : '';
    const level = parseInt(tagName.charAt(1)) as 1 | 2 | 3 | 4 | 5 | 6;
    const text = $(el).text().trim();
    if (text.length > 0 && level >= 1 && level <= 6) {
      headings.push({ level, text });
    }
  });

  return headings;
}

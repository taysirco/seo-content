'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Code, Check, Copy } from 'lucide-react';

interface SeoMetaToolsProps {
    keyword: string;
    content: string;
    store: {
        clientMeta?: { domain?: string; clientName?: string } | null;
        step2?: { merged?: { title?: string } } | null;
    };
}

// SM-1: SEO Meta Tools Panel — TOC, Meta Description, Title, OG, Canonical
export function SeoMetaTools({ keyword, content, store }: SeoMetaToolsProps) {
    const [expanded, setExpanded] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyField = (key: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(key);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Auto-generate all SEO meta from content
    const meta = useMemo(() => {
        if (!content) return null;
        const plain = (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || ''; })();
        const domain = store.clientMeta?.domain || 'example.com';
        const clientName = store.clientMeta?.clientName || '';
        const title = store.step2?.merged?.title || keyword;

        // Meta title — under 60 chars
        const metaTitle = title.length <= 60 ? title : title.slice(0, 57) + '...';

        // Meta description — first meaningful sentence, under 160 chars
        const sentences = plain.split(/[.!?؟\n]+/).filter(s => s.trim().length > 20);
        const rawDesc = sentences[0]?.trim() || `Comprehensive guide about ${keyword}`;
        const metaDesc = rawDesc.length <= 160 ? rawDesc : rawDesc.slice(0, 157) + '...';

        // Canonical URL
        const slug = keyword.replace(/\s+/g, '-').replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '');
        const canonical = `https://${domain}/${slug}`;

        // OG Tags
        const ogTags = `<meta property="og:type" content="article" />
<meta property="og:title" content="${metaTitle}" />
<meta property="og:description" content="${metaDesc}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:site_name" content="${clientName || domain}" />
<meta property="og:locale" content="ar_SA" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${metaTitle}" />
<meta name="twitter:description" content="${metaDesc}" />`;

        // TOC from headings
        const tocRegex = /<(h[23])[^>]*>([\s\S]*?)<\/\1>/gi;
        const tocItems: { level: number; text: string; id: string }[] = [];
        let tocMatch;
        while ((tocMatch = tocRegex.exec(content)) !== null) {
            const level = parseInt(tocMatch[1][1]);
            const text = tocMatch[2].replace(/<[^>]+>/g, '').trim();
            const id = text.replace(/\s+/g, '-').replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '');
            if (text) tocItems.push({ level, text, id });
        }

        // TOC HTML
        const tocHtml = tocItems.length > 0
            ? `<nav class="toc" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem;margin:1.5rem 0;">
<h2 style="font-size:1.1rem;margin:0 0 0.75rem 0;">Table of Contents</h2>
<ol style="padding-right:1.25rem;margin:0;line-height:2;">
${tocItems.map(t => `  <li style="padding-right:${(t.level - 2) * 1.5}rem;"><a href="#${t.id}" style="color:#2563eb;text-decoration:none;">${t.text}</a></li>`).join('\n')}
</ol>
</nav>`
            : '';

        // Full head meta block
        const headMeta = `<title>${metaTitle}</title>
<meta name="description" content="${metaDesc}" />
<link rel="canonical" href="${canonical}" />
${ogTags}`;

        return { metaTitle, metaDesc, canonical, ogTags, tocItems, tocHtml, headMeta };
    }, [content, keyword, store.clientMeta, store.step2?.merged?.title]);

    if (!meta) return null;

    return (
        <div className="rounded-lg border bg-card">
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-500" />
                    SEO Meta Tools
                    <Badge variant="secondary" className="text-[9px]">{meta.tocItems.length} headings</Badge>
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t pt-3">
                    {/* Title Tag */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Title Tag ({meta.metaTitle.length}/60)</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyField('title', meta.metaTitle)}>
                                {copiedField === 'title' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                        <div className="p-2 rounded bg-muted/30 text-sm font-medium">{meta.metaTitle}</div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${meta.metaTitle.length <= 60 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min((meta.metaTitle.length / 60) * 100, 100)}%` }} />
                        </div>
                    </div>

                    {/* Meta Description */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Meta Description ({meta.metaDesc.length}/160)</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyField('desc', meta.metaDesc)}>
                                {copiedField === 'desc' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                        <div className="p-2 rounded bg-muted/30 text-xs leading-relaxed">{meta.metaDesc}</div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${meta.metaDesc.length <= 160 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min((meta.metaDesc.length / 160) * 100, 100)}%` }} />
                        </div>
                    </div>

                    {/* Google SERP Preview */}
                    <div className="rounded-lg border p-3 bg-white dark:bg-zinc-900 space-y-0.5">
                        <p className="text-[10px] text-muted-foreground mb-2 font-semibold">SERP Preview</p>
                        <p className="text-[#1a0dab] dark:text-blue-400 text-base font-medium truncate">{meta.metaTitle}</p>
                        <p className="text-green-700 dark:text-green-400 text-xs truncate" dir="ltr">{meta.canonical}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{meta.metaDesc}</p>
                    </div>

                    {/* Canonical URL */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Canonical URL</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyField('canonical', meta.canonical)}>
                                {copiedField === 'canonical' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                        <code className="block p-2 rounded bg-muted/30 text-[11px]" dir="ltr">{meta.canonical}</code>
                    </div>

                    {/* OG Tags */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Open Graph + Twitter Cards</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyField('og', meta.ogTags)}>
                                {copiedField === 'og' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                        <pre className="p-2 rounded bg-muted/30 text-[10px] leading-relaxed overflow-x-auto" dir="ltr">{meta.ogTags}</pre>
                    </div>

                    {/* Full Head Meta Block */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Full Head Block (copy & paste)</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyField('head', meta.headMeta)}>
                                {copiedField === 'head' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                        <pre className="p-2 rounded bg-muted/30 text-[10px] leading-relaxed overflow-x-auto max-h-[120px]" dir="ltr">{meta.headMeta}</pre>
                    </div>

                    {/* SM-8: Multi-Excerpt Generator */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold">Ready-to-publish Excerpts</Label>
                        {[
                            { key: 'tw', label: 'Twitter/X', max: 280, icon: '𝕏' },
                            { key: 'fb', label: 'Facebook', max: 500, icon: 'f' },
                            { key: 'email', label: 'Email Subject', max: 70, icon: '✉' },
                            { key: 'ad', label: 'Ad Copy', max: 90, icon: '📢' },
                        ].map(({ key, label, max, icon }) => {
                            const excerpt = meta.metaDesc.length <= max
                                ? meta.metaDesc
                                : meta.metaDesc.slice(0, max - 3) + '...';
                            return (
                                <div key={key} className="flex items-center gap-2 p-2 rounded bg-muted/20 border">
                                    <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">{icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-muted-foreground">{label} ({excerpt.length}/{max})</p>
                                        <p className="text-xs truncate">{excerpt}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] shrink-0" onClick={() => copyField(key, excerpt)}>
                                        {copiedField === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    {/* TOC */}
                    {meta.tocItems.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Table of Contents ({meta.tocItems.length} headings)</Label>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyField('toc', meta.tocHtml)}>
                                    {copiedField === 'toc' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    Copy HTML
                                </Button>
                            </div>
                            <div className="p-3 rounded bg-muted/20 border space-y-0.5">
                                {meta.tocItems.map((t, i) => (
                                    <div key={i} className="text-xs" style={{ paddingRight: `${(t.level - 2) * 1.25}rem` }}>
                                        <span className="text-muted-foreground">{t.level === 2 ? '●' : '○'}</span>{' '}
                                        <span className={t.level === 2 ? 'font-medium' : ''}>{t.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* W15-2: Sitemap + Robots snippet */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Sitemap XML Snippet</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyField('sitemap', `<url>\n  <loc>${meta.canonical}</loc>\n  <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  <changefreq>monthly</changefreq>\n  <priority>0.8</priority>\n</url>`)}>
                                {copiedField === 'sitemap' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                        <pre className="p-2 rounded bg-muted/30 text-[10px] leading-relaxed overflow-x-auto" dir="ltr">{`<url>\n  <loc>${meta.canonical}</loc>\n  <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  <changefreq>monthly</changefreq>\n  <priority>0.8</priority>\n</url>`}</pre>
                    </div>

                    {/* W15-3: Hreflang Tags */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Hreflang Tags</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => copyField('hreflang', `<link rel="alternate" hreflang="ar" href="${meta.canonical}" />\n<link rel="alternate" hreflang="x-default" href="${meta.canonical}" />`)}>
                                {copiedField === 'hreflang' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                        <pre className="p-2 rounded bg-muted/30 text-[10px] leading-relaxed overflow-x-auto" dir="ltr">{`<link rel="alternate" hreflang="ar" href="${meta.canonical}" />\n<link rel="alternate" hreflang="x-default" href="${meta.canonical}" />`}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Code, Copy, FileDown, Download, FileText } from 'lucide-react';

import { htmlToMarkdown, htmlToPlainText } from '@/lib/content-utils'; // Need to ensure these exist

interface ExportActionsProps {
    content: string;
    keyword: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: any;
}

export function ExportActions({ content, keyword, store }: ExportActionsProps) {
    const [copiedType, setCopiedType] = useState<string | null>(null);

    const handleCopyHTML = async () => {
        await navigator.clipboard.writeText(content);
        setCopiedType('html');
        setTimeout(() => setCopiedType(null), 2000);
    };

    const handleCopyText = async () => {
        const plainText = htmlToPlainText(content);
        await navigator.clipboard.writeText(plainText);
        setCopiedType('text');
        setTimeout(() => setCopiedType(null), 2000);
    };

    const handleCopyMarkdown = async () => {
        const md = htmlToMarkdown(content);
        await navigator.clipboard.writeText(md);
        setCopiedType('md');
        setTimeout(() => setCopiedType(null), 2000);
    };

    const getArticleSchema = () => {
        const title = store.step2?.merged?.title || keyword;
        const today = new Date().toISOString().split('T')[0];
        const entities: string[] = [];
        if (store.step4?.merged) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.values(store.step4.merged.entities).forEach(items => { (items as any[]).forEach(e => entities.push(e.name)); });
        }
        if (store.step5?.aiEntities) entities.push(...store.step5.aiEntities.entities);
        const uniqueEntities = [...new Set(entities)];

        const buildEntitySameAs = (name: string) => ({
            '@type': 'Thing', name,
            sameAs: [
                `https://ar.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, '_'))}`,
                `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, '_'))}`,
            ],
        });
        const clientName = store.clientMeta?.clientName || 'المؤلف';
        const clientDomain = store.clientMeta?.domain || '';
        const clientLogo = store.clientMeta?.logoUrl || '';

        return {
            '@context': 'https://schema.org', '@type': 'Article',
            headline: title, description: `دليل شامل عن ${keyword}`,
            datePublished: today, dateModified: today,
            inLanguage: 'ar',
            author: { '@type': 'Person', name: clientName },
            publisher: {
                '@type': 'Organization', name: clientName,
                ...(clientLogo ? { logo: { '@type': 'ImageObject', url: clientLogo } } : {}),
                ...(clientDomain ? { url: `https://${clientDomain}` } : {}),
            },
            ...(clientDomain ? { url: `https://${clientDomain}/${encodeURIComponent(keyword)}` } : {}),
            about: uniqueEntities.slice(0, 10).map(buildEntitySameAs),
            mentions: uniqueEntities.slice(10, 20).map(buildEntitySameAs),
            keywords: keyword,
        };
    };

    const handleDownloadJSONLD = () => {
        const schema = getArticleSchema();
        const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${keyword || 'article'}-schema.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadHTML = () => {
        const title = store.step2?.merged?.title || keyword;
        const articleSchema = getArticleSchema();
        const clientName = store.clientMeta?.clientName || 'المؤلف';
        const clientDomain = store.clientMeta?.domain || '';
        const clientLogo = store.clientMeta?.logoUrl || '';

        // Extract FAQ Q&A pairs
        const faqPairs: { q: string; a: string }[] = [];
        const faqRegex = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
        let faqMatch;
        while ((faqMatch = faqRegex.exec(content)) !== null) {
            const q = faqMatch[1].replace(/<[^>]+>/g, '').trim();
            const a = faqMatch[2].replace(/<[^>]+>/g, '').trim();
            if (q && a && q.includes('؟')) faqPairs.push({ q, a });
        }

        const faqSchemaBlock = faqPairs.length > 0
            ? `\n<script type="application/ld+json">\n${JSON.stringify({
                '@context': 'https://schema.org', '@type': 'FAQPage',
                mainEntity: faqPairs.map(p => ({
                    '@type': 'Question', name: p.q,
                    acceptedAnswer: { '@type': 'Answer', text: p.a },
                })),
            }, null, 2)}\n</script>`
            : '';

        // W9-2: HowTo schema
        const exportOlRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
        const exportLiRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        const exportSteps: string[] = [];
        let exportOlMatch;
        while ((exportOlMatch = exportOlRegex.exec(content)) !== null) {
            let liMatch;
            exportLiRegex.lastIndex = 0;
            while ((liMatch = exportLiRegex.exec(exportOlMatch[1])) !== null) {
                const s = liMatch[1].replace(/<[^>]+>/g, '').trim();
                if (s) exportSteps.push(s);
            }
            if (exportSteps.length >= 3) break;
        }
        const howToSchemaBlock = exportSteps.length >= 3
            ? `\n<script type="application/ld+json">\n${JSON.stringify({
                '@context': 'https://schema.org', '@type': 'HowTo',
                name: `كيفية ${keyword}`,
                step: exportSteps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text })),
            }, null, 2)}\n</script>`
            : '';

        const fullHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
:root { --primary: #2563eb; --text: #1e293b; --bg: #ffffff; --surface: #f8fafc; --border: #e2e8f0; }
body { font-family: 'IBM Plex Sans Arabic', system-ui, -apple-system, sans-serif; max-width: 850px; margin: 0 auto; padding: 2rem 1.5rem; line-height: 1.8; color: var(--text); background: var(--bg); font-size: 1.125rem; }
h1 { font-size: 2.25rem; font-weight: 800; border-bottom: 3px solid var(--primary); padding-bottom: 0.75rem; margin-bottom: 2rem; color: #0f172a; line-height: 1.3; }
h2 { font-size: 1.75rem; font-weight: 700; margin-top: 3rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; color: #0f172a; }
h3 { font-size: 1.35rem; font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; color: #1e293b; }
p { margin-bottom: 1.25rem; }
ul, ol { padding-right: 2rem; margin-bottom: 1.5rem; }
li { margin-bottom: 0.5rem; }
blockquote { border-right: 4px solid var(--primary); padding: 1rem 1.25rem; margin: 2rem 0; background: #eff6ff; border-radius: 0.5rem 0 0 0.5rem; font-style: italic; color: #1e40af; }
table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 2rem 0; border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
th, td { border-bottom: 1px solid var(--border); padding: 1rem; text-align: right; }
th { background: #f1f5f9; font-weight: 700; color: #334155; }
tr:last-child td { border-bottom: none; }
tr:nth-child(even) { background: #f8fafc; }
.quick-answer { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.75rem; padding: 1.5rem; margin: 2rem 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.quick-answer strong { color: #166534; font-size: 1.1rem; display: block; margin-bottom: 0.5rem; }
.sge-bait-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.75rem; padding: 1.5rem; margin: 2rem 0; border-right: 4px solid var(--primary); }
.sge-bait-box strong { color: #1d4ed8; font-size: 1.1rem; display: block; margin-bottom: 0.5rem; }
.mermaid-diagram { background: #fafafa; border: 1px solid var(--border); border-radius: 0.75rem; padding: 1.5rem; margin: 2rem 0; text-align: center; }
a { color: var(--primary); text-decoration: none; font-weight: 500; border-bottom: 1px solid transparent; transition: all 0.2s; }
a:hover { border-bottom-color: var(--primary); }
@media (max-width: 640px) { body { padding: 1rem; font-size: 1rem; } h1 { font-size: 1.75rem; } h2 { font-size: 1.5rem; } }
</style>
<script type="application/ld+json">
${JSON.stringify(articleSchema, null, 2)}
</script>${faqSchemaBlock}${howToSchemaBlock}
</head>
<body>
${clientName !== 'المؤلف' || clientLogo ? `<header style="display:flex;align-items:center;gap:1rem;padding:1.5rem;background:#f8fafc;border-radius:1rem;margin-bottom:2.5rem;border:1px solid #e2e8f0;">
${clientLogo ? `<img src="${clientLogo}" alt="${clientName}" style="height:56px;width:auto;border-radius:0.5rem;box-shadow:0 1px 2px rgba(0,0,0,0.1);">` : ''}
<div>
<strong style="font-size:1.25rem;color:#0f172a;display:block;margin-bottom:0.25rem;">${clientName}</strong>
${clientDomain ? `<a href="https://${clientDomain}" style="color:#64748b;font-size:0.9rem;text-decoration:none;">${clientDomain}</a>` : ''}
</div>
</header>` : ''}
<article>
${content}
</article>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>document.addEventListener('DOMContentLoaded',function(){if(document.querySelector('.mermaid')){mermaid.initialize({startOnLoad:true,theme:'default'});}});</script>
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${keyword || 'article'}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadWP = () => {
        let wpContent = content;
        // Convert headings to WP block format
        wpContent = wpContent.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, '<!-- wp:heading -->\n<h2$1>$2</h2>\n<!-- /wp:heading -->');
        wpContent = wpContent.replace(/<h3([^>]*)>([\s\S]*?)<\/h3>/gi, '<!-- wp:heading {"level":3} -->\n<h3$1>$2</h3>\n<!-- /wp:heading -->');
        // Convert paragraphs
        wpContent = wpContent.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, '<!-- wp:paragraph -->\n<p$1>$2</p>\n<!-- /wp:paragraph -->');
        // Convert lists
        wpContent = wpContent.replace(/<ul([^>]*)>([\s\S]*?)<\/ul>/gi, '<!-- wp:list -->\n<ul$1>$2</ul>\n<!-- /wp:list -->');
        wpContent = wpContent.replace(/<ol([^>]*)>([\s\S]*?)<\/ol>/gi, '<!-- wp:list {"ordered":true} -->\n<ol$1>$2</ol>\n<!-- /wp:list -->');
        // Convert blockquotes
        wpContent = wpContent.replace(/<blockquote([^>]*)>([\s\S]*?)<\/blockquote>/gi, '<!-- wp:quote -->\n<blockquote$1>$2</blockquote>\n<!-- /wp:quote -->');
        // Convert tables
        wpContent = wpContent.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, '<!-- wp:table -->\n<figure class="wp-block-table"><table$1>$2</table></figure>\n<!-- /wp:table -->');

        const blob = new Blob([wpContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${keyword || 'article'}-wordpress.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadText = () => {
        const plainText = htmlToPlainText(content);
        const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${keyword || 'article'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadMarkdown = () => {
        const md = htmlToMarkdown(content);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${keyword || 'article'}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handlePrintPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${keyword}</title><style>
body{font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;max-width:800px;margin:0 auto;padding:2rem;line-height:1.8;color:#1a1a1a}
h1{font-size:2rem;border-bottom:2px solid #e5e5e5;padding-bottom:0.5rem}
h2{font-size:1.5rem;margin-top:2rem;border-bottom:1px solid #e5e5e5;padding-bottom:0.25rem}
h3{font-size:1.25rem;margin-top:1.5rem}p{margin-bottom:1rem}
ul,ol{padding-right:1.5rem;margin-bottom:1rem}
blockquote{border-right:4px solid #3b82f6;padding:0.75rem 1rem;margin:1rem 0;background:#f0f7ff}
table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{border:1px solid #e5e5e5;padding:0.5rem;text-align:right}th{background:#f5f5f5}
.quick-answer{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1rem;margin:1rem 0}
.quick-answer strong{color:#166534}
.sge-bait-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:1rem;margin:1rem 0;border-right:4px solid #3b82f6}
.sge-bait-box strong{color:#1d4ed8}
.comparison-table th{background:#1e40af;color:white;padding:0.75rem}
.comparison-table tr:nth-child(even){background:#f9fafb}
.mermaid-diagram{background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:1rem;margin:1.5rem 0;text-align:center;font-family:monospace;white-space:pre-wrap}
.seo-meta{background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:1rem;margin:2rem 0}
@media print{body{padding:0}}</style></head><body>${content}</body></html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    return (
        <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleCopyHTML} className="gap-1 text-xs">
                {copiedType === 'html' ? <Check className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                {copiedType === 'html' ? 'تم' : 'نسخ HTML'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyText} className="gap-1 text-xs">
                {copiedType === 'text' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedType === 'text' ? 'تم' : 'نسخ نص'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="gap-1 text-xs">
                {copiedType === 'md' ? <Check className="w-3 h-3" /> : <FileDown className="w-3 h-3" />}
                {copiedType === 'md' ? 'تم' : 'Markdown'}
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="outline" size="sm" onClick={handleDownloadJSONLD} className="gap-1 text-xs">
                <Code className="w-3 h-3" />
                JSON-LD
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadHTML} className="gap-1 text-xs">
                <Download className="w-3 h-3" />
                HTML
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadMarkdown} className="gap-1 text-xs">
                <FileDown className="w-3 h-3" />
                MD
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadWP} className="gap-1 text-xs">
                <Download className="w-3 h-3" />
                WP
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadText} className="gap-1 text-xs">
                <FileText className="w-3 h-3" />
                TXT
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintPDF} className="gap-1 text-xs">
                <FileText className="w-3 h-3" />
                PDF
            </Button>
        </div>
    );
}

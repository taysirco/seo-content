'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Code, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { PipelineState } from '@/types/pipeline';

interface SchemaGeneratorProps {
    keyword: string;
    store: PipelineState;
}

// E8: Schema JSON-LD Generator Component
export function SchemaGenerator({ keyword, store }: SchemaGeneratorProps) {
    const [schema, setSchema] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const title = store.step2?.merged?.title || keyword;
            const entities: string[] = [];
            if (store.step4?.merged) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                for (const items of Object.values(store.step4.merged.entities)) {
                    for (const e of items as { name: string }[]) entities.push(e.name);
                }
            }
            if (store.step5?.aiEntities) entities.push(...store.step5.aiEntities.entities);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const questions = store.step7?.combined?.foundInContent?.questionPhrases?.map((k: { term: string }) => k.term) || [];
            const today = new Date().toISOString().split('T')[0];

            // G5: Build Article schema with sameAs Wikipedia/Wikidata links for Knowledge Graph connection
            const buildEntityWithSameAs = (name: string) => ({
                '@type': 'Thing',
                name,
                sameAs: [
                    `https://ar.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, '_'))}`,
                    `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, '_'))}`,
                ],
            });

            // W20-2: TechArticle & Speakable Schema
            const isTechnical = /how|guide|tutorial|setup|install|code|api|sdk|review|vs/i.test(keyword);

            const articleSchema = {
                '@context': 'https://schema.org',
                '@type': isTechnical ? 'TechArticle' : 'Article',
                headline: title,
                description: `Comprehensive guide about ${keyword}`,
                datePublished: today,
                dateModified: today,
                inLanguage: 'ar',
                author: { '@type': 'Person', name: 'Author' },
                publisher: {
                    '@type': 'Organization',
                    name: 'Publisher',
                    logo: { '@type': 'ImageObject', url: 'https://example.com/logo.png' }
                },
                about: [...new Set(entities)].slice(0, 10).map(buildEntityWithSameAs),
                mentions: [...new Set(entities)].slice(10, 20).map(buildEntityWithSameAs),
                keywords: keyword,
                speakable: {
                    '@type': 'SpeakableSpecification',
                    cssSelector: ['h1', 'p:first-of-type']
                },
                proficiencyLevel: isTechnical ? 'Beginner' : undefined,
            };

            // F9: Extract real FAQ answers from the generated article
            const articleHtml = store.step13?.content || '';
            const faqAnswerMap = new Map<string, string>();
            if (articleHtml) {
                // Parse H3 question + following P answer pairs
                const faqRegex = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
                let faqMatch;
                while ((faqMatch = faqRegex.exec(articleHtml)) !== null) {
                    const q = faqMatch[1].replace(/<[^>]+>/g, '').trim();
                    const a = faqMatch[2].replace(/<[^>]+>/g, '').trim();
                    if (q && a) faqAnswerMap.set(q, a);
                }
            }

            // Build FAQ schema with real answers when available
            const faqSchema = questions.length > 0 ? {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: questions.slice(0, 8).map(q => {
                    // Try to match question to an extracted answer
                    let answer = '';
                    for (const [extractedQ, extractedA] of faqAnswerMap.entries()) {
                        if (extractedQ.includes(q) || q.includes(extractedQ) || extractedQ === q) {
                            answer = extractedA;
                            break;
                        }
                    }
                    return {
                        '@type': 'Question',
                        name: q,
                        acceptedAnswer: { '@type': 'Answer', text: answer || `See the article for a detailed answer about: ${q}` },
                    };
                }),
            } : null;

            // W7-7: HowTo Schema — extract ordered steps from <ol> lists in the article
            const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
            const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
            const howToSteps: string[] = [];
            let olMatch;
            while ((olMatch = olRegex.exec(articleHtml)) !== null) {
                let liMatch;
                const olContent = olMatch[1];
                liRegex.lastIndex = 0;
                while ((liMatch = liRegex.exec(olContent)) !== null) {
                    const stepText = liMatch[1].replace(/<[^>]+>/g, '').trim();
                    if (stepText) howToSteps.push(stepText);
                }
                if (howToSteps.length >= 3) break; // Use the first meaningful <ol>
            }
            const howToSchema = howToSteps.length >= 3 ? {
                '@context': 'https://schema.org',
                '@type': 'HowTo',
                name: `How to ${keyword}`,
                step: howToSteps.map((text, i) => ({
                    '@type': 'HowToStep',
                    position: i + 1,
                    text,
                })),
            } : null;

            // W10-4: BreadcrumbList schema from H2 headings
            const h2Headings = store.step2?.merged?.headings?.filter(h => h.level === 2).map(h => h.text) || [];
            const breadcrumbSchema = h2Headings.length >= 2 ? {
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com' },
                    { '@type': 'ListItem', position: 2, name: keyword, item: `https://example.com/${encodeURIComponent(keyword)}` },
                    ...h2Headings.slice(0, 6).map((h, i) => ({
                        '@type': 'ListItem', position: i + 3, name: h,
                    })),
                ],
            } : null;

            const output = [
                `<script type="application/ld+json">\n${JSON.stringify(articleSchema, null, 2)}\n</script>`,
                faqSchema ? `\n<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script>` : '',
                howToSchema ? `\n<script type="application/ld+json">\n${JSON.stringify(howToSchema, null, 2)}\n</script>` : '',
                breadcrumbSchema ? `\n<script type="application/ld+json">\n${JSON.stringify(breadcrumbSchema, null, 2)}\n</script>` : '',
            ].join('');

            setSchema(output);
        } catch {
            toast.error('Failed to generate Schema');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Schema JSON-LD</h4>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleGenerate} disabled={loading}>
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Code className="w-3 h-3" />}
                    {schema ? 'Regenerate' : 'Generate Schema'}
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
                Article + FAQPage + HowTo Schema with entity injection in about/mentions linked to Wikipedia (Knowledge Graph)
            </p>
            {schema && (
                <div className="relative">
                    <ScrollArea className="h-[200px] rounded-md border bg-muted/30">
                        <pre className="p-3 text-[10px] leading-relaxed font-mono whitespace-pre-wrap" dir="ltr">{schema}</pre>
                    </ScrollArea>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 left-2 text-xs h-6 gap-1"
                        onClick={() => { navigator.clipboard.writeText(schema); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                </div>
            )}
        </div>
    );
}

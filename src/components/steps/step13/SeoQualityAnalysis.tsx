'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Highlighter } from 'lucide-react';

interface SeoQualityAnalysisProps {
    content: string;
    keyword: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: any;
}

const FORBIDDEN_PHRASES = [
    'في ختام', 'في الختام', 'وختاماً', 'وفي النهاية', 'مما لا شك فيه', 'الجدير بالذكر',
    'لا يخفى على أحد', 'بطبيعة الحال', 'من المعروف أن', 'كما ذكرنا سابقاً',
    'conclusion', 'in conclusion', 'finally', 'to summarize', 'needless to say',
];

export function SeoQualityAnalysis({ content, keyword, store }: SeoQualityAnalysisProps) {
    const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;

    // ─── Article Sections by H2 ───
    const articleSections = useMemo(() => {
        if (!content) return [];
        const sections: { heading: string; wordCount: number }[] = [];
        const parts = content.split(/<h2[^>]*>/gi);
        if (parts.length <= 1) return [];
        for (let i = 1; i < parts.length; i++) {
            const closingIdx = parts[i].indexOf('</h2>');
            if (closingIdx === -1) continue;
            const heading = parts[i].slice(0, closingIdx).replace(/<[^>]+>/g, '').trim();
            const bodyHtml = parts[i].slice(closingIdx + 5);
            const bodyText = bodyHtml.replace(/<[^>]+>/g, ' ').trim();
            const wc = bodyText.split(/\s+/).filter(Boolean).length;
            sections.push({ heading, wordCount: wc });
        }
        return sections;
    }, [content]);

    // ─── SEO Quality Analysis (memoized) ───
    const seoAnalysis = useMemo(() => {
        if (!content || wordCount < 50) return null;
        const plainText = (() => { const tmp = document.createElement('div'); tmp.innerHTML = content; return tmp.textContent || ''; })();

        // Keyword density
        const kw = keyword.toLowerCase();
        const kwCount = plainText.toLowerCase().split(kw).length - 1;
        const kwDensity = wordCount > 0 ? ((kwCount / wordCount) * 100) : 0;

        // Heading structure
        const h1s = (content.match(/<h1[\s>]/gi) || []).length;
        const h2s = (content.match(/<h2[\s>]/gi) || []).length;
        const h3s = (content.match(/<h3[\s>]/gi) || []).length;

        // Word count vs target
        const lengthTarget = store.step12?.config?.contentLength || 'long';
        const targetMap: Record<string, { min: number; max: number }> = {
            short: { min: 800, max: 1200 }, medium: { min: 1500, max: 2500 },
            long: { min: 3000, max: 5000 }, comprehensive: { min: 5000, max: 8000 },
        };
        const target = targetMap[lengthTarget] || targetMap.long;
        const meetsTarget = wordCount >= target.min;
        const targetPercent = Math.min((wordCount / target.min) * 100, 100);

        // Entity coverage
        let entitiesFound = 0;
        let entitiesTotal = 0;
        if (store.step4?.merged) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.values(store.step4.merged.entities).forEach(items => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (items as { name: string }[]).forEach(e => {
                    entitiesTotal++;
                    if (plainText.includes(e.name)) entitiesFound++;
                });
            });
        }

        // Paragraph count
        const paragraphs = (content.match(/<p[\s>]/gi) || []).length;

        // Outline heading coverage
        let outlineFound = 0;
        let outlineTotal = 0;
        if (store.step2?.merged) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const h2Headings = store.step2.merged.headings.filter((h: any) => h.level === 2);
            outlineTotal = h2Headings.length;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            h2Headings.forEach((h: any) => {
                if (plainText.includes(h.text) || content.includes(h.text)) outlineFound++;
            });
        }

        // N-gram coverage (respect user exclusions + include generated categories)
        let ngramsFound = 0;
        let ngramsTotal = 0;
        if (store.step6) {
            const excludedP = new Set(store.step6.excludedPicked || []);
            const excludedU = new Set(store.step6.excludedUnique || []);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pickedFiltered = (store.step6.picked || []).filter((_: any, i: number) => !excludedP.has(i));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const uniqueFiltered = (store.step6.unique || []).filter((_: any, i: number) => !excludedU.has(i));
            const gen = store.step6.generated;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const generatedPhrases = gen ? [...(gen.bigrams || []), ...(gen.trigrams || []), ...(gen.fourgrams || [])] : [];
            const allNgrams = [...pickedFiltered, ...uniqueFiltered, ...generatedPhrases];
            ngramsTotal = allNgrams.length;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            allNgrams.forEach((ng: any) => { if (plainText.includes(ng)) ngramsFound++; });
        }

        // Skip-gram coverage (respect user exclusions)
        let skipFound = 0;
        let skipTotal = 0;
        if (store.step8?.skipGrams) {
            const excludedSG = new Set(store.step8.excludedIndices || []);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filteredSG = store.step8.skipGrams.filter((_: any, i: number) => !excludedSG.has(i));
            skipTotal = filteredSG.length;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            filteredSG.forEach((sg: any) => {
                const words = sg.split(/\s+/);
                if (words.length >= 2 && words.every((w: string) => plainText.includes(w))) skipFound++;
            });
        }

        // S13b: AutoComplete keyword coverage
        let autoFound = 0;
        let autoTotal = 0;
        if (store.step9?.autoKeywords) {
            const excludedAK = new Set(store.step9.excludedIndices || []);
            const filteredAK = store.step9.autoKeywords.filter((_: string, i: number) => !excludedAK.has(i));
            autoTotal = filteredAK.length;
            filteredAK.forEach((ak: string) => { if (plainText.includes(ak)) autoFound++; });
        }

        // P6: Per-section thin content detection
        const thinSections: string[] = [];
        if (articleSections.length > 0) {
            for (const sec of articleSections) {
                if (sec.wordCount < 150) thinSections.push(sec.heading);
            }
        }

        // W8-5: Count God-Tier visual elements
        const quickAnswerCount = (content.match(/class="quick-answer"/gi) || []).length;
        const sgeBaitCount = (content.match(/class="sge-bait-box"/gi) || []).length;
        const compTableCount = (content.match(/<table[\s>]/gi) || []).length;
        const mermaidCount = (content.match(/class="mermaid"/gi) || []).length;

        // D11-1: Content stats — reading time, sentences, avg sentence length, unique words ratio
        const sentences = plainText.split(/[.!?؟。\n]+/).filter(s => s.trim().length > 5);
        const sentenceCount = sentences.length;
        const avgSentenceLength = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
        const readingTimeMin = Math.max(1, Math.round(wordCount / 200));
        const allWords = plainText.toLowerCase().split(/\s+/).filter(Boolean);
        const uniqueWordsCount = new Set(allWords).size;
        const uniqueWordsRatio = allWords.length > 0 ? Math.round((uniqueWordsCount / allWords.length) * 100) : 0;

        // D11-2: Quality gate checks — forbidden phrases found in content
        const forbiddenFound: string[] = [];
        for (const phrase of FORBIDDEN_PHRASES) {
            if (plainText.includes(phrase)) forbiddenFound.push(phrase);
        }

        // SM-4: Arabic reading level — simplified Flesch-like score
        // Based on: avg sentence length + avg word length (Arabic chars)
        const avgWordLen = allWords.length > 0 ? allWords.reduce((sum, w) => sum + w.length, 0) / allWords.length : 0;
        // Score: 100 - (avgSentLen * 1.5) - (avgWordLen * 8)  → higher = easier
        const readingScore = Math.max(0, Math.min(100, Math.round(100 - (avgSentenceLength * 1.5) - (avgWordLen * 8))));
        const readingLabel = readingScore >= 70 ? 'سهل' : readingScore >= 50 ? 'متوسط' : readingScore >= 30 ? 'متقدم' : 'أكاديمي';

        // SM-4: Content freshness — days since generation
        const generatedAt = store.step13?.generatedAt;
        const freshnessDays = generatedAt ? Math.floor((Date.now() - new Date(generatedAt).getTime()) / 86400000) : 0;
        const freshnessLabel = freshnessDays === 0 ? 'جديد' : freshnessDays <= 7 ? 'حديث' : freshnessDays <= 30 ? 'مقبول' : freshnessDays <= 90 ? 'يحتاج مراجعة' : 'قديم';

        // D11-5: Keyword distribution per section
        const kwDistribution: { heading: string; count: number; density: number }[] = [];
        if (articleSections.length > 0) {
            const parts = content.split(/<h2[^>]*>/gi);
            for (let i = 1; i < parts.length; i++) {
                const closingIdx = parts[i].indexOf('</h2>');
                if (closingIdx === -1) continue;
                const heading = parts[i].slice(0, closingIdx).replace(/<[^>]+>/g, '').trim();
                const bodyHtml = parts[i].slice(closingIdx + 5);
                const bodyText = bodyHtml.replace(/<[^>]+>/g, ' ').trim();
                const sectionWords = bodyText.split(/\s+/).filter(Boolean).length;
                const sectionKwCount = bodyText.toLowerCase().split(kw).length - 1;
                const sectionDensity = sectionWords > 0 ? +((sectionKwCount / sectionWords) * 100).toFixed(2) : 0;
                kwDistribution.push({ heading, count: sectionKwCount, density: sectionDensity });
            }
        }

        return {
            kwCount, kwDensity, h1s, h2s, h3s,
            meetsTarget, targetPercent, target,
            entitiesFound, entitiesTotal,
            paragraphs,
            outlineFound, outlineTotal,
            ngramsFound, ngramsTotal,
            skipFound, skipTotal,
            autoFound, autoTotal,
            thinSections,
            quickAnswerCount, sgeBaitCount, compTableCount, mermaidCount,
            // D11-1
            sentenceCount, avgSentenceLength, readingTimeMin, uniqueWordsRatio,
            // D11-2
            forbiddenFound,
            // D11-5
            kwDistribution,
            // SM-4
            readingScore, readingLabel, freshnessDays, freshnessLabel,
        };
    }, [content, wordCount, keyword, store.step2?.merged, store.step4?.merged, store.step6, store.step8, store.step9, store.step12?.config?.contentLength, store.step13?.generatedAt, articleSections]);

    if (!seoAnalysis) return null;

    const scores: number[] = [];
    scores.push(seoAnalysis.meetsTarget ? 100 : seoAnalysis.targetPercent);
    scores.push(seoAnalysis.kwDensity >= 0.5 && seoAnalysis.kwDensity <= 2.5 ? 100 : seoAnalysis.kwDensity > 2.5 ? 50 : 30);
    scores.push(seoAnalysis.h1s === 1 && seoAnalysis.h2s >= 3 ? 100 : seoAnalysis.h2s >= 2 ? 70 : 40);
    if (seoAnalysis.entitiesTotal > 0) scores.push(Math.round((seoAnalysis.entitiesFound / seoAnalysis.entitiesTotal) * 100));
    if (seoAnalysis.outlineTotal > 0) scores.push(Math.round((seoAnalysis.outlineFound / seoAnalysis.outlineTotal) * 100));
    if (seoAnalysis.ngramsTotal > 0) scores.push(Math.round((seoAnalysis.ngramsFound / seoAnalysis.ngramsTotal) * 100));
    if (seoAnalysis.skipTotal > 0) scores.push(Math.round((seoAnalysis.skipFound / seoAnalysis.skipTotal) * 100));
    if (seoAnalysis.autoTotal > 0) scores.push(Math.round((seoAnalysis.autoFound / seoAnalysis.autoTotal) * 100));
    const aggregate = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const gradeColor = aggregate >= 80 ? 'text-green-600 dark:text-green-400' : aggregate >= 60 ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400';
    const gradeLabel = aggregate >= 80 ? 'Excellent' : aggregate >= 60 ? 'Good' : aggregate >= 40 ? 'Fair' : 'Needs Improvement';

    return (
        <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">SEO Quality Analysis</h4>
                <div className="flex items-center gap-3">
                    <div className={`text-3xl font-bold ${gradeColor}`}>{aggregate}</div>
                    <div className="text-left">
                        <div className={`text-sm font-semibold ${gradeColor}`}>{gradeLabel}</div>
                        <div className="text-[9px] text-muted-foreground">from {scores.length} criteria</div>
                    </div>
                </div>
            </div>
            {/* W15-4: SEO Scoring Radar — visual dimension bars */}
            <div className="space-y-1.5 p-3 rounded-lg border bg-background/50">
                {[
                    { label: 'Word Count', score: seoAnalysis.meetsTarget ? 100 : seoAnalysis.targetPercent },
                    { label: 'Keyword Density', score: seoAnalysis.kwDensity >= 0.5 && seoAnalysis.kwDensity <= 2.5 ? 100 : seoAnalysis.kwDensity > 2.5 ? 50 : 30 },
                    { label: 'Heading Structure', score: seoAnalysis.h1s === 1 && seoAnalysis.h2s >= 3 ? 100 : seoAnalysis.h2s >= 2 ? 70 : 40 },
                    ...(seoAnalysis.entitiesTotal > 0 ? [{ label: 'Entity Coverage', score: Math.round((seoAnalysis.entitiesFound / seoAnalysis.entitiesTotal) * 100) }] : []),
                    ...(seoAnalysis.outlineTotal > 0 ? [{ label: 'Outline Coverage', score: Math.round((seoAnalysis.outlineFound / seoAnalysis.outlineTotal) * 100) }] : []),
                    ...(seoAnalysis.ngramsTotal > 0 ? [{ label: 'N-Grams', score: Math.round((seoAnalysis.ngramsFound / seoAnalysis.ngramsTotal) * 100) }] : []),
                    ...(seoAnalysis.skipTotal > 0 ? [{ label: 'Skip-Grams', score: Math.round((seoAnalysis.skipFound / seoAnalysis.skipTotal) * 100) }] : []),
                    ...(seoAnalysis.autoTotal > 0 ? [{ label: 'Suggestions', score: Math.round((seoAnalysis.autoFound / seoAnalysis.autoTotal) * 100) }] : []),
                    { label: 'Reading Level', score: seoAnalysis.readingScore },
                    { label: 'Vocabulary Diversity', score: Math.min(seoAnalysis.uniqueWordsRatio * 2, 100) },
                ].map((dim, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-28 text-left shrink-0">{dim.label}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${dim.score >= 80 ? 'bg-green-500' : dim.score >= 60 ? 'bg-blue-500' : dim.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${dim.score}%` }}
                            />
                        </div>
                        <span className={`text-[10px] font-bold w-8 text-left ${dim.score >= 80 ? 'text-green-600' : dim.score >= 60 ? 'text-blue-600' : dim.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{dim.score}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Word count vs target */}
                <div className="rounded-md border p-3 text-center space-y-1">
                    <div className={`text-xl font-bold ${seoAnalysis.meetsTarget ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {wordCount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        Target: {seoAnalysis.target.min.toLocaleString()}+
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${seoAnalysis.meetsTarget ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${seoAnalysis.targetPercent}%` }} />
                    </div>
                </div>
                {/* Keyword density */}
                <div className="rounded-md border p-3 text-center space-y-1">
                    <div className={`text-xl font-bold ${seoAnalysis.kwDensity >= 0.5 && seoAnalysis.kwDensity <= 2.5 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {seoAnalysis.kwDensity.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">KW Density ({seoAnalysis.kwCount}×)</div>
                    <div className="text-[9px] text-muted-foreground">Ideal: 0.5-2.5%</div>
                </div>
                {/* Heading structure */}
                <div className="rounded-md border p-3 text-center space-y-1">
                    <div className="flex items-center justify-center gap-2 text-sm font-bold">
                        <span className="text-blue-600">H1:{seoAnalysis.h1s}</span>
                        <span className="text-purple-600">H2:{seoAnalysis.h2s}</span>
                        <span className="text-orange-600">H3:{seoAnalysis.h3s}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">Heading Structure</div>
                    <div className="text-[9px] text-muted-foreground">{seoAnalysis.paragraphs} paragraphs</div>
                </div>
                {/* Entity coverage */}
                {seoAnalysis.entitiesTotal > 0 && (
                    <div className="rounded-md border p-3 text-center space-y-1">
                        <div className={`text-xl font-bold ${seoAnalysis.entitiesFound / seoAnalysis.entitiesTotal > 0.5 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                            {Math.round((seoAnalysis.entitiesFound / seoAnalysis.entitiesTotal) * 100)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">Entity Coverage</div>
                        <div className="text-[9px] text-muted-foreground">{seoAnalysis.entitiesFound}/{seoAnalysis.entitiesTotal} found</div>
                    </div>
                )}
                {/* Outline coverage */}
                {seoAnalysis.outlineTotal > 0 && (
                    <div className="rounded-md border p-3 text-center space-y-1">
                        <div className={`text-xl font-bold ${seoAnalysis.outlineFound / seoAnalysis.outlineTotal > 0.7 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                            {Math.round((seoAnalysis.outlineFound / seoAnalysis.outlineTotal) * 100)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">Outline Coverage</div>
                        <div className="text-[9px] text-muted-foreground">{seoAnalysis.outlineFound}/{seoAnalysis.outlineTotal} H2</div>
                    </div>
                )}
                {/* N-gram coverage */}
                {seoAnalysis.ngramsTotal > 0 && (
                    <div className="rounded-md border p-3 text-center space-y-1">
                        <div className={`text-xl font-bold ${seoAnalysis.ngramsFound / seoAnalysis.ngramsTotal > 0.4 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                            {Math.round((seoAnalysis.ngramsFound / seoAnalysis.ngramsTotal) * 100)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">N-Grams Coverage</div>
                        <div className="text-[9px] text-muted-foreground">{seoAnalysis.ngramsFound}/{seoAnalysis.ngramsTotal} found</div>
                    </div>
                )}
                {/* Skip-gram coverage */}
                {seoAnalysis.skipTotal > 0 && (
                    <div className="rounded-md border p-3 text-center space-y-1">
                        <div className={`text-xl font-bold ${seoAnalysis.skipFound / seoAnalysis.skipTotal > 0.3 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                            {Math.round((seoAnalysis.skipFound / seoAnalysis.skipTotal) * 100)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">Skip-Grams Coverage</div>
                        <div className="text-[9px] text-muted-foreground">{seoAnalysis.skipFound}/{seoAnalysis.skipTotal} found</div>
                    </div>
                )}
                {/* S13b: AutoComplete coverage */}
                {seoAnalysis.autoTotal > 0 && (
                    <div className="rounded-md border p-3 text-center space-y-1">
                        <div className={`text-xl font-bold ${seoAnalysis.autoFound / seoAnalysis.autoTotal > 0.3 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                            {Math.round((seoAnalysis.autoFound / seoAnalysis.autoTotal) * 100)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground">AutoComplete Coverage</div>
                        <div className="text-[9px] text-muted-foreground">{seoAnalysis.autoFound}/{seoAnalysis.autoTotal} found</div>
                    </div>
                )}
            </div>
            {/* P6: Thin sections warning */}
            {seoAnalysis.thinSections.length > 0 && (
                <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Thin sections (&lt;150 words) — regenerate:
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {seoAnalysis.thinSections.map((heading, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-700 dark:text-yellow-400">{heading}</Badge>
                        ))}
                    </div>
                </div>
            )}
            {/* W8-5: God-Tier visual elements */}
            {(seoAnalysis.quickAnswerCount > 0 || seoAnalysis.sgeBaitCount > 0 || seoAnalysis.compTableCount > 0 || seoAnalysis.mermaidCount > 0) && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {seoAnalysis.quickAnswerCount > 0 && <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-700 dark:text-green-400">AEO: {seoAnalysis.quickAnswerCount}</Badge>}
                    {seoAnalysis.sgeBaitCount > 0 && <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-700 dark:text-blue-400">SGE Bait: {seoAnalysis.sgeBaitCount}</Badge>}
                    {seoAnalysis.compTableCount > 0 && <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-700 dark:text-purple-400">Tables: {seoAnalysis.compTableCount}</Badge>}
                    {seoAnalysis.mermaidCount > 0 && <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-700 dark:text-orange-400">Mermaid: {seoAnalysis.mermaidCount}</Badge>}
                </div>
            )}

            {/* D11-1 + SM-4: Content Stats Panel */}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2 pt-2 border-t">
                <div className="rounded-md border p-2.5 text-center">
                    <div className="text-lg font-bold text-primary">{seoAnalysis.readingTimeMin}m</div>
                    <div className="text-[9px] text-muted-foreground">Reading Time</div>
                </div>
                <div className="rounded-md border p-2.5 text-center">
                    <div className="text-lg font-bold">{seoAnalysis.sentenceCount}</div>
                    <div className="text-[9px] text-muted-foreground">Sentences</div>
                </div>
                <div className="rounded-md border p-2.5 text-center">
                    <div className={`text-lg font-bold ${seoAnalysis.avgSentenceLength <= 25 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {seoAnalysis.avgSentenceLength}
                    </div>
                    <div className="text-[9px] text-muted-foreground">Words/Sentence</div>
                </div>
                <div className="rounded-md border p-2.5 text-center">
                    <div className={`text-lg font-bold ${seoAnalysis.uniqueWordsRatio >= 40 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {seoAnalysis.uniqueWordsRatio}%
                    </div>
                    <div className="text-[9px] text-muted-foreground">Vocabulary Diversity</div>
                </div>
                <div className="rounded-md border p-2.5 text-center">
                    <div className="text-lg font-bold">{seoAnalysis.paragraphs}</div>
                    <div className="text-[9px] text-muted-foreground">Paragraphs</div>
                </div>
                {/* SM-4: Reading Level */}
                <div className="rounded-md border p-2.5 text-center">
                    <div className={`text-lg font-bold ${seoAnalysis.readingScore >= 50 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {seoAnalysis.readingScore}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{seoAnalysis.readingLabel}</div>
                </div>
                {/* SM-4: Content Freshness */}
                <div className="rounded-md border p-2.5 text-center">
                    <div className={`text-lg font-bold ${seoAnalysis.freshnessDays <= 7 ? 'text-green-600 dark:text-green-400' : seoAnalysis.freshnessDays <= 30 ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {seoAnalysis.freshnessDays === 0 ? '✓' : `${seoAnalysis.freshnessDays}ي`}
                    </div>
                    <div className="text-[9px] text-muted-foreground">{seoAnalysis.freshnessLabel}</div>
                </div>
            </div>

            {/* D11-2: Quality Gate */}
            {seoAnalysis.forbiddenFound.length > 0 && (
                <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Quality Gate: {seoAnalysis.forbiddenFound.length} forbidden cliché phrases
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {seoAnalysis.forbiddenFound.map((phrase, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] border-red-500/30 text-red-700 dark:text-red-400">{phrase}</Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* D11-5: Keyword Distribution Map */}
            {seoAnalysis.kwDistribution.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                    <h5 className="text-[11px] font-semibold flex items-center gap-1">
                        <Highlighter className="w-3 h-3" />
                        Keyword Distribution by Section
                    </h5>
                    <div className="space-y-1">
                        {seoAnalysis.kwDistribution.map((sec, i) => {
                            const maxCount = Math.max(...seoAnalysis.kwDistribution.map(s => s.count), 1);
                            // const barWidth = Math.max((sec.count / maxCount) * 100, 3); // Unused calculation
                            const color = sec.density >= 0.5 && sec.density <= 3 ? 'bg-green-500' : sec.density > 3 ? 'bg-red-500' : 'bg-yellow-500';
                            return (
                                <div key={i} className="flex items-center gap-2 text-[10px]">
                                    <span className="w-[40%] truncate text-muted-foreground">{sec.heading}</span>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min((sec.count / maxCount) * 100, 100)}%` }} />
                                    </div>
                                    <span className="w-12 text-right">{sec.density}% ({sec.count})</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

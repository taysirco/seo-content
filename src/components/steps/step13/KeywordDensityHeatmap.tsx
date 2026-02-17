'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface KeywordDensityHeatmapProps {
    content: string;
    keyword: string;
}

// W19-5: Keyword Density Heatmap — per-section visual distribution
export function KeywordDensityHeatmap({ content, keyword }: KeywordDensityHeatmapProps) {
    const heatmap = useMemo(() => {
        if (!content || !keyword) return [];
        const kwLower = keyword.toLowerCase();
        const kwWords = kwLower.split(/\s+/);
        const sections: { heading: string; density: number; count: number; wc: number }[] = [];

        // Intro section (before first H2)
        const introMatch = content.match(/^([\s\S]*?)(?=<h2)/i);
        if (introMatch) {
            const text = introMatch[1].replace(/<[^>]+>/g, ' ').toLowerCase();
            const wc = text.split(/\s+/).filter(Boolean).length;
            const count = kwWords.reduce((acc, w) => acc + (text.split(w).length - 1), 0);
            sections.push({ heading: 'المقدمة', density: wc > 0 ? Math.round((count / wc) * 100 * 10) / 10 : 0, count, wc });
        }

        const sectionRegex = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
        let sm;
        while ((sm = sectionRegex.exec(content)) !== null) {
            const heading = sm[1].replace(/<[^>]+>/g, '').trim();
            const text = sm[2].replace(/<[^>]+>/g, ' ').toLowerCase();
            const wc = text.split(/\s+/).filter(Boolean).length;
            const count = kwWords.reduce((acc, w) => acc + (text.split(w).length - 1), 0);
            sections.push({ heading, density: wc > 0 ? Math.round((count / wc) * 100 * 10) / 10 : 0, count, wc });
        }

        return sections;
    }, [content, keyword]);

    if (heatmap.length === 0) return null;
    const maxDensity = Math.max(...heatmap.map(h => h.density), 1);

    return (
        <div className="rounded-lg border bg-card p-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                🔥 خريطة كثافة الكلمة المفتاحية
                <Badge variant="secondary" className="text-[9px]">&quot;{keyword}&quot;</Badge>
            </h4>
            <div className="space-y-1">
                {heatmap.map((s, i) => {
                    const heat = s.density / maxDensity;
                    const color = s.density < 0.5 ? 'bg-blue-500/20 text-blue-700' : s.density <= 2.5 ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700';
                    return (
                        <div key={i} className={`flex items-center gap-2 text-[11px] p-1.5 rounded ${color}`}>
                            <span className="w-28 truncate font-medium">{s.heading}</span>
                            <div className="flex-1 h-3 bg-muted/20 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-current opacity-40" style={{ width: `${Math.min(heat * 100, 100)}%` }} />
                            </div>
                            <span className="w-12 text-left text-[9px]">{s.density}%</span>
                            <span className="w-10 text-left text-[9px] opacity-60">×{s.count}</span>
                        </div>
                    );
                })}
            </div>
            <p className="text-[9px] text-muted-foreground">المثالي: 0.5-2.5% — أزرق = قليل جداً، أخضر = مثالي، أحمر = مبالغ</p>
        </div>
    );
}

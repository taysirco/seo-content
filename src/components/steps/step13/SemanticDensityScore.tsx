'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface SemanticDensityScoreProps {
    content: string;
    keyword: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: any;
}

// W19-1: Semantic Density Score — per-section entity & keyword coverage
export function SemanticDensityScore({ content, keyword, store }: SemanticDensityScoreProps) {
    const analysis = useMemo(() => {
        if (!content || !keyword) return null;
        const sections: { heading: string; text: string }[] = [];
        const sectionRegex = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
        let sm;
        while ((sm = sectionRegex.exec(content)) !== null) {
            sections.push({ heading: sm[1].replace(/<[^>]+>/g, '').trim(), text: sm[2].replace(/<[^>]+>/g, ' ').trim() });
        }
        if (sections.length === 0) return null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entityValues: any[] = store.step4?.merged?.entities ? Object.values(store.step4.merged.entities).flat() : [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entities: string[] = entityValues.map((e: any) => (e?.name || '').toLowerCase());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pkws: any[] = store.step7?.combined?.foundInContent?.primaryKeywords || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lkws: any[] = (store.step7?.combined?.foundInContent?.lsiKeywords || []).slice(0, 5);
        const keywords = [
            keyword.toLowerCase(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...pkws.map((k: any) => (k.term || '').toLowerCase()),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...lkws.map((k: any) => (k.term || '').toLowerCase()),
        ];

        return sections.map(s => {
            const text = s.text.toLowerCase();
            const wc = s.text.split(/\s+/).length;
            const entityHits = entities.filter(e => text.includes(e)).length;
            const kwHits = keywords.filter(k => text.includes(k)).length;
            const entityDensity = entities.length > 0 ? Math.round((entityHits / entities.length) * 100) : 0;
            const kwDensity = keywords.length > 0 ? Math.round((kwHits / keywords.length) * 100) : 0;
            const score = Math.round((entityDensity * 0.4 + kwDensity * 0.6));
            return { heading: s.heading, wc, entityHits, kwHits, entityDensity, kwDensity, score };
        });
    }, [content, keyword, store.step4, store.step7]);

    if (!analysis || analysis.length === 0) return null;
    const avgScore = Math.round(analysis.reduce((a, s) => a + s.score, 0) / analysis.length);

    return (
        <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-500" />
                    الكثافة الدلالية لكل قسم
                </h4>
                <Badge variant={avgScore >= 50 ? 'default' : 'destructive'} className="text-[9px]">متوسط: {avgScore}%</Badge>
            </div>
            <div className="space-y-1.5">
                {analysis.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="w-32 truncate font-medium">{s.heading}</span>
                        <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden relative">
                            <div className={`h-full rounded-full ${s.score >= 60 ? 'bg-green-500' : s.score >= 35 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(s.score, 100)}%` }} />
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{s.score}%</span>
                        </div>
                        <span className="w-16 text-[9px] text-muted-foreground">{s.wc} كلمة</span>
                    </div>
                ))}
            </div>
            <p className="text-[9px] text-muted-foreground">الأقسام الحمراء تحتاج مزيداً من الكيانات والكلمات المفتاحية</p>
        </div>
    );
}

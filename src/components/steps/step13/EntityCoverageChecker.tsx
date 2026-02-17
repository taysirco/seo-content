'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface EntityCoverageCheckerProps {
    content: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: any;
}

// W19-10: Entity Coverage Checker
export function EntityCoverageChecker({ content, store }: EntityCoverageCheckerProps) {
    const analysis = useMemo(() => {
        if (!content) return null;
        const plain = content.replace(/<[^>]+>/g, ' ').toLowerCase();

        // Collect planned entities
        const planned: { name: string; source: string; found: boolean }[] = [];
        if (store.step4?.merged?.entities) {
            for (const [cat, items] of Object.entries(store.step4.merged.entities)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                for (const e of items as any[]) {
                    if ((e?.relevance || 0) >= 5) {
                        planned.push({ name: e.name, source: `منافسين (${cat})`, found: plain.includes((e.name || '').toLowerCase()) });
                    }
                }
            }
        }
        if (store.step5?.aiEntities?.entities) {
            for (const e of store.step5.aiEntities.entities) {
                if (!planned.some(p => p.name.toLowerCase() === e.toLowerCase())) {
                    planned.push({ name: e, source: 'AI', found: plain.includes(e.toLowerCase()) });
                }
            }
        }

        if (planned.length === 0) return null;
        const found = planned.filter(p => p.found).length;
        const missing = planned.filter(p => !p.found);
        const coverage = Math.round((found / planned.length) * 100);

        return { planned: planned.length, found, missing, coverage };
    }, [content, store.step4, store.step5]);

    if (!analysis) return null;

    return (
        <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    🎯 تغطية الكيانات المخططة
                </h4>
                <Badge variant={analysis.coverage >= 70 ? 'default' : analysis.coverage >= 40 ? 'outline' : 'destructive'} className="text-[9px]">
                    {analysis.coverage}% ({analysis.found}/{analysis.planned})
                </Badge>
            </div>
            <div className="w-full h-3 bg-muted/30 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${analysis.coverage >= 70 ? 'bg-green-500' : analysis.coverage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${analysis.coverage}%` }} />
            </div>
            {analysis.missing.length > 0 && (
                <div>
                    <p className="text-[10px] text-muted-foreground mb-1">كيانات مفقودة (الأهم):</p>
                    <div className="flex flex-wrap gap-1">
                        {analysis.missing.slice(0, 15).map((m, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] text-red-600 border-red-500/30">{m.name}</Badge>
                        ))}
                        {analysis.missing.length > 15 && <Badge variant="outline" className="text-[9px]">+{analysis.missing.length - 15} أخرى</Badge>}
                    </div>
                </div>
            )}
        </div>
    );
}

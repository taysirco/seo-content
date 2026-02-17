'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface RedundancyDetectorProps {
    content: string;
}

// W16-6: Content Redundancy Detector
export function RedundancyDetector({ content }: RedundancyDetectorProps) {
    const issues = useMemo(() => {
        if (!content) return [];
        // Extract paragraphs
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        const paras: { text: string; words: Set<string>; index: number }[] = [];
        let pm;
        let idx = 0;
        while ((pm = pRegex.exec(content)) !== null) {
            const text = pm[1].replace(/<[^>]+>/g, '').trim();
            if (text.length < 30) { idx++; continue; }
            const words = new Set(text.toLowerCase().split(/\s+/).filter(w => w.length > 2));
            paras.push({ text, words, index: idx });
            idx++;
        }

        // Find pairs with >60% word overlap
        const redundant: { paraA: number; paraB: number; overlap: number; textA: string; textB: string }[] = [];
        for (let i = 0; i < paras.length; i++) {
            for (let j = i + 1; j < paras.length; j++) {
                const a = paras[i], b = paras[j];
                const shared = [...a.words].filter(w => b.words.has(w)).length;
                const overlapPct = Math.round((shared / Math.min(a.words.size, b.words.size)) * 100);
                if (overlapPct >= 60 && shared >= 5) {
                    redundant.push({ paraA: a.index + 1, paraB: b.index + 1, overlap: overlapPct, textA: a.text.slice(0, 80), textB: b.text.slice(0, 80) });
                }
            }
        }
        return redundant.slice(0, 5); // Show max 5
    }, [content]);

    if (issues.length === 0) return null;

    return (
        <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                Redundancy Detector
                <Badge variant="outline" className="text-[9px] text-yellow-600 border-yellow-500/30">{issues.length} potential duplicates</Badge>
            </h4>
            <div className="space-y-2">
                {issues.map((r, i) => (
                    <div key={i} className="text-[11px] p-2 rounded bg-yellow-500/5 border border-yellow-500/10 space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] shrink-0">{r.overlap}% overlap</Badge>
                            <span className="text-muted-foreground">Para {r.paraA} ↔ Para {r.paraB}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">&quot;{r.textA}...&quot;</p>
                        <p className="text-[10px] text-muted-foreground truncate">&quot;{r.textB}...&quot;</p>
                    </div>
                ))}
            </div>
            <p className="text-[9px] text-muted-foreground">Rephrase or merge similar paragraphs to reduce redundancy</p>
        </div>
    );
}

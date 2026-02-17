'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface ParagraphLengthOptimizerProps {
    content: string;
}

// W18-5: Paragraph Length Optimizer
export function ParagraphLengthOptimizer({ content }: ParagraphLengthOptimizerProps) {
    const issues = useMemo(() => {
        if (!content) return [];
        const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        const problems: { paraNum: number; words: number; type: 'long' | 'short'; text: string }[] = [];
        let pm;
        let idx = 0;
        while ((pm = pRegex.exec(content)) !== null) {
            idx++;
            const text = pm[1].replace(/<[^>]+>/g, '').trim();
            const wc = text.split(/\s+/).filter(Boolean).length;
            if (wc > 150) problems.push({ paraNum: idx, words: wc, type: 'long', text: text.slice(0, 60) });
            else if (wc < 10 && wc > 0) problems.push({ paraNum: idx, words: wc, type: 'short', text: text.slice(0, 60) });
        }
        return problems.slice(0, 8);
    }, [content]);

    if (issues.length === 0) return null;

    return (
        <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                تحسين طول الفقرات
                <Badge variant="outline" className="text-[9px]">{issues.length} فقرة تحتاج تعديل</Badge>
            </h4>
            <div className="space-y-1">
                {issues.map((p, i) => (
                    <div key={i} className={`text-[11px] p-1.5 rounded flex items-center gap-2 ${p.type === 'long' ? 'bg-orange-500/5 text-orange-600' : 'bg-blue-500/5 text-blue-600'}`}>
                        <Badge variant="outline" className="text-[8px] shrink-0">فقرة {p.paraNum}</Badge>
                        <span className="shrink-0">{p.type === 'long' ? '📏 طويلة جداً' : '📐 قصيرة جداً'} ({p.words} كلمة)</span>
                        <span className="text-[9px] text-muted-foreground truncate">&quot;{p.text}...&quot;</span>
                    </div>
                ))}
            </div>
            <p className="text-[9px] text-muted-foreground">الأفضل: 40-120 كلمة لكل فقرة لسهولة القراءة</p>
        </div>
    );
}

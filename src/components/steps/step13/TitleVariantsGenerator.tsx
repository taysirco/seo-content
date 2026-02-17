'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Check, Copy } from 'lucide-react';

interface TitleVariantsGeneratorProps {
    keyword: string;
    store: {
        step2?: { merged?: { title?: string } } | null;
    };
}

// W17-2: A/B Title Variants Generator
export function TitleVariantsGenerator({ keyword, store }: TitleVariantsGeneratorProps) {
    const [expanded, setExpanded] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    const variants = useMemo(() => {
        const base = store.step2?.merged?.title || keyword;
        const results: { title: string; type: string }[] = [
            { title: base, type: 'أصلي' },
            { title: `${keyword}: دليلك الشامل ${new Date().getFullYear()}`, type: 'دليل + سنة' },
            { title: `أفضل ${keyword} — مراجعة شاملة ومقارنة`, type: 'مراجعة' },
            { title: `${keyword}: كل ما تحتاج معرفته من الصفر`, type: 'للمبتدئين' },
            { title: `${keyword} — 10 نصائح من الخبراء`, type: 'قائمة' },
            { title: `لماذا ${keyword}؟ الإجابة الكاملة بالأرقام`, type: 'لماذا + أرقام' },
            { title: `${keyword}: الأخطاء الشائعة وكيف تتجنبها`, type: 'أخطاء' },
            { title: `هل ${keyword} يستحق؟ تحليل مفصل`, type: 'تساؤل' },
        ];
        return results;
    }, [keyword, store.step2?.merged?.title]);

    return (
        <div className="rounded-lg border bg-card">
            <button type="button" className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
                <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    مولد عناوين A/B
                    <Badge variant="secondary" className="text-[9px]">{variants.length} عنوان</Badge>
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-2 border-t pt-3">
                    {variants.map((v, i) => {
                        const len = v.title.length;
                        const ok = len <= 60;
                        return (
                            <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border bg-muted/10">
                                <Badge variant="outline" className="text-[8px] shrink-0 w-16 justify-center">{v.type}</Badge>
                                <span className="flex-1 font-medium">{v.title}</span>
                                <span className={`text-[9px] shrink-0 ${ok ? 'text-green-600' : 'text-red-500'}`}>{len}/60</span>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] shrink-0" onClick={() => { navigator.clipboard.writeText(v.title); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500); }}>
                                    {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

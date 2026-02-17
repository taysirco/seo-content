'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Highlighter, Check, Copy } from 'lucide-react';

interface CTAGeneratorProps {
    keyword: string;
    content: string;
}

// W17-3: Smart CTA Generator
export function CTAGenerator({ keyword, content }: CTAGeneratorProps) {
    const [expanded, setExpanded] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    const ctas = useMemo(() => {
        if (!content) return [];
        return [
            { text: `ابدأ الآن مع ${keyword} — احصل على استشارة مجانية`, style: 'استشارة' },
            { text: `اكتشف المزيد عن ${keyword} وحقق نتائج فورية`, style: 'اكتشاف' },
            { text: `هل أنت مستعد لـ${keyword}؟ تواصل معنا اليوم`, style: 'تواصل' },
            { text: `حمّل دليل ${keyword} المجاني الآن`, style: 'تحميل' },
            { text: `اشترك للحصول على أحدث نصائح ${keyword}`, style: 'اشتراك' },
            { text: `قارن أفضل خيارات ${keyword} — مقارنة مجانية`, style: 'مقارنة' },
        ];
    }, [keyword, content]);

    if (ctas.length === 0) return null;

    return (
        <div className="rounded-lg border bg-card">
            <button type="button" className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
                <span className="flex items-center gap-2">
                    <Highlighter className="w-4 h-4 text-green-500" />
                    مولد CTA ذكي
                    <Badge variant="secondary" className="text-[9px]">{ctas.length} نداء</Badge>
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-2 border-t pt-3">
                    {ctas.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border bg-green-500/5">
                            <Badge variant="outline" className="text-[8px] shrink-0 w-14 justify-center">{c.style}</Badge>
                            <span className="flex-1">{c.text}</span>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] shrink-0" onClick={() => { navigator.clipboard.writeText(c.text); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500); }}>
                                {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

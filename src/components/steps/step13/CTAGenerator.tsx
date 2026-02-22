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

        // Naive Intent Inference
        const kw = keyword.toLowerCase();
        const contentPlain = content.toLowerCase();

        let type = 'informational';
        if (/(سعر|شراء|للبيع|خصم|رخيص|متجر)/i.test(kw) || /(سعر|شراء|للبيع|خصم|رخيص|متجر)/i.test(contentPlain.slice(0, 500))) {
            type = 'commercial';
        } else if (/(مراجعة|تقييم|أفضل|مقارنة|عيوب|مميزات)/i.test(kw) || /(مراجعة|تقييم|أفضل|مقارنة)/i.test(contentPlain.slice(0, 500))) {
            type = 'evaluative';
        }

        if (type === 'commercial') {
            return [
                { text: `🛒 اطلب ${keyword} الآن واحصل على عرضك الخاص!`, style: 'شراء' },
                { text: `💰 تحقق من أحدث سعر لـ ${keyword} قبل نفاد الكمية`, style: 'سعر' },
                { text: `🔥 وفر اليوم: احصل على خصم عند صيانة/شراء ${keyword}`, style: 'عروض' },
                { text: `📞 للطلب الفوري لخدمات ${keyword}، تواصل معنا`, style: 'اتصال' },
            ];
        } else if (type === 'evaluative') {
            return [
                { text: `⚖️ هل لا زلت محتاراً؟ اقرأ مراجعتنا الشاملة حول ${keyword}`, style: 'مراجعة' },
                { text: `🏆 قارن ${keyword} مع البدائل واختر الأفضل لك`, style: 'مقارنة' },
                { text: `💡 تعرف على العيوب القاتلة لـ ${keyword} قبل الشراء`, style: 'عيوب' },
                { text: `💬 شاركنا رأيك: هل جربت ${keyword} من قبل؟`, style: 'تفاعل' },
            ];
        } else {
            // General / Informational
            return [
                { text: `🚀 ابدأ الآن مع ${keyword} — احصل على استشارة مجانية`, style: 'استشارة' },
                { text: `📖 اكتشف الدليل الشامل عن ${keyword} وحقق نتائج فورية`, style: 'اكتشاف' },
                { text: `📩 اشترك في نشرتنا للحصول على أحدث نصائح ${keyword}`, style: 'اشتراك' },
                { text: `❓ هل لديك استفسار حول ${keyword}؟ تواصل مع خبرائنا`, style: 'تواصل' },
            ];
        }
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

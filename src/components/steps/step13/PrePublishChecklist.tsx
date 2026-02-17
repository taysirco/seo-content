'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle } from 'lucide-react';

interface PrePublishChecklistProps {
    content: string;
    keyword: string;
    store: {
        step2?: { merged?: { title?: string } } | null;
        step13?: { generatedAt?: string } | null;
        clientMeta?: { domain?: string } | null;
    };
}

// W17-1: Pre-Publish SEO Checklist
export function PrePublishChecklist({ content, keyword, store }: PrePublishChecklistProps) {
    const [expanded, setExpanded] = useState(false);

    const checks = useMemo(() => {
        if (!content) return [];
        const plain = (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || ''; })();
        const wc = plain.split(/\s+/).filter(Boolean).length;
        const items: { id: string; label: string; pass: boolean; tip: string; category: string }[] = [];

        // Content
        items.push({ id: 'wc', label: 'عدد الكلمات ≥ 1500', pass: wc >= 1500, tip: `الحالي: ${wc}`, category: 'محتوى' });
        items.push({ id: 'h1', label: 'H1 واحد فقط', pass: (content.match(/<h1[\s>]/gi) || []).length === 1, tip: 'يجب أن يكون هناك عنوان H1 واحد فقط', category: 'محتوى' });
        items.push({ id: 'h2', label: 'H2 ≥ 3 عناوين', pass: (content.match(/<h2[\s>]/gi) || []).length >= 3, tip: 'أضف المزيد من الأقسام', category: 'محتوى' });
        items.push({ id: 'imgs', label: 'صور مع alt text', pass: !/<img(?![^>]*alt=)[^>]*>/i.test(content), tip: 'أضف alt وصفي لكل صورة', category: 'محتوى' });
        items.push({ id: 'links', label: 'روابط داخلية/خارجية', pass: /<a[^>]*href/i.test(content), tip: 'أضف روابط لمصادر موثوقة', category: 'محتوى' });
        items.push({ id: 'lists', label: 'قوائم منقطة/مرقمة', pass: /<[uo]l[\s>]/i.test(content), tip: 'أضف قوائم لسهولة القراءة', category: 'محتوى' });

        // Keyword
        const kwLower = keyword.toLowerCase();
        const kwCount = (plain.toLowerCase().match(new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        const density = wc > 0 ? (kwCount / wc) * 100 : 0;
        items.push({ id: 'kw-h1', label: 'الكلمة المفتاحية في H1', pass: /<h1[^>]*>[^<]*/.test(content) && content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.toLowerCase().includes(kwLower) || false, tip: 'ضع الكلمة المفتاحية في العنوان الرئيسي', category: 'كلمة مفتاحية' });
        items.push({ id: 'kw-density', label: 'كثافة 0.5-2.5%', pass: density >= 0.5 && density <= 2.5, tip: `الحالي: ${density.toFixed(1)}%`, category: 'كلمة مفتاحية' });
        items.push({ id: 'kw-first', label: 'الكلمة في أول 100 كلمة', pass: plain.split(/\s+/).slice(0, 100).join(' ').toLowerCase().includes(kwLower), tip: 'اذكر الكلمة المفتاحية مبكراً', category: 'كلمة مفتاحية' });

        // Technical
        items.push({ id: 'schema', label: 'Schema JSON-LD', pass: /application\/ld\+json/i.test(content), tip: 'أضف Schema markup', category: 'تقني' });
        items.push({ id: 'faq', label: 'أسئلة شائعة (FAQ)', pass: /أسئلة شائعة|FAQ/i.test(plain) || (content.match(/<h3/gi) || []).length >= 2, tip: 'أضف قسم أسئلة شائعة', category: 'تقني' });
        items.push({ id: 'meta', label: 'عنوان Meta ≤ 60 حرف', pass: (store.step2?.merged?.title || keyword).length <= 60, tip: 'اختصر العنوان', category: 'تقني' });

        return items;
    }, [content, keyword, store.step2?.merged?.title]);

    if (checks.length === 0) return null;
    const passed = checks.filter(c => c.pass).length;
    const total = checks.length;
    const pct = Math.round((passed / total) * 100);
    const ready = pct >= 80;

    return (
        <div className={`rounded-lg border ${ready ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
            <button type="button" className="w-full flex items-center justify-between p-4 text-sm font-semibold" onClick={() => setExpanded(!expanded)}>
                <span className="flex items-center gap-2">
                    {ready ? <Check className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    قائمة التحقق قبل النشر
                    <Badge variant={ready ? 'default' : 'destructive'} className="text-[9px]">{passed}/{total} ({pct}%)</Badge>
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    {['محتوى', 'كلمة مفتاحية', 'تقني'].map(cat => (
                        <div key={cat} className="space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground">{cat}</p>
                            {checks.filter(c => c.category === cat).map(c => (
                                <div key={c.id} className={`flex items-center gap-2 text-[11px] p-1.5 rounded ${c.pass ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                                    <span>{c.pass ? '✅' : '❌'}</span>
                                    <span className="flex-1">{c.label}</span>
                                    <span className="text-[9px] text-muted-foreground">{c.tip}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

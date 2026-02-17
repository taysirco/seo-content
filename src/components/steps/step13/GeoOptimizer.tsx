'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface GeoOptimizerProps {
    content: string;
    keyword: string;
}

// W20-1: Generative Engine Optimization (GEO) Component
// Replaces and expands upon FeaturedSnippetOptimizer
export function GeoOptimizer({ content, keyword }: GeoOptimizerProps) {
    const opportunities = useMemo(() => {
        if (!content) return [];
        const ops: { type: string; heading: string; status: 'found' | 'missing'; tip: string; score: number }[] = [];

        // Helper: Count words
        const countWords = (html: string) => html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;

        // 1. Direct Answer Optimization (Definition/What is)
        // Look for H2s followed immediately by a <p> that starts with the keyword or subject
        const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
        let hm;
        while ((hm = h2Regex.exec(content)) !== null) {
            const heading = hm[1].replace(/<[^>]+>/g, '').trim();
            const body = hm[2];
            const headingLower = heading.toLowerCase();

            // Definition/Direct Answer Target
            if (/ma (hiya|huwa)|what is|definition|meaning|تعريف|ما هو|ما هي/i.test(heading)) {
                const firstP = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
                if (firstP) {
                    const text = firstP[1].replace(/<[^>]+>/g, '').trim();
                    const wc = countWords(text);
                    const isDirect = text.length > 10 && (text.startsWith(keyword) || text.includes('هو') || text.includes('هي') || text.includes('is a'));

                    ops.push({
                        type: 'إجابة مباشرة (SGE)',
                        heading,
                        status: (wc >= 30 && wc <= 60 && isDirect) ? 'found' : 'missing',
                        score: (wc >= 30 && wc <= 60 && isDirect) ? 10 : 0,
                        tip: wc < 30 ? 'الإجابة قصيرة جداً للذكاء الاصطناعي. اجعلها 40-60 كلمة.' :
                            wc > 60 ? 'الإجابة طويلة جداً. اختصر أول فقرة لتكون "تعريفاً قاموسياً".' :
                                !isDirect ? 'ابدأ الجملة بالكلمة المفتاحية مباشرة (مثال: "الـ[كلمة] هو...")' :
                                    '✅ تنسيق مثالي لمحركات الإجابة (Answer Engines)',
                    });
                } else {
                    ops.push({ type: 'إجابة مباشرة (SGE)', heading, status: 'missing', score: 0, tip: 'القسم يفتقر إلى فقرة تعريفية مباشرة بعد العنوان.' });
                }
            }

            // Listicle Depth Target
            if (/how to|steps|ways|tips|كيف|خطوات|طرق|نصائح/i.test(heading)) {
                const listMatch = body.match(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/i);
                if (listMatch) {
                    const items = listMatch[2].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
                    const avgWords = items.reduce((acc, item) => acc + countWords(item), 0) / (items.length || 1);

                    ops.push({
                        type: 'قائمة غنية (Deep List)',
                        heading,
                        status: (items.length >= 5 && avgWords >= 10) ? 'found' : 'missing',
                        score: (items.length >= 5 && avgWords >= 10) ? 10 : 5,
                        tip: items.length < 5 ? 'القائمة قصيرة. الذكاء الاصطناعي يفضل القوائم الشاملة (+5 عناصر).' :
                            avgWords < 10 ? 'العناصر قصيرة جداً. أضف شرحاً لكل نقطة (Google يفضل القوائم المشروحة).' :
                                '✅ قائمة ممتازة وغنية بالتفاصيل.',
                    });
                } else {
                    ops.push({ type: 'قائمة (List)', heading, status: 'missing', score: 0, tip: 'العنوان يوحي بقائمة (خطوات/طرق) لكن لا توجد <ul> أو <ol>.' });
                }
            }
        }

        // 2. Statistical Authority Check (Data-Driven Content)
        // AI models trust content with numbers, percentages, and citations.
        const statsRegex = /(\d+(\.\d+)?%|\d+ (سنوات|عاماً|دولار|ريال|جنيه)|دراسة|إحصائية|عام \d{4})/gi;
        const statsCount = (content.match(statsRegex) || []).length;
        ops.push({
            type: 'سلطة البيانات (Data Authority)',
            heading: 'المقال بالكامل',
            status: statsCount >= 3 ? 'found' : 'missing',
            score: Math.min(statsCount * 2, 10),
            tip: statsCount < 3 ? 'المقال يفتقر للأرقام والإحصائيات. أضف نسب مئوية أو تواريخ لزيادة الثقة لدى AI.' :
                `✅ ممتاز! تم رصد ${statsCount} إشارة إحصائية/رقمية.`,
        });

        // 3. Citation/Quotes Check (E-E-A-T)
        // AI models validation against known entities.
        const quoteRegex = /(قال|يقول|وفقاً لـ|حسب|أشار|أكد|According to|stated|reported)/gi;
        const quoteCount = (content.match(quoteRegex) || []).length;
        ops.push({
            type: 'الاستشهاد بالمصادر (Citations)',
            heading: 'المصداقية',
            status: quoteCount >= 2 ? 'found' : 'missing',
            score: Math.min(quoteCount * 3, 10),
            tip: quoteCount < 2 ? 'أضف اقتباسات أو إشارات لخبراء/مؤسسات ("وفقاً لـ..."). هذا يرفع تقييم E-E-A-T.' :
                `✅ جيد جداً. لديك ${quoteCount} استشهادات.`,
        });

        return ops;
    }, [content, keyword]);

    if (!content) return null;

    const totalScore = opportunities.reduce((acc, op) => acc + op.score, 0);
    const maxScore = opportunities.length * 10;
    const percentage = Math.round((totalScore / (maxScore || 1)) * 100);

    return (
        <div className="rounded-lg border bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a10 10 0 1 0 10 10H12V2z" /><path d="M12 2a10 10 0 0 1 10 10" opacity="0.5" /><path d="M2.05 13a10 10 0 0 1 9.95-9" opacity="0.5" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-foreground">تحسين محركات الذكاء (GEO)</h4>
                        <p className="text-[10px] text-muted-foreground">التوافق مع Google SGE & Gemini</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`text-lg font-black ${percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {percentage}%
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                {opportunities.map((op, i) => (
                    <div key={i} className={`text-[11px] p-2.5 rounded-md border flex flex-col gap-1.5 ${op.status === 'found'
                            ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30'
                            : 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'
                        }`}>
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">{op.type}</span>
                            <Badge variant={op.status === 'found' ? 'secondary' : 'outline'} className={`text-[9px] h-4 ${op.status === 'found' ? 'bg-green-100 text-green-700' : 'text-red-600'}`}>
                                {op.status === 'found' ? 'مطبق' : 'مفقود'}
                            </Badge>
                        </div>
                        {op.heading !== 'المقال بالكامل' && <span className="text-[10px] text-muted-foreground bg-background/50 px-1 rounded w-fit">{op.heading}</span>}
                        <p className="text-[10px] opacity-90 leading-relaxed">{op.tip}</p>
                    </div>
                ))}
            </div>

            <div className="pt-2 border-t text-[10px] text-muted-foreground flex items-center gap-1">
                <span>ℹ️</span>
                <span>GEO يركز على: الإجابات المباشرة، القوائم الغنية، والإشارات المرجعية (Citations).</span>
            </div>
        </div>
    );
}

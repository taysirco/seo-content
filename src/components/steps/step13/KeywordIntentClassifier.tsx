'use client';

import { useMemo } from 'react';

interface KeywordIntentClassifierProps {
    keyword: string;
}

// W17-5: Keyword Intent Classifier
export function KeywordIntentClassifier({ keyword }: KeywordIntentClassifierProps) {
    const intent = useMemo(() => {
        const kw = keyword.toLowerCase();
        const transactional = ['شراء', 'سعر', 'أفضل', 'مقارنة', 'خصم', 'عرض', 'رخيص', 'اشتراك', 'تحميل', 'buy', 'price', 'cheap', 'discount', 'order'];
        const navigational = ['موقع', 'تسجيل', 'دخول', 'تطبيق', 'رسمي', 'login', 'sign up', 'official', 'app'];
        const commercial = ['مراجعة', 'تقييم', 'أيهما', 'بديل', 'مميزات', 'عيوب', 'review', 'vs', 'alternative', 'comparison'];

        if (transactional.some(w => kw.includes(w))) return { type: 'تجاري (Transactional)', color: 'text-red-600 bg-red-500/10 border-red-500/20', icon: '🛒', tip: 'ركز على CTA واضح + مقارنات + أسعار' };
        if (navigational.some(w => kw.includes(w))) return { type: 'تنقلي (Navigational)', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20', icon: '🧭', tip: 'ركز على معلومات الوصول والتسجيل' };
        if (commercial.some(w => kw.includes(w))) return { type: 'تجاري بحثي (Commercial)', color: 'text-purple-600 bg-purple-500/10 border-purple-500/20', icon: '🔍', tip: 'ركز على المراجعات والمقارنات' };
        return { type: 'معلوماتي (Informational)', color: 'text-green-600 bg-green-500/10 border-green-500/20', icon: '📚', tip: 'ركز على الشرح الشامل + FAQ + How-to' };
    }, [keyword]);

    return (
        <div className={`rounded-lg border p-3 ${intent.color}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{intent.icon}</span>
                <span>نية البحث: {intent.type}</span>
            </div>
            <p className="text-[10px] mt-1 opacity-80">{intent.tip}</p>
        </div>
    );
}

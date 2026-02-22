'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { LayoutTemplate } from 'lucide-react';

interface ContentUXValidatorProps {
    content: string;
    keyword: string;
}

// Deep Layout & UX Validation against Google Helpful Content
export function ContentUXValidator({ content, keyword }: ContentUXValidatorProps) {
    const issues = useMemo(() => {
        if (!content) return [];
        const problems: { type: 'Error' | 'Warning' | 'Success'; desc: string }[] = [];

        const plain = (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || ''; })();
        const kwLower = keyword.toLowerCase();

        // 1. Keyword Prominence (In first 100 words)
        const first100Words = plain.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
        if (!first100Words.includes(kwLower)) {
            problems.push({ type: 'Error', desc: `الكلمة المفتاحية غير موجودة في أول 100 كلمة.` });
        } else {
            problems.push({ type: 'Success', desc: `الكلمة المفتاحية ظهرت في بداية المقال.` });
        }

        // 2. Wall of Text Detection
        const sections = content.split(/<h[2-3][^>]*>/i);
        let hasWallOfText = false;
        sections.forEach(sec => {
            const secText = sec.replace(/<[^>]+>/g, ' ');
            const secWords = secText.split(/\s+/).filter(Boolean).length;
            if (secWords > 300) {
                hasWallOfText = true;
            }
        });

        if (hasWallOfText) {
            problems.push({ type: 'Error', desc: `جدار نصي (Wall of Text): توجد أقسام تتجاوز 300 كلمة دون ترويسات فرعية.` });
        }

        // 3. Featured Snippet Optimization (Lists/Tables)
        const hasLists = /<ul|<ol/i.test(content);
        const hasTables = /<table/i.test(content);

        if (!hasLists) {
            problems.push({ type: 'Warning', desc: `المقال يفتقر للقوائم النقطية (Bullet Points) لسهولة القراءة.` });
        }
        if (!hasTables) {
            problems.push({ type: 'Warning', desc: `المقال لا يحتوي على جداول (تزيد من فرص المقتطف المميز).` });
        }
        if (hasLists && hasTables) {
            problems.push({ type: 'Success', desc: `تنسيق غني: المقال يحتوي على قوائم وجداول.` });
        }

        // 4. Broken Layout Tags
        const openDivs = (content.match(/<div/gi) || []).length;
        const closeDivs = (content.match(/<\/div>/gi) || []).length;
        if (openDivs !== closeDivs) {
            problems.push({ type: 'Error', desc: `خلل في هيكلة الـ HTML (وسوم <div> غير مغلقة).` });
        }

        return problems;
    }, [content, keyword]);

    if (issues.length === 0) return null;

    const errorCount = issues.filter(i => i.type === 'Error').length;

    return (
        <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5 text-indigo-500" />
                تحليل جودة تجربة المستخدم (UX Layout)
                <Badge variant={errorCount > 0 ? 'destructive' : 'outline'} className="text-[9px]">
                    {errorCount > 0 ? `${errorCount} مشكلة حرجة` : 'تنسيق جيد'}
                </Badge>
            </h4>
            <div className="space-y-1">
                {issues.map((issue, i) => (
                    <div key={i} className={`text-[11px] p-1.5 rounded flex items-start gap-2 ${issue.type === 'Error' ? 'bg-red-500/5 text-red-600' : issue.type === 'Warning' ? 'bg-yellow-500/5 text-yellow-600' : 'bg-green-500/5 text-green-600'}`}>
                        <span className="shrink-0 mt-0.5">{issue.type === 'Error' ? '❌' : issue.type === 'Warning' ? '⚠️' : '✅'}</span>
                        <span>{issue.desc}</span>
                    </div>
                ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-2 border-t pt-2">يفضل محرك جوجل المقالات سريعة القراءة، الموزعة بالفقرات القصيرة، والقوائم النقطية، والجداول.</p>
        </div>
    );
}

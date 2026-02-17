'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface TransitionCheckerProps {
    content: string;
}

// W19-6: Transition Quality Checker
export function TransitionChecker({ content }: TransitionCheckerProps) {
    const issues = useMemo(() => {
        if (!content) return [];
        const sections: { heading: string; lastSentence: string; firstSentence: string }[] = [];
        const sectionRegex = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
        let sm;
        while ((sm = sectionRegex.exec(content)) !== null) {
            const heading = sm[1].replace(/<[^>]+>/g, '').trim();
            const text = sm[2].replace(/<[^>]+>/g, ' ').trim();
            const sentences = text.split(/[.!؟]\s+/).filter(s => s.length > 10);
            sections.push({
                heading,
                lastSentence: sentences[sentences.length - 1]?.trim() || '',
                firstSentence: sentences[0]?.trim() || '',
            });
        }

        const problems: { from: string; to: string; type: string }[] = [];
        const transitionWords = ['لذلك', 'بالإضافة', 'علاوة', 'من ناحية', 'بينما', 'لكن', 'ومع ذلك', 'في المقابل', 'نتيجة', 'بناء على', 'furthermore', 'however', 'moreover', 'additionally', 'consequently'];

        for (let i = 1; i < sections.length; i++) {
            const prevLast = sections[i - 1].lastSentence.toLowerCase();
            const currFirst = sections[i].firstSentence.toLowerCase();
            const hasTransition = transitionWords.some(tw => currFirst.includes(tw) || prevLast.includes(tw));
            if (!hasTransition && prevLast.length > 0 && currFirst.length > 0) {
                problems.push({ from: sections[i - 1].heading, to: sections[i].heading, type: 'لا يوجد رابط انتقالي' });
            }
        }
        return problems.slice(0, 5);
    }, [content]);

    if (issues.length === 0) return null;

    return (
        <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                جودة الانتقال بين الأقسام
                <Badge variant="outline" className="text-[9px] text-orange-600">{issues.length} انتقال ضعيف</Badge>
            </h4>
            <div className="space-y-1">
                {issues.map((issue, i) => (
                    <div key={i} className="text-[11px] p-1.5 rounded bg-orange-500/5 text-orange-700 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{issue.from} → {issue.to}: {issue.type}</span>
                    </div>
                ))}
            </div>
            <p className="text-[9px] text-muted-foreground">أضف كلمات ربط مثل: &quot;بالإضافة إلى ذلك&quot;، &quot;من ناحية أخرى&quot;، &quot;بناءً على ما سبق&quot;</p>
        </div>
    );
}

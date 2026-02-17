'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface HeadingHierarchyValidatorProps {
    content: string;
}

// W18-2: Heading Hierarchy Validator
export function HeadingHierarchyValidator({ content }: HeadingHierarchyValidatorProps) {
    const issues = useMemo(() => {
        if (!content) return [];
        const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
        const headings: { level: number; text: string }[] = [];
        let m;
        while ((m = headingRegex.exec(content)) !== null) {
            headings.push({ level: parseInt(m[1]), text: m[2].replace(/<[^>]+>/g, '').trim() });
        }
        if (headings.length === 0) return [];

        const problems: { type: 'Error' | 'Warning'; desc: string }[] = [];
        const h1s = headings.filter(h => h.level === 1);
        if (h1s.length === 0) problems.push({ type: 'Error', desc: 'No H1 — add a main heading' });
        if (h1s.length > 1) problems.push({ type: 'Error', desc: `${h1s.length} H1 headings — should be exactly one` });

        for (let i = 1; i < headings.length; i++) {
            const prev = headings[i - 1].level;
            const curr = headings[i].level;
            if (curr > prev + 1) {
                problems.push({ type: 'Warning', desc: `Jump from H${prev} to H${curr} — "${headings[i].text.slice(0, 30)}"` });
            }
        }

        const h2s = headings.filter(h => h.level === 2);
        if (h2s.length < 3) problems.push({ type: 'Warning', desc: `Only ${h2s.length} H2 headings — 3+ sections recommended` });

        const emptyHeadings = headings.filter(h => h.text.length < 3);
        if (emptyHeadings.length > 0) problems.push({ type: 'Error', desc: `${emptyHeadings.length} empty or very short headings` });

        return problems;
    }, [content]);

    if (issues.length === 0) return null;

    return (
        <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                Heading Hierarchy Check
                <Badge variant="outline" className="text-[9px] text-yellow-600">{issues.length} issues</Badge>
            </h4>
            <div className="space-y-1">
                {issues.map((issue, i) => (
                    <div key={i} className={`text-[11px] p-1.5 rounded flex items-center gap-2 ${issue.type === 'Error' ? 'bg-red-500/5 text-red-600' : 'bg-yellow-500/5 text-yellow-600'}`}>
                        <span>{issue.type === 'Error' ? '❌' : '⚠️'}</span>
                        <span>{issue.desc}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

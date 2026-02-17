'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Highlighter, Check, Copy } from 'lucide-react';

interface PAAQuestionsGeneratorProps {
    keyword: string;
    content: string;
}

// W16-9: PAA (People Also Ask) Questions Generator
export function PAAQuestionsGenerator({ keyword, content }: PAAQuestionsGeneratorProps) {
    const [expanded, setExpanded] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    const questions = useMemo(() => {
        if (!content) return [];
        const plain = (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || ''; })();

        // Extract existing questions from content
        const existingQs: string[] = [];
        const qRegex = /([^.!؟\n]*؟)/g;
        let qm;
        while ((qm = qRegex.exec(plain)) !== null) {
            const q = qm[1].trim();
            if (q.length > 10 && q.length < 120) existingQs.push(q);
        }

        // Generate PAA-style questions from H2 headings
        const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
        const generated: string[] = [];
        let hm;
        while ((hm = h2Regex.exec(content)) !== null) {
            const heading = hm[1].replace(/<[^>]+>/g, '').trim();
            if (!heading) continue;
            // Generate question variants
            generated.push(`ما هو ${heading}؟`);
            generated.push(`كيف يمكن ${heading}؟`);
            generated.push(`لماذا ${heading} مهم؟`);
        }

        // Add keyword-based questions
        generated.push(`ما هو ${keyword}؟`);
        generated.push(`ما هي فوائد ${keyword}؟`);
        generated.push(`كيف أبدأ في ${keyword}؟`);
        generated.push(`ما الفرق بين ${keyword} والبدائل الأخرى؟`);
        generated.push(`هل ${keyword} مناسب للمبتدئين؟`);

        // Deduplicate and filter
        const allQs = [...new Set([...existingQs, ...generated])];
        return allQs.slice(0, 15);
    }, [content, keyword]);

    if (questions.length === 0) return null;

    return (
        <div className="rounded-lg border bg-card">
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="flex items-center gap-2">
                    <Highlighter className="w-4 h-4 text-indigo-500" />
                    People Also Ask Questions
                    <Badge variant="secondary" className="text-[9px]">{questions.length} questions</Badge>
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-2 border-t pt-3">
                    <p className="text-[10px] text-muted-foreground">Suggested PAA questions to improve article visibility in &quot;People Also Ask&quot; results</p>
                    <div className="space-y-1">
                        {questions.map((q, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/20 border">
                                <span className="text-indigo-500 shrink-0">❓</span>
                                <span className="flex-1">{q}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] shrink-0"
                                    onClick={() => {
                                        navigator.clipboard.writeText(q);
                                        setCopiedIdx(i);
                                        setTimeout(() => setCopiedIdx(null), 1500);
                                    }}
                                >
                                    {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1"
                        onClick={() => {
                            navigator.clipboard.writeText(questions.join('\n'));
                            setCopiedIdx(-1);
                            setTimeout(() => setCopiedIdx(null), 1500);
                        }}
                    >
                        {copiedIdx === -1 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Copy All Questions
                    </Button>
                </div>
            )}
        </div>
    );
}

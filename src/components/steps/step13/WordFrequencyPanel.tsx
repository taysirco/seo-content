'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';

interface WordFrequencyPanelProps {
    content: string;
    keyword: string;
}

// W18-3: Word Frequency Cloud Data
export function WordFrequencyPanel({ content, keyword }: WordFrequencyPanelProps) {
    const [expanded, setExpanded] = useState(false);
    const topWords = useMemo(() => {
        if (!content) return [];
        const plain = (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || ''; })();
        const stopWords = new Set(['من', 'في', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'التي', 'الذي', 'أن', 'لا', 'ما', 'هو', 'هي', 'كان', 'قد', 'بين', 'أو', 'ذلك', 'كل', 'لم', 'حتى', 'بعد', 'قبل', 'عند', 'يمكن', 'كما', 'أي', 'ثم', 'the', 'a', 'an', 'is', 'are', 'was', 'in', 'on', 'to', 'of', 'and', 'for', 'with', 'that', 'this']);
        const freq: Record<string, number> = {};
        const words = plain.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
        for (const w of words) {
            const clean = w.replace(/[^\u0600-\u06FFa-zA-Z]/g, '');
            if (clean.length > 2) freq[clean] = (freq[clean] || 0) + 1;
        }
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 25)
            .map(([word, count]) => ({ word, count, isKeyword: keyword.toLowerCase().includes(word.toLowerCase()) || word.toLowerCase().includes(keyword.toLowerCase()) }));
    }, [content, keyword]);

    if (topWords.length === 0) return null;
    const maxCount = topWords[0]?.count || 1;

    return (
        <div className="rounded-lg border bg-card">
            <button type="button" className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
                <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-violet-500" />
                    Word Frequency
                    <Badge variant="secondary" className="text-[9px]">{topWords.length} words</Badge>
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-1 border-t pt-3">
                    {topWords.map((w, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                            <span className="w-5 text-muted-foreground text-left">{i + 1}</span>
                            <span className={`w-24 truncate font-medium ${w.isKeyword ? 'text-green-600' : ''}`}>{w.word}</span>
                            <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${w.isKeyword ? 'bg-green-500' : 'bg-violet-500/50'}`} style={{ width: `${(w.count / maxCount) * 100}%` }} />
                            </div>
                            <span className="w-8 text-left text-muted-foreground">{w.count}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

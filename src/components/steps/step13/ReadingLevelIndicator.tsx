'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface ReadingLevelIndicatorProps {
    content: string;
}

// W18-1: Content Reading Level Indicator (Arabic Flesch-like)
export function ReadingLevelIndicator({ content }: ReadingLevelIndicatorProps) {
    const analysis = useMemo(() => {
        if (!content) return null;
        const plain = (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || ''; })();
        const words = plain.split(/\s+/).filter(Boolean);
        const wc = words.length;
        if (wc < 50) return null;

        const sentences = plain.split(/[.!؟،؛\n]+/).filter(s => s.trim().length > 3);
        const sc = sentences.length || 1;
        const avgWordsPerSentence = wc / sc;
        const longWords = words.filter(w => w.length > 6).length;
        const longWordPct = (longWords / wc) * 100;

        // Arabic readability formula (adapted)
        // Lower score = easier, Higher = harder
        const rawScore = (avgWordsPerSentence * 1.5) + (longWordPct * 0.5);
        let level: string, color: string, emoji: string;
        if (rawScore < 25) { level = 'Very Easy — suitable for everyone'; color = 'text-green-600 bg-green-500/10'; emoji = '🟢'; }
        else if (rawScore < 35) { level = 'Easy — general audience'; color = 'text-blue-600 bg-blue-500/10'; emoji = '🔵'; }
        else if (rawScore < 45) { level = 'Medium — requires focus'; color = 'text-yellow-600 bg-yellow-500/10'; emoji = '🟡'; }
        else if (rawScore < 55) { level = 'Hard — for specialists'; color = 'text-orange-600 bg-orange-500/10'; emoji = '🟠'; }
        else { level = 'Very Hard — academic'; color = 'text-red-600 bg-red-500/10'; emoji = '🔴'; }

        return { level, color, emoji, avgWordsPerSentence: avgWordsPerSentence.toFixed(1), longWordPct: longWordPct.toFixed(1), rawScore: rawScore.toFixed(0) };
    }, [content]);

    if (!analysis) return null;

    return (
        <div className={`rounded-lg border p-3 ${analysis.color}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{analysis.emoji}</span>
                <span>Reading Level: {analysis.level}</span>
            </div>
            <div className="flex gap-4 mt-1 text-[10px] opacity-80">
                <span>Avg words/sentence: {analysis.avgWordsPerSentence}</span>
                <span>Long words: {analysis.longWordPct}%</span>
                <span>Score: {analysis.rawScore}/100</span>
            </div>
        </div>
    );
}

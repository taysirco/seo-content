'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface FreshnessScoreProps {
    content: string;
}

// W18-4: Content Freshness Score
export function FreshnessScore({ content }: FreshnessScoreProps) {
    const analysis = useMemo(() => {
        if (!content) return null;
        const plain = (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || ''; })();
        const currentYear = new Date().getFullYear();
        const yearRegex = /\b(20\d{2})\b/g;
        const years: number[] = [];
        let ym;
        while ((ym = yearRegex.exec(plain)) !== null) years.push(parseInt(ym[1]));

        const hasCurrentYear = years.includes(currentYear);
        const hasLastYear = years.includes(currentYear - 1);
        const oldYears = years.filter(y => y < currentYear - 2);

        let score = 50;
        if (hasCurrentYear) score += 30;
        if (hasLastYear) score += 10;
        score -= oldYears.length * 5;
        score = Math.max(0, Math.min(100, score));

        // Check for freshness signals
        const freshSignals = ['أحدث', 'محدث', 'جديد', `${currentYear}`, 'updated', 'latest', 'new'].filter(s => plain.toLowerCase().includes(s.toLowerCase()));

        let label: string, color: string;
        if (score >= 80) { label = 'Very Fresh'; color = 'text-green-600 bg-green-500/10'; }
        else if (score >= 60) { label = 'Fresh'; color = 'text-blue-600 bg-blue-500/10'; }
        else if (score >= 40) { label = 'Needs Update'; color = 'text-yellow-600 bg-yellow-500/10'; }
        else { label = 'Outdated — update it'; color = 'text-red-600 bg-red-500/10'; }

        return { score, label, color, hasCurrentYear, oldYears: oldYears.length, freshSignals: freshSignals.length };
    }, [content]);

    if (!analysis) return null;

    return (
        <div className={`rounded-lg border p-3 ${analysis.color}`}>
            <div className="flex items-center justify-between text-sm font-semibold">
                <span>🕐 Content Freshness: {analysis.label}</span>
                <Badge variant="outline" className="text-[9px]">{analysis.score}/100</Badge>
            </div>
            <div className="flex gap-4 mt-1 text-[10px] opacity-80">
                <span>{analysis.hasCurrentYear ? '✅' : '❌'} Year {new Date().getFullYear()}</span>
                <span>{analysis.oldYears > 0 ? `⚠️ ${analysis.oldYears} old references` : '✅ No old references'}</span>
                <span>{analysis.freshSignals} freshness signals</span>
            </div>
        </div>
    );
}

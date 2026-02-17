'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface EEATScoreCardProps {
    content: string;
    keyword: string;
}

// W14-E: E-E-A-T Score Calculator
export function EEATScoreCard({ content, keyword }: EEATScoreCardProps) {
    const score = useMemo(() => {
        if (!content) return null;
        const plain = (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || ''; })();
        const checks: { label: string; found: boolean; weight: number; tip: string }[] = [];

        // Experience signals
        checks.push({ label: 'Personal experience / practical examples', found: /تجربت|تجربة|جرّب|من واقع|عملياً|في الممارسة|experience|practical|real-world/i.test(plain), weight: 15, tip: 'Add real-world examples from actual experience' });
        checks.push({ label: 'Data & statistics', found: /\d+%|\d+٪|دراسة|بحث|إحصائ|وفقاً|حسب تقرير|study|research|according to|report/i.test(plain), weight: 15, tip: 'Add statistics from authoritative sources' });

        // Expertise signals
        checks.push({ label: 'Sources / references', found: /<a[^>]*href/i.test(content) || /المصدر|المرجع|وفقاً لـ|حسب|source|reference|according/i.test(plain), weight: 15, tip: 'Add links to authoritative external sources' });
        checks.push({ label: 'Specialized terminology', found: plain.split(/\s+/).filter(w => w.length > 6).length > 20, weight: 10, tip: 'Use domain-specific terminology' });
        checks.push({ label: 'Expert quotes', found: /قال|يقول|أشار|وفق|صرّح|أوضح الدكتور|البروفيسور|said|stated|according to Dr|Professor/i.test(plain), weight: 10, tip: 'Add expert quotes from the field' });

        // Authoritativeness
        checks.push({ label: 'Structured H2/H3 hierarchy', found: (content.match(/<h2/gi) || []).length >= 3, weight: 10, tip: 'Organize content with clear headings' });
        checks.push({ label: 'FAQ section', found: /أسئلة شائعة|الأسئلة المتكررة|FAQ|frequently asked|؟/.test(plain) && (content.match(/<h3/gi) || []).length >= 2, weight: 10, tip: 'Add an FAQ section' });

        // Trust
        checks.push({ label: 'Schema JSON-LD', found: /application\/ld\+json/i.test(content), weight: 5, tip: 'Add Schema markup' });
        checks.push({ label: 'Publish/update date', found: /تاريخ|آخر تحديث|نُشر في|datePublished|published|updated/i.test(plain + content), weight: 5, tip: 'Add publish and update dates' });
        checks.push({ label: 'Sufficient length (>1500 words)', found: plain.split(/\s+/).filter(Boolean).length >= 1500, weight: 5, tip: 'Write longer, more comprehensive content' });

        const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
        const earnedWeight = checks.filter(c => c.found).reduce((sum, c) => sum + c.weight, 0);
        const pct = Math.round((earnedWeight / totalWeight) * 100);
        const grade = pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D';

        return { checks, pct, grade, keyword };
    }, [content, keyword]);

    if (!score) return null;

    const gradeColor: Record<string, string> = { A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600', D: 'text-red-600' };

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    E-E-A-T Score
                </h4>
                <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${gradeColor[score.grade]}`}>{score.grade}</span>
                    <Badge variant={score.pct >= 60 ? 'default' : 'destructive'} className="text-[10px]">{score.pct}%</Badge>
                </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${score.pct >= 80 ? 'bg-green-500' : score.pct >= 60 ? 'bg-blue-500' : score.pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${score.pct}%` }}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {score.checks.map((c, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[11px] p-1.5 rounded ${c.found ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                        <span className="shrink-0">{c.found ? '✅' : '❌'}</span>
                        <span className={c.found ? '' : 'text-muted-foreground'}>{c.label}</span>
                        <span className="text-[9px] text-muted-foreground mr-auto">({c.weight})</span>
                    </div>
                ))}
            </div>
            {score.checks.filter(c => !c.found).length > 0 && (
                <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2 space-y-1">
                    <p className="text-[10px] font-medium text-blue-700 dark:text-blue-400">💡 Suggestions to improve score:</p>
                    {score.checks.filter(c => !c.found).slice(0, 3).map((c, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground">• {c.tip}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

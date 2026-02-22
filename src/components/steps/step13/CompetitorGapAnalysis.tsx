'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface CompetitorGapAnalysisProps {
    content: string;
    store: {
        step2?: {
            competitors?: { url: string; headings: { level: number; text: string }[] }[];
            merged?: {
                headings: { level: number; text: string }[];
                gapAnalysis?: {
                    hiddenObjections?: { fearOrObjection: string; suggestedH2: string }[];
                    counterNarrative?: { standardAdvice: string; contrarianTake: string; suggestedH2: string };
                };
            };
        } | null;
    };
}

// W14-1: Competitor Gap Analysis — find topics competitors cover that we don't
export function CompetitorGapAnalysis({ content, store }: CompetitorGapAnalysisProps) {
    const [expanded, setExpanded] = useState(false);

    const competitors = store.step2?.competitors;
    const analysis = useMemo(() => {
        if (!competitors || competitors.length === 0) return null;

        // Our article H2 headings
        const ourH2s: string[] = [];
        const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
        let m;
        while ((m = h2Regex.exec(content)) !== null) {
            ourH2s.push(m[1].replace(/<[^>]+>/g, '').trim().toLowerCase());
        }

        // Competitor H2 headings (all)
        const compH2Map = new Map<string, { text: string; count: number; sources: string[] }>();
        for (const comp of competitors) {
            const domain = (() => { try { return new URL(comp.url).hostname; } catch { return comp.url.slice(0, 30); } })();
            for (const h of comp.headings) {
                if (h.level !== 2) continue;
                const normalized = h.text.toLowerCase().trim();
                if (!normalized) continue;
                const existing = compH2Map.get(normalized);
                if (existing) {
                    existing.count++;
                    if (!existing.sources.includes(domain)) existing.sources.push(domain);
                } else {
                    compH2Map.set(normalized, { text: h.text, count: 1, sources: [domain] });
                }
            }
        }

        // Find gaps — competitor topics NOT in our article
        const gaps: { text: string; count: number; sources: string[] }[] = [];
        const covered: { text: string; count: number }[] = [];
        for (const [normalized, data] of compH2Map.entries()) {
            const isCovered = ourH2s.some(h =>
                h.includes(normalized) || normalized.includes(h) ||
                // Fuzzy: share 60%+ words
                (() => {
                    const aWords = new Set(normalized.split(/\s+/));
                    const bWords = h.split(/\s+/);
                    const overlap = bWords.filter(w => aWords.has(w)).length;
                    return overlap >= Math.min(aWords.size, bWords.length) * 0.6;
                })()
            );
            if (isCovered) {
                covered.push({ text: data.text, count: data.count });
            } else {
                gaps.push(data);
            }
        }

        // Sort gaps by frequency (topics covered by most competitors first)
        gaps.sort((a, b) => b.count - a.count);

        const totalTopics = compH2Map.size;
        const coveragePct = totalTopics > 0 ? Math.round((covered.length / totalTopics) * 100) : 100;

        return { gaps, covered, totalTopics, coveragePct, ourH2Count: ourH2s.length };
    }, [content, competitors]);

    if (!analysis || analysis.totalTopics === 0) return null;

    return (
        <div className="rounded-lg border bg-card">
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Competitor Gap Analysis
                    <Badge variant={analysis.coveragePct >= 80 ? 'default' : 'destructive'} className="text-[9px]">
                        Coverage {analysis.coveragePct}%
                    </Badge>
                    {analysis.gaps.length > 0 && (
                        <Badge variant="outline" className="text-[9px] text-orange-600 border-orange-500/30">
                            {analysis.gaps.length} gaps
                        </Badge>
                    )}
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    {/* Coverage bar */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                            <span>Topic Coverage: {analysis.covered.length}/{analysis.totalTopics}</span>
                            <span className={analysis.coveragePct >= 80 ? 'text-green-600' : 'text-orange-600'}>{analysis.coveragePct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${analysis.coveragePct >= 80 ? 'bg-green-500' : analysis.coveragePct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${analysis.coveragePct}%` }}
                            />
                        </div>
                    </div>

                    {/* Gaps */}
                    {analysis.gaps.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold text-orange-600">Topics competitors cover that you don&apos;t:</p>
                            {analysis.gaps.map((g, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-orange-500/5 border border-orange-500/10">
                                    <Badge variant="outline" className="text-[9px] shrink-0 w-5 h-5 flex items-center justify-center rounded-full p-0">{g.count}</Badge>
                                    <span className="flex-1 font-medium">{g.text}</span>
                                    <span className="text-[9px] text-muted-foreground shrink-0">{g.sources.slice(0, 2).join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Weapon 1: Deep Intent / Hidden Objections */}
                    {store.step2?.merged?.gapAnalysis?.hiddenObjections && store.step2.merged.gapAnalysis.hiddenObjections.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                            <p className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                                🧠 Deep Intent (الفجوة النفسية):
                            </p>
                            {store.step2.merged.gapAnalysis.hiddenObjections.map((obj, i) => (
                                <div key={i} className="flex flex-col gap-1 text-xs p-2 rounded bg-indigo-50 border border-indigo-200">
                                    <span className="font-semibold text-indigo-900">{obj.fearOrObjection}</span>
                                    <span className="text-muted-foreground">→ <span className="font-mono text-indigo-600">H2:</span> {obj.suggestedH2}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Weapon 6: Counter-Narrative */}
                    {store.step2?.merged?.gapAnalysis?.counterNarrative && (
                        <div className="space-y-1.5 mt-2">
                            <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                ⚔️ Counter-Narrative (Weapon 6):
                            </p>
                            <div className="flex flex-col gap-1 text-xs p-2 rounded bg-red-50 border border-red-200">
                                <span className="text-muted-foreground strike-through">Standard: {store.step2.merged.gapAnalysis.counterNarrative.standardAdvice}</span>
                                <span className="font-semibold text-red-900">Your Take: {store.step2.merged.gapAnalysis.counterNarrative.contrarianTake}</span>
                                <span className="text-muted-foreground mt-1">→ <span className="font-mono text-red-600">H2:</span> {store.step2.merged.gapAnalysis.counterNarrative.suggestedH2}</span>
                            </div>
                        </div>
                    )}

                    {/* Covered */}
                    {analysis.covered.length > 0 && (
                        <div className="space-y-1 mt-2">
                            <p className="text-[10px] font-semibold text-green-600">Covered Topics ✓</p>
                            <div className="flex flex-wrap gap-1">
                                {analysis.covered.map((c, i) => (
                                    <Badge key={i} variant="outline" className="text-[9px] text-green-600 border-green-500/30">{c.text}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Link2 } from 'lucide-react';

interface AnchorTextAnalyzerProps {
    content: string;
}

// W14-3: Anchor Text Diversity Analyzer
export function AnchorTextAnalyzer({ content }: AnchorTextAnalyzerProps) {
    const [expanded, setExpanded] = useState(false);

    const analysis = useMemo(() => {
        const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        const links: { url: string; anchor: string; isExternal: boolean }[] = [];
        let m;
        while ((m = linkRegex.exec(content)) !== null) {
            const url = m[1];
            const anchor = m[2].replace(/<[^>]+>/g, '').trim();
            const isExternal = url.startsWith('http') && !url.includes(typeof window !== 'undefined' ? window.location.hostname : '');
            if (anchor) links.push({ url, anchor, isExternal });
        }
        if (links.length === 0) return null;

        const internal = links.filter(l => !l.isExternal);
        const external = links.filter(l => l.isExternal);
        const uniqueAnchors = new Set(links.map(l => l.anchor.toLowerCase()));
        const diversityPct = links.length > 0 ? Math.round((uniqueAnchors.size / links.length) * 100) : 0;

        // Check for generic anchors
        const genericPhrases = ['اضغط هنا', 'انقر هنا', 'هنا', 'اقرأ المزيد', 'المزيد', 'رابط', 'click here', 'here', 'read more'];
        const genericAnchors = links.filter(l => genericPhrases.includes(l.anchor.toLowerCase()));

        return { links, internal, external, uniqueAnchors: uniqueAnchors.size, diversityPct, genericAnchors };
    }, [content]);

    if (!analysis) return null;

    return (
        <div className="rounded-lg border bg-card">
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-blue-500" />
                    Anchor Text Analysis
                    <Badge variant={analysis.diversityPct >= 70 ? 'default' : 'secondary'} className="text-[9px]">
                        Diversity {analysis.diversityPct}%
                    </Badge>
                    {analysis.genericAnchors.length > 0 && (
                        <Badge variant="destructive" className="text-[9px]">
                            {analysis.genericAnchors.length} generic
                        </Badge>
                    )}
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    <p className="text-[10px] text-muted-foreground">
                        Total Links: {analysis.links.length} ({analysis.internal.length} internal, {analysis.external.length} external).
                        Ideally, anchor text should be descriptive and diverse.
                    </p>

                    {analysis.genericAnchors.length > 0 && (
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-xs space-y-1">
                            <p className="font-semibold text-red-600">Avoid generic anchors:</p>
                            <ul className="list-disc list-inside text-red-700">
                                {analysis.genericAnchors.map((l, i) => (
                                    <li key={i}>&quot;{l.anchor}&quot; → {l.url}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="space-y-1">
                        <p className="text-[10px] font-semibold">Anchor Distribution</p>
                        <div className="flex flex-wrap gap-1">
                            {[...new Set(analysis.links.map(l => l.anchor))].slice(0, 15).map((a, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] text-muted-foreground border-dashed">
                                    {a}
                                </Badge>
                            ))}
                            {analysis.links.length > 15 && <span className="text-[9px] text-muted-foreground">...</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface CannibalizationCheckerProps {
    keyword: string;
    store: {
        clientMeta?: { domain?: string } | null;
    };
}

// W14-K: Keyword Cannibalization Checker
export function CannibalizationChecker({ keyword, store }: CannibalizationCheckerProps) {
    const [results, setResults] = useState<{ keyword: string; similarity: number; id: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState(false);

    const handleCheck = async () => {
        if (!store.clientMeta?.domain) {
            toast.error('Enter site domain first');
            return;
        }
        setLoading(true);
        try {
            const { listProjects } = await import('@/lib/firebase');
            const projects = await listProjects();
            const sameClient = projects.filter(p =>
                p.domain === store.clientMeta?.domain && p.keyword && p.keyword !== keyword
            );

            // Check word overlap for cannibalization
            const kwWords = new Set(keyword.toLowerCase().split(/\s+/));
            const cannibal: { keyword: string; similarity: number; id: string }[] = [];

            for (const p of sameClient) {
                const pWords = p.keyword.toLowerCase().split(/\s+/);
                const overlap = pWords.filter(w => kwWords.has(w)).length;
                const similarity = Math.round((overlap / Math.max(kwWords.size, pWords.length)) * 100);
                if (similarity >= 40) {
                    cannibal.push({ keyword: p.keyword, similarity, id: p.id });
                }
            }

            cannibal.sort((a, b) => b.similarity - a.similarity);
            setResults(cannibal);
            setChecked(true);
            if (cannibal.length === 0) toast.success('No cannibalization issues found');
        } catch {
            toast.error('Failed to check overlap');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Keyword Cannibalization Check
                </h4>
                <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={handleCheck} disabled={loading}>
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                    {checked ? 'Re-check' : 'Check'}
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Checks same-site projects for overlapping keywords that may compete for the same ranking</p>
            {results.length > 0 && (
                <div className="space-y-1.5">
                    {results.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-orange-500/5 border border-orange-500/10">
                            <Badge variant={r.similarity >= 70 ? 'destructive' : 'outline'} className="text-[9px] shrink-0">{r.similarity}%</Badge>
                            <span className="flex-1 font-medium">{r.keyword}</span>
                            <a href={`/project/${r.id}`} className="text-[10px] text-primary hover:underline shrink-0">Open</a>
                        </div>
                    ))}
                </div>
            )}
            {checked && results.length === 0 && (
                <p className="text-[10px] text-green-600 text-center py-1">✅ No overlap — each article targets a unique keyword</p>
            )}
        </div>
    );
}

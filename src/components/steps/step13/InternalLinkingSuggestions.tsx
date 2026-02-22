'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Copy, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface InternalLinkingSuggestionsProps {
    keyword: string;
    content: string;
    store: {
        clientMeta?: { domain?: string; clientName?: string } | null;
    };
    onInjectLink?: (anchor: string, url: string) => void;
}

// D11-3 + SM-7: Internal Linking Suggestions with Auto-Inject
export function InternalLinkingSuggestions({ keyword, content, store, onInjectLink }: InternalLinkingSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<{ keyword: string; url: string; anchor: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [injected, setInjected] = useState<Set<number>>(new Set());

    const handleFetch = async () => {
        if (!store.clientMeta?.domain) {
            toast.error('Enter site domain in client info first (Step 1)');
            return;
        }
        setLoading(true);
        setInjected(new Set());
        try {
            const { listProjects } = await import('@/lib/firebase');
            const projects = await listProjects();
            const sameClient = projects.filter(p =>
                p.domain === store.clientMeta?.domain && p.keyword && p.keyword !== keyword && p.currentStep >= 13
            );

            const domain = store.clientMeta.domain;
            const results = sameClient.map(p => {
                const slug = p.keyword.replace(/\s+/g, '-').replace(/[^\u0600-\u06FFa-zA-Z0-9-]/g, '');
                return {
                    keyword: p.keyword,
                    url: `https://${domain}/${encodeURIComponent(slug)}`,
                    anchor: p.keyword,
                };
            });

            const filtered = results.filter(r => !content.includes(`href="${r.url}"`));
            setSuggestions(filtered);
            setFetched(true);
            if (filtered.length === 0) {
                toast.info('No other articles for the same site to link between');
            }
        } catch {
            toast.error('Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = (s: { anchor: string; url: string }) => {
        const html = `<a href="${s.url}">${s.anchor}</a>`;
        navigator.clipboard.writeText(html);
        toast.success('Link copied');
    };

    // SM-7: Auto-inject link into first matching paragraph
    const handleInject = (s: { anchor: string; url: string; keyword: string }, idx: number) => {
        if (onInjectLink) {
            onInjectLink(s.anchor, s.url);
            setInjected(prev => new Set(prev).add(idx));
            toast.success(`Injected link for "${s.keyword}" into article`);
        }
    };

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Internal Link Suggestions
                </h4>
                <div className="flex items-center gap-1">
                    {suggestions.length > 0 && onInjectLink && (
                        <Button
                            variant="default"
                            size="sm"
                            className="gap-1 text-[10px] h-7"
                            onClick={() => {
                                let count = 0;
                                suggestions.forEach((s, i) => {
                                    if (!injected.has(i)) {
                                        handleInject(s, i);
                                        count++;
                                    }
                                });
                                if (count === 0) toast.info('All links already injected');
                            }}
                        >
                            Inject All ({suggestions.length - injected.size})
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={handleFetch} disabled={loading}>
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                        {fetched ? 'Refresh' : 'Fetch Suggestions'}
                    </Button>
                </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Searches same-site projects and suggests internal links — click &quot;Inject&quot; to insert automatically</p>
            {suggestions.length > 0 && (
                <div className="space-y-1.5">
                    {suggestions.map((s, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded ${injected.has(i) ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/30'}`}>
                            <span className="flex-1 truncate font-medium">{s.keyword}</span>
                            <code className="text-[9px] text-muted-foreground truncate max-w-[150px]" dir="ltr">{s.url}</code>
                            {onInjectLink && !injected.has(i) && (
                                <Button variant="default" size="sm" className="h-6 text-[10px] gap-1 shrink-0" onClick={() => handleInject(s, i)}>
                                    Inject
                                </Button>
                            )}
                            {injected.has(i) && <Badge variant="outline" className="text-[9px] text-green-600 border-green-500/30">✓</Badge>}
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 shrink-0" onClick={() => handleCopyLink(s)}>
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            {fetched && suggestions.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-2">All articles already linked or no other articles for the same site</p>
            )}
        </div>
    );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';

// G6: IndexNow Instant Indexing Component
export function IndexNowPinger() {
    const [articleUrl, setArticleUrl] = useState('');
    const [pinging, setPinging] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any>(null);

    const handlePing = async () => {
        if (!articleUrl.trim()) return;
        setPinging(true);
        try {
            const res = await fetch('/api/indexnow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: articleUrl.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
            toast.success(data.summary);
        } catch {
            toast.error('Failed to send indexing request');
        } finally {
            setPinging(false);
        }
    };

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Instant Indexing (IndexNow)</h4>
                {result && <Badge variant="outline" className="text-[10px]">{result.summary}</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground">
                Send published article URL to search engines for instant crawling — Bing + Yandex + Google (optional).
            </p>
            <div className="flex gap-2">
                <input
                    type="url"
                    dir="ltr"
                    placeholder="https://yoursite.com/article-slug"
                    value={articleUrl}
                    onChange={(e) => setArticleUrl(e.target.value)}
                    className="flex-1 text-sm px-3 py-1.5 rounded-md border bg-background font-mono"
                />
                <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0" onClick={handlePing} disabled={pinging || !articleUrl.trim()}>
                    {pinging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                    Send Ping
                </Button>
            </div>
            {result?.results && (
                <div className="flex gap-2">
                    {result?.results.map((r: { engine: string; status: string; code?: number }, i: number) => (
                        <Badge key={i} variant={r.status === 'success' ? 'default' : 'secondary'} className="text-[10px] gap-1">
                            {r.engine}: {r.status === 'success' ? '✓' : '✗'}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

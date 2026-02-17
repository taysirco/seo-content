'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

interface ImageAltCheckerProps {
    content: string;
    keyword: string;
}

// W16-2: Image Alt Text Checker
export function ImageAltChecker({ content, keyword }: ImageAltCheckerProps) {
    const analysis = useMemo(() => {
        const imgRegex = /<img[^>]*>/gi;
        const imgs: { tag: string; src: string; alt: string; hasAlt: boolean }[] = [];
        let m;
        while ((m = imgRegex.exec(content)) !== null) {
            const tag = m[0];
            const srcMatch = tag.match(/src="([^"]*)"/i);
            const altMatch = tag.match(/alt="([^"]*)"/i);
            const src = srcMatch?.[1] || '';
            const alt = altMatch?.[1] || '';
            imgs.push({ tag, src, alt, hasAlt: !!altMatch && alt.trim().length > 0 });
        }
        if (imgs.length === 0) return null;
        const missing = imgs.filter(i => !i.hasAlt);
        return { imgs, missing, total: imgs.length };
    }, [content]);

    if (!analysis) return null;

    return (
        <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Image Alt Text Check
                <Badge variant={analysis.missing.length === 0 ? 'default' : 'destructive'} className="text-[9px]">
                    {analysis.missing.length === 0 ? '✓ Complete' : `${analysis.missing.length}/${analysis.total} missing alt`}
                </Badge>
            </h4>
            {analysis.missing.length > 0 && (
                <div className="space-y-1.5">
                    {analysis.missing.map((img, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] p-2 rounded bg-red-500/5 border border-red-500/10">
                            <span className="text-red-600 shrink-0">❌</span>
                            <code className="flex-1 truncate text-[9px]" dir="ltr">{img.src.slice(0, 60) || '[no src]'}</code>
                            <span className="text-[9px] text-muted-foreground shrink-0">Suggest: &quot;{keyword}&quot;</span>
                        </div>
                    ))}
                    <p className="text-[9px] text-muted-foreground">Add descriptive alt text with keyword for each image</p>
                </div>
            )}
            {analysis.missing.length === 0 && (
                <p className="text-[10px] text-green-600">✅ All images ({analysis.total}) have alt text</p>
            )}
        </div>
    );
}

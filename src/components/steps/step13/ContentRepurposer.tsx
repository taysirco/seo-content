'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ContentRepurposerProps {
    keyword: string;
    content: string;
}

// W14-2: Content Repurposing Generator
export function ContentRepurposer({ keyword, content }: ContentRepurposerProps) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [outputs, setOutputs] = useState<{ type: string; text: string }[]>([]);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyText = (key: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(key);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleGenerate = async () => {
        if (!content) return;
        setLoading(true);
        try {
            const prompt = `
        Based on this SEO article about "${keyword}", generate 5 content repurposing assets:
        1. LinkedIn: Professional, industry-focused, bullet points, hashtags.
        2. Twitter Thread: A thread of 5-7 tweets. Start with a hook. Separate tweets with "---".
        3. Facebook: Engaging, question-based, emoticons, hashtags.
        4. Newsletter: Subject Line + Body (Short, punchy, drives traffic to article).
        5. Instagram: Caption + Image Suggestion.

        Return ONLY the JSON array:
        [
          { "type": "LinkedIn", "text": "..." },
          { "type": "Twitter Thread", "text": "..." },
          { "type": "Facebook", "text": "..." },
          { "type": "Newsletter", "text": "Subject: ...\n\nBody: ..." },
          { "type": "Instagram", "text": "Image: ...\n\nCaption: ..." }
        ]
      `;
            // We pass a truncated content to avoid token limits
            const context = content.slice(0, 10000).replace(/<[^>]+>/g, ' ');
            const response = await fetch('/api/ai/tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: 'You are an expert content repurposer. Convert article content into different social media formats. Return valid JSON array.',
                    userPrompt: prompt + `\n\nArticle Content:\n${context}`,
                    jsonMode: true,
                }),
            });
            if (!response.ok) throw new Error('Failed to generate');
            const data = await response.json();
            const parsed = JSON.parse(data.result);
            setOutputs(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate social content');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border bg-card">
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-pink-500" />
                    Content Repurposing
                    {outputs.length > 0 && <Badge variant="secondary" className="text-[9px]">{outputs.length} posts</Badge>}
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    {outputs.length === 0 ? (
                        <div className="text-center py-4 space-y-2">
                            <p className="text-xs text-muted-foreground">Generate social media posts from this article (LinkedIn, Twitter, Facebook)</p>
                            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-2">
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                                Generate Posts
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {outputs.map((post, i) => (
                                <div key={i} className="p-3 rounded bg-muted/20 border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="font-semibold">{post.type}</Badge>
                                        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => copyText(post.type, post.text)}>
                                            {copiedField === post.type ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            Copy
                                        </Button>
                                    </div>
                                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{post.text}</p>
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading} className="w-full text-xs">
                                {loading ? 'Regenerating...' : 'Regenerate All'}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

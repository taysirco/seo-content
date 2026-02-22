'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

interface ReadabilitySuggestionsProps {
    content: string;
}

// W14-4: Readability Improvement Suggestions
export function ReadabilitySuggestions({ content }: ReadabilitySuggestionsProps) {
    const [expanded, setExpanded] = useState(false);

    const analysis = useMemo(() => {
        const plain = (() => { const d = document.createElement('div'); d.innerHTML = content; return d.textContent || ''; })();
        const sentences = plain.split(/[.!?؟\n]+/).filter(s => s.trim().length > 0);
        const words = plain.split(/\s+/).filter(w => w.trim().length > 0);
        const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;

        const longSentences = sentences.filter(s => s.split(/\s+/).length > 25);
        const veryLongSentences = sentences.filter(s => s.split(/\s+/).length > 40);

        const paragraphs = content.split(/<\/p>/i).filter(p => p.includes('<p'));
        const longParagraphs = paragraphs.filter(p => {
            const text = p.replace(/<[^>]+>/g, '');
            return text.split(/\s+/).length > 60; // >60 words
        });

        // NLP: Detect Arabic Transition Words (كلمات انتقالية)
        const transitionWords = [
            'لذلك', 'إذن', 'مع ذلك', 'بينما', 'حيث أن', 'من ناحية أخرى', 'وبالتالي', 'علاوة على ذلك',
            'بالإضافة إلى ذلك', 'في الواقع', 'على سبيل المثال', 'بناءً على ذلك', 'خلاصة القول',
            'في النهاية', 'أخيراً', 'نتيجة لذلك', 'بالمقابل', 'في حين', 'لأن', 'بسبب', 'لذا',
            'إلى جانب ذلك', 'على وجه التحديد', 'بصفتها', 'لكن', 'بل', 'أو' // Some basics included
        ];

        let transitionCount = 0;
        transitionWords.forEach(tw => {
            const regex = new RegExp(`\\b${tw}\\b`, 'gi');
            const matches = plain.match(regex);
            if (matches) transitionCount += matches.length;
        });

        const optimalTransitions = Math.max(2, Math.floor(words.length / 50)); // Target 1 transition per 50 words approx
        const transitionDeficit = Math.max(0, optimalTransitions - transitionCount);

        let penalty = (longSentences.length * 2) + (veryLongSentences.length * 4) + (longParagraphs.length * 5);
        if (transitionDeficit > 0) penalty += (transitionDeficit * 2);

        return {
            avgWordsPerSentence,
            longSentencesCount: longSentences.length,
            veryLongSentencesCount: veryLongSentences.length,
            longParagraphsCount: longParagraphs.length,
            transitionCount,
            transitionDeficit,
            score: Math.max(0, 100 - penalty),
        };
    }, [content]);

    return (
        <div className="rounded-lg border bg-card">
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    Readability & Flow Check
                    <Badge variant={analysis.score >= 80 ? 'default' : analysis.score >= 60 ? 'secondary' : 'destructive'} className="text-[9px]">
                        Score {analysis.score}/100
                    </Badge>
                    {(analysis.longSentencesCount > 0 || analysis.longParagraphsCount > 0 || analysis.transitionDeficit > 0) && (
                        <Badge variant="outline" className="text-[9px] text-purple-600 border-purple-500/30">
                            Needs improvements
                        </Badge>
                    )}
                </span>
                <span className="text-muted-foreground text-xs">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2 rounded bg-muted/30 border">
                            <span className="text-muted-foreground block mb-1">Avg. Sentence length:</span>
                            <p className={`font-semibold ${analysis.avgWordsPerSentence > 20 ? 'text-red-500' : 'text-green-500'}`}>
                                {analysis.avgWordsPerSentence.toFixed(1)} words
                            </p>
                        </div>
                        <div className="p-2 rounded bg-muted/30 border">
                            <span className="text-muted-foreground block mb-1">Very Long Sentences:</span>
                            <p className={`font-semibold ${analysis.veryLongSentencesCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {analysis.veryLongSentencesCount}
                            </p>
                        </div>
                        <div className="p-2 rounded bg-muted/30 border">
                            <span className="text-muted-foreground block mb-1">Transition Words:</span>
                            <p className={`font-semibold ${analysis.transitionDeficit > 0 ? 'text-yellow-600' : 'text-green-500'}`}>
                                {analysis.transitionCount} used
                            </p>
                        </div>
                    </div>

                    {(analysis.longSentencesCount > 0 || analysis.longParagraphsCount > 0 || analysis.transitionDeficit > 0) ? (
                        <div className="space-y-2">
                            <p className="text-[10px] font-semibold text-purple-600">Suggestions:</p>
                            <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                                {analysis.longSentencesCount > 0 && (
                                    <li>Shorten {analysis.longSentencesCount} sentences (avoid {'>'}25 words).</li>
                                )}
                                {analysis.veryLongSentencesCount > 0 && (
                                    <li>Break up {analysis.veryLongSentencesCount} very long sentences (they confuse readers).</li>
                                )}
                                {analysis.longParagraphsCount > 0 && (
                                    <li>Split {analysis.longParagraphsCount} paragraphs (wall of text). Aim for 3-4 lines max.</li>
                                )}
                                {analysis.transitionDeficit > 0 && (
                                    <li>The text flow is a bit robotic. Add roughly {analysis.transitionDeficit} more Arabic transition words (لذلك، علاوة على ذلك، من ناحية أخرى) to connect ideas.</li>
                                )}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            ✓ Excellent readability and flow! Text feels natural with good transitions.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

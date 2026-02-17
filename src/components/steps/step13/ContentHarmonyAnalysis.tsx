'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { callGemini } from '@/lib/ai-client';
import type { PipelineState } from '@/types/pipeline';

interface ContentHarmonyAnalysisProps {
    content: string;
    keyword: string;
    store: PipelineState;
}

interface HarmonyResult {
    score: number;
    verdict: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    issues: string[];
    alignment: {
        titleIntent: number; // 0-100
        introBody: number;
        conclusionPromise: number;
    };
}

export function ContentHarmonyAnalysis({ content, keyword, store }: ContentHarmonyAnalysisProps) {
    const [result, setResult] = useState<HarmonyResult | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        if (!content) return;
        setLoading(true);
        try {
            const title = store.step2?.merged?.title || 'Unknown Title';
            const prompt = `
        Analyze the "Semantic Harmony" of this article.
        Keyword: "${keyword}"
        Title: "${title}"
        
        Content Highlight (First 500 words):
        ${content.replace(/<[^>]+>/g, ' ').slice(0, 500)}...
        
        Content Conclusion (Last 500 words):
        ${content.replace(/<[^>]+>/g, ' ').slice(-500)}
        
        Task:
        1. Check if the Title matches the User Intent of the Keyword.
        2. Check if the Introduction delivers on the Title's promise immediatey.
        3. Check if the Conclusion resolves the core problem defined in the Intro.
        
        Return JSON Code ONLY:
        {
          "score": 0-100,
          "verdict": "Excellent" | "Good" | "Fair" | "Poor",
          "issues": ["Issue 1", "Issue 2"],
          "alignment": {
            "titleIntent": 0-100,
            "introBody": 0-100,
            "conclusionPromise": 0-100
          }
        }
      `;

            const response = await callGemini({
                systemInstruction: 'You are an expert Content Strategist analyzing semantic alignment.',
                userPrompt: prompt,
                temperature: 0.2, // Low temp for analysis
                jsonMode: true
            });

            const parsed = JSON.parse(response);
            setResult(parsed);
            toast.success('تم تحليل التناغم الدلالي');
        } catch (error) {
            console.error(error);
            toast.error('فشل التحليل');
        } finally {
            setLoading(false);
        }
    };

    if (!content) return null;

    return (
        <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-500" />
                        تحليل التناغم الدلالي (Content Harmony)
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={loading}>
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'تحليل'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {!result ? (
                    <p className="text-sm text-muted-foreground">اضغط "تحليل" للتحقق من توافق العنوان والمقدمة والخاتمة.</p>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold">{result.score}/100</span>
                                <Badge variant={result.score > 80 ? 'default' : 'secondary'} className={result.score > 80 ? 'bg-green-500' : ''}>
                                    {result.verdict}
                                </Badge>
                            </div>
                            <div className="space-y-1 w-1/2">
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>العنوان/النية</span>
                                    <span>{result.alignment.titleIntent}%</span>
                                </div>
                                <Progress value={result.alignment.titleIntent} className="h-1.5" />

                                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>المقدمة/المحتوى</span>
                                    <span>{result.alignment.introBody}%</span>
                                </div>
                                <Progress value={result.alignment.introBody} className="h-1.5" />

                                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>الخاتمة/الوعد</span>
                                    <span>{result.alignment.conclusionPromise}%</span>
                                </div>
                                <Progress value={result.alignment.conclusionPromise} className="h-1.5" />
                            </div>
                        </div>

                        {result.issues.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded text-xs space-y-1 border border-red-100 dark:border-red-900/30">
                                <span className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> مشاكل التناغم:
                                </span>
                                <ul className="list-disc list-inside text-red-600 dark:text-red-400/80">
                                    {result.issues.map((issue, i) => (
                                        <li key={i}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {result.score > 90 && (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> المقال متناغم تماماً ويحقق وعد العنوان.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

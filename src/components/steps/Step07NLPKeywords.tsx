'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Filter, BarChart3 } from 'lucide-react';
import { extractDomain } from '@/lib/utils/extract-domain';

const CATEGORY_LABELS: Record<string, string> = {
  primaryKeywords: 'Primary',
  secondaryKeywords: 'Secondary',
  lsiKeywords: 'LSI',
  technicalTerms: 'Technical',
  longTailPhrases: 'Long-Tail',
  questionPhrases: 'Questions',
};

const ALL_CATEGORIES = Object.keys({ primaryKeywords: 1, secondaryKeywords: 1, lsiKeywords: 1, technicalTerms: 1, longTailPhrases: 1, questionPhrases: 1 });
const PRIORITY_OPTIONS = ['all', 'high', 'medium', 'low'] as const;
const PRIORITY_LABELS: Record<string, string> = { all: 'All', high: 'High', medium: 'Medium', low: 'Low' };

export function Step07NLPKeywords() {
  const { keyword, step3, step7, setStep7, setStatus, setError } = usePipelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const handleProcess = async () => {
    if (!step3 || step3.contents.length === 0) return;
    setIsProcessing(true);
    setStatus('processing');
    setProgressPercent(0);

    try {
      const total = step3.contents.length;

      // OPT: Single batch call — backend handles per-competitor + combined in ONE Gemini call
      setProgressText(`NLP analysis for ${total} competitors in batch...`);
      setProgressPercent(30);

      const res = await fetch('/api/ai/nlp-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          contents: step3.contents.map(c => ({ url: c.url, text: c.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'NLP analysis failed');

      setStep7(data.perCompetitor, data.combined);
      setProgressPercent(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsProcessing(false);
      setStatus('idle');
      setProgressText('');
      setProgressPercent(0);
    }
  };

  return (
    <StepContainer
      onProcess={handleProcess}
      processLabel="Analyze NLP Keywords"
      isProcessing={isProcessing}
      canProceed={!!step7?.combined}
      progressText={progressText}
      progressPercent={progressPercent}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          NLP keyword analysis: primary, secondary, LSI, long-tail, and questions.
        </p>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing keywords...</span>
          </div>
        )}

        {step7 && (
          <Tabs defaultValue="combined" dir="rtl">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="combined">Combined Analysis</TabsTrigger>
              {step7.perCompetitor.length > 1 && <TabsTrigger value="compare">Compare Competitors</TabsTrigger>}
              {step7.perCompetitor.map((_, idx) => {
                const url = step3?.contents[idx]?.url;
                const domain = url ? extractDomain(url) : `Competitor ${idx + 1}`;
                return (
                  <TabsTrigger key={idx} value={`comp-${idx}`} className="text-[11px] max-w-[100px] truncate">
                    {domain}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Competitor Score Comparison */}
            {step7.perCompetitor.length > 1 && (
              <TabsContent value="compare" className="mt-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">NLP Score Comparison</span>
                  </div>
                  <div className="space-y-2">
                    {step7.perCompetitor.map((comp, idx) => {
                      const url = step3?.contents[idx]?.url;
                      const domain = url ? extractDomain(url) : `Competitor ${idx + 1}`;
                      const score = comp.contentScore;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground w-24 truncate text-left" dir="ltr">{domain}</span>
                          <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all ${
                                score >= 75 ? 'bg-green-500/70' : score >= 50 ? 'bg-blue-500/70' : 'bg-yellow-500/70'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{score}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 pt-1 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500/70" /> ≥ 75 Excellent</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/70" /> 50-74 Good</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500/70" /> {'<'} 50 Weak</span>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Per-competitor individual analysis */}
            {step7.perCompetitor.map((comp, idx) => (
              <TabsContent key={idx} value={`comp-${idx}`} className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Score: {comp.contentScore}/100</Badge>
                    {comp.criticalGaps?.length > 0 && (
                      <Badge variant="destructive" className="text-xs">{comp.criticalGaps.length} gaps</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(comp.foundInContent).map(([cat, items]) => {
                      const kws = items as { term: string; count: number }[];
                      if (!kws || kws.length === 0) return null;
                      return (
                        <div key={cat} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                            <Badge variant="secondary">{kws.length}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {kws.map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {kw.term} <span className="opacity-50">({kw.count})</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {comp.seoTips?.length > 0 && (
                    <div className="rounded-lg border p-3 space-y-1">
                      <span className="text-xs font-medium">Tips</span>
                      {comp.seoTips.map((tip, i) => (
                        <p key={i} className="text-xs text-muted-foreground">• {tip}</p>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}

            <TabsContent value="combined" className="mt-4">
          <div className="space-y-6">
            {/* Score */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <div className="text-center">
                <div className="text-3xl font-bold">{step7.combined.contentScore}</div>
                <div className="text-xs text-muted-foreground">Coverage Score</div>
              </div>
              <Progress value={step7.combined.contentScore} className="flex-1" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Filter:</span>
              <div className="flex gap-1">
                <Button variant={filterCat === 'all' ? 'default' : 'outline'} size="sm" className="h-6 text-[10px]" onClick={() => setFilterCat('all')}>All</Button>
                {ALL_CATEGORIES.map(cat => (
                  <Button key={cat} variant={filterCat === cat ? 'default' : 'outline'} size="sm" className="h-6 text-[10px]" onClick={() => setFilterCat(cat)}>
                    {CATEGORY_LABELS[cat]}
                  </Button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground mr-2">Priority:</span>
              <div className="flex gap-1">
                {PRIORITY_OPTIONS.map(p => (
                  <Button key={p} variant={filterPriority === p ? 'default' : 'outline'} size="sm" className="h-6 text-[10px]" onClick={() => setFilterPriority(p)}>
                    {PRIORITY_LABELS[p]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Found Keywords */}
            <div className="space-y-4">
              <h4 className="font-semibold">Found in Content</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(step7.combined.foundInContent)
                  .filter(([cat]) => filterCat === 'all' || cat === filterCat)
                  .map(([cat, items]) => {
                  const keywords = items as { term: string; count: number }[];
                  if (!keywords || keywords.length === 0) return null;
                  return (
                    <div key={cat} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                        <Badge variant="secondary">{keywords.length}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {keywords.map((kw, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {kw.term} <span className="opacity-50 mr-1">({kw.count})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suggested Keywords */}
            <div className="space-y-4">
              <h4 className="font-semibold text-green-600 dark:text-green-400">Suggested to Add</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(step7.combined.suggestedToAdd)
                  .filter(([cat]) => filterCat === 'all' || cat === filterCat)
                  .map(([cat, items]) => {
                  const keywords = (items as { term: string; priority: string }[])
                    .filter(kw => filterPriority === 'all' || kw.priority === filterPriority);
                  if (!keywords || keywords.length === 0) return null;
                  return (
                    <div key={cat} className="rounded-lg border border-green-500/20 p-3 space-y-2 bg-green-500/5">
                      <span className="text-sm font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                      <div className="flex flex-wrap gap-1">
                        {keywords.map((kw, idx) => (
                          <Badge key={idx} variant={kw.priority === 'high' ? 'default' : 'secondary'} className="text-xs">
                            {kw.term}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Critical Gaps */}
            {step7.combined.criticalGaps.length > 0 && (
              <div className="rounded-lg border border-red-500/20 p-4 space-y-2 bg-red-500/5">
                <h4 className="font-semibold text-sm text-red-600 dark:text-red-400">فجوات حرجة</h4>
                <div className="flex flex-wrap gap-2">
                  {step7.combined.criticalGaps.map((gap, idx) => (
                    <Badge key={idx} variant="destructive" className="text-xs">{gap}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {step7.combined.seoTips.length > 0 && (
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-semibold text-sm">نصائح SEO</h4>
                <ul className="space-y-1">
                  {step7.combined.seoTips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </StepContainer>
  );
}

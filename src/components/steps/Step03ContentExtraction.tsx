'use client';

import { useState, useMemo } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, AlertTriangle, ClipboardPaste, BarChart3, RefreshCw, ArrowUpDown } from 'lucide-react';
import type { CompetitorContent } from '@/types/pipeline';
import { extractDomain } from '@/lib/utils/extract-domain';

// SM-2: Simple content hash for drift detection
function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function Step03ContentExtraction() {
  const { step1, step3, setStep3, setStatus, setError } = usePipelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [manualPasteIdx, setManualPasteIdx] = useState<number | null>(null);
  const [manualText, setManualText] = useState('');
  const [prevHashes, setPrevHashes] = useState<Record<string, string>>({});
  const [driftResults, setDriftResults] = useState<Record<string, 'changed' | 'same' | 'new'>>({});

  const selectedUrls = step1?.competitors.filter(c => c.selected).map(c => c.url) || [];

  const handleProcess = async () => {
    if (selectedUrls.length === 0) return;
    setIsProcessing(true);
    setStatus('processing');
    setProgressPercent(0);

    try {
      const total = selectedUrls.length;

      // OPT: Single batch call — backend extracts all URLs in parallel
      setProgressText(`Extracting content from ${total} pages in parallel...`);
      setProgressPercent(20);

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: selectedUrls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract content');

      const allContents: CompetitorContent[] = data.contents || selectedUrls.map((url: string) => ({
        url, text: '[Extraction failed]', wordCount: 0, extractedAt: new Date().toISOString(),
      }));
      setProgressPercent(90);

      // SM-2: Compute hashes and detect drift
      const newHashes: Record<string, string> = {};
      const drift: Record<string, 'changed' | 'same' | 'new'> = {};
      for (const c of allContents) {
        if (c.wordCount > 0) {
          const h = simpleHash(c.text);
          newHashes[c.url] = h;
          if (prevHashes[c.url]) {
            drift[c.url] = prevHashes[c.url] === h ? 'same' : 'changed';
          } else {
            drift[c.url] = 'new';
          }
        }
      }
      setPrevHashes(prev => ({ ...prev, ...newHashes }));
      setDriftResults(drift);

      setStep3(allContents);
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

  const handleManualPaste = (idx: number) => {
    if (!step3 || !manualText.trim()) return;
    const updated: CompetitorContent[] = step3.contents.map((c, i) =>
      i === idx
        ? { ...c, text: manualText.trim(), wordCount: manualText.trim().split(/\s+/).filter(Boolean).length }
        : c
    );
    setStep3(updated);
    setManualPasteIdx(null);
    setManualText('');
  };

  const totalWords = step3?.contents.reduce((sum, c) => sum + c.wordCount, 0) || 0;
  const failedCount = step3?.contents.filter(c => c.text.startsWith('[') && c.wordCount === 0).length || 0;

  const wordStats = useMemo(() => {
    if (!step3 || step3.contents.length === 0) return null;
    const counts = step3.contents.map(c => c.wordCount);
    const maxWords = Math.max(...counts);
    const avgWords = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
    return { counts, maxWords, avgWords };
  }, [step3]);

  return (
    <StepContainer
      onProcess={handleProcess}
      processLabel="Extract Content"
      isProcessing={isProcessing}
      canProceed={!!step3 && step3.contents.some(c => c.wordCount > 0)}
      progressText={progressText}
      progressPercent={progressPercent}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Extract clean text from {selectedUrls.length} competitor pages (Jina AI → Cheerio fallback).
        </p>

        {step3 && step3.contents.length > 0 && (
          <>
            {/* Summary */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Badge variant="secondary">{step3.contents.length} pages</Badge>
              <Badge variant="secondary">{totalWords.toLocaleString()} total words</Badge>
              {wordStats && <Badge variant="outline">avg: {wordStats.avgWords.toLocaleString()}</Badge>}
              {failedCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {failedCount} failed
                </Badge>
              )}
              {/* SM-2: Drift detection results */}
              {Object.keys(driftResults).length > 0 && (() => {
                const changed = Object.values(driftResults).filter(d => d === 'changed').length;
                const same = Object.values(driftResults).filter(d => d === 'same').length;
                return (
                  <>
                    {changed > 0 && (
                      <Badge variant="default" className="gap-1 bg-orange-500">
                        <ArrowUpDown className="w-3 h-3" />
                        {changed} changed
                      </Badge>
                    )}
                    {same > 0 && (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-500/30">
                        <RefreshCw className="w-3 h-3" />
                        {same} unchanged
                      </Badge>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Word Count Comparison Chart */}
            {wordStats && wordStats.maxWords > 0 && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium">Word Count Comparison</span>
                </div>
                <div className="space-y-1.5">
                  {step3.contents.map((content, idx) => {
                    const pct = wordStats.maxWords > 0 ? (content.wordCount / wordStats.maxWords) * 100 : 0;
                    const domain = extractDomain(content.url) || `Competitor ${idx + 1}`;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-24 truncate text-left" dir="ltr">{domain}</span>
                        <div className="flex-1 h-4 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              content.wordCount === 0
                                ? 'bg-red-400/50'
                                : content.wordCount >= wordStats.avgWords
                                ? 'bg-green-500/70'
                                : 'bg-blue-500/70'
                            }`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono w-12 text-left">{content.wordCount.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 pt-1 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500/70" /> ≥ avg</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/70" /> {'<'} avg</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400/50" /> failed</span>
                </div>
              </div>
            )}

            <Tabs defaultValue="content-0" dir="rtl">
              <TabsList className="flex-wrap h-auto gap-1">
                {step3.contents.map((content, idx) => {
                  const domain = extractDomain(content.url) || `منافس ${idx + 1}`;
                  return (
                    <TabsTrigger key={idx} value={`content-${idx}`} className="gap-2">
                      <span className="max-w-[100px] truncate text-[11px]" dir="ltr">{domain}</span>
                      <Badge
                        variant={content.wordCount > 0 ? 'secondary' : 'destructive'}
                        className="text-[10px]"
                      >
                        {content.wordCount > 0 ? `${content.wordCount}` : '✗'}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {step3.contents.map((content, idx) => (
                <TabsContent key={idx} value={`content-${idx}`} className="mt-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-muted-foreground truncate max-w-md" dir="ltr">{content.url}</p>
                      <div className="flex items-center gap-2">
                        <Badge>{content.wordCount} words</Badge>
                        <Button
                          variant={content.wordCount === 0 ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setManualPasteIdx(manualPasteIdx === idx ? null : idx)}
                          className="gap-1 text-xs"
                        >
                          <ClipboardPaste className="w-3 h-3" />
                          {content.wordCount === 0 ? 'Manual Paste (required)' : 'Edit Content'}
                        </Button>
                      </div>
                    </div>

                    {/* Manual paste fallback */}
                    {manualPasteIdx === idx && (
                      <div className="space-y-2 mb-3 p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                          Auto-extraction failed. Open the URL and paste content manually:
                        </p>
                        <Textarea
                          rows={6}
                          placeholder="Paste page content here..."
                          value={manualText}
                          onChange={(e) => setManualText(e.target.value)}
                        />
                        <Button size="sm" onClick={() => handleManualPaste(idx)} disabled={!manualText.trim()}>
                          Save Content
                        </Button>
                      </div>
                    )}

                    <ScrollArea className="h-[400px]">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {content.text}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Extracting content from {selectedUrls.length} pages...</span>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

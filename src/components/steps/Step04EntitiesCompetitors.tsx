'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  people: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  organizations: 'bg-green-500/10 text-green-600 dark:text-green-400',
  locations: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  products: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  concepts: 'bg-red-500/10 text-red-600 dark:text-red-400',
  events: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  technologies: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  other: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  people: 'People',
  organizations: 'Organizations',
  locations: 'Locations',
  products: 'Products',
  concepts: 'Concepts',
  events: 'Events',
  technologies: 'Technologies',
  other: 'Other',
};

export function Step04EntitiesCompetitors() {
  const { step3, step4, setStep4, setStatus, setError, keyword } = usePipelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  const competitorCount = step3?.contents.length || 0;

  const handleProcess = async () => {
    if (!step3 || step3.contents.length === 0) return;
    setIsProcessing(true);
    setStatus('processing');
    setProgressPercent(0);

    try {
      const allContents = step3.contents.map(c => ({ url: c.url, text: c.text }));
      const BATCH = 3;
      const totalBatches = Math.ceil(allContents.length / BATCH);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allPerCompetitor: any[] = [];

      // Phase 1: Fire ALL batches in parallel — each uses a different API key
      setProgressText(`Analyzing ${totalBatches} batches in parallel...`);
      const emptyResult = (url: string, reason: string) => ({
        title: url.replace(/^https?:\/\//, '').split('/')[0],
        foundInContent: { people: [], organizations: [], locations: [], products: [], concepts: [], events: [], technologies: [], other: [] },
        suggestedToAdd: { people: [], organizations: [], locations: [], products: [], concepts: [], events: [], technologies: [], other: [] },
        contentScore: 0, criticalGaps: [reason],
      });

      const batchPromises = Array.from({ length: totalBatches }, (_, b) => {
        const batch = allContents.slice(b * BATCH, (b + 1) * BATCH);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 90000);
        return fetch('/api/ai/entities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: batch, keyword, mode: 'competitors' }),
          signal: controller.signal,
        }).then(async res => {
          clearTimeout(timer);
          const data = await res.json();
          if (res.ok && data.perCompetitor) return { ok: true, results: data.perCompetitor, batch };
          return { ok: false, results: batch.map(c => emptyResult(c.url, 'Batch failed')), batch };
        }).catch(() => {
          clearTimeout(timer);
          return { ok: false, results: batch.map(c => emptyResult(c.url, 'Batch timed out')), batch };
        });
      });

      const settled = await Promise.all(batchPromises);
      let doneCount = 0;
      for (const s of settled) {
        allPerCompetitor.push(...s.results);
        doneCount++;
        setProgressPercent(Math.round((doneCount / (totalBatches + 1)) * 100));
        setProgressText(`Completed ${doneCount}/${totalBatches} batches...`);
      }

      // Phase 2: Merge all results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validSources = allPerCompetitor.filter((r: any) =>
        r.contentScore > 0 || Object.values(r.foundInContent).some((arr: unknown) => Array.isArray(arr) && arr.length > 0)
      );

      if (validSources.length === 0) {
        setError('All competitor analyses failed. Check your API key or retry.');
        return;
      }

      setProgressText(`Merging entities from ${validSources.length} competitors...`);
      setProgressPercent(85);

      const mergeController = new AbortController();
      const mergeTimer = setTimeout(() => mergeController.abort(), 60000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entitySources = validSources.map((r: any) => JSON.stringify(r.foundInContent));
      const mergeRes = await fetch('/api/ai/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'merge', keyword, entitySources }),
        signal: mergeController.signal,
      });
      clearTimeout(mergeTimer);
      const mergeData = await mergeRes.json();

      if (mergeRes.ok && mergeData.merged) {
        setStep4(allPerCompetitor, mergeData.merged);
      } else {
        // Save perCompetitor even if merge fails — better than nothing
        setStep4(allPerCompetitor, { entities: { people: [], organizations: [], locations: [], products: [], concepts: [], events: [], technologies: [], other: [] }, summary: 'Merge failed — showing individual results', totalUnique: 0 });
      }
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
      processLabel="Analyze Entities"
      isProcessing={isProcessing}
      canProceed={!!step4?.merged}
      progressText={progressText}
      progressPercent={progressPercent}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Analyze entities (people, organizations, concepts...) from competitor content and merge.
        </p>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing {competitorCount} competitors and merging entities...</span>
          </div>
        )}

        {step4 && (
          <Tabs defaultValue="merged" dir="rtl">
            <TabsList>
              <TabsTrigger value="merged">Merged Entities</TabsTrigger>
              {step4.perCompetitor.map((analysis, idx) => {
                const domain = analysis.title?.slice(0, 20) || `Competitor ${idx + 1}`;
                return (
                  <TabsTrigger key={idx} value={`comp-${idx}`} className="text-[11px] max-w-[120px] truncate">
                    {domain}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="merged" className="mt-4">
              {step4.merged && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Merged Entities</h3>
                    <Badge variant="secondary">{step4.merged.totalUnique} unique entities</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{step4.merged.summary}</p>

                  <Accordion type="multiple" className="w-full">
                    {Object.entries(step4.merged.entities).map(([category, entities]) => {
                      const items = entities as { name: string; relevance: number }[];
                      if (!items || items.length === 0) return null;
                      return (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger className="text-sm">
                            <div className="flex items-center gap-2">
                              <Badge className={CATEGORY_COLORS[category]}>
                                {CATEGORY_LABELS[category] || category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{items.length} entities</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {items.map((entity: { name: string; relevance: number }, idx: number) => (
                                <span
                                  key={idx}
                                  className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS[category]}`}
                                >
                                  {entity.name}
                                  <span className="opacity-60 mr-1">({entity.relevance})</span>
                                </span>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              )}
            </TabsContent>

            {step4.perCompetitor.map((analysis, idx) => (
              <TabsContent key={idx} value={`comp-${idx}`} className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-sm">{analysis.title}</h4>
                    <Badge variant="outline">Coverage: {analysis.contentScore}/100</Badge>
                  </div>
                  {analysis.criticalGaps.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {analysis.criticalGaps.map((gap, gIdx) => (
                        <Badge key={gIdx} variant="destructive" className="text-xs">{gap}</Badge>
                      ))}
                    </div>
                  )}
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(analysis.foundInContent).map(([cat, items]) => {
                      const entities = items as { name: string; count: number }[];
                      if (!entities || entities.length === 0) return null;
                      return (
                        <AccordionItem key={cat} value={cat}>
                          <AccordionTrigger className="text-sm">
                            <div className="flex items-center gap-2">
                              <Badge className={CATEGORY_COLORS[cat]}>{CATEGORY_LABELS[cat] || cat}</Badge>
                              <span className="text-xs text-muted-foreground">{entities.length}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {entities.map((e, eIdx) => (
                                <span key={eIdx} className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS[cat]}`}>
                                  {e.name} <span className="opacity-60">({e.count})</span>
                                </span>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </StepContainer>
  );
}

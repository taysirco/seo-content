'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Sparkles } from 'lucide-react';

const GENERATED_CATEGORIES: { key: string; label: string; labelAr: string; color: string }[] = [
  { key: 'bigrams', label: 'Bigrams', labelAr: 'ثنائية', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  { key: 'trigrams', label: 'Trigrams', labelAr: 'ثلاثية', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
  { key: 'fourgrams', label: '4-Grams', labelAr: 'رباعية', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  { key: 'informational', label: 'Informational', labelAr: 'معلوماتية', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
  { key: 'commercial', label: 'Commercial', labelAr: 'تجارية', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  { key: 'longtail', label: 'Long-Tail', labelAr: 'طويلة الذيل', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  { key: 'seasonal', label: 'Seasonal', labelAr: 'موسمية', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  { key: 'authority', label: 'Authority', labelAr: 'سلطوية', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
];

export function Step06NGrams() {
  const { keyword, step3, step6, setStep6, setStatus, setError } = usePipelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [excludedPicked, setExcludedPicked] = useState<Set<number>>(
    new Set(step6?.excludedPicked || [])
  );
  const [excludedUnique, setExcludedUnique] = useState<Set<number>>(
    new Set(step6?.excludedUnique || [])
  );

  const syncExclusions = (ep: Set<number>, eu: Set<number>) => {
    if (!step6) return;
    setStep6({ ...step6, excludedPicked: [...ep], excludedUnique: [...eu] });
  };

  const togglePicked = (idx: number) => {
    setExcludedPicked(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      syncExclusions(next, excludedUnique);
      return next;
    });
  };

  const toggleUnique = (idx: number) => {
    setExcludedUnique(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      syncExclusions(excludedPicked, next);
      return next;
    });
  };

  const [progressPercent, setProgressPercent] = useState(0);

  const handleProcess = async () => {
    if (!step3 || step3.contents.length === 0 || !keyword) return;
    setIsProcessing(true);
    setStatus('processing');
    setProgressPercent(0);

    try {
      setProgressText('Analyzing and extracting N-Grams from competitor content...');
      setProgressPercent(20);

      const res = await fetch('/api/ai/ngrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          contents: step3.contents.map(c => c.text),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract N-Grams');
      setProgressPercent(90);

      // Preserve any existing generated 8-category data
      const prev = step6;
      setStep6({ ...data, generated: prev?.generated || data.generated });
      setExcludedPicked(new Set());
      setExcludedUnique(new Set());
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

  const handleGenerate = async () => {
    if (!keyword) return;
    setIsGenerating(true);
    setStatus('processing');
    setProgressText('Generating unique N-Grams in 8 categories...');

    try {
      const res = await fetch('/api/ai/ngrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, mode: 'generate' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate N-Grams');

      // Merge generated data into existing step6 or create new
      const prev = step6 || { extracted: [], picked: [], unique: [] };
      setStep6({
        ...prev,
        unique: [...new Set([...prev.unique, ...(data.unique || [])])],
        generated: data.generated,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsGenerating(false);
      setStatus('idle');
      setProgressText('');
    }
  };

  return (
    <StepContainer
      onProcess={handleProcess}
      processLabel="Extract N-Grams"
      isProcessing={isProcessing || isGenerating}
      canProceed={!!step6}
      progressText={progressText}
      progressPercent={progressPercent}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Extract 3-4 word phrases from competitor content, select the best, and generate unique phrases.
          </p>
          <Button
            variant="default"
            size="sm"
            className="gap-1 text-xs h-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
            onClick={handleGenerate}
            disabled={isProcessing || isGenerating || !keyword}
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Generate from Keyword
          </Button>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing N-Grams...</span>
          </div>
        )}

        {step6 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Extracted</h4>
                <Badge variant="secondary">{step6.extracted.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {step6.extracted.map((ng, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 rounded-full bg-muted">
                    {ng}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3 border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Picked (Best)</h4>
                <Badge>{step6.picked.length - excludedPicked.size}/{step6.picked.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {step6.picked.map((ng, idx) => {
                  const included = !excludedPicked.has(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => togglePicked(idx)}
                      className={`text-xs px-2 py-1 rounded-full border transition-all ${
                        included
                          ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                          : 'bg-muted/30 text-muted-foreground border-muted line-through opacity-50'
                      }`}
                    >
                      {ng}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => { const s = new Set<number>(); setExcludedPicked(s); syncExclusions(s, excludedUnique); }}>
                  <Check className="w-3 h-3 mr-1" />Select All
                </Button>
                <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => { const s = new Set(step6.picked.map((_, i) => i)); setExcludedPicked(s); syncExclusions(s, excludedUnique); }}>
                  <X className="w-3 h-3 mr-1" />Deselect All
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3 border-green-500/30 bg-green-500/5">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Unique (New)</h4>
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">{step6.unique.length - excludedUnique.size}/{step6.unique.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {step6.unique.map((ng, idx) => {
                  const included = !excludedUnique.has(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleUnique(idx)}
                      className={`text-xs px-2 py-1 rounded-full border transition-all ${
                        included
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30'
                          : 'bg-muted/30 text-muted-foreground border-muted line-through opacity-50'
                      }`}
                    >
                      {ng}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => { const s = new Set<number>(); setExcludedUnique(s); syncExclusions(excludedPicked, s); }}>
                  <Check className="w-3 h-3 mr-1" />Select All
                </Button>
                <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => { const s = new Set(step6.unique.map((_, i) => i)); setExcludedUnique(s); syncExclusions(excludedPicked, s); }}>
                  <X className="w-3 h-3 mr-1" />Deselect All
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 8-Category Generated N-Grams */}
        {step6?.generated && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fuchsia-500" />
              Generated N-Grams (8 Categories)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {GENERATED_CATEGORIES.map(cat => {
                const items = (step6.generated as unknown as Record<string, string[]>)?.[cat.key] || [];
                if (items.length === 0) return null;
                return (
                  <div key={cat.key} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{cat.labelAr}</span>
                      <Badge variant="secondary" className="text-[9px] h-5">{items.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {items.map((phrase, i) => (
                        <span key={i} className={`text-[11px] px-2 py-0.5 rounded ${cat.color}`}>
                          {phrase}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

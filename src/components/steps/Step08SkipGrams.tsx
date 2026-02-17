'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';

export function Step08SkipGrams() {
  const { keyword, step3, step8, setStep8, setStatus, setError } = usePipelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [deselected, setDeselected] = useState<Set<number>>(
    new Set(step8?.excludedIndices || [])
  );

  const syncExclusions = (d: Set<number>) => {
    if (!step8) return;
    usePipelineStore.setState({ step8: { ...step8, excludedIndices: [...d] } });
  };

  const handleProcess = async () => {
    if (!keyword) return;
    setIsProcessing(true);
    setStatus('processing');
    setProgressText('Generating 20-30 topical word pairs...');
    setDeselected(new Set());
    try {
      const res = await fetch('/api/ai/skip-grams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          competitorContext: step3?.contents?.map(c => c.text).join('\n').slice(0, 3000) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate Skip-Grams');
      setStep8(data.skipGrams, {
        word_sense_disambiguation: data.word_sense_disambiguation,
        document_summarization: data.document_summarization,
        keyword_extraction: data.keyword_extraction,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsProcessing(false);
      setStatus('idle');
      setProgressText('');
    }
  };

  const toggleTag = (idx: number) => {
    setDeselected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      syncExclusions(next);
      return next;
    });
  };

  const selectedCount = step8 ? step8.skipGrams.length - deselected.size : 0;

  return (
    <StepContainer
      onProcess={handleProcess}
      processLabel="Generate Skip-Grams"
      isProcessing={isProcessing}
      canProceed={!!step8 && selectedCount > 0}
      progressText={progressText}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate topical word pairs (Skip-Grams) that strengthen semantic relevance. Click any pair to deselect.
        </p>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating Skip-Grams...</span>
          </div>
        )}

        {step8 && step8.skipGrams.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{selectedCount}/{step8.skipGrams.length} selected</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { const s = new Set<number>(); setDeselected(s); syncExclusions(s); }}>
                  <Check className="w-3 h-3 mr-1" />Select All
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { const s = new Set(step8.skipGrams.map((_, i) => i)); setDeselected(s); syncExclusions(s); }}>
                  <X className="w-3 h-3 mr-1" />Deselect All
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {step8.skipGrams.map((sg, idx) => {
                const isSelected = !deselected.has(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleTag(idx)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-muted/30 border-muted text-muted-foreground line-through opacity-50'
                    }`}
                  >
                    {sg}
                  </button>
                );
              })}
            </div>

            {/* Word Sense Disambiguation */}
            {step8.word_sense_disambiguation && step8.word_sense_disambiguation.length > 0 && (
              <div className="space-y-2 pt-3 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Word Sense Disambiguation</h4>
                {step8.word_sense_disambiguation.map((sense, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-primary">{sense.sense}:</span>{' '}
                    <span className="text-muted-foreground">{sense.dominant_words.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Document Summarization + Keyword Extraction */}
            {(step8.document_summarization?.length || step8.keyword_extraction?.length) ? (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                {step8.document_summarization && step8.document_summarization.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summarization Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {step8.document_summarization.map((w, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
                {step8.keyword_extraction && step8.keyword_extraction.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Technical Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {step8.keyword_extraction.map((w, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </StepContainer>
  );
}

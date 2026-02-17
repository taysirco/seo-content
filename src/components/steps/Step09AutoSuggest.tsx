'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';

export function Step09AutoSuggest() {
  const { keyword, location, step9, setStep9, setStatus, setError } = usePipelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [deselected, setDeselected] = useState<Set<number>>(
    new Set(step9?.excludedIndices || [])
  );
  const [rawCount, setRawCount] = useState<number | null>(null);

  const syncExclusions = (d: Set<number>) => {
    if (!step9) return;
    usePipelineStore.setState({ step9: { ...step9, excludedIndices: [...d] } });
  };

  const handleProcess = async () => {
    if (!keyword) return;
    setIsProcessing(true);
    setStatus('processing');
    const contentLang = location?.lang || 'ar';
    setProgressText(`Fetching suggestions (${contentLang})...`);
    setDeselected(new Set());
    setRawCount(null);
    try {
      const res = await fetch('/api/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, lang: contentLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch suggestions');
      setRawCount(data.rawCount || data.keywords?.length || 0);
      setStep9(data.keywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsProcessing(false);
      setStatus('idle');
      setProgressText('');
    }
  };

  const toggleChip = (idx: number) => {
    setDeselected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      syncExclusions(next);
      return next;
    });
  };

  const selectedCount = step9 ? step9.autoKeywords.length - deselected.size : 0;

  return (
    <StepContainer
      onProcess={handleProcess}
      processLabel="Fetch Suggestions"
      isProcessing={isProcessing}
      canProceed={!!step9 && selectedCount > 0}
      progressText={progressText}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Fetch Google autocomplete suggestions and filter with AI. Click to deselect irrelevant ones.
        </p>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Fetching and filtering suggestions...</span>
          </div>
        )}

        {step9 && step9.autoKeywords.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedCount}/{step9.autoKeywords.length} selected</Badge>
                {rawCount && rawCount > step9.autoKeywords.length && (
                  <Badge variant="outline" className="text-[10px]">Filtered {rawCount} → {step9.autoKeywords.length}</Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { const s = new Set<number>(); setDeselected(s); syncExclusions(s); }}>
                  <Check className="w-3 h-3 mr-1" />Select All
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { const s = new Set(step9.autoKeywords.map((_, i) => i)); setDeselected(s); syncExclusions(s); }}>
                  <X className="w-3 h-3 mr-1" />Deselect All
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {step9.autoKeywords.map((kw, idx) => {
                const isSelected = !deselected.has(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleChip(idx)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                      isSelected
                        ? 'bg-secondary border-secondary text-secondary-foreground'
                        : 'bg-muted/30 border-muted text-muted-foreground line-through opacity-50'
                    }`}
                  >
                    {kw}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

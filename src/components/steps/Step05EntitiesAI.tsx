'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Merge, Check } from 'lucide-react';

export function Step05EntitiesAI() {
  const { keyword, step4, step5, setStep5, setStatus, setError } = usePipelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [showMerged, setShowMerged] = useState(false);

  const mergedEntityList = (() => {
    if (!showMerged || !step4?.merged || !step5?.aiEntities) return null;
    const competitorEntities = new Set<string>();
    Object.values(step4.merged.entities).forEach(items => {
      (items as { name: string }[]).forEach(e => competitorEntities.add(e.name));
    });
    const aiOnly = step5.aiEntities.entities.filter(e => !competitorEntities.has(e));
    const shared = step5.aiEntities.entities.filter(e => competitorEntities.has(e));
    return { all: [...competitorEntities], aiOnly, shared, total: competitorEntities.size + aiOnly.length };
  })();

  const handleProcess = async () => {
    if (!keyword) return;
    setIsProcessing(true);
    setStatus('processing');
    setProgressText(`Generating SEO entities for "${keyword}"...`);
    try {
      const res = await fetch('/api/ai/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, mode: 'generate' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate entities');
      setStep5(data.aiEntities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsProcessing(false);
      setStatus('idle');
      setProgressText('');
    }
  };

  const categoryLabels: Record<string, string> = {
    people: 'People',
    organizations: 'Organizations',
    concepts: 'Concepts',
    products: 'Products',
    locations: 'Locations',
  };

  return (
    <StepContainer
      onProcess={handleProcess}
      processLabel="Generate AI Entities"
      isProcessing={isProcessing}
      canProceed={!!step5}
      progressText={progressText}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generate SEO entities related to &quot;{keyword}&quot; using AI.
        </p>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating entities...</span>
          </div>
        )}

        {step5?.aiEntities && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {step5.aiEntities.entities.map((entity, idx) => (
                <Badge key={idx} variant="secondary" className="text-sm px-3 py-1">
                  {entity}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {Object.entries(step5.aiEntities.entityTypes).map(([category, items]) => {
                if (!items || items.length === 0) return null;
                return (
                  <div key={category} className="rounded-lg border p-4 space-y-2">
                    <h4 className="font-medium text-sm">{categoryLabels[category] || category}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item: string, idx: number) => (
                        <span key={idx} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {step4?.merged && (
              <div className="pt-2">
                <Button
                  variant={showMerged ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowMerged(!showMerged)}
                >
                  {showMerged ? <Check className="w-3.5 h-3.5" /> : <Merge className="w-3.5 h-3.5" />}
                  {showMerged ? 'Merged' : 'Merge with competitor entities (Step 4)'}
                </Button>

                {showMerged && mergedEntityList && (
                  <div className="mt-3 rounded-lg border p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm">Merged Entities (Competitors + AI)</h4>
                      <Badge variant="secondary">{mergedEntityList.total} entities</Badge>
                    </div>
                    {mergedEntityList.shared.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Shared ({mergedEntityList.shared.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {mergedEntityList.shared.map((e, i) => (
                            <Badge key={i} variant="default" className="text-xs">{e}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {mergedEntityList.aiOnly.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">AI-Only ({mergedEntityList.aiOnly.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {mergedEntityList.aiOnly.map((e, i) => (
                            <Badge key={i} variant="outline" className="text-xs border-green-500/30 text-green-600">{e}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </StepContainer>
  );
}

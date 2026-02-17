'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Check } from 'lucide-react';

const GRAMMAR_LABELS: Record<string, string> = {
  proper_nouns: 'Proper Nouns',
  common_nouns: 'Common Nouns',
  synonyms: 'Synonyms',
  antonyms: 'Antonyms',
  hyponyms: 'Hyponyms',
  hypernyms: 'Hypernyms',
  homonyms: 'Homonyms',
  meronyms: 'Meronyms',
  holonyms: 'Holonyms',
  polysemy: 'Polysemy',
};

export function Step10Grammar() {
  const { keyword, step10, setStep10, setStatus, setError } = usePipelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleProcess = async () => {
    if (!keyword) return;
    setIsProcessing(true);
    setStatus('processing');
    setProgressText('Analyzing 10 grammar categories: synonyms, antonyms, meronyms, holonyms...');
    try {
      const res = await fetch('/api/ai/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grammar analysis failed');
      setStep10(data.grammar);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsProcessing(false);
      setStatus('idle');
      setProgressText('');
    }
  };

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const grammarEntries = step10?.grammar
    ? Object.entries(step10.grammar).filter(([key]) => key !== 'term')
    : [];

  const totalTerms = grammarEntries.reduce((sum, [, vals]) => sum + (vals as string[]).length, 0);

  const handleCopyCategory = async (key: string, items: string[]) => {
    await navigator.clipboard.writeText(items.join(', '));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <StepContainer
      onProcess={handleProcess}
      processLabel="Grammar Analysis"
      isProcessing={isProcessing}
      canProceed={!!step10}
      progressText={progressText}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Analyze linguistic and semantic relationships for the keyword: synonyms, antonyms, meronyms, holonyms...
        </p>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Grammar analysis (10 categories)...</span>
          </div>
        )}

        {step10?.grammar && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{totalTerms} terms</Badge>
              <Badge variant="outline">{grammarEntries.filter(([, v]) => (v as string[]).length > 0).length} categories</Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={async () => {
                const allTerms = grammarEntries.map(([key, vals]) => `${GRAMMAR_LABELS[key]}: ${(vals as string[]).join(', ')}`).join('\n');
                await navigator.clipboard.writeText(allTerms);
                setCopiedKey('_all');
                setTimeout(() => setCopiedKey(null), 1500);
              }}
            >
              {copiedKey === '_all' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedKey === '_all' ? 'All Copied' : 'Copy All Terms'}
            </Button>

            <Accordion type="multiple" className="w-full">
              {grammarEntries.map(([key, values]) => {
                const items = values as string[];
                if (!items || items.length === 0) return null;
                return (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <span>{GRAMMAR_LABELS[key] || key}</span>
                        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <div className="flex flex-wrap gap-2">
                          {items.map((item: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-sm px-3 py-1">
                              {item}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 gap-1"
                          onClick={() => handleCopyCategory(key, items)}
                        >
                          {copiedKey === key ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedKey === key ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

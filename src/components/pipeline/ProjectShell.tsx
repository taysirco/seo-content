'use client';

import { useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePipelineStore } from '@/store/pipeline-store';
import { Stepper } from '@/components/pipeline/Stepper';
import { ThemeToggle } from '@/components/theme-toggle';
import { Step01CompetitorResearch } from '@/components/steps/Step01CompetitorResearch';
import { Step02OutlineCreation } from '@/components/steps/Step02OutlineCreation';
import { Step03ContentExtraction } from '@/components/steps/Step03ContentExtraction';
import { Step04EntitiesCompetitors } from '@/components/steps/Step04EntitiesCompetitors';
import { Step05EntitiesAI } from '@/components/steps/Step05EntitiesAI';
import { Step06NGrams } from '@/components/steps/Step06NGrams';
import { Step07NLPKeywords } from '@/components/steps/Step07NLPKeywords';
import { Step08SkipGrams } from '@/components/steps/Step08SkipGrams';
import { Step09AutoSuggest } from '@/components/steps/Step09AutoSuggest';
import { Step10Grammar } from '@/components/steps/Step10Grammar';
import { Step11SEORules } from '@/components/steps/Step11SEORules';
import { Step12AIInstructions } from '@/components/steps/Step12AIInstructions';
import { Step13FinalContent } from '@/components/steps/Step13FinalContent';
import { Sparkles, Home, Save, Loader2, Download, Upload, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useState } from 'react';

// D11-4: API Key Pool Status Widget
function KeyPoolWidget() {
  const [stats, setStats] = useState<{ poolSize: number; totalCalls: number; activeCooling: number } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/key-pool-stats');
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-[10px] h-7 hidden sm:flex" onClick={fetchStats}>
          <Zap className="w-3 h-3" />
          {stats ? `${stats.poolSize}🔑 ${stats.totalCalls}↗` : 'API'}
          {stats && stats.activeCooling > 0 && (
            <Badge variant="destructive" className="text-[8px] h-4 px-1">{stats.activeCooling}⏳</Badge>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {stats
          ? `${stats.poolSize} keys — ${stats.totalCalls} calls — ${stats.activeCooling} cooling`
          : 'Click to fetch API key status'}
      </TooltipContent>
    </Tooltip>
  );
}

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: Step01CompetitorResearch,
  2: Step02OutlineCreation,
  3: Step03ContentExtraction,
  4: Step04EntitiesCompetitors,
  5: Step05EntitiesAI,
  6: Step06NGrams,
  7: Step07NLPKeywords,
  8: Step08SkipGrams,
  9: Step09AutoSuggest,
  10: Step10Grammar,
  11: Step11SEORules,
  12: Step12AIInstructions,
  13: Step13FinalContent,
};

function PipelineSummaryBar() {
  const store = usePipelineStore();
  const items: { label: string; value: string | number; done: boolean }[] = [
    { label: 'Competitors', value: store.step1?.competitors.filter(c => c.selected).length || 0, done: !!store.step1 },
    { label: 'Headings', value: store.step2?.merged?.headings.length || 0, done: !!store.step2 },
    { label: 'Pages', value: store.step3?.contents.filter(c => c.wordCount > 0).length || 0, done: !!store.step3 },
    { label: 'Entities', value: store.step4?.merged?.totalUnique || 0, done: !!store.step4 },
    { label: 'AI Entities', value: store.step5?.aiEntities?.entities.length || 0, done: !!store.step5 },
    { label: 'N-Grams', value: store.step6 ? (store.step6.picked.length - (store.step6.excludedPicked?.length || 0)) + (store.step6.unique.length - (store.step6.excludedUnique?.length || 0)) + (store.step6.generated ? Object.values(store.step6.generated).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0) : 0) : 0, done: !!store.step6 },
    { label: 'NLP', value: store.step7?.combined?.contentScore || 0, done: !!store.step7 },
    { label: 'Skip', value: store.step8 ? store.step8.skipGrams.length - (store.step8.excludedIndices?.length || 0) : 0, done: !!store.step8 },
    { label: 'Suggest', value: store.step9 ? store.step9.autoKeywords.length - (store.step9.excludedIndices?.length || 0) : 0, done: !!store.step9 },
    { label: 'Grammar', value: store.step10 ? '✓' : '—', done: !!store.step10 },
    { label: 'Rules', value: store.step11?.rules?.filter(r => r.enabled).length || 0, done: !!store.step11 },
    { label: 'Config', value: store.step12 ? '✓' : '—', done: !!store.step12 },
  ];
  const doneCount = items.filter(i => i.done).length;
  if (doneCount === 0) return null;

  return (
    <div className="border-b bg-muted/20">
      <div className="container mx-auto px-4 py-1.5 flex items-center gap-3 overflow-x-auto scrollbar-thin">
        <span className="text-[10px] text-muted-foreground shrink-0">{doneCount}/12</span>
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1 text-[10px] shrink-0 ${item.done ? 'text-foreground' : 'text-muted-foreground/40'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${item.done ? 'bg-green-500' : 'bg-muted-foreground/20'}`} />
            <span>{item.label}</span>
            <span className="font-mono font-bold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectShell() {
  const router = useRouter();
  const { currentStep, keyword, error, setError, setCurrentStep, resetPipeline, saveToCloud } = usePipelineStore();
  const [saving, setSaving] = useState(false);

  // ─── Auto-save debounce on any store mutation ───
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeSnapshot = usePipelineStore(s => {
    // Create a lightweight fingerprint of all step data to detect any change
    const parts = [s.currentStep, s.keyword];
    for (let i = 1; i <= 13; i++) {
      const key = `step${i}` as keyof typeof s;
      parts.push(s[key] ? 1 : 0);
    }
    // Include exclusion data changes
    if (s.step6) parts.push(s.step6.excludedPicked?.length ?? -1, s.step6.excludedUnique?.length ?? -1);
    if (s.step8) parts.push(s.step8.excludedIndices?.length ?? -1);
    if (s.step9) parts.push(s.step9.excludedIndices?.length ?? -1);
    if (s.step11) parts.push(s.step11.rules.filter(r => r.enabled).length);
    return parts.join(',');
  });

  useEffect(() => {
    if (!usePipelineStore.getState().keyword) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await saveToCloud();
      } catch {
        // silent auto-save failure
      }
    }, 5000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [storeSnapshot, saveToCloud]);

  // ─── Keyboard shortcuts ───
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveToCloud();
      toast.success('Saved successfully');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [saveToCloud]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      // Ctrl/Cmd + S → Save
      if (e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      // Ctrl/Cmd + ArrowRight → Previous step (RTL: right = back)
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = usePipelineStore.getState().currentStep;
        if (step > 1) setCurrentStep(step - 1);
        return;
      }
      // Ctrl/Cmd + ArrowLeft → Next step (RTL: left = forward)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = usePipelineStore.getState().currentStep;
        if (step < 13) setCurrentStep(step + 1);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, setCurrentStep]);

  // ─── Export / Import ───
  const handleExportJSON = () => {
    const state = usePipelineStore.getState();
    const exportData = {
      keyword: state.keyword, location: state.location, currentStep: state.currentStep,
      step1: state.step1, step2: state.step2, step3: state.step3, step4: state.step4,
      step5: state.step5, step6: state.step6, step7: state.step7, step8: state.step8,
      step9: state.step9, step10: state.step10, step11: state.step11, step12: state.step12,
      step13: state.step13,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-pipeline-${state.keyword || 'project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const store = usePipelineStore.getState();
        if (data.keyword) store.setKeyword(data.keyword);
        if (data.location) store.setLocation(data.location);
        if (data.currentStep) store.setCurrentStep(data.currentStep);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apply = (fn: (...args: any[]) => void, ...args: any[]) => fn(...args);
        if (data.step1) apply(store.setStep1, data.step1.competitors);
        if (data.step2) apply(store.setStep2, data.step2.outlines, data.step2.merged);
        if (data.step3) apply(store.setStep3, data.step3.contents);
        if (data.step4) apply(store.setStep4, data.step4.perCompetitor, data.step4.merged);
        if (data.step5) apply(store.setStep5, data.step5.aiEntities);
        if (data.step6) apply(store.setStep6, data.step6);
        if (data.step7) apply(store.setStep7, data.step7.perCompetitor, data.step7.combined);
        if (data.step8) usePipelineStore.setState({ step8: data.step8 });
        if (data.step9) usePipelineStore.setState({ step9: data.step9 });
        if (data.step10) apply(store.setStep10, data.step10.grammar);
        if (data.step11) apply(store.setStep11, data.step11.rules);
        if (data.step12) apply(store.setStep12, data.step12.config, data.step12.instructions);
        if (data.step13) apply(store.setStep13, data.step13.content);
        toast.success('Data imported successfully');
      } catch {
        toast.error('Failed to read file');
      }
    };
    input.click();
  };

  // ─── Batch process all remaining steps ───
  const [batching, setBatching] = useState(false);
  const [batchText, setBatchText] = useState('');

  const handleBatchProcess = async () => {
    const store = usePipelineStore.getState();
    if (!store.keyword) { toast.error('Enter keyword first'); return; }
    setBatching(true);

    const steps: { num: number; label: string; needsData: boolean; endpoint: string; body: () => Record<string, unknown>; setter: (data: Record<string, unknown>) => void }[] = [
      {
        num: 5, label: 'AI Entities', needsData: !store.step5,
        endpoint: '/api/ai/entities',
        body: () => ({ keyword: store.keyword, mode: 'generate' }),
        setter: (d) => usePipelineStore.getState().setStep5(d.aiEntities as Parameters<typeof store.setStep5>[0]),
      },
      ...(store.step3 ? [{
        num: 6, label: 'N-Grams', needsData: !store.step6,
        endpoint: '/api/ai/ngrams',
        body: () => ({ keyword: store.keyword, contents: store.step3!.contents.map(c => c.text) }),
        setter: (d: Record<string, unknown>) => usePipelineStore.getState().setStep6(d as unknown as Parameters<typeof store.setStep6>[0]),
      }] : []),
      {
        num: 8, label: 'Skip-Grams', needsData: !store.step8,
        endpoint: '/api/ai/skip-grams',
        body: () => ({ keyword: store.keyword }),
        setter: (d) => usePipelineStore.getState().setStep8(d.skipGrams as string[], {
          word_sense_disambiguation: d.word_sense_disambiguation as { sense: string; dominant_words: string[] }[] | undefined,
          document_summarization: d.document_summarization as string[] | undefined,
          keyword_extraction: d.keyword_extraction as string[] | undefined,
        }),
      },
      {
        num: 9, label: 'Suggestions', needsData: !store.step9,
        endpoint: '/api/autocomplete',
        body: () => ({ keyword: store.keyword }),
        setter: (d) => usePipelineStore.getState().setStep9(d.keywords as string[]),
      },
      {
        num: 10, label: 'Grammar', needsData: !store.step10,
        endpoint: '/api/ai/grammar',
        body: () => ({ keyword: store.keyword }),
        setter: (d) => usePipelineStore.getState().setStep10(d.grammar as Parameters<typeof store.setStep10>[0]),
      },
    ];

    const pending = steps.filter(s => s.needsData);
    if (pending.length === 0) { toast.success('All independent steps complete'); setBatching(false); return; }

    for (let i = 0; i < pending.length; i++) {
      const s = pending[i];
      setBatchText(`Processing ${s.label} (${i + 1}/${pending.length})...`);
      try {
        const res = await fetch(s.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(s.body()),
        });
        const data = await res.json();
        if (res.ok) s.setter(data);
      } catch { /* continue on error */ }
    }

    toast.success(`Processed ${pending.length} steps`);
    setBatching(false);
    setBatchText('');
  };

  const StepComponent = STEP_COMPONENTS[currentStep] || Step01CompetitorResearch;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <Home className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-bold hidden sm:inline">SEO Content System</span>
            </div>
            {keyword && (
              <Badge variant="secondary" className="text-sm max-w-[160px] truncate">
                {keyword}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs hidden sm:flex"
                  onClick={handleBatchProcess}
                  disabled={batching}
                >
                  {batching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  {batching ? batchText : 'Batch Process'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Process steps 5, 8, 9, 10 in one batch</TooltipContent>
            </Tooltip>
            {/* D11-4: API Key Pool Status Widget */}
            <KeyPoolWidget />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleExportJSON}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export JSON</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleImportJSON}>
                  <Upload className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import JSON</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-1 text-xs">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ctrl+S</TooltipContent>
            </Tooltip>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hidden sm:flex">
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all current project data including the keyword and all analysis results. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { resetPipeline(); router.push('/'); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete &amp; Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ThemeToggle />
                </div>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Stepper - responsive horizontal scroll */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 overflow-x-auto scrollbar-thin">
          <Stepper />
        </div>
      </div>

      {/* Pipeline Summary Bar */}
      <PipelineSummaryBar />

      {/* Keyboard shortcuts hint */}
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 py-1.5 text-[10px] text-muted-foreground/60">
          <span className="opacity-70">⌨</span>
          <span>Ctrl+S Save</span>
          <span>Ctrl+← Next</span>
          <span>Ctrl+→ Prev</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="container mx-auto px-4 pt-2">
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Step Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <StepComponent />
      </main>
    </div>
  );
}

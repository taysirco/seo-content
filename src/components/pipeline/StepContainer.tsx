'use client';

import { useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Lightbulb, AlertTriangle } from 'lucide-react';
import { usePipelineStore } from '@/store/pipeline-store';
import { STEPS_META } from '@/types/pipeline';
import { validateStep } from '@/lib/pipeline-validator';
import { StepErrorBoundary } from '@/components/pipeline/StepErrorBoundary';
import { toast } from 'sonner';

const STEP_DEPS: Record<number, { step: number; label: string }[]> = {
  1: [],
  2: [{ step: 1, label: 'Competitors / المنافسين' }],
  3: [{ step: 1, label: 'Competitors / المنافسين' }],
  4: [{ step: 3, label: 'Content / المحتوى' }],
  5: [],
  6: [{ step: 3, label: 'Content / المحتوى' }],
  7: [{ step: 3, label: 'Content / المحتوى' }],
  8: [],
  9: [],
  10: [],
  11: [],
  12: [],
  13: [{ step: 2, label: 'Outline / المخطط' }, { step: 11, label: 'SEO Rules / قواعد' }, { step: 12, label: 'Config / التعليمات' }],
};

interface StepContainerProps {
  children: React.ReactNode;
  onProcess?: () => Promise<void>;
  processLabel?: string;
  isProcessing?: boolean;
  canProceed?: boolean;
  progressText?: string;
  autoAdvance?: boolean;
  progressPercent?: number;
}

export function StepContainer({
  children,
  onProcess,
  processLabel = 'تنفيذ',
  isProcessing = false,
  canProceed = false,
  progressText,
  autoAdvance = true,
  progressPercent,
}: StepContainerProps) {
  const store = usePipelineStore();
  const { currentStep, setCurrentStep } = store;
  const stepMeta = STEPS_META[currentStep - 1];
  const prevCanProceed = useRef(canProceed);

  const deps = STEP_DEPS[currentStep] || [];
  const missingDeps = deps.filter(d => {
    const key = `step${d.step}` as keyof typeof store;
    return !store[key];
  });

  // Pipeline validation — check data quality warnings for current step
  const validation = validateStep(currentStep, store);

  // Smart suggestion: what should user do next?
  const smartSuggestion = (() => {
    if (isProcessing || !canProceed) return null;
    // Find the next incomplete step that has all dependencies met
    for (let s = 1; s <= 13; s++) {
      const key = `step${s}` as keyof typeof store;
      if (store[key]) continue; // already done
      const stepDeps = STEP_DEPS[s] || [];
      const allDepsMet = stepDeps.every(d => !!store[`step${d.step}` as keyof typeof store]);
      if (allDepsMet && s !== currentStep) {
        return { step: s, title: STEPS_META[s - 1]?.titleAr };
      }
    }
    return null;
  })();

  useEffect(() => {
    if (canProceed && !prevCanProceed.current && autoAdvance && !isProcessing) {
      toast.success(`✅ ${stepMeta.titleEn} — Completed / ${stepMeta.titleAr} اكتمل`, {
        description: currentStep < 13 ? 'Advancing to next step...' : undefined,
        duration: 2500,
      });
      if (currentStep < 13) {
        const timer = setTimeout(() => setCurrentStep(currentStep + 1), 1200);
        return () => clearTimeout(timer);
      }
    }
    prevCanProceed.current = canProceed;
  }, [canProceed, isProcessing, autoAdvance, currentStep, setCurrentStep, stepMeta.titleAr, stepMeta.titleEn]);

  const goNext = useCallback(() => {
    if (currentStep < 13) setCurrentStep(currentStep + 1);
  }, [currentStep, setCurrentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }, [currentStep, setCurrentStep]);

  const processingRef = useRef(false);
  const handleProcess = useCallback(async () => {
    if (!onProcess || processingRef.current) return;
    processingRef.current = true;
    try { await onProcess(); } finally { processingRef.current = false; }
  }, [onProcess]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={stepMeta.hasAI ? 'default' : 'secondary'} className="text-xs">
              {stepMeta.hasAI ? 'AI' : stepMeta.type === 'config' ? 'Config' : 'Data'}
            </Badge>
            <div>
              <CardTitle className="text-xl">{stepMeta.titleAr}</CardTitle>
              <CardDescription>{stepMeta.titleEn} — Step {currentStep} of 13</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canProceed && !isProcessing && (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-500/30 bg-green-500/5">
                <CheckCircle2 className="w-3 h-3" />
                Done / مكتمل
              </Badge>
            )}
            {smartSuggestion && (
              <button
                onClick={() => setCurrentStep(smartSuggestion.step)}
                className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Lightbulb className="w-3 h-3" />
                Next: {STEPS_META[smartSuggestion.step - 1]?.titleEn}
              </button>
            )}
          </div>
        </div>
        {isProcessing && (
          <div className="mt-2 space-y-2">
            {progressText && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {progressText}
              </div>
            )}
            {typeof progressPercent === 'number' && progressPercent > 0 && (
              <Progress value={progressPercent} className="h-1.5" />
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {missingDeps.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs">
            <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
            <span className="text-yellow-700 dark:text-yellow-400">
              Requires: {missingDeps.map((d, i) => (
                <button
                  key={d.step}
                  onClick={() => setCurrentStep(d.step)}
                  className="underline font-medium hover:text-yellow-800 dark:hover:text-yellow-300 mx-0.5"
                >
                  Step {d.step} ({d.label}){i < missingDeps.length - 1 ? ',' : ''}
                </button>
              ))}
            </span>
          </div>
        )}
        {validation.warnings.length > 0 && missingDeps.length === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-blue-700 dark:text-blue-400 space-y-0.5">
              {validation.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          </div>
        )}
        <StepErrorBoundary fallbackTitle={`Error in Step ${currentStep}`}>
          {children}
        </StepErrorBoundary>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentStep <= 1 || isProcessing}
            className="gap-2"
          >
            <ChevronRight className="w-4 h-4" />
            Prev
          </Button>

          <div className="flex items-center gap-2">
            {onProcess && (
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                variant={canProceed ? 'outline' : 'default'}
                className="gap-2"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                {canProceed ? 'Re-run' : processLabel}
              </Button>
            )}

            <Button
              onClick={goNext}
              disabled={!canProceed || currentStep >= 13 || isProcessing}
              className="gap-2"
            >
              Next
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

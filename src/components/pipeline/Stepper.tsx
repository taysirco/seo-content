'use client';

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { STEPS_META } from '@/types/pipeline';
import { usePipelineStore } from '@/store/pipeline-store';
import {
  Search, List, FileText, Users, Brain, Hash, Key,
  Shuffle, Lightbulb, BookOpen, Shield, Settings, Sparkles,
  Check, Loader2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const ICON_MAP: Record<string, React.ElementType> = {
  Search, List, FileText, Users, Brain, Hash, Key,
  Shuffle, Lightbulb, BookOpen, Shield, Settings, Sparkles,
};

export function Stepper() {
  const store = usePipelineStore();
  const { currentStep, setCurrentStep, status } = store;
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setStepRef = useCallback((el: HTMLButtonElement | null, idx: number) => {
    stepRefs.current[idx] = el;
  }, []);

  useEffect(() => {
    const el = stepRefs.current[currentStep - 1];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentStep]);

  const isStepDataPresent = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1: return !!store.step1 && store.step1.competitors.some(c => c.selected);
      case 2: return !!store.step2?.merged;
      case 3: return !!store.step3 && store.step3.contents.some(c => c.wordCount > 0);
      case 4: return !!store.step4?.perCompetitor?.length || !!store.step4?.merged || !!store.step7?.combined || !!store.step5; // Semantic engine has at least some data
      case 5: return !!store.step11;
      case 6: return !!store.step12;
      case 7: return !!store.step13;
      default: return false;
    }
  };

  const getStepState = (stepNumber: number) => {
    if (stepNumber === currentStep && status === 'processing') return 'processing';
    if (stepNumber === currentStep && status === 'error') return 'error';
    if (isStepDataPresent(stepNumber) && stepNumber !== currentStep) return 'completed';
    if (stepNumber === currentStep) return 'active';
    return 'pending';
  };

  // Dependency map: which steps must be complete before a step is reachable
  const STEP_DEPS: Record<number, number[]> = {
    1: [], 2: [1], 3: [1], 4: [3], 5: [], 6: [], 7: [2, 5, 6],
  };

  const isStepReachable = (stepNumber: number): boolean => {
    const deps = STEP_DEPS[stepNumber] || [];
    return deps.every(d => isStepDataPresent(d));
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex items-center gap-1 px-2 py-4 min-w-max">
        {STEPS_META.map((step, idx) => {
          const state = getStepState(step.number);
          const Icon = ICON_MAP[step.icon] || Search;
          const isClickable = isStepReachable(step.number);

          return (
            <div key={step.number} className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    ref={(el) => setStepRef(el, idx)}
                    onClick={() => isClickable && setCurrentStep(step.number)}
                    disabled={!isClickable}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg transition-all min-w-[72px]',
                      state === 'active' && 'bg-primary/10 text-primary',
                      state === 'completed' && 'text-green-600 dark:text-green-400 cursor-pointer hover:bg-green-500/10',
                      state === 'processing' && 'bg-blue-500/10 text-blue-500',
                      state === 'error' && 'bg-destructive/10 text-destructive',
                      state === 'pending' && 'text-muted-foreground opacity-50 cursor-not-allowed',
                    )}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                      state === 'active' && 'border-primary bg-primary text-primary-foreground',
                      state === 'completed' && 'border-green-500 bg-green-500 text-white',
                      state === 'processing' && 'border-blue-500 bg-blue-500 text-white',
                      state === 'error' && 'border-destructive bg-destructive text-white',
                      state === 'pending' && 'border-muted-foreground/30 bg-transparent',
                    )}>
                      {state === 'completed' ? (
                        <Check className="w-4 h-4" />
                      ) : state === 'processing' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium leading-tight text-center whitespace-nowrap">
                      {step.titleAr}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-medium">{step.titleAr}</p>
                  <p className="text-xs text-muted-foreground">{step.titleEn} — Step {step.number}</p>
                </TooltipContent>
              </Tooltip>

              {idx < STEPS_META.length - 1 && (
                <div className={cn(
                  'w-6 h-0.5 mx-0.5',
                  isStepDataPresent(step.number) ? 'bg-green-500' : 'bg-muted-foreground/20',
                )} />
              )}
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

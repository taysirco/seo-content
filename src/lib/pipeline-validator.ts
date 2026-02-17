import type { PipelineState } from '@/types/pipeline';

/**
 * Pipeline State Validator — ensures data integrity between steps.
 * Each step depends on previous steps having valid data.
 * Returns { valid, errors } for the requested step.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

type StepValidator = (state: PipelineState) => ValidationResult;

const ok = (): ValidationResult => ({ valid: true, errors: [], warnings: [] });

const fail = (errors: string[], warnings: string[] = []): ValidationResult => ({
  valid: false,
  errors,
  warnings,
});

const warn = (warnings: string[]): ValidationResult => ({
  valid: true,
  errors: [],
  warnings,
});

/** Step 1: Competitors — needs keyword + location */
const validateStep1: StepValidator = (state) => {
  const errors: string[] = [];
  if (!state.keyword || state.keyword.trim().length === 0) {
    errors.push('Keyword is required before competitor research');
  }
  if (!state.location?.country) {
    errors.push('Location (country) is required before competitor research');
  }
  if (errors.length > 0) return fail(errors);

  const warnings: string[] = [];
  if (!state.location?.city) {
    warnings.push('City not specified — results may be less targeted');
  }
  return warnings.length > 0 ? warn(warnings) : ok();
};

/** Step 2: Outlines — needs selected competitors from Step 1 */
const validateStep2: StepValidator = (state) => {
  const errors: string[] = [];
  if (!state.step1?.competitors || state.step1.competitors.length === 0) {
    errors.push('Complete Step 1 (competitor research) first');
    return fail(errors);
  }
  const selected = state.step1.competitors.filter(c => c.selected);
  if (selected.length === 0) {
    errors.push('Select at least 1 competitor for outline analysis');
    return fail(errors);
  }
  return ok();
};

/** Step 3: Content extraction — needs outlines from Step 2 */
const validateStep3: StepValidator = (state) => {
  if (!state.step2?.outlines || state.step2.outlines.length === 0) {
    return fail(['Complete Step 2 (outline creation) first']);
  }
  const selected = state.step1?.competitors.filter(c => c.selected) || [];
  if (selected.length === 0) {
    return fail(['No competitors selected — go back to Step 1']);
  }
  return ok();
};

/** Step 4: Entities — needs content from Step 3 */
const validateStep4: StepValidator = (state) => {
  if (!state.step3?.contents || state.step3.contents.length === 0) {
    return fail(['Complete Step 3 (content extraction) first']);
  }
  const nonEmpty = state.step3.contents.filter(c => c.text && c.text.length > 100);
  if (nonEmpty.length === 0) {
    return fail(['No competitor content extracted — retry Step 3']);
  }
  const warnings: string[] = [];
  if (nonEmpty.length < 3) {
    warnings.push(`Only ${nonEmpty.length} competitors have content — results may be less comprehensive`);
  }
  return warnings.length > 0 ? warn(warnings) : ok();
};

/** Steps 5-10: Various analysis — needs entities from Step 4 */
const validateStep5Plus: StepValidator = (state) => {
  if (!state.step4?.merged) {
    return fail(['Complete Step 4 (entity analysis) first']);
  }
  return ok();
};

/** Step 11: SEO Rules — can run anytime but benefits from prior steps */
const validateStep11: StepValidator = () => ok();

/** Step 12: Writing Config — needs keyword at minimum */
const validateStep12: StepValidator = (state) => {
  if (!state.keyword || state.keyword.trim().length === 0) {
    return fail(['Keyword is required before configuring writing instructions']);
  }
  return ok();
};

/** Step 13: Generate — needs most prior steps */
const validateStep13: StepValidator = (state) => {
  const errors: string[] = [];
  if (!state.keyword) errors.push('Keyword is missing');
  if (!state.step1?.competitors?.length) errors.push('Step 1 (competitors) incomplete');
  if (!state.step2?.merged) errors.push('Step 2 (outline) incomplete');
  if (!state.step12?.config) errors.push('Step 12 (writing config) incomplete');
  if (errors.length > 0) return fail(errors);

  const warnings: string[] = [];
  if (!state.step3?.contents?.length) warnings.push('Step 3 (content) skipped — less context for generation');
  if (!state.step4?.merged) warnings.push('Step 4 (entities) skipped — entity coverage may suffer');
  if (!state.step11?.rules?.length) warnings.push('Step 11 (SEO rules) skipped — no SEO constraints applied');
  return warnings.length > 0 ? warn(warnings) : ok();
};

const validators: Record<number, StepValidator> = {
  1: validateStep1,
  2: validateStep2,
  3: validateStep3,
  4: validateStep4,
  5: validateStep5Plus,
  6: validateStep5Plus,
  7: validateStep5Plus,
  8: validateStep5Plus,
  9: validateStep5Plus,
  10: validateStep5Plus,
  11: validateStep11,
  12: validateStep12,
  13: validateStep13,
};

/** Validate whether a specific step can proceed given the current pipeline state */
export function validateStep(step: number, state: PipelineState): ValidationResult {
  const validator = validators[step];
  if (!validator) return ok();
  return validator(state);
}

/** Get a summary of all step readiness for the pipeline summary bar */
export function validateAllSteps(state: PipelineState): Record<number, ValidationResult> {
  const results: Record<number, ValidationResult> = {};
  for (let i = 1; i <= 13; i++) {
    results[i] = validateStep(i, state);
  }
  return results;
}

/** Check if the pipeline state is internally consistent (no orphaned data) */
export function validatePipelineIntegrity(state: PipelineState): ValidationResult {
  const warnings: string[] = [];

  // Check for orphaned step data (step has data but dependency is missing)
  if (state.step2 && !state.step1) warnings.push('Step 2 data exists but Step 1 is empty');
  if (state.step3 && !state.step2) warnings.push('Step 3 data exists but Step 2 is empty');
  if (state.step4 && !state.step3) warnings.push('Step 4 data exists but Step 3 is empty');
  if (state.step13 && !state.step12) warnings.push('Step 13 content exists but Step 12 config is empty');

  // Check competitor count consistency
  if (state.step1 && state.step2) {
    const selectedCount = state.step1.competitors.filter(c => c.selected).length;
    const outlineCount = state.step2.outlines.length;
    if (outlineCount > selectedCount * 2) {
      warnings.push(`Outline count (${outlineCount}) seems inconsistent with selected competitors (${selectedCount})`);
    }
  }

  return warnings.length > 0 ? warn(warnings) : ok();
}

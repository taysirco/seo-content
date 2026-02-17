import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PipelineState,
  Location,
  ClientMeta,
  CompetitorResult,
  CompetitorOutline,
  MergedOutline,
  CompetitorContent,
  EntityAnalysisResult,
  MergedEntitiesResult,
  AIEntitiesResult,
  NGramsResult,
  NLPKeywordsResult,
  GrammarResult,
  SEORule,
  WritingConfig,
} from '@/types/pipeline';
import { saveProject, loadProject } from '@/lib/firebase';
import { SEO_RULES_LIBRARY } from '@/lib/seo-rules-library';
import { toast } from 'sonner';

// Debounced auto-save — 3s after last step change
// Captures projectId at schedule time to prevent saving stale/reset data
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleAutoSave(getState: () => PipelineState) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  const scheduledProjectId = getState().projectId;
  if (!scheduledProjectId) return;
  autoSaveTimer = setTimeout(async () => {
    autoSaveTimer = null;
    const state = getState();
    // Guard: skip if project was reset or changed between schedule and fire
    if (!state.projectId || state.projectId !== scheduledProjectId) return;
    try { await saveProject(state); }
    catch (err) { console.warn('[AutoSave] Failed:', err); }
  }, 3000);
}

// Cleanup timer on module unload (HMR / page navigation)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
  });
}

// D6: Merge new rules from library into existing project rules
// Also propagate new fields (like 'category') to existing rules that lack them
function migrateRules(existingRules: SEORule[] | undefined): SEORule[] {
  if (!existingRules) return [...SEO_RULES_LIBRARY];
  const libraryMap = new Map(SEO_RULES_LIBRARY.map(r => [r.id, r]));
  // Update existing rules with any new fields from the library
  const updated = existingRules.map(r => {
    const lib = libraryMap.get(r.id);
    if (lib) {
      return { ...r, category: r.category || lib.category };
    }
    return r;
  });
  // Add brand-new rules not in the existing set
  const existingIds = new Set(existingRules.map(r => r.id));
  const newRules = SEO_RULES_LIBRARY.filter(r => !existingIds.has(r.id));
  return [...updated, ...newRules];
}

interface PipelineActions {
  setKeyword: (keyword: string) => void;
  setLocation: (location: Location) => void;
  setClientMeta: (meta: ClientMeta | null) => void;
  setCurrentStep: (step: number) => void;
  setStatus: (status: PipelineState['status']) => void;
  setError: (error: string | null) => void;
  setProjectId: (id: string) => void;
  cloneProject: (newKeyword: string) => string;

  setStep1: (competitors: CompetitorResult[], serpFeatures?: PipelineState['step1'] extends null ? never : NonNullable<PipelineState['step1']>['serpFeatures']) => void;
  setStep2: (outlines: CompetitorOutline[], merged: MergedOutline) => void;
  setStep3: (contents: CompetitorContent[]) => void;
  setStep4: (perCompetitor: EntityAnalysisResult[], merged: MergedEntitiesResult) => void;
  setStep5: (aiEntities: AIEntitiesResult) => void;
  setStep6: (ngrams: NGramsResult) => void;
  setStep7: (perCompetitor: NLPKeywordsResult[], combined: NLPKeywordsResult) => void;
  setStep8: (skipGrams: string[], extra?: { word_sense_disambiguation?: { sense: string; dominant_words: string[] }[]; document_summarization?: string[]; keyword_extraction?: string[] }) => void;
  setStep9: (autoKeywords: string[]) => void;
  setStep10: (grammar: GrammarResult) => void;
  setStep11: (rules: SEORule[]) => void;
  setStep12: (config: WritingConfig, instructions: string) => void;
  setStep13: (content: string) => void;
  setPublishStatus: (status: 'draft' | 'review' | 'approved' | 'published') => void;

  toggleCompetitor: (index: number) => void;
  resetPipeline: () => void;
  getSelectedCompetitors: () => CompetitorResult[];
  saveToCloud: () => Promise<void>;
  loadFromCloud: (projectId: string) => Promise<boolean>;
}

type PipelineStore = PipelineState & PipelineActions;

const initialState: PipelineState = {
  projectId: '',
  keyword: '',
  location: null,
  clientMeta: null,
  currentStep: 1,
  status: 'idle',
  error: null,
  step1: null,
  step2: null,
  step3: null,
  step4: null,
  step5: null,
  step6: null,
  step7: null,
  step8: null,
  step9: null,
  step10: null,
  step11: null,
  step12: null,
  step13: null,
  publishStatus: 'draft' as const,
};

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setKeyword: (keyword) => set({ keyword }),
      setLocation: (location) => set({ location }),
      setClientMeta: (meta) => set({ clientMeta: meta }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setStatus: (status) => set({ status }),
      setError: (error) => {
        if (error) toast.error(error);
        set({ error });
      },
      setProjectId: (id) => set({ projectId: id }),

      // S8: Clone current project config for a new keyword (reuses client, location, rules, writing config)
      cloneProject: (newKeyword: string) => {
        const state = get();
        const newId = crypto.randomUUID();
        set({
          ...initialState,
          projectId: newId,
          keyword: newKeyword,
          location: state.location,
          clientMeta: state.clientMeta,
          step11: state.step11,
          step12: state.step12,
        });
        return newId;
      },

      setStep1: (competitors, serpFeatures) => { set({ step1: { competitors, serpFeatures } }); scheduleAutoSave(get); },
      setStep2: (outlines, merged) => { set({ step2: { outlines, merged } }); scheduleAutoSave(get); },
      setStep3: (contents) => { set({ step3: { contents } }); scheduleAutoSave(get); },
      setStep4: (perCompetitor, merged) => { set({ step4: { perCompetitor, merged } }); scheduleAutoSave(get); },
      setStep5: (aiEntities) => { set({ step5: { aiEntities } }); scheduleAutoSave(get); },
      setStep6: (ngrams) => { set({ step6: ngrams }); scheduleAutoSave(get); },
      setStep7: (perCompetitor, combined) => { set({ step7: { perCompetitor, combined } }); scheduleAutoSave(get); },
      setStep8: (skipGrams, extra) => { set({ step8: { skipGrams, ...extra } }); scheduleAutoSave(get); },
      setStep9: (autoKeywords) => { set({ step9: { autoKeywords } }); scheduleAutoSave(get); },
      setStep10: (grammar) => { set({ step10: { grammar } }); scheduleAutoSave(get); },
      setStep11: (rules) => { set({ step11: { rules } }); scheduleAutoSave(get); },
      setStep12: (config, instructions) => { set({ step12: { config, instructions } }); scheduleAutoSave(get); },
      setStep13: (content) => { set({ step13: { content, generatedAt: new Date().toISOString() } }); scheduleAutoSave(get); },
      setPublishStatus: (status) => { set({ publishStatus: status }); scheduleAutoSave(get); },

      toggleCompetitor: (index) => {
        const state = get();
        if (!state.step1) return;
        const competitors = [...state.step1.competitors];
        competitors[index] = { ...competitors[index], selected: !competitors[index].selected };
        set({ step1: { ...state.step1, competitors } });
      },

      resetPipeline: () => set(initialState),

      getSelectedCompetitors: () => {
        const state = get();
        if (!state.step1) return [];
        return state.step1.competitors.filter(c => c.selected);
      },

      saveToCloud: async () => {
        const state = get();
        try {
          await saveProject(state);
        } catch (err) {
          console.error('Failed to save to Firestore:', err);
        }
      },

      loadFromCloud: async (projectId: string) => {
        try {
          const data = await loadProject(projectId);
          if (data) {
            // D6: Migrate SEO rules — add new rules from library to old projects
            const migratedRules = data.step11?.rules ? migrateRules(data.step11.rules) : undefined;
            const step11 = migratedRules ? { rules: migratedRules } : data.step11;
            set({ ...initialState, ...data, step11, status: 'idle', error: null });
            return true;
          }
          return false;
        } catch (err) {
          console.error('Failed to load from Firestore:', err);
          return false;
        }
      },
    }),
    {
      name: 'content-flow-pipeline',
      partialize: (state) => ({
        projectId: state.projectId,
        keyword: state.keyword,
        location: state.location,
        clientMeta: state.clientMeta,
        currentStep: state.currentStep,
        step1: state.step1,
        step2: state.step2,
        step3: state.step3,
        step4: state.step4,
        step5: state.step5,
        step6: state.step6,
        step7: state.step7,
        step8: state.step8,
        step9: state.step9,
        step10: state.step10,
        step11: state.step11,
        step12: state.step12,
        step13: state.step13,
        publishStatus: state.publishStatus,
      }),
    }
  )
);

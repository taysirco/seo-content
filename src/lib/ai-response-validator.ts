import type {
  EntityAnalysisResult,
  MergedEntitiesResult,
  AIEntitiesResult,
  NLPKeywordsResult,
  GrammarResult,
  MergedOutline,
} from '@/types/pipeline';

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every(v => typeof v === 'string');
}

function hasEntityCategories(obj: unknown): boolean {
  if (!isObject(obj)) return false;
  const cats = ['people', 'organizations', 'locations', 'products', 'concepts', 'events', 'technologies', 'other'];
  return cats.some(c => Array.isArray((obj as Record<string, unknown>)[c]));
}

export function validateMergedOutline(data: unknown): MergedOutline {
  if (!isObject(data)) throw new Error('Invalid outline: not an object');
  const d = data as Record<string, unknown>;
  return {
    title: typeof d.title === 'string' ? d.title : 'Untitled',
    headings: Array.isArray(d.headings)
      ? d.headings.map((h: unknown) => {
          const hObj = h as Record<string, unknown>;
          return {
            level: (typeof hObj.level === 'number' && hObj.level >= 1 && hObj.level <= 6
              ? hObj.level : 2) as 1 | 2 | 3 | 4 | 5 | 6,
            text: typeof hObj.text === 'string' ? hObj.text : '',
          };
        }).filter(h => h.text.length > 0)
      : [],
    summary: typeof d.summary === 'string' ? d.summary : '',
  };
}

export function validateEntityAnalysis(data: unknown): EntityAnalysisResult {
  if (!isObject(data)) throw new Error('Invalid entity analysis: not an object');
  const d = data as Record<string, unknown>;

  const emptyCategories = {
    people: [], organizations: [], locations: [], products: [],
    concepts: [], events: [], technologies: [], other: [],
  };

  return {
    title: typeof d.title === 'string' ? d.title : '',
    foundInContent: hasEntityCategories(d.foundInContent)
      ? d.foundInContent as EntityAnalysisResult['foundInContent']
      : emptyCategories,
    suggestedToAdd: hasEntityCategories(d.suggestedToAdd)
      ? d.suggestedToAdd as EntityAnalysisResult['suggestedToAdd']
      : emptyCategories,
    contentScore: typeof d.contentScore === 'number'
      ? Math.max(0, Math.min(100, d.contentScore)) : 50,
    criticalGaps: isStringArray(d.criticalGaps) ? d.criticalGaps : [],
  };
}

export function validateMergedEntities(data: unknown): MergedEntitiesResult {
  if (!isObject(data)) throw new Error('Invalid merged entities: not an object');
  const d = data as Record<string, unknown>;

  const emptyCategories = {
    people: [], organizations: [], locations: [], products: [],
    concepts: [], events: [], technologies: [], other: [],
  };

  return {
    entities: hasEntityCategories(d.entities)
      ? d.entities as MergedEntitiesResult['entities']
      : emptyCategories,
    summary: typeof d.summary === 'string' ? d.summary : '',
    totalUnique: typeof d.totalUnique === 'number' ? d.totalUnique : 0,
  };
}

export function validateAIEntities(data: unknown): AIEntitiesResult {
  if (!isObject(data)) throw new Error('Invalid AI entities: not an object');
  const d = data as Record<string, unknown>;

  return {
    entities: isStringArray(d.entities) ? d.entities : [],
    entityTypes: isObject(d.entityTypes) ? {
      people: isStringArray((d.entityTypes as Record<string, unknown>).people) ? (d.entityTypes as Record<string, string[]>).people : [],
      organizations: isStringArray((d.entityTypes as Record<string, unknown>).organizations) ? (d.entityTypes as Record<string, string[]>).organizations : [],
      concepts: isStringArray((d.entityTypes as Record<string, unknown>).concepts) ? (d.entityTypes as Record<string, string[]>).concepts : [],
      products: isStringArray((d.entityTypes as Record<string, unknown>).products) ? (d.entityTypes as Record<string, string[]>).products : [],
      locations: isStringArray((d.entityTypes as Record<string, unknown>).locations) ? (d.entityTypes as Record<string, string[]>).locations : [],
    } : { people: [], organizations: [], concepts: [], products: [], locations: [] },
  };
}

export function validateNLPKeywords(data: unknown): NLPKeywordsResult {
  if (!isObject(data)) throw new Error('Invalid NLP keywords: not an object');
  const d = data as Record<string, unknown>;

  const emptyKeywords = {
    primaryKeywords: [], secondaryKeywords: [], lsiKeywords: [],
    technicalTerms: [], longTailPhrases: [], questionPhrases: [],
  };

  return {
    topic: typeof d.topic === 'string' ? d.topic : '',
    foundInContent: isObject(d.foundInContent)
      ? d.foundInContent as unknown as NLPKeywordsResult['foundInContent']
      : emptyKeywords,
    suggestedToAdd: isObject(d.suggestedToAdd)
      ? d.suggestedToAdd as unknown as NLPKeywordsResult['suggestedToAdd']
      : emptyKeywords,
    contentScore: typeof d.contentScore === 'number'
      ? Math.max(0, Math.min(100, d.contentScore)) : 50,
    seoTips: isStringArray(d.seoTips) ? d.seoTips : [],
    criticalGaps: isStringArray(d.criticalGaps) ? d.criticalGaps : [],
  };
}

export function validateNGrams(data: unknown): { ngrams: string[] } {
  if (!isObject(data)) return { ngrams: [] };
  const d = data as Record<string, unknown>;
  return { ngrams: isStringArray(d.ngrams) ? d.ngrams : [] };
}

export function validatePickedNGrams(data: unknown): { picked: string[] } {
  if (!isObject(data)) return { picked: [] };
  const d = data as Record<string, unknown>;
  return { picked: isStringArray(d.picked) ? d.picked : [] };
}

export interface SkipGramSense {
  sense: string;
  dominant_words: string[];
}

export interface SkipGramsResult {
  term: string;
  word_sense_disambiguation: SkipGramSense[];
  document_summarization: string[];
  keyword_extraction: string[];
  skipGrams: string[];
}

export function validateSkipGrams(data: unknown): SkipGramsResult {
  if (!isObject(data)) return { term: '', word_sense_disambiguation: [], document_summarization: [], keyword_extraction: [], skipGrams: [] };
  const d = data as Record<string, unknown>;

  // Parse word_sense_disambiguation
  let wsd: SkipGramSense[] = [];
  if (Array.isArray(d.word_sense_disambiguation)) {
    wsd = (d.word_sense_disambiguation as unknown[]).map((s: unknown) => {
      if (!isObject(s)) return { sense: '', dominant_words: [] };
      const sObj = s as Record<string, unknown>;
      return {
        sense: typeof sObj.sense === 'string' ? sObj.sense : '',
        dominant_words: isStringArray(sObj.dominant_words) ? sObj.dominant_words : [],
      };
    }).filter(s => s.sense.length > 0);
  }

  // Build skipGrams from explicit array OR derive from dominant words
  let skipGrams: string[] = [];
  if (isStringArray(d.skipGrams)) {
    skipGrams = d.skipGrams;
  } else if (wsd.length > 0) {
    // Derive skip-gram pairs from the first sense's dominant words
    const words = wsd[0].dominant_words;
    for (let i = 0; i < words.length - 1 && skipGrams.length < 30; i++) {
      skipGrams.push(`${words[i]} + ${words[i + 1]}`);
    }
  }

  return {
    term: typeof d.term === 'string' ? d.term : '',
    word_sense_disambiguation: wsd,
    document_summarization: isStringArray(d.document_summarization) ? d.document_summarization : [],
    keyword_extraction: isStringArray(d.keyword_extraction) ? d.keyword_extraction : [],
    skipGrams,
  };
}

export function validateGrammar(data: unknown): GrammarResult {
  if (!isObject(data)) throw new Error('Invalid grammar: not an object');
  const d = data as Record<string, unknown>;

  const toArr = (key: string) => isStringArray(d[key]) ? d[key] as string[] : [];

  return {
    term: typeof d.term === 'string' ? d.term : '',
    proper_nouns: toArr('proper_nouns'),
    common_nouns: toArr('common_nouns'),
    synonyms: toArr('synonyms'),
    antonyms: toArr('antonyms'),
    hyponyms: toArr('hyponyms'),
    hypernyms: toArr('hypernyms'),
    homonyms: toArr('homonyms'),
    meronyms: toArr('meronyms'),
    holonyms: toArr('holonyms'),
    polysemy: toArr('polysemy'),
  };
}

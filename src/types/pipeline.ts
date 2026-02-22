// ─── Step 1 ───
export interface Location {
  city: string;         // English city name
  cityAr: string;       // Legacy Arabic name (kept for backward compat)
  cityLocal?: string;   // City name in local language
  country: string;      // ISO 3166-1 alpha-2
  lang: string;         // ISO 639-1
  lat: number;
  lng: number;
  googleTld?: string;   // e.g. 'google.com.sa', 'google.co.uk'
  countryName?: string; // e.g. 'Saudi Arabia', 'United Kingdom'
}

export interface CompetitorResult {
  position: number;
  url: string;
  title: string;
  metaDescription: string;
  domain: string;
  selected: boolean;
}

// ─── Step 2 ───
export interface HeadingItem {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface CompetitorOutline {
  url: string;
  headings: HeadingItem[];
}

export interface MergedOutline {
  title: string;
  headings: HeadingItem[];
  summary: string;
  gapAnalysis?: {
    blindSpots: { heading: string; rationale: string; searchIntent: string; suggestedSubHeadings: string[] }[];
    hiddenObjections?: { fearOrObjection: string; suggestedH2: string }[];
    counterNarrative?: { standardAdvice: string; contrarianTake: string; suggestedH2: string };
    depthAnalysis: { currentH2Count: number; currentH3Count: number; recommendedH2Count: number; recommendedH3Count: number; depthScore: number; shallowSections: string[]; suggestedSubSections: { parentH2: string; newH3: string }[] };
    missingQuestions: string[];
    uniqueAngles: string[];
    informationGainScore: number;
  };
}

// ─── Step 3 ───
export interface CompetitorContent {
  url: string;
  text: string;
  wordCount: number;
  extractedAt: string;
}

// ─── Step 4 ───
export interface EntityWithCount { name: string; count: number; }
export interface EntityWithPriority { name: string; priority: 'high' | 'medium' | 'low'; }
export interface EntityWithRelevance { name: string; relevance: number; }

export interface EntityCategories<T> {
  people: T[];
  organizations: T[];
  locations: T[];
  products: T[];
  concepts: T[];
  events: T[];
  technologies: T[];
  other: T[];
}

export interface EntityAnalysisResult {
  title: string;
  foundInContent: EntityCategories<EntityWithCount>;
  suggestedToAdd: EntityCategories<EntityWithPriority>;
  contentScore: number;
  criticalGaps: string[];
}

export interface MergedEntitiesResult {
  entities: EntityCategories<EntityWithRelevance>;
  summary: string;
  totalUnique: number;
}

// ─── Step 5 ───
export interface AIEntitiesResult {
  entities: string[];
  entityTypes: {
    people: string[];
    organizations: string[];
    concepts: string[];
    products: string[];
    locations: string[];
  };
}

// ─── Step 6 ───
export interface NGramGenerated {
  bigrams: string[];
  trigrams: string[];
  fourgrams: string[];
  informational: string[];
  commercial: string[];
  longtail: string[];
  seasonal: string[];
  authority: string[];
}

export interface NGramsResult {
  extracted: string[];
  picked: string[];
  unique: string[];
  excludedPicked?: number[];
  excludedUnique?: number[];
  generated?: NGramGenerated;
}

// ─── Step 7 ───
export interface KeywordWithCount { term: string; count: number; }
export interface KeywordWithPriority { term: string; priority: 'high' | 'medium' | 'low'; }

export interface KeywordCategories<T> {
  primaryKeywords: T[];
  secondaryKeywords: T[];
  lsiKeywords: T[];
  technicalTerms: T[];
  longTailPhrases: T[];
  questionPhrases: T[];
}

export interface NLPKeywordsResult {
  topic: string;
  foundInContent: KeywordCategories<KeywordWithCount>;
  suggestedToAdd: KeywordCategories<KeywordWithPriority>;
  contentScore: number;
  seoTips: string[];
  criticalGaps: string[];
}

// ─── Step 10 ───
export interface GrammarResult {
  term: string;
  proper_nouns: string[];
  common_nouns: string[];
  synonyms: string[];
  antonyms: string[];
  hyponyms: string[];
  hypernyms: string[];
  homonyms: string[];
  meronyms: string[];
  holonyms: string[];
  polysemy: string[];
}

// ─── Step 11 ───
export interface SEORule {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  fullPrompt: string;
  enabled: boolean;
  category?: 'seo' | 'semantic' | 'visual' | 'custom';
}

// ─── Step 12 ───
export interface WritingConfig {
  tone: 'professional' | 'casual' | 'academic' | 'conversational' | 'authoritative';
  voice: 'first_person' | 'third_person' | 'impersonal';
  persona: 'default' | 'doctor' | 'engineer' | 'marketer' | 'lawyer' | 'chef' | 'reviewer';
  audience: 'general' | 'specialists' | 'business_owners' | 'students';
  contentLength: 'short' | 'medium' | 'long' | 'comprehensive';
  languageStyle: 'msa' | 'colloquial' | 'mixed' | 'formal' | 'informal';
  formatting: ('bullets' | 'numbered' | 'tables' | 'blockquotes')[];
  ctaStyle: 'soft' | 'direct' | 'question' | 'none';
  customInstructions: string;
  firstHandExperience?: string;
}

// ─── S1: Client/Site Metadata for SaaS multi-site management ───
export interface ClientMeta {
  clientName: string;
  domain: string;
  logoUrl?: string;
  notes?: string;
  tags?: string[];
  createdAt?: string;
}

// ─── Pipeline State ───
export interface PipelineState {
  projectId: string;
  keyword: string;
  location: Location | null;
  clientMeta?: ClientMeta | null;
  currentStep: number;
  status: 'idle' | 'processing' | 'error' | 'complete';
  error: string | null;
  step1: {
    competitors: CompetitorResult[];
    serpFeatures?: {
      peopleAlsoAsk?: { question: string; snippet: string }[];
      relatedSearches?: string[];
      knowledgeGraph?: { title: string; type: string; description: string };
      detected?: string[];
      competitorStrength?: { domain: string; position: number; domainType: string; title: string }[];
    };
  } | null;
  step2: { outlines: CompetitorOutline[]; merged: MergedOutline } | null;
  step3: { contents: CompetitorContent[] } | null;
  step4: { perCompetitor: EntityAnalysisResult[]; merged: MergedEntitiesResult } | null;
  step5: { aiEntities: AIEntitiesResult } | null;
  step6: NGramsResult | null;
  step7: { perCompetitor: NLPKeywordsResult[]; combined: NLPKeywordsResult } | null;
  step8: {
    skipGrams: string[];
    excludedIndices?: number[];
    word_sense_disambiguation?: { sense: string; dominant_words: string[] }[];
    document_summarization?: string[];
    keyword_extraction?: string[];
  } | null;
  step9: { autoKeywords: string[]; excludedIndices?: number[] } | null;
  step10: { grammar: GrammarResult } | null;
  step11: { rules: SEORule[] } | null;
  step12: { config: WritingConfig; instructions: string } | null;
  step13: { content: string; generatedAt: string } | null;
  // Weapon 4: Semantic Silo - Internal project links to weave into content
  internalLinks?: { keyword: string; url: string; projectId: string }[];
  // W17-4: Publishing workflow status
  publishStatus?: 'draft' | 'review' | 'approved' | 'published';
}

// ─── Step metadata ───
export interface StepMeta {
  number: number;
  titleAr: string;
  titleEn: string;
  icon: string;
  type: 'data' | 'ai' | 'config';
  hasAI: boolean;
}

export const STEPS_META: StepMeta[] = [
  { number: 1, titleAr: 'بحث المنافسين', titleEn: 'Competitor Research', icon: 'Search', type: 'data', hasAI: false },
  { number: 2, titleAr: 'إنشاء المخطط', titleEn: 'Outline Creation', icon: 'List', type: 'ai', hasAI: true },
  { number: 3, titleAr: 'استخراج المحتوى', titleEn: 'Content Extraction', icon: 'FileText', type: 'data', hasAI: false },
  { number: 4, titleAr: 'المحرك الدلالي', titleEn: 'Semantic Engine', icon: 'Brain', type: 'ai', hasAI: true },
  { number: 5, titleAr: 'قواعد SEO', titleEn: 'SEO Rules', icon: 'Shield', type: 'config', hasAI: false },
  { number: 6, titleAr: 'تعليمات الكتابة', titleEn: 'AI Instructions', icon: 'Settings', type: 'config', hasAI: false },
  { number: 7, titleAr: 'المحتوى النهائي', titleEn: 'Final Content', icon: 'Sparkles', type: 'ai', hasAI: true },
];

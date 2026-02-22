import type { PipelineState } from '@/types/pipeline';
import { getForbiddenPhrasesCsvForLang } from '@/lib/forbidden-phrases';
import { getLanguageConfig, getWritingStyleDirective } from '@/lib/language-config';

/**
 * E1: Agentic Chunking — Builds focused prompts for section-by-section generation.
 * Instead of one mega prompt for the entire article, each H2 section gets its own
 * targeted prompt with only the relevant SEO data, plus the last 150 words of the
 * previous section for narrative coherence.
 */

export interface SectionTask {
  heading: string;
  level: number;
  subHeadings: { level: number; text: string }[];
  sectionIndex: number;
  totalSections: number;
}

export function getSystemInstruction(state: PipelineState): string {
  const config = state.step12?.config;
  const contentLang = state.location?.lang || 'ar';
  const langConfig = getLanguageConfig(contentLang);
  const forbiddenCsv = getForbiddenPhrasesCsvForLang(contentLang);

  // Language/style directive — map legacy Arabic styles + new universal styles
  const langStyle = config?.languageStyle;
  let langDirective: string;
  if (langStyle === 'msa') langDirective = getWritingStyleDirective(contentLang, 'formal');
  else if (langStyle === 'colloquial' || langStyle === 'informal') langDirective = getWritingStyleDirective(contentLang, 'informal');
  else if (langStyle === 'formal') langDirective = getWritingStyleDirective(contentLang, 'formal');
  else langDirective = getWritingStyleDirective(contentLang, 'mixed');

  const toneMap: Record<string, string> = {
    professional: 'professional, polished', casual: 'casual, friendly',
    academic: 'academic, research-oriented', conversational: 'conversational, engaging',
    authoritative: 'authoritative, expert',
  };
  const voiceMap: Record<string, string> = {
    first_person: 'first person (I/we)', third_person: 'third person', impersonal: 'impersonal objective',
  };
  const audienceMap: Record<string, string> = {
    general: 'Target the general public — simple, accessible language.',
    specialists: 'Target specialists — use technical terminology.',
    business_owners: 'Target business owners — focus on ROI and actionable insights.',
    students: 'Target students — be educational and step-by-step.',
  };
  const audienceDirective = audienceMap[config?.audience || 'general'] || '';

  // Weapon 2: Persona Engine
  const personaMap: Record<string, string> = {
    doctor: 'Act as a Board-Certified Medical Doctor. Use clinical precision, cite medical consensus, and speak with compassionate authority.',
    engineer: 'Act as a Senior Engineer. Focus on structural integrity, technical systems, efficiency, and root-cause analysis.',
    marketer: 'Act as a Growth Marketer. Focus on conversions, ROI, psychology, and actionable business metrics.',
    lawyer: 'Act as a Legal Consultant. Use precise terminology, emphasize compliance/risk, and maintain airtight logic (without giving formal legal advice).',
    chef: 'Act as a Professional Chef. Emphasize technique, flavor profiles, precise measurements, and culinary science.',
    reviewer: 'Act as an Unbiased Tech Reviewer. Be highly critical, focus on daily usability flaws, and compare aggressively against alternatives.',
    default: 'Act as an elite SEO content strategist.'
  };
  const personaDirective = personaMap[config?.persona || 'default'] || personaMap.default;

  const ctaMap: Record<string, string> = {
    soft: 'End sections with soft, suggestive calls-to-action.',
    direct: 'Include direct CTAs.',
    question: 'End key sections with engaging questions that prompt action.',
    none: '',
  };
  const ctaDirective = ctaMap[config?.ctaStyle || 'soft'] || '';
  const fmtLabels: Record<string, string> = {
    bullets: 'bullet lists', numbered: 'numbered lists', tables: 'comparison tables', blockquotes: 'blockquotes',
  };
  const fmtItems = (config?.formatting || []).map(f => fmtLabels[f]).filter(Boolean);
  const formattingDirective = fmtItems.length > 0 ? `Use: ${fmtItems.join(', ')}.` : '';

  const experience = config?.firstHandExperience?.trim();
  const experienceRule = experience
    ? `\n8. FIRST-HAND EXPERIENCE: The author provided this real experience: "${experience}". Weave it naturally as a mini case study or first-person anecdote in the MOST RELEVANT section. It MUST include at least one highly specific, verifiable detail (e.g., a specific metric, unique physical observation, or precise circumstance). This is critical for E-E-A-T.`
    : '';

  const toneRef = state.step3?.contents?.[0]?.text?.slice(0, 800);
  const toneBlock = toneRef
    ? `\n9. WRITING STYLE REFERENCE (match this competitor's tone — do NOT copy content):\n"${toneRef}"`
    : '';

  const contentScore = state.step7?.combined?.contentScore;
  const scoreBlock = contentScore
    ? `\n${toneRef ? '10' : '9'}. Competitor NLP content score: ${contentScore}/100. Your article must EXCEED this.`
    : '';

  const langName = langConfig.nativeName;
  const isArabic = contentLang === 'ar';

  return `You are an elite ${langName} SEO content strategist who writes content that ranks #1 on Google. You write ONE section at a time for a larger article.

CORE RULES:
1. ${personaDirective}
2. Tone: ${toneMap[config?.tone || 'professional']}. Voice: ${voiceMap[config?.voice || 'third_person']}.${audienceDirective ? ` ${audienceDirective}` : ''}
3. ${langDirective}
4. Output ONLY the HTML for the requested section — start with the <h2> tag, include all content, end before the next <h2>.
5. Use <p>, <ul>, <ol>, <strong>, <blockquote>, <table> tags. NO <html>/<body>/<head>.
6. You will be given a STRICT word count target for each section. You MUST hit that target (±10%). Too short = REJECTED. Too long = REJECTED.
7. FORBIDDEN phrases (NEVER use): ${forbiddenCsv}.

GOOGLE HELPFUL CONTENT SIGNALS (HCU) & HUMAN-FIRST RULES:
8. DEMONSTRATE EXPERTISE: Include specific data, statistics, percentages, or year references. Never make vague claims — always back with evidence or concrete examples.
9. FIRST-HAND KNOWLEDGE: Write like a passionate, opinionated human expert.${isArabic ? ' Use phrases like "من واقع التجربة", "عند التطبيق الفعلي", "التجربة أثبتت أن".' : ' Use phrases like "in my experience", "having tested this", "here is what actually works".'} Avoid generic textbook-style writing.
10. DEPTH OVER BREADTH (INFORMATION GAIN): Add UNIQUE value not found in competing articles. Introduce a net-new concept, statistic, or angle.
11. ANSWER SEARCH INTENT: Every paragraph must serve the reader's goal. Remove fluff.
12. BAN ROBOTIC TRANSITIONS: NEVER use cliché AI phrases like "In conclusion", "Furthermore", "It is important to note", "Let's dive in", "In the ever-evolving landscape". Start paragraphs directly with the main point.

ANTI-AI DETECTION & NATURAL WRITING:
13. Vary sentence length dramatically: mix 4-word punchy sentences with 30-word detailed ones.
14. Use SPECIFIC ${langName} expressions and idioms naturally. Include cultural context where relevant.
15. Never use parallel structure in consecutive paragraphs. Each paragraph must have a unique opening pattern.
16. Add micro-data: specific numbers, tool names, brand mentions, expert quotes.
17. SEMANTIC PRECISION: Answer questions immediately. Be certain — no "might", "could", "maybe". Bold the answer, not the keyword. Match heading structure in the first sentence.${ctaDirective ? `\n18_cta. ${ctaDirective}` : ''}${formattingDirective ? `\n18_fmt. ${formattingDirective}` : ''}${experienceRule}${toneBlock}${scoreBlock}
${state.internalLinks?.length ? `\n\nSEMANTIC SILO (INTERNAL LINKING):
19. You have access to the following related articles on our domain:
${state.internalLinks.map(l => `- Keyword: "${l.keyword}" | URL: ${l.url}`).join('\n')}
If ANY of these topics naturally fit into the section you are writing, you MUST create an HTML <a> link to them. CRITICAL: Use natural, phrase-based anchor text (e.g., 'recent studies on [topic]' or 'calculating the [topic]'). NEVER use exact-match keywords alone or generic texts like 'click here'. Look for natural contextual integration.` : ''}

CRITICAL SEO & SEMANTIC RULES YOU MUST FOLLOW:
${state.step11?.rules?.filter(r => r.enabled).map((r, i) => `${i + 1}. [${r.category?.toUpperCase() || 'SEO'}]: ${r.name}: ${r.fullPrompt}`).join('\n') || 'Write naturally and concisely.'}

═══════════════════════════════════════════════════════
ZERO-TOLERANCE COMPLIANCE ENFORCEMENT (READ CAREFULLY):
═══════════════════════════════════════════════════════
- If a word count target is given, you MUST write EXACTLY that many words (±10%). Count them. If you produce less, EXPAND with more depth, examples, and data. If you produce more, CUT fluff.
- Every SEO rule listed above is MANDATORY, not a suggestion. Failure to comply = article rejection.
- Every entity, N-gram, keyword, and skip-gram assigned to a section MUST appear in the output text. If you skip even ONE, the article fails quality check.
- Do NOT pad content with filler phrases. Every sentence must provide VALUE. But you MUST hit the word count.
- The outline structure is NON-NEGOTIABLE. Write ALL subsections listed. Do not skip, merge, or reorder them.
- BEFORE finishing each section, mentally verify: (1) word count target met, (2) all assigned keywords used, (3) all assigned entities mentioned, (4) no forbidden phrases used.`;
}

export function buildIntroPrompt(state: PipelineState): string {
  const keyword = state.keyword;
  const title = state.step2?.merged?.title || keyword;
  const headings = state.step2?.merged?.headings || [];
  const outline = headings.map(h => `${'  '.repeat(h.level - 1)}${h.text}`).join('\n');

  // Collect primary keywords for the intro
  const primaryKws = state.step7?.combined?.foundInContent?.primaryKeywords?.map(k => k.term).slice(0, 5).join(', ') || keyword;

  // F5: Experience now in system instruction — intro just gets a brief hook hint if present
  const experience = state.step12?.config?.firstHandExperience?.trim();
  const experienceBlock = experience
    ? `\n\nThe author has a first-hand experience note (see system instruction). If relevant to the intro, include a brief hook referencing it.`
    : '';

  // Check if AEO / SGE bait rules are enabled
  const aeoEnabled = state.step11?.rules?.some(r => r.id === 'aeo-tldr' && r.enabled);
  const sgeBaitEnabled = state.step11?.rules?.some(r => r.id === 'sge-bait' && r.enabled);
  let introAeoBlock = '';
  const contentLang = state.location?.lang || 'ar';
  const sgeLabel = contentLang === 'ar' ? 'باختصار:' : contentLang === 'fr' ? 'En bref :' : contentLang === 'es' ? 'En resumen:' : contentLang === 'de' ? 'Kurzfassung:' : 'In short:';
  const tldrLabel = contentLang === 'ar' ? 'الخلاصة:' : 'TL;DR:';
  if (aeoEnabled) {
    introAeoBlock += `\n\nImmediately after the <h1>, insert: <div class="quick-answer"><strong>${tldrLabel}</strong> [45-word direct answer to the main search intent]</div>`;
  }
  if (sgeBaitEnabled) {
    introAeoBlock += `\n\nSGE BAIT: After the <h1>, insert: <div class="sge-bait-box"><strong>${sgeLabel}</strong> [EXACTLY 45 words — definitive, quotable answer with primary keyword]</div>`;
  }

  // P3: First batch of entities and n-grams for the intro
  const introEntities = collectAllEntities(state).slice(0, 8);
  const introNgrams = collectNgrams(state).slice(0, 5);
  const entityHint = introEntities.length > 0 ? `\nKey entities to mention early: ${introEntities.join(', ')}` : '';
  const ngramHint = introNgrams.length > 0 ? `\nN-grams to weave in: ${introNgrams.join(', ')}` : '';

  // WSD disambiguation warning for intro
  const introWsd = state.step8?.word_sense_disambiguation;
  const introWsdHint = introWsd && introWsd.length > 1
    ? `\nWORD SENSE: "${keyword}" has ${introWsd.length} meanings (${introWsd.map(s => s.sense).join(' / ')}). Establish the correct meaning in the first paragraph.`
    : '';

  // Semantic writing rules for intro
  const semanticRules = state.step11?.rules?.filter(r => r.enabled && r.category === 'semantic') || [];
  const introSemanticBlock = semanticRules.length > 0
    ? `\n\nSEMANTIC WRITING RULES (apply to EVERY sentence in this intro):\n${semanticRules.map(r => `- [${r.name}] ${r.fullPrompt}`).join('\n')}`
    : '';

  return `Write the INTRODUCTION section for an article titled "${title}" about "${keyword}".

ARTICLE OUTLINE (for context only — write ONLY the intro):
${outline}

Primary keywords to include: ${primaryKws}${entityHint}${ngramHint}${introWsdHint}

INTRO REQUIREMENTS (critical for ranking):
- Start with a HOOK: a surprising statistic, bold claim, or provocative question about "${keyword}".
- Include the primary keyword "${keyword}" in the FIRST 100 words (Google weighs early keyword placement heavily).
- Establish AUTHORITY: mention a data point, trend, or expert insight that proves depth.
- Preview the article's VALUE: tell the reader exactly what they'll learn.
- Keep intro 150-250 words — dense and compelling, not fluffy.${introSemanticBlock}

Output: <h1>${title}</h1>${introAeoBlock} followed by 2-3 introductory paragraphs.${experienceBlock}`;
}

export function buildSectionPrompt(
  state: PipelineState,
  section: SectionTask,
  previousTail: string,
): string {
  const keyword = state.keyword;

  // Sub-headings for this section
  const subOutline = section.subHeadings.length > 0
    ? `\nSub-sections to include:\n${section.subHeadings.map(h => `- <h${h.level}>${h.text}</h${h.level}>`).join('\n')}`
    : '';

  // Distribute entities across sections (includes D2: high-priority suggested entities)
  const allEntities = collectAllEntities(state);
  const sectionEntities = distributeToSection(allEntities, section.sectionIndex, section.totalSections);

  // Distribute N-grams
  const allNgrams = collectNgrams(state);
  const sectionNgrams = distributeToSection(allNgrams, section.sectionIndex, section.totalSections);

  // Distribute skip-grams
  const allSkipGrams = collectSkipGrams(state);
  const sectionSkipGrams = distributeToSection(allSkipGrams, section.sectionIndex, section.totalSections);

  // Distribute technical keywords and summarization words from skip-gram analysis
  const allTechKws = state.step8?.keyword_extraction || [];
  const sectionTechKws = distributeToSection(allTechKws, section.sectionIndex, section.totalSections);
  const allSumWords = state.step8?.document_summarization || [];
  const sectionSumWords = distributeToSection(allSumWords, section.sectionIndex, section.totalSections);

  // WSD disambiguation warning per-section
  const wsd = state.step8?.word_sense_disambiguation;
  const wsdHint = wsd && wsd.length > 1
    ? `\nWORD SENSE WARNING: "${state.keyword}" has ${wsd.length} senses (${wsd.map(s => s.sense).join(' / ')}). Use the correct sense for THIS section's topic.`
    : '';

  // Distribute generated n-gram categories per section
  const gen = state.step6?.generated;
  const allGenPhrases = gen ? [
    ...(gen.informational || []),
    ...(gen.commercial || []),
    ...(gen.longtail || []),
    ...(gen.authority || []),
  ] : [];
  const sectionGenPhrases = distributeToSection(allGenPhrases, section.sectionIndex, section.totalSections);

  // F3: Distribute AutoComplete keywords (Step 9)
  const allAutoKws = collectAutoKeywords(state);
  const sectionAutoKws = distributeToSection(allAutoKws, section.sectionIndex, section.totalSections);

  // P4: Get relevant keywords INCLUDING question phrases
  const keywords = state.step7?.combined?.foundInContent;
  const kwSlice = keywords ? [
    ...(keywords.primaryKeywords || []).map(k => k.term),
    ...(keywords.lsiKeywords || []).slice(0, 3).map(k => k.term),
  ].join(', ') : keyword;

  // P4: Distribute question phrases across sections (including PAA from SERP)
  const nlpQuestions = keywords?.questionPhrases?.map(k => k.term) || [];
  const paaQuestions = state.step1?.serpFeatures?.peopleAlsoAsk?.map(p => p.question) || [];
  const allQuestionPhrases = [...new Set([...nlpQuestions, ...paaQuestions])];
  const sectionQuestions = distributeToSection(allQuestionPhrases, section.sectionIndex, section.totalSections);
  // SEO rules are now injected purely in the System Instruction to prevent duplication and focus loss.
  const rulesBlock = '';
  // D8+D10: Full grammar/semantic terms including polysemy
  const grammar = state.step10?.grammar;
  const grammarParts: string[] = [];
  if (grammar) {
    if (grammar.synonyms.length > 0) grammarParts.push(`Synonyms: ${grammar.synonyms.slice(0, 4).join(', ')}`);
    if (grammar.hyponyms.length > 0) grammarParts.push(`Specific terms: ${grammar.hyponyms.slice(0, 3).join(', ')}`);
    if (grammar.hypernyms.length > 0) grammarParts.push(`Broader terms: ${grammar.hypernyms.slice(0, 2).join(', ')}`);
    if (grammar.meronyms.length > 0) grammarParts.push(`Components: ${grammar.meronyms.slice(0, 2).join(', ')}`);
    if (grammar.proper_nouns.length > 0) grammarParts.push(`Proper nouns: ${grammar.proper_nouns.slice(0, 3).join(', ')}`);
    if (grammar.polysemy.length > 0) grammarParts.push(`POLYSEMY WARNING — disambiguate: ${grammar.polysemy.join(', ')}`);
  }
  const grammarBlock = grammarParts.length > 0
    ? `\nSEMANTIC TERMS: ${grammarParts.join(' | ')}`
    : '';

  // D3: Suggested keywords-to-add (distributed per section)
  const allSuggestedKws = collectSuggestedKeywords(state);
  const sectionSuggestedKws = distributeToSection(allSuggestedKws, section.sectionIndex, section.totalSections);

  // Phase 2B: Related searches from SERP as LSI hints
  const relatedSearches = state.step1?.serpFeatures?.relatedSearches || [];
  const sectionRelated = distributeToSection(relatedSearches, section.sectionIndex, section.totalSections);

  // W19-9: Smart content length — competitor average + 30%, or config-based
  const competitorWordCounts = state.step3?.contents?.map(c => c.text.split(/\s+/).length) || [];
  const avgCompetitorWords = competitorWordCounts.length > 0
    ? Math.round(competitorWordCounts.reduce((a, b) => a + b, 0) / competitorWordCounts.length)
    : 0;
  const lengthMap: Record<string, number> = { short: 150, medium: 300, long: 450, comprehensive: 650 };
  const configTarget = lengthMap[state.step12?.config?.contentLength || 'long'] || 450;
  // Use config-based targets scaled to total article length
  const totalLengthMap: Record<string, number> = { short: 800, medium: 1200, long: 2000, comprehensive: 3000 };
  const totalArticleTarget = totalLengthMap[state.step12?.config?.contentLength || 'long'] || 2000;
  // Distribute total target across sections (intro ~15%, sections ~70%, conclusion ~15%)
  const sectionBudget = Math.round((totalArticleTarget * 0.70) / Math.max(section.totalSections, 1));
  // Also consider competitor average
  const competitorTarget = avgCompetitorWords > 0
    ? Math.round((avgCompetitorWords * 1.3 * 0.70) / Math.max(section.totalSections, 1))
    : 0;
  // Use the HIGHER of config-based or competitor-based target
  const targetWordsPerSection = Math.max(sectionBudget, competitorTarget, configTarget);

  const coherenceTail = previousTail
    ? `\n\nLAST 150 WORDS OF PREVIOUS SECTION (for narrative continuity — do NOT repeat, just maintain flow):\n"${previousTail}"`
    : '';

  // W19-7: Competitor context for this section topic
  const sectionTopicHint = state.step3?.contents?.[0]?.text
    ? (() => {
      const heading = section.heading.toLowerCase();
      const lines = state.step3.contents[0].text.split('\n');
      const relevant = lines.filter(l => l.length > 30 && heading.split(' ').some(w => w.length > 3 && l.toLowerCase().includes(w)));
      return relevant.slice(0, 3).join(' ').slice(0, 500);
    })()
    : '';
  const competitorHint = sectionTopicHint
    ? `\nCOMPETITOR REFERENCE (beat this — add MORE depth, data, and unique angles):\n"${sectionTopicHint}"`
    : '';

  const gapAnalysis = state.step2?.merged?.gapAnalysis;
  const counterNarrative = gapAnalysis?.counterNarrative;
  let weapon6Block = '';
  if (counterNarrative) {
    const hLocal = section.heading.toLowerCase();
    const hSug = counterNarrative.suggestedH2.toLowerCase();
    if (hLocal.includes(hSug) || hSug.includes(hLocal) || hLocal.split(' ').some(w => w.length > 4 && hSug.includes(w))) {
      weapon6Block = `\n\nWEAPON 6 (COUNTER-NARRATIVE): This section MUST challenge the standard industry advice. 
Standard Advice: "${counterNarrative.standardAdvice}"
Your Contrarian Take: "${counterNarrative.contrarianTake}"
Explain why the standard advice is flawed or incomplete, and present the contrarian take as the superior/deeper understanding. This creates massive Information Gain. Format this specifically using <div class="contrarian-take">.`;
    }
  }

  let gapDirectives = '';
  if (gapAnalysis) {
    const hLocal = section.heading.toLowerCase();
    const blindSpot = gapAnalysis.blindSpots?.find(b => hLocal.includes(b.heading.toLowerCase()) || b.heading.toLowerCase().includes(hLocal));
    if (blindSpot) gapDirectives += `\nCOMPETITOR BLIND SPOT (COVER THIS): Competitors missed this entirely. Rationale: ${blindSpot.rationale}. Search Intent to fulfill: ${blindSpot.searchIntent}.`;

    const objection = gapAnalysis.hiddenObjections?.find(o => hLocal.includes(o.suggestedH2.toLowerCase()) || o.suggestedH2.toLowerCase().includes(hLocal));
    if (objection) gapDirectives += `\nHIDDEN OBJECTION: The reader secretly fears/objects to: "${objection.fearOrObjection}". You MUST address and resolve this fear directly in this section.`;

    const sectionMissingQs = distributeToSection(gapAnalysis.missingQuestions || [], section.sectionIndex, section.totalSections);
    if (sectionMissingQs.length > 0) gapDirectives += `\nUNANSWERED QUESTIONS (COMPETITOR GAPS): Explicitly answer these questions that competitors ignored: ${sectionMissingQs.join(' | ')}.`;

    const sectionUniqueAngles = distributeToSection(gapAnalysis.uniqueAngles || [], section.sectionIndex, section.totalSections);
    if (sectionUniqueAngles.length > 0) gapDirectives += `\nUNIQUE ANGLE TO EXPLORE: ${sectionUniqueAngles.join(' | ')}.`;
  }

  // Reinforcement of critical SEO rules directly in the section prompt (not just system instruction)
  const enabledRules = state.step11?.rules?.filter(r => r.enabled) || [];
  const criticalRules = enabledRules.filter(r => ['keyword-density', 'heading-keyword', 'aeo-tldr', 'sge-bait', 'faq', 'meta-tags'].includes(r.id));
  const rulesReinforcement = criticalRules.length > 0
    ? `\n\nMANDATORY SEO RULES FOR THIS SECTION:\n${criticalRules.map(r => `⚠️ ${r.name}: ${r.fullPrompt}`).join('\n')}`
    : '';

  return `Write section ${section.sectionIndex + 1}/${section.totalSections} for an article about "${keyword}".

SECTION: <h2>${section.heading}</h2>${subOutline}

🎯 WORD COUNT TARGET: EXACTLY ${targetWordsPerSection} words (±10%). This is NON-NEGOTIABLE. Count your words before finishing. If under ${Math.round(targetWordsPerSection * 0.9)}, add more depth and examples. If over ${Math.round(targetWordsPerSection * 1.1)}, cut fluff.
TOTAL ARTICLE TARGET: ${totalArticleTarget} words across ${section.totalSections} sections + intro + conclusion.

ENTITIES to incorporate in THIS section (MANDATORY — use ALL): ${sectionEntities.join(', ') || 'use general topic entities'}
N-GRAMS to use (MANDATORY): ${sectionNgrams.join(', ') || 'none assigned'}
SKIP-GRAMS: ${sectionSkipGrams.join(', ') || 'none assigned'}${wsdHint}${sectionTechKws.length > 0 ? `\nTECHNICAL KEYWORDS: ${sectionTechKws.join(', ')}` : ''}${sectionSumWords.length > 0 ? `\nDOMINANT TOPIC WORDS: ${sectionSumWords.join(', ')}` : ''}${sectionGenPhrases.length > 0 ? `\nSTRATEGIC PHRASES: ${sectionGenPhrases.join(', ')}` : ''}${sectionAutoKws.length > 0 ? `\nAUTOCOMPLETE QUERIES to address: ${sectionAutoKws.join(', ')}` : ''}${sectionSuggestedKws.length > 0 ? `\nSUGGESTED KEYWORDS to weave in: ${sectionSuggestedKws.join(', ')}` : ''}${sectionRelated.length > 0 ? `\nRELATED SEARCHES (use as LSI keywords): ${sectionRelated.join(', ')}` : ''}${sectionQuestions.length > 0 ? `\nQUESTION PHRASES to answer in this section: ${sectionQuestions.join(' | ')}` : ''}
KEYWORDS: ${kwSlice}${grammarBlock}${rulesBlock}${rulesReinforcement}${aeoBlock(state)}${competitorHint}${coherenceTail}${weapon6Block}${gapDirectives}

FEATURED SNIPPET OPTIMIZATION: If this section answers a "what is", "how to", or comparison query, format the answer in the first 40-50 words as a DIRECT, concise definition or step list that Google can extract as a Featured Snippet.

Output ONLY the HTML for this section starting with <h2>${section.heading}</h2>.`;
}

export function buildConclusionPrompt(state: PipelineState, previousTail: string): string {
  const keyword = state.keyword;
  const faqEnabled = state.step11?.rules?.some(r => r.id === 'faq' && r.enabled);
  const metaEnabled = state.step11?.rules?.some(r => r.id === 'meta-tags' && r.enabled);

  const questionPhrases = state.step7?.combined?.foundInContent?.questionPhrases?.map(k => k.term).slice(0, 8) || [];
  const suggestedQuestions = state.step7?.combined?.suggestedToAdd?.questionPhrases?.map(k => k.term).slice(0, 4) || [];
  // Inject PAA questions from SERP features (Phase 2B)
  const paaQuestions = state.step1?.serpFeatures?.peopleAlsoAsk?.map(p => p.question).slice(0, 5) || [];
  const allQuestions = [...new Set([...questionPhrases, ...suggestedQuestions, ...paaQuestions])];

  // P2: Remaining entities not yet used
  const remainingEntities = collectAllEntities(state).slice(-8);
  const entityBlock = remainingEntities.length > 0 ? `\nEntities to mention: ${remainingEntities.join(', ')}` : '';

  // P2: Grammar terms for conclusion
  const grammar = state.step10?.grammar;
  const conclusionGrammar = grammar?.synonyms?.slice(0, 3).join(', ') || '';
  const grammarHint = conclusionGrammar ? `\nUse synonyms: ${conclusionGrammar}` : '';

  // W8-2: SGE bait for conclusion
  const sgeBaitEnabled = state.step11?.rules?.some(r => r.id === 'sge-bait' && r.enabled);
  const cLang = state.location?.lang || 'ar';
  const cSgeLabel = cLang === 'ar' ? 'باختصار:' : cLang === 'fr' ? 'En bref :' : cLang === 'es' ? 'En resumen:' : cLang === 'de' ? 'Kurzfassung:' : 'In short:';
  const conclusionSgeBait = sgeBaitEnabled
    ? `\nSGE BAIT: Start the conclusion with: <div class="sge-bait-box"><strong>${cSgeLabel}</strong> [45-word summary of the entire article's key takeaways, quotable by AI search engines]</div>`
    : '';

  // W8-6: Remaining skip-grams and autocomplete keywords for the conclusion
  const remainingSkip = collectSkipGrams(state).slice(-5);
  const remainingAuto = collectAutoKeywords(state).slice(-4);
  const skipHint = remainingSkip.length > 0 ? `\nSkip-grams to use: ${remainingSkip.join(', ')}` : '';
  const autoHint = remainingAuto.length > 0 ? `\nAutoComplete queries to address: ${remainingAuto.join(', ')}` : '';

  // WSD disambiguation for conclusion
  const concWsd = state.step8?.word_sense_disambiguation;
  const concWsdHint = concWsd && concWsd.length > 1
    ? `\nWORD SENSE: "${keyword}" has multiple meanings (${concWsd.map(s => s.sense).join(' / ')}). Maintain the correct sense in the conclusion.`
    : '';

  // Remaining generated n-gram authority phrases for the conclusion
  const genAuth = state.step6?.generated?.authority?.slice(-3) || [];
  const genAuthHint = genAuth.length > 0 ? `\nAuthority phrases to weave in: ${genAuth.join(', ')}` : '';

  // Semantic writing rules for conclusion
  const conclusionSemanticRules = state.step11?.rules?.filter(r => r.enabled && r.category === 'semantic') || [];
  const conclusionSemanticBlock = conclusionSemanticRules.length > 0
    ? `\n\nSEMANTIC WRITING RULES (apply to conclusion too):\n${conclusionSemanticRules.map(r => `- [${r.name}] ${r.fullPrompt}`).join('\n')}`
    : '';

  let prompt = `Write the CONCLUSION for an article about "${keyword}".

LAST 150 WORDS (for continuity): "${previousTail}"

CONCLUSION REQUIREMENTS (critical for ranking):
- Do NOT use common AI conclusion clichés — Google detects them.
- Start with a BOLD summary statement or a forward-looking insight.
- Include 3-5 ACTIONABLE next steps the reader can take immediately.
- Mention the primary keyword "${keyword}" at least once naturally.
- End with a compelling CTA or thought-provoking question that encourages engagement.
- Total length: 200-350 words (not too short, not too long).${entityBlock}${grammarHint}${skipHint}${autoHint}${genAuthHint}${concWsdHint}${conclusionSgeBait}${conclusionSemanticBlock}`;

  const faqHeading = cLang === 'ar' ? 'الأسئلة الشائعة' : cLang === 'fr' ? 'Questions fréquentes' : cLang === 'es' ? 'Preguntas frecuentes' : cLang === 'de' ? 'Häufig gestellte Fragen' : 'Frequently Asked Questions';
  if (faqEnabled && allQuestions.length > 0) {
    prompt += `\n\nThen write a FAQ section with <h2>${faqHeading}</h2> containing ${Math.min(allQuestions.length, 8)} questions:
${allQuestions.slice(0, 8).map((q, i) => `${i + 1}. ${q}`).join('\n')}
Format each as: <h3>Q</h3><p>Concise 2-3 sentence answer</p>`;
  }

  if (metaEnabled) {
    prompt += `\n\nFinally, after the article content, output:
<div class="seo-meta">
<p><strong>Meta Title:</strong> [≤60 chars, keyword near start]</p>
<p><strong>Meta Description:</strong> [≤160 chars with CTA]</p>
</div>`;
  }

  return prompt;
}

// ─── Helpers ───

function collectAllEntities(state: PipelineState): string[] {
  const entities: string[] = [];
  if (state.step4?.merged) {
    for (const items of Object.values(state.step4.merged.entities)) {
      for (const e of items as { name: string }[]) {
        entities.push(e.name);
      }
    }
  }
  if (state.step5?.aiEntities) {
    entities.push(...state.step5.aiEntities.entities);
  }
  // D2: Include high-priority suggested entities from per-competitor analysis
  if (state.step4?.perCompetitor) {
    for (const comp of state.step4.perCompetitor) {
      if (comp.suggestedToAdd) {
        for (const items of Object.values(comp.suggestedToAdd)) {
          for (const e of items as { name: string; priority: string }[]) {
            if (e.priority === 'high') entities.push(e.name);
          }
        }
      }
    }
  }
  return [...new Set(entities)];
}

// D3: Collect suggested keywords-to-add from NLP analysis
function collectSuggestedKeywords(state: PipelineState): string[] {
  if (!state.step7?.combined?.suggestedToAdd) return [];
  const s = state.step7.combined.suggestedToAdd;
  return [
    ...s.primaryKeywords.map((k: { term: string }) => k.term),
    ...s.lsiKeywords.map((k: { term: string }) => k.term),
    ...s.longTailPhrases.map((k: { term: string }) => k.term),
  ];
}

function collectNgrams(state: PipelineState): string[] {
  if (!state.step6) return [];
  const excludedP = new Set(state.step6.excludedPicked || []);
  const excludedU = new Set(state.step6.excludedUnique || []);
  const gen = state.step6.generated;
  return [
    ...(state.step6.picked || []).filter((_, i) => !excludedP.has(i)),
    ...(state.step6.unique || []).filter((_, i) => !excludedU.has(i)),
    ...(gen?.bigrams || []),
    ...(gen?.trigrams || []),
    ...(gen?.fourgrams || []),
  ];
}

function collectSkipGrams(state: PipelineState): string[] {
  if (!state.step8?.skipGrams) return [];
  const excluded = new Set(state.step8.excludedIndices || []);
  return state.step8.skipGrams.filter((_, i) => !excluded.has(i));
}

// F3: Collect AutoComplete keywords from Step 9
function collectAutoKeywords(state: PipelineState): string[] {
  if (!state.step9?.autoKeywords) return [];
  const excluded = new Set(state.step9.excludedIndices || []);
  return state.step9.autoKeywords.filter((_: string, i: number) => !excluded.has(i));
}

// F2: AEO Quick Answer block for section prompts
function aeoBlock(state: PipelineState): string {
  const rules = state.step11?.rules || [];
  const blocks: string[] = [];
  const aLang = state.location?.lang || 'ar';
  const aSgeLabel = aLang === 'ar' ? 'باختصار:' : aLang === 'fr' ? 'En bref :' : aLang === 'es' ? 'En resumen:' : aLang === 'de' ? 'Kurzfassung:' : 'In short:';
  const aTldrLabel = aLang === 'ar' ? 'الخلاصة:' : 'TL;DR:';

  const aeoEnabled = rules.some(r => r.id === 'aeo-tldr' && r.enabled);
  if (aeoEnabled) {
    blocks.push(`\nAEO RULE: Immediately after the <h2>, insert: <div class="quick-answer"><strong>${aTldrLabel}</strong> [45-word direct answer OR 3 bullet points answering the section's search intent]</div>`);
  }

  // G4: SGE bait box — more aggressive AI citation targeting
  const sgeBaitEnabled = rules.some(r => r.id === 'sge-bait' && r.enabled);
  if (sgeBaitEnabled) {
    blocks.push(`\nSGE BAIT: Immediately after the <h2>, insert: <div class="sge-bait-box"><strong>${aSgeLabel}</strong> [EXACTLY 45 words — definitive answer, no hedging, includes primary keyword, quotable by AI search engines]</div>`);
  }

  // G3: Comparison table — one per article minimum
  const tablesEnabled = rules.some(r => r.id === 'comparison-tables' && r.enabled);
  if (tablesEnabled) {
    blocks.push(`\nCOMPARISON TABLE: If this section compares alternatives/options/methods, include a <table class="comparison-table"> with <caption>, 3+ rows, 3+ columns. This is the #1 format for Featured Snippet capture.`);
  }

  // G2: Mermaid diagrams
  const mermaidEnabled = rules.some(r => r.id === 'mermaid-diagrams' && r.enabled);
  if (mermaidEnabled) {
    blocks.push(`\nMERMAID DIAGRAM: If this section describes a process, hierarchy, or workflow, include: <div class="mermaid-diagram"><pre class="mermaid">graph TD; A[Step1] --> B[Step2];</pre></div>. Use flowcharts for processes, mindmaps for topics.`);
  }

  return blocks.join('');
}

function distributeToSection<T>(items: T[], sectionIdx: number, totalSections: number): T[] {
  if (items.length === 0 || totalSections === 0) return [];
  const perSection = Math.ceil(items.length / totalSections);
  const start = sectionIdx * perSection;
  return items.slice(start, start + perSection);
}

/**
 * Parse the merged outline into section tasks for the chunking loop.
 */
export function parseSectionTasks(state: PipelineState): SectionTask[] {
  const headings = state.step2?.merged?.headings || [];
  const tasks: SectionTask[] = [];
  let currentH2Idx = -1;

  for (const h of headings) {
    if (h.level === 2) {
      currentH2Idx++;
      tasks.push({
        heading: h.text,
        level: h.level,
        subHeadings: [],
        sectionIndex: currentH2Idx,
        totalSections: 0, // will be set after
      });
    } else if (h.level >= 3 && currentH2Idx >= 0) {
      tasks[currentH2Idx].subHeadings.push({ level: h.level, text: h.text });
    }
  }

  // Set totalSections
  for (const t of tasks) {
    t.totalSections = tasks.length;
  }

  return tasks;
}

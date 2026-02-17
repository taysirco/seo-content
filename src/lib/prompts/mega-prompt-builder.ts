import type { PipelineState } from '@/types/pipeline';
import { getForbiddenPhrasesCsvForLang } from '@/lib/forbidden-phrases';
import { getLanguageConfig, getWritingStyleDirective } from '@/lib/language-config';

export function buildMegaPrompt(state: PipelineState): { system: string; user: string } {
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

  // Build tone/voice/audience directives from writing config
  const toneMap: Record<string, string> = {
    professional: 'Use a professional, polished tone.',
    casual: 'Use a casual, friendly tone.',
    academic: 'Use an academic, research-oriented tone with citations.',
    conversational: 'Use a conversational, engaging tone as if speaking to a friend.',
    authoritative: 'Use an authoritative, expert tone that commands respect.',
  };
  const voiceMap: Record<string, string> = {
    first_person: 'Write in first person (I/we).',
    third_person: 'Write in third person.',
    impersonal: 'Write in an impersonal, objective style.',
  };
  const audienceMap: Record<string, string> = {
    general: 'Target the general public — keep language simple and accessible.',
    specialists: 'Target specialists — use technical terminology appropriately.',
    business_owners: 'Target business owners — focus on practical ROI and actionable insights.',
    students: 'Target students — be educational and step-by-step.',
  };
  const toneDirective = toneMap[config?.tone || 'professional'] || toneMap.professional;
  const voiceDirective = voiceMap[config?.voice || 'third_person'] || voiceMap.third_person;
  const audienceDirective = audienceMap[config?.audience || 'general'] || audienceMap.general;

  // Build formatting directive from config
  const fmtLabels: Record<string, string> = {
    bullets: 'bullet lists (<ul>)', numbered: 'numbered lists (<ol>)',
    tables: 'comparison tables (<table>)', blockquotes: 'blockquotes (<blockquote>)',
  };
  const fmtItems = (config?.formatting || []).map(f => fmtLabels[f]).filter(Boolean);
  const formattingDirective = fmtItems.length > 0
    ? `Use these formatting elements throughout the article: ${fmtItems.join(', ')}.`
    : 'Use bullet lists and numbered lists where appropriate.';

  // CTA directive
  const ctaMap: Record<string, string> = {
    soft: 'End sections with soft, suggestive calls-to-action.',
    direct: 'Include direct, actionable calls-to-action (e.g. "اتصل بنا الآن").',
    question: 'End key sections with engaging questions that prompt reader action.',
    none: '',
  };
  const ctaDirective = ctaMap[config?.ctaStyle || 'soft'] || '';

  const langName = langConfig.nativeName;

  const system = `You are an expert SEO content writer specializing in ${langName} content. Write a comprehensive, SEO-optimized article following the exact outline and incorporating all the provided SEO data.

CRITICAL RULES:
1. ${langDirective}
2. ${toneDirective}
3. ${voiceDirective}
4. ${audienceDirective}
5. ${formattingDirective}${ctaDirective ? `\n6. ${ctaDirective}` : ''}
${ctaDirective ? '7' : '6'}. Follow the provided outline EXACTLY — do not skip or reorder sections.
${ctaDirective ? '8' : '7'}. Naturally incorporate ALL provided entities, keywords, and phrases throughout the article.
${ctaDirective ? '9' : '8'}. Use proper HTML heading tags (h1, h2, h3) matching the outline hierarchy.
${ctaDirective ? '10' : '9'}. Write engaging, authoritative content that demonstrates E-E-A-T signals.
${ctaDirective ? '11' : '10'}. Each section must be substantive — no thin or placeholder content.
${ctaDirective ? '12' : '11'}. Use transition sentences between sections for natural flow.
${ctaDirective ? '13' : '12'}. SEMANTIC PRECISION: Answer questions immediately. Be certain — no "might", "could", "maybe". Use numbers, not vague quantities. Bold the answer, not the keyword.`;

  const sections: string[] = [];

  // SECTION 1: MERGED OUTLINE
  if (state.step2?.merged) {
    const outlineText = state.step2.merged.headings
      .map(h => `${'#'.repeat(h.level)} ${h.text}`)
      .join('\n');
    sections.push(`=== ARTICLE OUTLINE ===\nFollow this exact outline structure:\n${outlineText}`);
  }

  // SECTION 2: COMPETITOR TONE REFERENCE
  if (state.step3?.contents && state.step3.contents.length > 0) {
    const topContent = state.step3.contents[0].text.slice(0, 1500);
    sections.push(`=== COMPETITOR TONE REFERENCE ===\nUse the following competitor content as a reference for writing style and tone (DO NOT copy, only match the style):\n${topContent}`);
  }

  // SECTION 3: ENTITIES TO INCORPORATE
  if (state.step4?.merged) {
    const entityList = Object.entries(state.step4.merged.entities)
      .map(([cat, items]) => {
        const names = (items as { name: string; relevance: number }[]).map(e => `${e.name} (relevance: ${e.relevance})`).join(', ');
        return `- ${cat}: ${names}`;
      })
      .join('\n');
    sections.push(`=== ENTITIES TO INCORPORATE ===\nNaturally incorporate these entities throughout the article:\n${entityList}`);
  }

  // A7: Include high-priority suggested entities from per-competitor analysis
  if (state.step4?.perCompetitor) {
    const suggestedSet = new Set<string>();
    for (const comp of state.step4.perCompetitor) {
      if (comp.suggestedToAdd) {
        for (const items of Object.values(comp.suggestedToAdd)) {
          for (const e of items as { name: string; priority: string }[]) {
            if (e.priority === 'high') suggestedSet.add(e.name);
          }
        }
      }
    }
    if (suggestedSet.size > 0) {
      sections.push(`=== HIGH-PRIORITY MISSING ENTITIES ===\nThese entities were identified as critical gaps across competitor analysis — include them:\n${[...suggestedSet].join(', ')}`);
    }
  }

  if (state.step5?.aiEntities) {
    sections.push(`=== AI-SUGGESTED ENTITIES ===\nAlso incorporate: ${state.step5.aiEntities.entities.join(', ')}`);
  }

  // SECTION 4: N-GRAMS (respect user exclusions)
  if (state.step6) {
    const excludedP = new Set(state.step6.excludedPicked || []);
    const excludedU = new Set(state.step6.excludedUnique || []);
    const pickedFiltered = (state.step6.picked || []).filter((_, i) => !excludedP.has(i));
    const uniqueFiltered = (state.step6.unique || []).filter((_, i) => !excludedU.has(i));
    const allNgrams = [...pickedFiltered, ...uniqueFiltered];
    if (allNgrams.length > 0) {
      sections.push(`=== N-GRAMS TO USE ===\nInclude these exact phrases naturally in the content:\n${allNgrams.join('\n')}`);
    }
    // Inject 8-category generated n-grams for topical authority
    const gen = state.step6.generated;
    if (gen) {
      const catLines: string[] = [];
      if (gen.informational?.length) catLines.push(`- Informational: ${gen.informational.join(', ')}`);
      if (gen.commercial?.length) catLines.push(`- Commercial intent: ${gen.commercial.join(', ')}`);
      if (gen.longtail?.length) catLines.push(`- Long-tail phrases: ${gen.longtail.join(', ')}`);
      if (gen.seasonal?.length) catLines.push(`- Seasonal/timely: ${gen.seasonal.join(', ')}`);
      if (gen.authority?.length) catLines.push(`- Authority phrases: ${gen.authority.join(', ')}`);
      if (catLines.length > 0) {
        sections.push(`=== STRATEGIC N-GRAM CATEGORIES ===\nUse these categorized phrases to strengthen topical authority:\n${catLines.join('\n')}`);
      }
    }
  }

  // SECTION 5: NLP KEYWORDS
  if (state.step7?.combined) {
    const kw = state.step7.combined;
    const kwSection = [
      `- Primary: ${kw.foundInContent.primaryKeywords.map(k => k.term).join(', ')}`,
      `- Secondary: ${kw.foundInContent.secondaryKeywords.map(k => k.term).join(', ')}`,
      `- LSI: ${kw.foundInContent.lsiKeywords.map(k => k.term).join(', ')}`,
      `- Long-tail: ${kw.foundInContent.longTailPhrases.map(k => k.term).join(', ')}`,
      `- Questions to answer: ${kw.foundInContent.questionPhrases.map(k => k.term).join(', ')}`,
    ].join('\n');
    sections.push(`=== NLP KEYWORDS ===\nOptimize for these keywords:\n${kwSection}`);

    // A6: Include suggested question phrases for FAQ sections
    const suggested = [
      ...kw.suggestedToAdd.primaryKeywords.map(k => k.term),
      ...kw.suggestedToAdd.lsiKeywords.map(k => k.term),
      ...kw.suggestedToAdd.longTailPhrases.map(k => k.term),
      ...kw.suggestedToAdd.questionPhrases.map(k => k.term),
    ];
    if (suggested.length > 0) {
      sections.push(`=== SUGGESTED KEYWORDS TO ADD ===\n${suggested.join(', ')}`);
    }

    // B8: Include content score context
    if (kw.contentScore) {
      sections.push(`=== CONTENT QUALITY BASELINE ===\nCompetitor average NLP content score: ${kw.contentScore}/100. Your article must exceed this score.`);
    }
  }

  // SECTION 6: SKIP-GRAMS (respect user exclusions)
  if (state.step8?.skipGrams && state.step8.skipGrams.length > 0) {
    const excludedSG = new Set(state.step8.excludedIndices || []);
    const filtered = state.step8.skipGrams.filter((_, i) => !excludedSG.has(i));
    if (filtered.length > 0) {
      sections.push(`=== SKIP-GRAMS ===\nInclude these word pairs naturally:\n${filtered.join('\n')}`);
    }
  }
  // Include keyword_extraction and document_summarization from skip-gram analysis
  if (state.step8?.keyword_extraction && state.step8.keyword_extraction.length > 0) {
    sections.push(`=== TECHNICAL KEYWORDS (from Skip-Gram analysis) ===\nIncorporate these technical/research terms for authority: ${state.step8.keyword_extraction.join(', ')}`);
  }
  if (state.step8?.document_summarization && state.step8.document_summarization.length > 0) {
    sections.push(`=== DOMINANT TOPIC WORDS ===\nEnsure these core topic words appear throughout: ${state.step8.document_summarization.join(', ')}`);
  }

  // SECTION 7: AUTOCOMPLETE KEYWORDS (respect user exclusions)
  if (state.step9?.autoKeywords && state.step9.autoKeywords.length > 0) {
    const excludedAK = new Set(state.step9.excludedIndices || []);
    const filtered = state.step9.autoKeywords.filter((_, i) => !excludedAK.has(i));
    if (filtered.length > 0) {
      sections.push(`=== AUTOCOMPLETE KEYWORDS ===\nAddress these search queries within the content:\n${filtered.join('\n')}`);
    }
  }

  // WSD→Polysemy cross-reference: warn about keyword ambiguity
  if (state.step8?.word_sense_disambiguation && state.step8.word_sense_disambiguation.length > 1) {
    const wsd = state.step8.word_sense_disambiguation;
    const sensesList = wsd.map(s => `"${s.sense}" (associated words: ${s.dominant_words.slice(0, 5).join(', ')})`).join('\n- ');
    sections.push(`=== WORD SENSE DISAMBIGUATION WARNING ===\nThe keyword "${state.keyword}" has ${wsd.length} distinct meanings:\n- ${sensesList}\n\nYou MUST disambiguate correctly throughout the article. Use context-appropriate vocabulary from each sense only when relevant. Do NOT confuse terms from one meaning with another.`);
  }

  // SECTION 8: GRAMMAR/SEMANTIC TERMS
  if (state.step10?.grammar) {
    const g = state.step10.grammar;
    const grammarSection = [
      g.synonyms.length > 0 ? `- Synonyms: ${g.synonyms.join(', ')}` : '',
      g.proper_nouns.length > 0 ? `- Related proper nouns: ${g.proper_nouns.join(', ')}` : '',
      g.hyponyms.length > 0 ? `- Specific terms (hyponyms): ${g.hyponyms.join(', ')}` : '',
      g.hypernyms.length > 0 ? `- Broader terms (hypernyms): ${g.hypernyms.join(', ')}` : '',
      g.meronyms.length > 0 ? `- Component terms (meronyms): ${g.meronyms.join(', ')}` : '',
      g.polysemy.length > 0 ? `- POLYSEMY WARNING — disambiguate these terms correctly: ${g.polysemy.join(', ')}` : '',
    ].filter(Boolean).join('\n');
    sections.push(`=== GRAMMAR/SEMANTIC TERMS ===\nUse these linguistic variations for natural writing:\n${grammarSection}`);
  }

  // SECTION 9: SEO RULES — split by category for clearer AI instructions
  if (state.step11?.rules) {
    const enabledRules = state.step11.rules.filter(r => r.enabled);
    const seoRules = enabledRules.filter(r => r.category === 'seo' || (!r.category && !['immediate-answer', 'no-analogies', 'clear-pronouns', 'sentence-efficiency', 'abbreviations', 'no-back-reference', 'safe-answers', 'bold-answer', 'if-placement', 'heading-text-match', 'examples-after-plural', 'precise-verbs', 'expert-specificity', 'use-numbers', 'cut-fluff', 'be-certain', 'parallel-lists', 'match-interrogative', 'diverse-units', 'boolean-answers'].includes(r.id)));
    const semanticRules = enabledRules.filter(r => r.category === 'semantic');
    const visualRules = enabledRules.filter(r => r.category === 'visual');

    if (seoRules.length > 0) {
      sections.push(`=== SEO OPTIMIZATION RULES ===\n${seoRules.map(r => r.fullPrompt).join('\n\n')}`);
    }
    if (semanticRules.length > 0) {
      sections.push(`=== SEMANTIC WRITING RULES (CRITICAL — apply to EVERY sentence) ===\nThese rules control HOW you write. They are not optional — apply them consistently throughout the entire article:\n\n${semanticRules.map(r => `• ${r.name}: ${r.fullPrompt}`).join('\n\n')}`);
    }
    if (visualRules.length > 0) {
      sections.push(`=== VISUAL & STRUCTURAL RULES ===\n${visualRules.map(r => r.fullPrompt).join('\n\n')}`);
    }
  }

  // SECTION 10: SERP INTELLIGENCE (PAA + Related Searches)
  const serpFeatures = state.step1?.serpFeatures;
  if (serpFeatures) {
    const serpParts: string[] = [];
    if (serpFeatures.peopleAlsoAsk && serpFeatures.peopleAlsoAsk.length > 0) {
      serpParts.push(`PEOPLE ALSO ASK (Google shows these questions — answering them = Featured Snippet eligibility):\n${serpFeatures.peopleAlsoAsk.map((p, i) => `${i + 1}. ${p.question}`).join('\n')}\nYou MUST answer at least 3 of these questions within the article body or FAQ section.`);
    }
    if (serpFeatures.relatedSearches && serpFeatures.relatedSearches.length > 0) {
      serpParts.push(`RELATED SEARCHES (use as LSI keywords / subtopic ideas):\n${serpFeatures.relatedSearches.join(', ')}`);
    }
    if (serpFeatures.knowledgeGraph) {
      const kg = serpFeatures.knowledgeGraph;
      if (kg.title) serpParts.push(`KNOWLEDGE GRAPH: Google recognizes "${kg.title}" (${kg.type}). Align your content with this entity definition.`);
    }
    if (serpParts.length > 0) {
      sections.push(`=== SERP INTELLIGENCE ===\n${serpParts.join('\n\n')}`);
    }
  }

  // SECTION 11: WRITING INSTRUCTIONS
  if (state.step12?.instructions) {
    sections.push(`=== WRITING INSTRUCTIONS ===\n${state.step12.instructions}`);
  }

  // E3: FIRST-HAND EXPERIENCE (E-E-A-T Injection)
  if (state.step12?.config?.firstHandExperience?.trim()) {
    sections.push(`=== FIRST-HAND EXPERIENCE (MANDATORY) ===
The author has provided the following real experience. You MUST weave this into the article as a mini case study or personal anecdote told in first person. Place it naturally within the most relevant section. This is critical for E-E-A-T and bypassing AI detectors:
"${state.step12.config.firstHandExperience.trim()}"
Transform this into a compelling 3-5 sentence narrative that demonstrates genuine expertise.`);
  }

  // E7: ANTI-AI FOOTPRINT FILTER
  sections.push(`=== ANTI-AI FOOTPRINT RULES (MANDATORY) ===
ABSOLUTELY FORBIDDEN phrases — never use any of these:
[${forbiddenCsv}]
STYLE RULES:
- Vary sentence length dramatically (mix 5-word and 25-word sentences) for high burstiness.
- Use active voice predominantly — avoid passive constructions.
- Start paragraphs with concrete facts, numbers, or questions — never with vague philosophical statements.
- Avoid repeating the same transition word more than once in the entire article.
- Never start consecutive paragraphs with the same word.
- Use rhetorical questions, short emphatic statements, and data points to break monotony.`);

  // W7-6: VISUAL DOMINANCE ELEMENTS — conditional based on active rules
  if (state.step11?.rules) {
    const activeRules = state.step11.rules.filter(r => r.enabled);
    const visualParts: string[] = [];
    if (activeRules.some(r => r.id === 'comparison-tables')) {
      visualParts.push('- Include at least ONE <table class="comparison-table"> with <caption>, 3+ rows, 3+ columns. Google Featured Snippets prioritize tables.');
    }
    if (activeRules.some(r => r.id === 'mermaid-diagrams')) {
      visualParts.push('- Include 1-2 Mermaid.js diagrams: <div class="mermaid-diagram"><pre class="mermaid">graph TD; ...</pre></div>. Use flowcharts for processes, mindmaps for topic overviews.');
    }
    if (activeRules.some(r => r.id === 'sge-bait')) {
      const mSgeLabel = contentLang === 'ar' ? 'باختصار:' : contentLang === 'fr' ? 'En bref :' : contentLang === 'es' ? 'En resumen:' : contentLang === 'de' ? 'Kurzfassung:' : 'In short:';
      visualParts.push(`- SGE BAIT: Under H1 and EVERY H2, insert: <div class="sge-bait-box"><strong>${mSgeLabel}</strong> [EXACTLY 45 words — definitive, quotable answer]</div>`);
    }
    if (activeRules.some(r => r.id === 'featured-snippet')) {
      visualParts.push('- FEATURED SNIPPET: Structure at least ONE section as a direct answer (40-60 word definition, numbered step list, or comparison table) near the top of the article. This is the #1 format Google extracts for Position 0.');
    }
    if (visualParts.length > 0) {
      sections.push(`=== VISUAL DOMINANCE ELEMENTS (MANDATORY) ===\n${visualParts.join('\n')}`);
    }
  }

  // SECTION 11: OUTPUT FORMAT
  const lengthMap: Record<string, string> = {
    short: 'Minimum 800 words, target 1000-1200 words.',
    medium: 'Minimum 1500 words, target 2000-2500 words.',
    long: 'Minimum 3000 words, target 4000-5000 words.',
    comprehensive: 'Minimum 5000 words. Cover every subtopic exhaustively.',
  };
  const lengthDirective = lengthMap[state.step12?.config?.contentLength || 'long'] || lengthMap.long;

  sections.push(`=== OUTPUT FORMAT ===
Write the complete article in HTML format with proper heading tags (h1, h2, h3, etc.).
Include ALL sections from the outline. The article must be comprehensive and well-structured.
${lengthDirective}
Use <p> tags for paragraphs, <ul>/<ol> for lists, <strong> for emphasis, <blockquote> for quotes.
Do NOT include <html>, <head>, or <body> tags — only the article content.`);

  const user = `Write a complete SEO-optimized article about "${state.keyword}".\n\n${sections.join('\n\n')}`;

  return { system, user };
}

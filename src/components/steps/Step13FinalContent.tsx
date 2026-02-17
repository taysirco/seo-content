'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, Sparkles, Activity, LayoutTemplate } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { buildMegaPrompt } from '@/lib/prompts/mega-prompt-builder';
import { streamGemini } from '@/lib/ai-client';
import { callGemini } from '@/lib/ai-client';

// Extracted Components
import { SchemaGenerator } from './step13/SchemaGenerator';
import { IndexNowPinger } from './step13/IndexNowPinger';
import { SeoMetaTools } from './step13/SeoMetaTools';
import { InternalLinkingSuggestions } from './step13/InternalLinkingSuggestions';
import { CompetitorGapAnalysis } from './step13/CompetitorGapAnalysis';
import { AnchorTextAnalyzer } from './step13/AnchorTextAnalyzer';
import { ReadabilitySuggestions } from './step13/ReadabilitySuggestions';
import { ContentRepurposer } from './step13/ContentRepurposer';
import { EEATScoreCard } from './step13/EEATScoreCard';
import { CannibalizationChecker } from './step13/CannibalizationChecker';
import { ImageAltChecker } from './step13/ImageAltChecker';
import { RedundancyDetector } from './step13/RedundancyDetector';
import { PAAQuestionsGenerator } from './step13/PAAQuestionsGenerator';
import { ReadingLevelIndicator } from './step13/ReadingLevelIndicator';
import { HeadingHierarchyValidator } from './step13/HeadingHierarchyValidator';
import { WordFrequencyPanel } from './step13/WordFrequencyPanel';
import { FreshnessScore } from './step13/FreshnessScore';
import { ParagraphLengthOptimizer } from './step13/ParagraphLengthOptimizer';
import { SemanticDensityScore } from './step13/SemanticDensityScore';
import { GeoOptimizer } from './step13/GeoOptimizer';
import { KeywordDensityHeatmap } from './step13/KeywordDensityHeatmap';
import { TransitionChecker } from './step13/TransitionChecker';
import { EntityCoverageChecker } from './step13/EntityCoverageChecker';
import { PrePublishChecklist } from './step13/PrePublishChecklist';
import { TitleVariantsGenerator } from './step13/TitleVariantsGenerator';
import { CTAGenerator } from './step13/CTAGenerator';
import { KeywordIntentClassifier } from './step13/KeywordIntentClassifier';
import { SelfHealingDashboard } from './step13/SelfHealingDashboard';
import { AuditorAgent } from './step13/AuditorAgent';
import { VersionHistoryPanel } from './step13/VersionHistoryPanel';
import { ExportActions } from './step13/ExportActions';
import { DataReadyPanel } from './step13/DataReadyPanel';
import { SeoQualityAnalysis } from './step13/SeoQualityAnalysis';
import { ContentHarmonyAnalysis } from './step13/ContentHarmonyAnalysis';

export function Step13FinalContent() {
  const store = usePipelineStore();
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('editor');

  // Advanced settings
  const language = store.location?.lang || 'ar';

  // Config defaults if not set
  const [useChunking, setUseChunking] = useState(true);
  const [useGrounding, setUseGrounding] = useState(false);

  // Version history
  const [versions, setVersions] = useState<{ content: string; timestamp: number; label: string }[]>([]);

  // Load initial content
  useEffect(() => {
    if (store.step13?.content && !content) {
      setContent(store.step13.content);
    }
  }, [store.step13?.content, content]);

  // Auto-scroll during generation
  useEffect(() => {
    if (isGenerating && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      // Auto-switch to preview during generation to see it build
      if (activeTab !== 'preview') setActiveTab('preview');
    }
  }, [content, isGenerating, activeTab]);

  // Save content to store
  const saveContent = useCallback((newContent: string) => {
    if (newContent !== store.step13?.content) {
      store.setStep13(newContent);
    }
  }, [store]);

  const handleGenerate = async () => {
    const keyword = store.keyword;
    if (!keyword) {
      toast.error('الكلمة المفتاحية مفقودة');
      return;
    }

    // Capture version before regeneration
    if (content.trim()) {
      setVersions(prev => [{ content, timestamp: Date.now(), label: 'Pre-generation Backup' }, ...prev].slice(0, 10));
    }

    setIsGenerating(true);
    setProgress(0);
    setContent(''); // Clear previous content

    try {
      const { system, user } = buildMegaPrompt(store);

      let generatedText = '';
      const stream = streamGemini({
        systemInstruction: system,
        userPrompt: user,
        temperature: 0.7,
        useGrounding: useGrounding,
      });

      for await (const chunk of stream) {
        generatedText += chunk;
        setContent(generatedText);
        // Estimate progress purely visual
        setProgress(Math.min(95, Math.ceil((generatedText.length / 5000) * 100)));
      }

      // Cleanup markdown code blocks if present
      const cleanContent = generatedText.replace(/```html\s*/g, '').replace(/```\s*$/g, '').trim();
      setContent(cleanContent);
      saveContent(cleanContent);
      setProgress(100);
      toast.success('تم توليد المحتوى بنجاح');

      setVersions(prev => [{ content: cleanContent, timestamp: Date.now(), label: 'Generated Content' }, ...prev].slice(0, 10));

    } catch (err) {
      console.error(err);
      toast.error('فشل توليد المحتوى');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestore = (vContent: string) => {
    if (content.trim() && content !== vContent) {
      setVersions(prev => [{ content, timestamp: Date.now(), label: 'Before Restore' }, ...prev].slice(0, 10));
    }
    setContent(vContent);
    saveContent(vContent);
  };

  const handleInjectContent = (injectedHtml: string) => {
    setContent(prev => {
      const newContent = prev + '\n\n' + injectedHtml;
      saveContent(newContent);
      return newContent;
    });
    toast.success('تم إدراج المحتوى الإضافي');
  };

  const handleInjectLink = (anchor: string, url: string) => {
    if (!content) return;
    const regex = new RegExp(`(?<!href="[^"]*?)(${anchor})(?![^<]*>)`, 'i');
    const match = content.match(regex);

    if (match) {
      setContent(prev => {
        const regex2 = new RegExp(`(?<!href="[^"]*?)(${anchor})(?![^<]*>)`, 'i');
        if (!regex2.test(prev)) return prev;
        const newC = prev.replace(regex2, `<a href="${url}" title="${anchor}" target="_self">$1</a>`);
        saveContent(newC);
        return newC;
      });
    } else {
      toast.warning('لم يتم العثور على النص المحدد في المحتوى أو أنه رابط بالفعل');
    }
  };

  const handleRegenSection = async (heading: string, fixInstruction?: string) => {
    toast.info(`جاري إعادة صياغة القسم: ${heading}...`);
    try {
      const prompt = `
        Rewrite the section under the heading "${heading}" in the article.
        Context: The user wants to improve this section.
        Instruction: ${fixInstruction || 'Improve quality, depth, and relevance.'}
        Return ONLY the new HTML content for this section (including the <h2>/<h3> tag).
      `;
      // We pass a snippet of content near the heading to give context if needed, 
      // but for now simple prompt is safer to avoid huge tokens.

      const newSectionHtml = await callGemini({
        systemInstruction: 'You are an expert SEO content editor.',
        userPrompt: prompt,
        temperature: 0.7
      });

      // Replace in content
      // This is tricky with regex, assuming standard H2 structure
      const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(<h[2-6][^>]*>\\s*${escapedHeading}\\s*<\\/h[2-6]>)([\\s\\S]*?)(?=<h[2-6]|$)`, 'i');

      if (regex.test(content)) {
        setContent(prev => {
          if (!regex.test(prev)) return prev;
          const newC = prev.replace(regex, newSectionHtml);
          saveContent(newC);
          return newC;
        });
        toast.success(`تم تحديث القسم: ${heading}`);
      } else {
        toast.warning(`لم يتم العثور على القسم: ${heading}`);
        // Fallback: Append if not found? No, that's confusing.
      }
    } catch (error) {
      console.error(error);
      toast.error('فشل إعادة صياغة القسم');
    }
  };

  const currentKeyword = store.keyword || '';

  return (
    <StepContainer>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Left Column: Editor & Preview */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-3">
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 font-bold shadow-md">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-300" />}
                {content ? 'إعادة التوليد' : 'توليد المقال'}
              </Button>
              {isGenerating && (
                <div className="flex flex-col gap-1 w-32">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center">{progress}%</span>
                </div>
              )}
            </div>

            <ExportActions content={content} keyword={currentKeyword} store={store} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <TabsList>
                <TabsTrigger value="editor">المحرر</TabsTrigger>
                <TabsTrigger value="preview">المعاينة</TabsTrigger>
                <TabsTrigger value="audit">المدقق الآلي 🤖</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Switch checked={useChunking} onCheckedChange={setUseChunking} id="chunking" />
                <Label htmlFor="chunking" className="text-xs">تجزئة</Label>
                <Separator orientation="vertical" className="h-4 mx-2" />
                <Switch checked={useGrounding} onCheckedChange={setUseGrounding} id="grounding" />
                <Label htmlFor="grounding" className="text-xs">بحث Google</Label>
              </div>
            </div>

            <TabsContent value="editor" className="flex-1 mt-2 h-full overflow-hidden relative rounded-lg border bg-card">
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); saveContent(e.target.value); }}
                className="w-full h-full p-4 resize-none focus:outline-none bg-transparent font-mono text-sm leading-relaxed"
                placeholder="سيظهر المحتوى هنا..."
                dir="rtl"
              />
              <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur px-3 py-1.5 rounded-full border text-xs shadow-sm flex items-center gap-4">
                <span className="flex items-center gap-1"><LayoutTemplate className="w-3 h-3" /> {content.split(/\s+/).filter(Boolean).length} كلمة</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {language}</span>
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {activeTab}</span>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 mt-2 h-full overflow-hidden rounded-lg border bg-card p-6 prose prose-sm dark:prose-invert max-w-none overflow-y-auto" ref={scrollRef}>
              <div dangerouslySetInnerHTML={{ __html: content }} dir="rtl" />
            </TabsContent>

            <TabsContent value="audit" className="flex-1 mt-2 h-full overflow-hidden rounded-lg border bg-card p-4 overflow-y-auto">
              <AuditorAgent
                content={content}
                keyword={currentKeyword}
                store={store}
                onRegenSection={handleRegenSection}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Tools & Analysis */}
        <div className="lg:col-span-4 h-full overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-6 pb-8">

              <DataReadyPanel store={store} />

              <SeoQualityAnalysis content={content} keyword={currentKeyword} store={store} />

              <ContentHarmonyAnalysis content={content} keyword={currentKeyword} store={store} />

              {/* Collapsible Tool Sections (Accordions effectively) */}

              <div className="space-y-4">
                {/* W16-1: Version History (Only if versions exist) */}
                <VersionHistoryPanel versions={versions} onRestore={handleRestore} />

                {/* S13a: Schema & Meta */}
                <Tabs defaultValue="meta" className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="meta">Meta Tags</TabsTrigger>
                    <TabsTrigger value="schema">Schema</TabsTrigger>
                  </TabsList>
                  <TabsContent value="meta">
                    <SeoMetaTools keyword={currentKeyword} content={content} store={store} />
                  </TabsContent>
                  <TabsContent value="schema">
                    <SchemaGenerator keyword={currentKeyword} store={store} />
                  </TabsContent>
                </Tabs>

                {/* D11-3: Internal Linking */}
                <InternalLinkingSuggestions
                  keyword={currentKeyword}
                  content={content}
                  store={store}
                  onInjectLink={handleInjectLink}
                />

                {/* W17-1: Pre-Publish Checklist */}
                <PrePublishChecklist content={content} keyword={currentKeyword} store={store} />

                {/* W17-5: Intent Classifier */}
                <KeywordIntentClassifier keyword={currentKeyword} />

                {/* W14-1: Competitor Gap Analysis */}
                <CompetitorGapAnalysis content={content} store={store} />

                {/* W14-3: Anchor Text Diversity */}
                <AnchorTextAnalyzer content={content} />

                {/* W15-1: Readability Suggestions */}
                <ReadabilitySuggestions content={content} />

                {/* W19-10: Entity Coverage */}
                <EntityCoverageChecker content={content} store={store} />

                {/* W19-1: Semantic Density Score */}
                <SemanticDensityScore content={content} keyword={currentKeyword} store={store} />

                {/* W20-1: Generative Engine Optimization (GEO) */}
                <GeoOptimizer content={content} keyword={currentKeyword} />

                {/* W19-5: Keyword Density Heatmap */}
                <KeywordDensityHeatmap content={content} keyword={currentKeyword} />

                {/* W19-6: Transition Checker */}
                <TransitionChecker content={content} />

                {/* W18-5: Paragraph Length Optimizer */}
                <ParagraphLengthOptimizer content={content} />

                {/* W18-3: Word Frequency */}
                <WordFrequencyPanel content={content} keyword={currentKeyword} />

                {/* W18-1: Reading Level */}
                <ReadingLevelIndicator content={content} />

                {/* W18-2: Heading Hierarchy */}
                <HeadingHierarchyValidator content={content} />

                {/* W14-E: EEAT Score */}
                <EEATScoreCard content={content} keyword={currentKeyword} />

                {/* W14-K: Cannibalization Check */}
                <CannibalizationChecker keyword={currentKeyword} store={store} />

                {/* W16-2: Image Alt Checker */}
                <ImageAltChecker content={content} keyword={currentKeyword} />

                {/* W16-6: Redundancy Detector */}
                <RedundancyDetector content={content} />

                {/* W16-9: PAA Questions */}
                <PAAQuestionsGenerator keyword={currentKeyword} content={content} />

                {/* W14-2: Content Repurposer */}
                <ContentRepurposer content={content} keyword={currentKeyword} />

                {/* W17-2: Title Variants */}
                <TitleVariantsGenerator keyword={currentKeyword} store={store} />

                {/* W17-3: CTA Generator */}
                <CTAGenerator keyword={currentKeyword} content={content} />

                {/* W18-4: Freshness Score */}
                <FreshnessScore content={content} />

                {/* P6-6: Self-Healing Dashboard */}
                <SelfHealingDashboard
                  keyword={currentKeyword}
                  content={content}
                  onInjectContent={handleInjectContent}
                />

                {/* G6: IndexNow */}
                <IndexNowPinger />

              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </StepContainer>
  );
}

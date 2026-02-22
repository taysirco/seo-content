'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw, Sparkles, Activity, LayoutTemplate, BarChart3, Code2, FileText, Rocket, ChevronDown, ChevronUp } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Sub-components
import { SchemaGenerator } from './step13/SchemaGenerator';
import { IndexNowPinger } from './step13/IndexNowPinger';
import { SeoMetaTools } from './step13/SeoMetaTools';
import { InternalLinkingSuggestions } from './step13/InternalLinkingSuggestions';
import { CompetitorGapAnalysis } from './step13/CompetitorGapAnalysis';
import { ReadabilitySuggestions } from './step13/ReadabilitySuggestions';
import { ContentRepurposer } from './step13/ContentRepurposer';
import { EEATScoreCard } from './step13/EEATScoreCard';
import { CannibalizationChecker } from './step13/CannibalizationChecker';
import { ImageAltChecker } from './step13/ImageAltChecker';
import { RedundancyDetector } from './step13/RedundancyDetector';
import { PAAQuestionsGenerator } from './step13/PAAQuestionsGenerator';
import { PrePublishChecklist } from './step13/PrePublishChecklist';
import { TitleVariantsGenerator } from './step13/TitleVariantsGenerator';
import { CTAGenerator } from './step13/CTAGenerator';
import { GeoOptimizer } from './step13/GeoOptimizer';
import { SelfHealingDashboard } from './step13/SelfHealingDashboard';
import { AuditorAgent } from './step13/AuditorAgent';
import { VersionHistoryPanel } from './step13/VersionHistoryPanel';
import { ExportActions } from './step13/ExportActions';
import { DataReadyPanel } from './step13/DataReadyPanel';
import { SeoQualityAnalysis } from './step13/SeoQualityAnalysis';
import { ContentHarmonyAnalysis } from './step13/ContentHarmonyAnalysis';
import { ContentUXValidator } from './step13/ContentUXValidator';

export function Step13FinalContent() {
  const store = usePipelineStore();
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editorView, setEditorView] = useState<'editor' | 'preview'>('editor');
  const [toolTab, setToolTab] = useState('seo-analysis');
  const [showSettings, setShowSettings] = useState(false);

  const language = store.location?.lang || 'ar';
  const [useChunking, setUseChunking] = useState(true);
  const [useGrounding, setUseGrounding] = useState(false);
  const [versions, setVersions] = useState<{ content: string; timestamp: number; label: string }[]>([]);

  const hasContent = content.trim().length > 50;
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const currentKeyword = store.keyword || '';

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
    }
  }, [content, isGenerating]);

  const saveContent = useCallback((newContent: string) => {
    if (newContent !== store.step13?.content) {
      store.setStep13(newContent);
    }
  }, [store]);

  const handleGenerate = async () => {
    if (!currentKeyword) {
      toast.error('الكلمة المفتاحية مفقودة');
      return;
    }

    if (content.trim()) {
      setVersions(prev => [{ content, timestamp: Date.now(), label: 'Pre-generation Backup' }, ...prev].slice(0, 10));
    }

    setIsGenerating(true);
    setProgress(0);
    setContent('');
    setEditorView('preview');

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...store, chunked: useChunking, useGrounding }),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let generatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        generatedText += chunk;
        const cleanChunk = generatedText.replace(/<!-- PROGRESS:\d+\/\d+:.*?-->/g, '');
        setContent(cleanChunk);
        setProgress(Math.min(95, Math.ceil((cleanChunk.length / 5000) * 100)));
      }

      const cleanContent = generatedText.replace(/<!-- PROGRESS.*?-->/g, '').replace(/```html\s*/g, '').replace(/```\s*$/g, '').trim();
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
    if (regex.test(content)) {
      setContent(prev => {
        const r = new RegExp(`(?<!href="[^"]*?)(${anchor})(?![^<]*>)`, 'i');
        if (!r.test(prev)) return prev;
        const newC = prev.replace(r, `<a href="${url}" title="${anchor}" target="_self">$1</a>`);
        saveContent(newC);
        return newC;
      });
    } else {
      toast.warning('لم يتم العثور على النص المحدد في المحتوى');
    }
  };

  const handleRegenSection = async (heading: string, fixInstruction?: string) => {
    toast.info(`جاري إعادة صياغة القسم: ${heading}...`);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...store, sectionOnly: heading, auditFix: fixInstruction, useGrounding }),
      });

      if (!response.ok) throw new Error('Failed to regenerate section');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream');
      const decoder = new TextDecoder();
      let newSectionHtml = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        newSectionHtml += decoder.decode(value, { stream: true });
      }

      const cleanSection = newSectionHtml.replace(/```html\s*/g, '').replace(/```\s*$/g, '').trim();
      const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(<h[2-6][^>]*>\\s*${escapedHeading}\\s*<\\/h[2-6]>)([\\s\\S]*?)(?=<h[2-6]|$)`, 'i');

      if (regex.test(content)) {
        setContent(prev => {
          if (!regex.test(prev)) return prev;
          const newC = prev.replace(regex, cleanSection + '\n\n');
          saveContent(newC);
          return newC;
        });
        toast.success(`تم تحديث القسم: ${heading}`);
      } else {
        toast.warning(`لم يتم العثور على القسم: ${heading}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('فشل إعادة صياغة القسم');
    }
  };

  return (
    <StepContainer>
      <div className="space-y-4">

        {/* ════════════════════════════════════════════════════════ */}
        {/* SECTION 1: GENERATION TOOLBAR                          */}
        {/* ════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="lg"
              className="gap-2 font-bold shadow-md bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
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

            {/* Settings toggle */}
            <button
              onClick={() => setShowSettings(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              الإعدادات
            </button>
          </div>

          <div className="flex items-center gap-3">
            {hasContent && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
                <LayoutTemplate className="w-3 h-3" />
                <span className="font-bold">{wordCount}</span> كلمة
                <Separator orientation="vertical" className="h-3 mx-1" />
                <Activity className="w-3 h-3" />
                {language}
              </div>
            )}
            <ExportActions content={content} keyword={currentKeyword} store={store} />
          </div>
        </div>

        {/* Expandable settings */}
        {showSettings && (
          <div className="flex items-center gap-6 p-3 bg-muted/20 border rounded-lg text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Switch checked={useChunking} onCheckedChange={setUseChunking} id="chunking" />
              <Label htmlFor="chunking" className="text-xs">تجزئة المحتوى (Chunked)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={useGrounding} onCheckedChange={setUseGrounding} id="grounding" />
              <Label htmlFor="grounding" className="text-xs">بحث Google (Grounding)</Label>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* SECTION 2: EDITOR / PREVIEW WORKSPACE                  */}
        {/* ════════════════════════════════════════════════════════ */}
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          {/* Editor/Preview toggle header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex gap-1">
              <button
                onClick={() => setEditorView('editor')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${editorView === 'editor' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                المحرر
              </button>
              <button
                onClick={() => setEditorView('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${editorView === 'preview' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                المعاينة
              </button>
            </div>
            <VersionHistoryPanel versions={versions} onRestore={handleRestore} />
          </div>

          {/* Editor body */}
          <div className="h-[45vh] min-h-[300px]">
            {editorView === 'editor' ? (
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); saveContent(e.target.value); }}
                className="w-full h-full p-4 resize-none focus:outline-none bg-transparent font-mono text-sm leading-relaxed"
                placeholder="سيظهر المحتوى هنا بعد الضغط على توليد المقال..."
                dir="rtl"
              />
            ) : (
              <ScrollArea className="h-full" ref={scrollRef}>
                <div
                  className="p-6 prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: content || '<p class="text-muted-foreground text-center py-12">لا يوجد محتوى للمعاينة حالياً</p>' }}
                  dir="rtl"
                />
              </ScrollArea>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════ */}
        {/* SECTION 3: TOOL TABS (only visible when content exists) */}
        {/* ════════════════════════════════════════════════════════ */}
        {hasContent && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs value={toolTab} onValueChange={setToolTab} className="w-full">
              <TabsList className="w-full grid grid-cols-5 h-auto p-1 bg-muted/50 rounded-xl">
                <TabsTrigger value="seo-analysis" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg py-2.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">تحليل</span> SEO
                </TabsTrigger>
                <TabsTrigger value="technical-seo" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg py-2.5">
                  <Code2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">SEO</span> تقني
                </TabsTrigger>
                <TabsTrigger value="content-tools" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg py-2.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">أدوات</span> المحتوى
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg py-2.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  المدقق
                </TabsTrigger>
                <TabsTrigger value="publish" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg py-2.5">
                  <Rocket className="w-3.5 h-3.5" />
                  النشر
                </TabsTrigger>
              </TabsList>

              {/* ── TAB 1: SEO Analysis ── */}
              <TabsContent value="seo-analysis" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SeoQualityAnalysis content={content} keyword={currentKeyword} store={store} />
                  <ContentHarmonyAnalysis content={content} keyword={currentKeyword} store={store} />
                  <EEATScoreCard content={content} keyword={currentKeyword} />
                  <DataReadyPanel store={store} />
                </div>
              </TabsContent>

              {/* ── TAB 2: Technical SEO ── */}
              <TabsContent value="technical-seo" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SeoMetaTools keyword={currentKeyword} content={content} store={store} />
                  <SchemaGenerator keyword={currentKeyword} store={store} />
                  <InternalLinkingSuggestions keyword={currentKeyword} content={content} store={store} onInjectLink={handleInjectLink} />
                  <ImageAltChecker content={content} keyword={currentKeyword} />
                  <IndexNowPinger />
                </div>
              </TabsContent>

              {/* ── TAB 3: Content Tools ── */}
              <TabsContent value="content-tools" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ReadabilitySuggestions content={content} />
                  <RedundancyDetector content={content} />
                  <PAAQuestionsGenerator keyword={currentKeyword} content={content} />
                  <ContentRepurposer content={content} keyword={currentKeyword} />
                  <TitleVariantsGenerator keyword={currentKeyword} store={store} />
                  <CTAGenerator keyword={currentKeyword} content={content} />
                  <ContentUXValidator keyword={currentKeyword} content={content} />
                </div>
              </TabsContent>

              {/* ── TAB 4: Auditor ── */}
              <TabsContent value="audit" className="mt-4">
                <AuditorAgent content={content} keyword={currentKeyword} store={store} onRegenSection={handleRegenSection} />
              </TabsContent>

              {/* ── TAB 5: Publishing ── */}
              <TabsContent value="publish" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <PrePublishChecklist content={content} keyword={currentKeyword} store={store} />
                  <CompetitorGapAnalysis content={content} store={store} />
                  <CannibalizationChecker keyword={currentKeyword} store={store} />
                  <GeoOptimizer content={content} keyword={currentKeyword} />
                  <SelfHealingDashboard keyword={currentKeyword} content={content} onInjectContent={handleInjectContent} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

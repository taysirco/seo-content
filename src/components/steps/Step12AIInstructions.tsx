'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { buildMegaPrompt } from '@/lib/prompts/mega-prompt-builder';
import type { WritingConfig } from '@/types/pipeline';
import type { PipelineState } from '@/types/pipeline';

const DEFAULTS: WritingConfig = {
  tone: 'professional',
  voice: 'third_person',
  audience: 'general',
  contentLength: 'long',
  languageStyle: 'msa',
  formatting: ['bullets', 'numbered'],
  ctaStyle: 'soft',
  customInstructions: '',
};

function buildInstructionsString(config: WritingConfig): string {
  const toneMap: Record<string, string> = {
    professional: 'Professional', casual: 'Casual', academic: 'Academic',
    conversational: 'Conversational', authoritative: 'Authoritative',
  };
  const voiceMap: Record<string, string> = {
    first_person: 'First Person', third_person: 'Third Person', impersonal: 'Impersonal',
  };
  const audienceMap: Record<string, string> = {
    general: 'General', specialists: 'Specialists',
    business_owners: 'Business Owners', students: 'Students',
  };
  const lengthMap: Record<string, string> = {
    short: '800-1200 words', medium: '1500-2500 words',
    long: '3000-5000 words', comprehensive: '5000+ words',
  };
  const styleMap: Record<string, string> = {
    msa: 'Formal (MSA)', colloquial: 'Informal', mixed: 'Mixed',
  };

  const parts = [
    `Tone: ${toneMap[config.tone]}`,
    `Voice: ${voiceMap[config.voice]}`,
    `Target Audience: ${audienceMap[config.audience]}`,
    `Content Length: ${lengthMap[config.contentLength]}`,
    `Language Style: ${styleMap[config.languageStyle]}`,
  ];

  if (config.formatting.length > 0) {
    const fmtMap: Record<string, string> = {
      bullets: 'Bullet Lists', numbered: 'Numbered Lists',
      tables: 'Tables', blockquotes: 'Blockquotes',
    };
    parts.push(`Formatting: ${config.formatting.map(f => fmtMap[f]).join(', ')}`);
  }

  if (config.ctaStyle !== 'none') {
    const ctaMap: Record<string, string> = {
      soft: 'Soft', direct: 'Direct', question: 'Question',
    };
    parts.push(`CTA Style: ${ctaMap[config.ctaStyle]}`);
  }

  if (config.firstHandExperience?.trim()) {
    parts.push(`First-Hand Experience (E-E-A-T): "${config.firstHandExperience.trim().slice(0, 80)}${config.firstHandExperience.trim().length > 80 ? '...' : ''}"`);
  }

  if (config.customInstructions.trim()) {
    parts.push(`Custom Instructions: ${config.customInstructions}`);
  }

  return parts.join('\n');
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export function Step12AIInstructions() {
  const store = usePipelineStore();
  const { step12, setStep12 } = store;
  const [config, setConfig] = useState<WritingConfig>(step12?.config || DEFAULTS);

  const megaPromptStats = useMemo(() => {
    try {
      const { system, user } = buildMegaPrompt(store as PipelineState);
      const totalChars = system.length + user.length;
      const tokens = estimateTokens(system + user);
      const sections = (user.match(/===/g) || []).length / 2;
      return { totalChars, tokens, sections: Math.floor(sections) };
    } catch {
      return { totalChars: 0, tokens: 0, sections: 0 };
    }
  }, [store]);

  useEffect(() => {
    const instructions = buildInstructionsString(config);
    setStep12(config, instructions);
  }, [config, setStep12]);

  const updateConfig = (updates: Partial<WritingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const toggleFormatting = (fmt: WritingConfig['formatting'][number]) => {
    setConfig(prev => ({
      ...prev,
      formatting: prev.formatting.includes(fmt)
        ? prev.formatting.filter(f => f !== fmt)
        : [...prev.formatting, fmt],
    }));
  };

  return (
    <StepContainer canProceed={!!step12}>
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure AI writing instructions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tone */}
          <div className="space-y-2">
            <Label>Tone</Label>
            <Select value={config.tone} onValueChange={(v) => updateConfig({ tone: v as WritingConfig['tone'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="authoritative">Authoritative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Voice */}
          <div className="space-y-2">
            <Label>Voice</Label>
            <Select value={config.voice} onValueChange={(v) => updateConfig({ voice: v as WritingConfig['voice'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="first_person">First Person (I/We)</SelectItem>
                <SelectItem value="third_person">Third Person</SelectItem>
                <SelectItem value="impersonal">Impersonal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Audience */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select value={config.audience} onValueChange={(v) => updateConfig({ audience: v as WritingConfig['audience'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="specialists">Specialists</SelectItem>
                <SelectItem value="business_owners">Business Owners</SelectItem>
                <SelectItem value="students">Students</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Length + Dynamic Calculator */}
          <div className="space-y-2">
            <Label>Content Length</Label>
            <Select value={config.contentLength} onValueChange={(v) => updateConfig({ contentLength: v as WritingConfig['contentLength'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (800-1200 words)</SelectItem>
                <SelectItem value="medium">Medium (1500-2500 words)</SelectItem>
                <SelectItem value="long">Long (3000-5000 words)</SelectItem>
                <SelectItem value="comprehensive">Comprehensive (5000+ words)</SelectItem>
              </SelectContent>
            </Select>
            {/* Dynamic Content Length Calculator from competitor analysis */}
            {(() => {
              const contents = store.step3?.contents;
              if (!contents || contents.length === 0) return null;
              const wordCounts = contents.map((c: { text: string }) => c.text.split(/\s+/).filter(Boolean).length);
              const avg = Math.round(wordCounts.reduce((a: number, b: number) => a + b, 0) / wordCounts.length);
              const p75 = Math.round(wordCounts.sort((a: number, b: number) => a - b)[Math.floor(wordCounts.length * 0.75)] || avg);
              const optimal = Math.round(p75 * 1.2);
              return (
                <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 mt-1 space-y-0.5">
                  <p>📊 <strong>Competitor Analysis:</strong> avg {avg} words, P75 = {p75} words</p>
                  <p>🎯 <strong>Recommended:</strong> {optimal}+ words (P75 × 1.2 to outrank)</p>
                </div>
              );
            })()}
          </div>

          {/* Language Style — adapts based on content language */}
          <div className="space-y-2">
            <Label>Language Style</Label>
            <Select value={config.languageStyle} onValueChange={(v) => updateConfig({ languageStyle: v as WritingConfig['languageStyle'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {store.location?.lang === 'ar' ? (
                  <>
                    <SelectItem value="msa">Formal Arabic (MSA)</SelectItem>
                    <SelectItem value="colloquial">Informal / Colloquial</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="informal">Informal</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* CTA Style */}
          <div className="space-y-2">
            <Label>CTA Style</Label>
            <Select value={config.ctaStyle} onValueChange={(v) => updateConfig({ ctaStyle: v as WritingConfig['ctaStyle'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Formatting */}
        <div className="space-y-3">
          <Label>Formatting</Label>
          <div className="flex flex-wrap gap-4">
            {([
              { key: 'bullets', label: 'Bullet Lists' },
              { key: 'numbered', label: 'Numbered Lists' },
              { key: 'tables', label: 'Tables' },
              { key: 'blockquotes', label: 'Blockquotes' },
            ] as const).map(fmt => (
              <div key={fmt.key} className="flex items-center gap-2">
                <Switch
                  checked={config.formatting.includes(fmt.key)}
                  onCheckedChange={() => toggleFormatting(fmt.key)}
                />
                <Label className="cursor-pointer" onClick={() => toggleFormatting(fmt.key)}>
                  {fmt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* First-hand Experience (E-E-A-T) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            First-Hand Experience (E-E-A-T)
            <span className="text-[10px] text-muted-foreground font-normal">(optional — defeats AI detectors)</span>
          </Label>
          <Textarea
            rows={3}
            placeholder="e.g. As a contractor, I noticed clients complain about foam leaks in summer..."
            value={config.firstHandExperience || ''}
            onChange={(e) => updateConfig({ firstHandExperience: e.target.value })}
            className="border-green-500/30 focus:border-green-500"
          />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Write 1-2 sentences from real experience. AI will convert them into a mini case study or first-person anecdote inside the article.
          </p>
        </div>

        {/* Custom Instructions with Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Custom Instructions (optional)</Label>
            <div className="flex gap-1 flex-wrap">
              <button
                type="button"
                className="text-[10px] px-2 py-1 rounded border border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 transition-colors"
                onClick={() => updateConfig({ customInstructions: config.customInstructions + (config.customInstructions ? '\n\n' : '') + 'CONCISE WRITING: Omit needless words. Vigorous writing is concise. A sentence should contain no unnecessary words, a paragraph no unnecessary sentences. Use active voice. Make every word tell. Do not pad content with filler — every sentence must add information or insight.' })}
              >
                + Concise Writing
              </button>
              <button
                type="button"
                className="text-[10px] px-2 py-1 rounded border border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300 hover:bg-green-500/10 transition-colors"
                onClick={() => updateConfig({ customInstructions: config.customInstructions + (config.customInstructions ? '\n\n' : '') + 'NATURAL HUMAN LANGUAGE: Use simple, everyday language. Avoid jargon unless writing for specialists. Write as a knowledgeable friend explaining things clearly. Be direct — state facts without hedging. Vary rhythm: mix short punchy sentences with longer detailed ones.' })}
              >
                + Natural Language
              </button>
              <button
                type="button"
                className="text-[10px] px-2 py-1 rounded border border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300 hover:bg-red-500/10 transition-colors"
                onClick={() => updateConfig({ customInstructions: config.customInstructions + (config.customInstructions ? '\n\n' : '') + 'ANTI-AI WRITING PATTERNS: Never use these words/phrases: "delve", "navigate", "landscape", "tapestry", "realm", "crucial", "vital", "essential", "embark", "foster", "leverage", "robust", "cutting-edge", "game-changer", "In conclusion", "It\'s worth noting", "In this article we will". Avoid formulaic paragraph structures. Do not start 3+ paragraphs the same way. Never use "Furthermore" or "Moreover" as transitions.' })}
              >
                + Anti-AI Patterns
              </button>
            </div>
          </div>
          <Textarea
            rows={4}
            placeholder="Add any special writing instructions..."
            value={config.customInstructions}
            onChange={(e) => updateConfig({ customInstructions: e.target.value })}
          />
        </div>

        {/* Preview */}
        {step12?.instructions && (
          <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Instructions Preview</h4>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {step12.instructions}
            </pre>
          </div>
        )}

        {/* Mega Prompt Token Estimate */}
        {megaPromptStats.tokens > 0 && (
          <div className="rounded-lg border p-4 bg-blue-500/5 border-blue-500/20 space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              Mega Prompt Estimate
              <Badge variant="outline" className="text-[10px]">Live Preview</Badge>
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-md bg-background">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{megaPromptStats.tokens.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Est. Tokens</div>
              </div>
              <div className="text-center p-2 rounded-md bg-background">
                <div className="text-lg font-bold">{megaPromptStats.sections}</div>
                <div className="text-[10px] text-muted-foreground">Data Sections</div>
              </div>
              <div className="text-center p-2 rounded-md bg-background">
                <div className="text-lg font-bold">{(megaPromptStats.totalChars / 1000).toFixed(1)}K</div>
                <div className="text-[10px] text-muted-foreground">Characters</div>
              </div>
            </div>
            {megaPromptStats.tokens > 30000 ? (
              <p className="text-[10px] text-red-600 dark:text-red-400">
                ⚠ Prompt is very large ({megaPromptStats.tokens.toLocaleString()} tokens) — enable Agentic Chunking in Step 13 for better results.
              </p>
            ) : megaPromptStats.tokens > 15000 ? (
              <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
                ℹ Medium-sized prompt — Agentic Chunking will produce significantly better results than legacy mode.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </StepContainer>
  );
}

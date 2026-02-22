'use client';

import { useEffect, useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SEO_RULES_LIBRARY } from '@/lib/seo-rules-library';
import { Plus, Info, CheckCheck, XCircle, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { SEORule } from '@/types/pipeline';

export function Step11SEORules() {
  const { step11, setStep11 } = usePipelineStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    if (!step11) {
      setStep11(SEO_RULES_LIBRARY.map(r => ({ ...r })));
    }
  }, [step11, setStep11]);

  const toggleRule = (ruleId: string) => {
    if (!step11) return;
    const updated = step11.rules.map((r: SEORule) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    setStep11(updated);
  };

  const enableAll = () => {
    if (!step11) return;
    setStep11(step11.rules.map((r: SEORule) => ({ ...r, enabled: true })));
  };

  const disableAll = () => {
    if (!step11) return;
    setStep11(step11.rules.map((r: SEORule) => ({ ...r, enabled: false })));
  };

  const addCustomRule = () => {
    if (!step11 || !newName.trim() || !newPrompt.trim()) return;
    const customRule: SEORule = {
      id: `custom-${Date.now()}`,
      category: 'custom',
      name: newName.trim(),
      nameAr: newName.trim(),
      description: 'Custom rule',
      fullPrompt: newPrompt.trim(),
      enabled: true,
    };
    setStep11([...step11.rules, customRule]);
    setNewName('');
    setNewPrompt('');
    setShowAddForm(false);
  };

  const enabledCount = step11?.rules.filter((r: SEORule) => r.enabled).length || 0;

  return (
    <StepContainer canProceed={enabledCount > 0}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Select SEO rules to apply in the final content.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={enabledCount > 0 ? 'default' : 'secondary'}>{enabledCount} enabled</Badge>
            <Button
              variant="default"
              size="sm"
              className="gap-1 text-[10px] h-7 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => {
                if (!step11) return;
                // W9-4: God-Tier preset — enable all dominance rules for #1 ranking
                const godTierIds = new Set([
                  'kw-density', 'heading-kw', 'internal-links', 'meta-tags', 'readability',
                  'featured-snippet', 'eeat', 'faq', 'aeo-tldr', 'grounding-stats',
                  'comparison-tables',
                  // Semantic writing rules
                  'immediate-answer', 'clear-pronouns', 'abbreviations', 'no-back-reference',
                  'bold-answer', 'heading-text-match', 'expert-specificity', 'use-numbers',
                  'cut-fluff', 'be-certain', 'match-interrogative', 'boolean-answers',
                  'examples-after-plural',
                ]);
                setStep11(step11.rules.map((r: SEORule) => ({
                  ...r,
                  enabled: godTierIds.has(r.id) ? true : r.enabled,
                })));
              }}
            >
              God-Tier Preset
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-[10px] h-7" onClick={enableAll}>
              <CheckCheck className="w-3 h-3" />Enable All
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-[10px] h-7" onClick={disableAll}>
              <XCircle className="w-3 h-3" />Disable All
            </Button>
          </div>
        </div>

        {/* W9-5: Warn when AEO + SGE bait are both enabled */}
        {step11?.rules?.some((r: SEORule) => r.id === 'aeo-tldr' && r.enabled) && step11?.rules?.some((r: SEORule) => r.id === 'sge-bait' && r.enabled) && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-[11px] text-yellow-700 dark:text-yellow-400">
            ⚠ Both &quot;Quick Answers (AEO)&quot; and &quot;AI Bait Boxes (SGE)&quot; are enabled — two boxes will be created under each heading. Consider enabling only one to avoid article bloat.
          </div>
        )}

        {(() => {
          const rules = step11?.rules || SEO_RULES_LIBRARY;
          const groups: { key: string; titleAr: string; titleEn: string; color: string; rules: SEORule[] }[] = [
            { key: 'seo', titleAr: 'قواعد SEO التقنية', titleEn: 'SEO Technical Rules', color: 'border-blue-500/40 bg-blue-500/5', rules: rules.filter((r: SEORule) => r.category === 'seo' || (!r.category && !r.id.startsWith('custom-') && !['featured-snippet', 'img-alt', 'aeo-tldr', 'mermaid-diagrams', 'comparison-tables', 'sge-bait', 'immediate-answer', 'no-analogies', 'clear-pronouns', 'sentence-efficiency', 'abbreviations', 'no-back-reference', 'safe-answers', 'bold-answer', 'if-placement', 'heading-text-match', 'examples-after-plural', 'precise-verbs', 'expert-specificity', 'use-numbers', 'cut-fluff', 'be-certain', 'parallel-lists', 'match-interrogative', 'diverse-units', 'boolean-answers'].includes(r.id))) },
            { key: 'visual', titleAr: 'عناصر بصرية', titleEn: 'Visual Elements', color: 'border-purple-500/40 bg-purple-500/5', rules: rules.filter((r: SEORule) => r.category === 'visual') },
            { key: 'semantic', titleAr: 'قواعد الكتابة الدلالية', titleEn: 'Semantic Writing Rules', color: 'border-emerald-500/40 bg-emerald-500/5', rules: rules.filter((r: SEORule) => r.category === 'semantic') },
            { key: 'custom', titleAr: 'قواعد مخصصة', titleEn: 'Custom Rules', color: 'border-orange-500/40 bg-orange-500/5', rules: rules.filter((r: SEORule) => r.id.startsWith('custom-') || r.category === 'custom') },
          ].filter(g => g.rules.length > 0);

          return groups.map(group => (
            <div key={group.key} className="space-y-3">
              <div className={`flex items-center justify-between p-3 rounded-lg border ${group.color}`}>
                <div>
                  <h3 className="text-sm font-semibold">{group.titleAr}</h3>
                  <p className="text-[10px] text-muted-foreground">{group.titleEn} — {group.rules.filter((r: SEORule) => r.enabled).length}/{group.rules.length} enabled</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{group.rules.filter((r: SEORule) => r.enabled).length}</Badge>
              </div>
              <div className="space-y-2 pl-1">
                {group.rules.map((rule: SEORule) => (
                  <div
                    key={rule.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${rule.enabled ? 'bg-primary/5 border-primary/30' : 'bg-muted/20'
                      }`}
                  >
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium cursor-pointer" onClick={() => toggleRule(rule.id)}>
                          {rule.nameAr}
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm">
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{rule.fullPrompt}</p>
                          </TooltipContent>
                        </Tooltip>
                        {rule.id.startsWith('custom-') && (
                          <Badge variant="outline" className="text-[9px]">Custom</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                      {rule.enabled && (
                        <p className="text-xs text-primary/70 mt-2 p-2 rounded bg-primary/5 leading-relaxed whitespace-pre-wrap">
                          {rule.fullPrompt}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ));
        })()}

        {/* S7: Template Save/Load */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-[10px] h-7"
            onClick={() => {
              if (!step11) return;
              const template = {
                name: `SEO Template — ${new Date().toLocaleDateString('en-US')}`,
                createdAt: new Date().toISOString(),
                rules: step11.rules.map((r: SEORule) => ({ id: r.id, category: r.category, name: r.name, nameAr: r.nameAr, enabled: r.enabled, description: r.description, fullPrompt: r.fullPrompt })),
              };
              const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'seo-rules-template.json';
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Template exported');
            }}
          >
            <Download className="w-3 h-3" />
            Export Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-[10px] h-7"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const template = JSON.parse(text);
                  if (!template.rules || !Array.isArray(template.rules)) {
                    toast.error('Invalid file');
                    return;
                  }
                  setStep11(template.rules);
                  toast.success(`Template loaded: ${template.name || 'Unnamed'}`);
                } catch {
                  toast.error('Failed to read file');
                }
              };
              input.click();
            }}
          >
            <Upload className="w-3 h-3" />
            Import Template
          </Button>
          <span className="text-[9px] text-muted-foreground">Save rule settings as templates to reuse with other clients</span>
        </div>

        {/* Add Custom Rule */}
        {showAddForm ? (
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <h4 className="text-sm font-medium">Add Custom Rule</h4>
            <Input
              placeholder="Rule name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Textarea
              placeholder="Full prompt to inject into Mega Prompt..."
              rows={3}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={addCustomRule} disabled={!newName.trim() || !newPrompt.trim()}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowAddForm(true)}>
            <Plus className="w-3 h-3" />Add Custom Rule
          </Button>
        )}
      </div>
    </StepContainer>
  );
}

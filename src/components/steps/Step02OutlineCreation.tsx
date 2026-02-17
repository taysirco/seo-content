'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Pencil, ChevronUp, ChevronDown, Trash2, Plus, Check, X } from 'lucide-react';
import type { HeadingItem } from '@/types/pipeline';
import { extractDomain } from '@/lib/utils/extract-domain';

export function Step02OutlineCreation() {
  const { step1, step2, setStep2, setStatus, setError, keyword, location } = usePipelineStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gapAnalysis, setGapAnalysis] = useState<any>(null);

  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editLevel, setEditLevel] = useState<HeadingItem['level']>(2);

  const selectedUrls = step1?.competitors.filter(c => c.selected).map(c => c.url) || [];

  const startEdit = (idx: number) => {
    if (!step2?.merged) return;
    const h = step2.merged.headings[idx];
    setEditIdx(idx);
    setEditText(h.text);
    setEditLevel(h.level);
  };

  const saveEdit = () => {
    if (editIdx === null || !step2?.merged || !editText.trim()) return;
    const newHeadings = [...step2.merged.headings];
    newHeadings[editIdx] = { level: editLevel, text: editText.trim() };
    setStep2(step2.outlines, { ...step2.merged, headings: newHeadings });
    setEditIdx(null);
  };

  const cancelEdit = () => setEditIdx(null);

  const moveHeading = (idx: number, dir: -1 | 1) => {
    if (!step2?.merged) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= step2.merged.headings.length) return;
    const newHeadings = [...step2.merged.headings];
    [newHeadings[idx], newHeadings[newIdx]] = [newHeadings[newIdx], newHeadings[idx]];
    setStep2(step2.outlines, { ...step2.merged, headings: newHeadings });
  };

  const deleteHeading = (idx: number) => {
    if (!step2?.merged) return;
    const newHeadings = step2.merged.headings.filter((_, i) => i !== idx);
    setStep2(step2.outlines, { ...step2.merged, headings: newHeadings });
  };

  const addHeading = () => {
    if (!step2?.merged) return;
    const newHeadings = [...step2.merged.headings, { level: 2 as HeadingItem['level'], text: 'New Heading' }];
    setStep2(step2.outlines, { ...step2.merged, headings: newHeadings });
    startEdit(newHeadings.length - 1);
  };

  const handleProcess = async () => {
    if (selectedUrls.length === 0) return;
    setIsProcessing(true);
    setStatus('processing');
    setProgressText(`Extracting headings from ${selectedUrls.length} pages and merging with AI...`);
    try {
      const res = await fetch('/api/ai/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: selectedUrls, keyword, lang: location?.lang || 'ar' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create outline');
      setStep2(data.outlines, data.merged);
      if (data.gapAnalysis) setGapAnalysis(data.gapAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsProcessing(false);
      setStatus('idle');
      setProgressText('');
    }
  };

  return (
    <StepContainer
      onProcess={handleProcess}
      processLabel="Extract & Merge Outlines"
      isProcessing={isProcessing}
      canProceed={!!step2?.merged}
      progressText={progressText}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Extract headings from {selectedUrls.length} competitors and merge into one comprehensive outline.
        </p>

        {step2 && (
          <Tabs defaultValue="merged" dir="rtl">
            <TabsList>
              <TabsTrigger value="merged">Merged Outline</TabsTrigger>
              {step2.outlines.map((outline, idx) => {
                const domain = extractDomain(outline.url) || `Competitor ${idx + 1}`;
                return (
                  <TabsTrigger key={idx} value={`outline-${idx}`} className="gap-1">
                    <span className="max-w-[80px] truncate text-[11px]" dir="ltr">{domain}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{outline.headings.length}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="merged" className="mt-4">
              {step2.merged && (
                <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                  <h3 className="font-bold text-lg">{step2.merged.title}</h3>
                  <p className="text-sm text-muted-foreground">{step2.merged.summary}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{step2.merged.headings.length} headings</Badge>
                    {[1, 2, 3, 4].map(lvl => {
                      const c = step2.merged.headings.filter(h => h.level === lvl).length;
                      return c > 0 ? <Badge key={lvl} variant="outline" className="text-[10px]">H{lvl}: {c}</Badge> : null;
                    })}
                  </div>
                  <div className="space-y-1 mt-3">
                    {step2.merged.headings.map((h, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center gap-2 hover:bg-primary/5 rounded px-1 py-0.5 -mx-1 transition-colors"
                        style={{ paddingRight: `${(h.level - 1) * 20}px` }}
                      >
                        {editIdx === idx ? (
                          <>
                            <Select
                              value={String(editLevel)}
                              onValueChange={(v) => setEditLevel(Number(v) as HeadingItem['level'])}
                            >
                              <SelectTrigger className="w-16 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6].map(l => (
                                  <SelectItem key={l} value={String(l)}>H{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="h-7 text-sm flex-1"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                              <Check className="w-3 h-3 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              H{h.level}
                            </Badge>
                            <span className={`flex-1 ${h.level === 1 ? 'font-bold text-base' : h.level === 2 ? 'font-semibold' : 'text-sm'}`}>
                              {h.text}
                            </span>
                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(idx)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveHeading(idx, -1)} disabled={idx === 0}>
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveHeading(idx, 1)} disabled={idx === step2.merged.headings.length - 1}>
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteHeading(idx)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1 text-xs"
                    onClick={addHeading}
                  >
                    <Plus className="w-3 h-3" />
                    Add Heading
                  </Button>
                </div>
              )}
            </TabsContent>

            {step2.outlines.map((outline, idx) => {
              const mergedTexts = new Set(step2.merged?.headings.map(h => h.text.toLowerCase()) || []);
              const inMergedCount = outline.headings.filter(h => mergedTexts.has(h.text.toLowerCase())).length;
              return (
                <TabsContent key={idx} value={`outline-${idx}`} className="mt-4">
                  <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground" dir="ltr">{outline.url}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{outline.headings.length} headings</Badge>
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/30">{inMergedCount} in merged</Badge>
                      {[1, 2, 3].map(lvl => {
                        const c = outline.headings.filter(h => h.level === lvl).length;
                        return c > 0 ? <Badge key={lvl} variant="outline" className="text-[10px]">H{lvl}: {c}</Badge> : null;
                      })}
                    </div>
                    <div className="space-y-1 mt-2">
                      {outline.headings.map((h, hIdx) => {
                        const isInMerged = mergedTexts.has(h.text.toLowerCase());
                        return (
                          <div
                            key={hIdx}
                            className={`flex items-center gap-2 rounded px-1 py-0.5 ${isInMerged ? 'bg-green-500/5' : ''}`}
                            style={{ paddingRight: `${(h.level - 1) * 20}px` }}
                          >
                            <Badge variant="outline" className="shrink-0 text-xs">H{h.level}</Badge>
                            <span className="text-sm flex-1">{h.text}</span>
                            {isInMerged && <span className="text-[9px] text-green-600 shrink-0">✓ merged</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {/* E2: Information Gain — Gap Analysis Panel */}
        {gapAnalysis?.blindSpots?.length > 0 && step2?.merged && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                🔍 Information Gain Analysis
              </h4>
              {gapAnalysis.informationGainScore != null && (
                <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                  Opportunity Score: {gapAnalysis.informationGainScore}/100
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Missing angles no competitor covers — add to outline to outrank everyone:</p>
            <div className="space-y-2">
              {gapAnalysis.blindSpots.map((spot: { heading: string; rationale: string; suggestedSubHeadings?: string[] }, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-md bg-background border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{spot.heading}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{spot.rationale}</p>
                    {(spot.suggestedSubHeadings?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(spot.suggestedSubHeadings ?? []).map((sub: string, si: number) => (
                          <Badge key={si} variant="outline" className="text-[9px]">H3: {sub}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs gap-1 border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                    onClick={() => {
                      const newHeadings = [...step2.merged.headings, { level: 2 as HeadingItem['level'], text: spot.heading }];
                      if (spot.suggestedSubHeadings) {
                        for (const sub of spot.suggestedSubHeadings) {
                          newHeadings.push({ level: 3 as HeadingItem['level'], text: sub });
                        }
                      }
                      setStep2(step2.outlines, { ...step2.merged, headings: newHeadings });
                    }}
                  >
                    <Plus className="w-3 h-3" />Add
                  </Button>
                </div>
              ))}
            </div>
            {gapAnalysis.missingQuestions?.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium mb-1">Missing Deep Questions:</p>
                <div className="flex flex-wrap gap-1">
                  {gapAnalysis.missingQuestions.map((q: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{q}</Badge>
                  ))}
                </div>
              </div>
            )}
            {gapAnalysis.uniqueAngles?.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium mb-1">Suggested Unique Angles:</p>
                <div className="flex flex-wrap gap-1">
                  {gapAnalysis.uniqueAngles.map((angle: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-amber-500/30 text-amber-700">{angle}</Badge>
                  ))}
                </div>
              </div>
            )}
            {/* G7: Depth Analysis */}
            {gapAnalysis.depthAnalysis && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">Depth Analysis (40%+ rule):</p>
                  <Badge variant={gapAnalysis.depthAnalysis.depthScore >= 80 ? 'default' : 'destructive'} className="text-[10px]">
                    {gapAnalysis.depthAnalysis.depthScore}/100
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    H2: {gapAnalysis.depthAnalysis.currentH2Count} → {gapAnalysis.depthAnalysis.recommendedH2Count} | H3: {gapAnalysis.depthAnalysis.currentH3Count} → {gapAnalysis.depthAnalysis.recommendedH3Count}
                  </span>
                </div>
                {gapAnalysis.depthAnalysis.suggestedSubSections?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Suggested sub-sections to deepen the outline:</p>
                    {gapAnalysis.depthAnalysis.suggestedSubSections.map((sub: { parentH2: string; newH3: string }, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{sub.parentH2} ←</span>
                        <Badge variant="outline" className="text-[9px]">H3: {sub.newH3}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[9px] h-5 px-1"
                          onClick={() => {
                            if (!step2?.merged) return;
                            const parentIdx = step2.merged.headings.findIndex(h => h.text === sub.parentH2);
                            if (parentIdx === -1) return;
                            const newHeadings = [...step2.merged.headings];
                            newHeadings.splice(parentIdx + 1, 0, { level: 3 as HeadingItem['level'], text: sub.newH3 });
                            setStep2(step2.outlines, { ...step2.merged, headings: newHeadings });
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Topic Cluster Intelligence Panel */}
        {step2?.merged && keyword && (
          <TopicClusterPanel keyword={keyword} lang={location?.lang || 'ar'} />
        )}

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Extracting and merging outlines...</span>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

/** Topic Cluster sub-component */
function TopicClusterPanel({ keyword, lang }: { keyword: string; lang: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchCluster = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/topic-cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, lang }),
      });
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  type ClusterKw = { keyword: string; relationship: string; priority: string };
  type LinkSugg = { anchorText: string; targetKeyword: string; placement: string };

  return (
    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-indigo-500/10 transition-colors rounded-lg"
        onClick={() => { setOpen(!open); if (!data && !loading) fetchCluster(); }}
      >
        <span className="flex items-center gap-2">
          🗺️ Topic Cluster Map
          {data && <Badge variant="secondary" className="text-[10px]">✓</Badge>}
        </span>
        <span className="text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-indigo-500/20 pt-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing topic cluster...
            </div>
          )}
          {!data && !loading && (
            <Button variant="outline" size="sm" onClick={fetchCluster} disabled={loading}>
              Analyze Topic Cluster
            </Button>
          )}
          {data && (
            <>
              {/* Pillar Topic */}
              {data.pillarTopic && (
                <div className="p-2 rounded bg-indigo-500/10">
                  <p className="text-[10px] font-semibold text-indigo-700 mb-0.5">Pillar Topic</p>
                  <p className="text-sm font-medium">{String(data.pillarTopic)}</p>
                  {data.currentKeywordRole ? (
                    <Badge variant="outline" className="text-[9px] mt-1">{String(data.currentKeywordRole)}</Badge>
                  ) : null}
                </div>
              )}

              {/* Cluster Keywords */}
              {Array.isArray(data.clusterKeywords) && data.clusterKeywords.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1">Cluster Keywords ({(data.clusterKeywords as ClusterKw[]).length})</p>
                  <div className="flex flex-wrap gap-1">
                    {(data.clusterKeywords as ClusterKw[]).slice(0, 15).map((kw, i) => (
                      <Badge key={i} variant={kw.priority === 'critical' ? 'default' : 'outline'} className="text-[9px]">
                        {kw.keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Link Suggestions */}
              {Array.isArray(data.internalLinkSuggestions) && data.internalLinkSuggestions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1">🔗 Suggested Internal Links</p>
                  <div className="space-y-1">
                    {(data.internalLinkSuggestions as LinkSugg[]).slice(0, 8).map((link, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <Badge variant="outline" className="text-[8px] shrink-0">{link.placement}</Badge>
                        <span className="text-indigo-600 font-medium">&ldquo;{link.anchorText}&rdquo;</span>
                        <span className="text-muted-foreground">→ {link.targetKeyword}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topical Authority Gaps */}
              {Array.isArray(data.topicalAuthorityGaps) && data.topicalAuthorityGaps.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold mb-1">⚠️ Topical Authority Gaps</p>
                  <div className="flex flex-wrap gap-1">
                    {(data.topicalAuthorityGaps as string[]).map((gap, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-700">{gap}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitive Advantage */}
              {data.competitiveAdvantage && (
                <div className="p-2 rounded bg-green-500/10">
                  <p className="text-[10px] font-semibold text-green-700 mb-0.5">💡 Competitive Advantage</p>
                  <p className="text-xs">{String(data.competitiveAdvantage)}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

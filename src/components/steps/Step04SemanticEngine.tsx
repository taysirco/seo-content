'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, Zap, CheckCircle2, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export function Step04SemanticEngine() {
    const store = usePipelineStore();
    const { keyword, step3, location } = store;

    const [isProcessing, setIsProcessing] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [engineDone, setEngineDone] = useState(false);
    const [logs, setLogs] = useState<{ id: string; time: number; text: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([]);

    const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        setLogs(prev => [...prev, { id: Math.random().toString(), time: Date.now(), text, type }]);
    };

    const hasAllData = (!!store.step4?.merged || !!store.step4?.perCompetitor?.length) && !!store.step5 && !!store.step6 && !!store.step7?.combined && !!store.step8 && !!store.step9 && !!store.step10;

    // ── Compute summary stats for the report ──
    const entityCount = store.step4?.merged?.totalUnique || (() => {
        // Fallback: count from perCompetitor when merged.totalUnique is missing
        if (!store.step4?.perCompetitor) return 0;
        const allItems = new Set<string>();
        store.step4.perCompetitor.forEach((c: any) => {
            if (!c.foundInContent) return;
            Object.values(c.foundInContent).forEach((arr: any) => {
                if (Array.isArray(arr)) arr.forEach((item: any) => allItems.add(typeof item === 'string' ? item : item?.name || item?.entity || JSON.stringify(item)));
            });
        });
        return allItems.size;
    })();
    const aiEntityCount = store.step5?.aiEntities?.entities?.length || 0;
    const ngramCount = (() => {
        if (!store.step6) return 0;
        const s6 = store.step6 as any;
        // Try generated field first (from mode: 'generate')
        const genCount = (s6.generated?.trigrams?.length || 0) + (s6.generated?.fourgrams?.length || 0) + (s6.generated?.bigrams?.length || 0);
        if (genCount > 0) return genCount;
        // Fallback: count from extracted/unique/picked (from mode: 'extract' or old data)
        return (s6.unique?.length || 0) + (s6.extracted?.length || 0) + (s6.picked?.length || 0);
    })();
    const lsiCount = store.step7?.combined?.foundInContent?.lsiKeywords?.length || 0;
    const skipGramCount = store.step8?.skipGrams?.length || 0;
    const autoSuggestCount = store.step9?.autoKeywords?.length || 0;
    const synonymCount = (store.step10?.grammar?.synonyms?.length || 0) + (store.step10?.grammar?.meronyms?.length || 0);

    const runEngine = async () => {
        if (!keyword) {
            toast.error('Keyword is missing');
            return;
        }
        if (!step3 || step3.contents.length === 0) {
            toast.error('Competitor content is missing. Please complete Step 3.');
            return;
        }

        setIsProcessing(true);
        setEngineDone(false);
        setShowLogs(true); // Show logs during processing
        store.setStatus('processing');
        setLogs([]);
        addLog('🔧 Initializing Full Semantic NLP Engine...', 'info');

        let completedCount = 0;
        const totalStages = 7;

        const runStage = async (label: string, fn: () => Promise<void>) => {
            addLog(`>> Running ${label}...`, 'info');
            try {
                await fn();
                completedCount++;
                addLog(`✓ Completed: ${label} (${completedCount}/${totalStages})`, 'success');
            } catch (err: any) {
                addLog(`⚠ Failed: ${label} — ${err.message}`, 'warning');
                console.error(`[SemanticEngine] ${label} failed:`, err);
            }
        };

        try {
            // ── Stage 1: Competitor Entities ──
            await runStage('1. Competitor Entities', async () => {
                addLog('   ↳ Extracting entities from each competitor...', 'info');
                const extractRes = await fetch('/api/ai/entities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: step3.contents.map(c => ({ url: c.url, text: c.text })),
                        keyword,
                        mode: 'extract',
                    }),
                });
                const extractData = await extractRes.json();
                if (!extractRes.ok) throw new Error(extractData.error || 'Entity extraction failed');

                const perCompetitor = extractData.perCompetitor;
                if (!perCompetitor || perCompetitor.length === 0) {
                    throw new Error('No competitor entities were extracted');
                }
                addLog(`   ↳ Extracted entities from ${perCompetitor.length} competitors`, 'info');

                let merged = null;
                const entitySources = perCompetitor
                    .filter((r: any) => r.contentScore > 0 || Object.values(r.foundInContent || {}).some((arr: any) => Array.isArray(arr) && arr.length > 0))
                    .map((r: any) => JSON.stringify(r.foundInContent));

                if (entitySources.length > 0) {
                    addLog('   ↳ Merging entities via AI...', 'info');
                    try {
                        const mergeRes = await fetch('/api/ai/entities', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mode: 'merge', keyword, entitySources }),
                        });
                        const mergeData = await mergeRes.json();
                        if (mergeRes.ok && mergeData.merged) merged = mergeData.merged;
                    } catch (mergeErr: any) {
                        addLog(`   ↳ AI merge failed (${mergeErr.message}), using fallback`, 'warning');
                    }
                }

                if (!merged) {
                    addLog('   ↳ Building client-side merged summary...', 'info');
                    const allCategories: Record<string, Set<string>> = {};
                    for (const comp of perCompetitor) {
                        if (!comp.foundInContent) continue;
                        for (const [cat, items] of Object.entries(comp.foundInContent)) {
                            if (!allCategories[cat]) allCategories[cat] = new Set();
                            (items as string[]).forEach((item: string) => allCategories[cat].add(item));
                        }
                    }
                    const mergedCategories: Record<string, string[]> = {};
                    let totalUnique = 0;
                    for (const [cat, items] of Object.entries(allCategories)) {
                        mergedCategories[cat] = [...items];
                        totalUnique += items.size;
                    }
                    merged = { entities: mergedCategories, totalUnique, summary: `Merged ${totalUnique} unique entities from ${perCompetitor.length} competitors` };
                }

                store.setStep4(perCompetitor, merged);
            });

            // ── Stage 2: AI Entities ──
            await runStage('2. AI Entities', async () => {
                const res = await fetch('/api/ai/entities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword, mode: 'generate' }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'AI entity generation failed');
                store.setStep5(data.aiEntities);
            });

            // ── Stage 3: N-Grams ──
            await runStage('3. N-Grams', async () => {
                const res = await fetch('/api/ai/ngrams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword, mode: 'generate' }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'N-Gram generation failed');
                store.setStep6(data);
            });

            // ── Stage 4: NLP Keywords ──
            await runStage('4. NLP Keywords', async () => {
                const extractRes = await fetch('/api/ai/nlp-keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword, contents: step3.contents.map(c => ({ url: c.url, text: c.text })), mode: 'extract' }) });
                const extractData = await extractRes.json();
                if (!extractRes.ok) throw new Error(extractData.error || 'NLP keyword extraction failed');

                const mergeRes = await fetch('/api/ai/nlp-keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'merge', keyword, results: extractData.perCompetitor }) });
                const mergeData = await mergeRes.json();
                if (!mergeRes.ok) throw new Error(mergeData.error || 'NLP keyword merge failed');

                store.setStep7(extractData.perCompetitor, mergeData.combined);
            });

            // ── Stage 5: Skip-Grams ──
            await runStage('5. Skip-Grams', async () => {
                const res = await fetch('/api/ai/skip-grams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Skip-gram generation failed');
                store.setStep8(data.skipGrams, { word_sense_disambiguation: data.word_sense_disambiguation, document_summarization: data.document_summarization, keyword_extraction: data.keyword_extraction });
            });

            // ── Stage 6: AutoSuggest ──
            await runStage('6. AutoSuggest', async () => {
                const res = await fetch('/api/autocomplete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword, lang: location?.lang || 'ar' }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'AutoSuggest failed');
                store.setStep9(data.keywords);
            });

            // ── Stage 7: Grammar Analysis ──
            await runStage('7. Grammar Analysis', async () => {
                const res = await fetch('/api/ai/grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Grammar analysis failed');
                store.setStep10(data.grammar);
            });

            // Final
            if (completedCount === totalStages) {
                addLog('🚀 Semantic Engine completed successfully! All 7 stages passed.', 'success');
                toast.success('All semantic data extracted');
            } else {
                addLog(`⚠ Engine finished with ${completedCount}/${totalStages} stages.`, 'warning');
                toast.warning(`${completedCount}/${totalStages} stages completed.`);
            }
        } catch (err: any) {
            addLog(`✖ Critical Error: ${err.message}`, 'error');
            store.setError(err.message);
        } finally {
            setIsProcessing(false);
            setEngineDone(true);
            setShowLogs(false); // Auto-hide logs on completion
            store.setStatus('idle');
        }
    };

    return (
        <StepContainer
            onProcess={async () => { }}
            processLabel={hasAllData ? "Re-run Engine" : "Run Semantic Engine"}
            isProcessing={isProcessing}
            canProceed={hasAllData}
            progressText={isProcessing ? "Running Semantic Engine..." : ""}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-muted/20 border rounded-xl">
                    <div className="flex-1 space-y-1">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-500" />
                            Master Semantic Engine
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            This engine runs 7 AI models to deeply analyze entities, N-Grams, LSI keywords, and grammar structures for maximum semantic relevance.
                        </p>
                    </div>

                    <Button
                        size="lg"
                        onClick={runEngine}
                        disabled={isProcessing}
                        className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 font-bold gap-2"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {hasAllData ? "Re-run Full Engine" : "Ignite Engine 🚀"}
                    </Button>
                </div>

                {/* Status Badges */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    <StatusBadge label="Competitor Entities" active={!!store.step4?.perCompetitor?.length || !!store.step4?.merged} />
                    <StatusBadge label="AI Entities" active={!!store.step5} />
                    <StatusBadge label="N-Grams" active={!!store.step6} />
                    <StatusBadge label="NLP Keywords" active={!!store.step7?.combined} />
                    <StatusBadge label="Skip-Grams" active={!!store.step8} />
                    <StatusBadge label="AutoSuggest" active={!!store.step9} />
                    <StatusBadge label="Grammar Analysis" active={!!store.step10} />
                </div>

                {/* ── PROCESSING: Show Live Logs ── */}
                {isProcessing && (
                    <div className="bg-black/5 dark:bg-black/40 border rounded-lg p-4 font-mono text-xs h-[300px] overflow-y-auto animate-in fade-in duration-300">
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <div key={log.id} className="flex gap-3">
                                    <span className="text-muted-foreground/50 shrink-0">
                                        [{new Date(log.time).toLocaleTimeString()}]
                                    </span>
                                    <span className={{
                                        info: 'text-foreground',
                                        success: 'text-green-600 dark:text-green-400',
                                        warning: 'text-yellow-600 dark:text-yellow-400',
                                        error: 'text-red-600 dark:text-red-400'
                                    }[log.type]}>
                                        {log.text}
                                    </span>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 text-primary opacity-70 animate-pulse mt-4">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Engine is running...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── IDLE + NO DATA: Placeholder ── */}
                {!isProcessing && !hasAllData && !engineDone && (
                    <div className="bg-black/5 dark:bg-black/40 border rounded-lg p-8 text-center text-muted-foreground/50">
                        Press "Ignite Engine" to begin semantic extraction.
                    </div>
                )}

                {/* ── COMPLETED: Summary Report ── */}
                {!isProcessing && hasAllData && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Report Header */}
                        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                            <div>
                                <h4 className="font-bold text-green-700 dark:text-green-400">Semantic Analysis Complete</h4>
                                <p className="text-sm text-muted-foreground">All 7 stages processed successfully. Here is your full extraction report.</p>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard label="Competitor Entities" value={entityCount} color="purple" />
                            <StatCard label="AI Entities" value={aiEntityCount} color="blue" />
                            <StatCard label="N-Grams Generated" value={ngramCount} color="indigo" />
                            <StatCard label="LSI Keywords" value={lsiCount} color="violet" />
                            <StatCard label="Skip-Grams" value={skipGramCount} color="fuchsia" />
                            <StatCard label="AutoSuggest Keywords" value={autoSuggestCount} color="pink" />
                            <StatCard label="Grammar (Synonyms)" value={synonymCount} color="rose" />
                            <StatCard label="Total Semantic Signals" value={entityCount + aiEntityCount + ngramCount + lsiCount + skipGramCount + autoSuggestCount + synonymCount} color="green" />
                        </div>

                        {/* Detailed Sections */}
                        <div className="space-y-4">
                            {/* Entities */}
                            <ReportSection title="🏷️ Entities" subtitle={`${entityCount} competitor + ${aiEntityCount} AI-generated`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">AI Entities</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {store.step5?.aiEntities?.entities?.slice(0, 20).map((e, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">{e}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Competitor Summary</p>
                                        <Badge variant="outline">{entityCount} Unique Entities</Badge>
                                        <p className="text-xs text-muted-foreground mt-1">{store.step4?.merged?.summary}</p>
                                    </div>
                                </div>
                            </ReportSection>

                            {/* N-Grams & LSI */}
                            <ReportSection title="🔗 N-Grams & LSI Keywords" subtitle={`${ngramCount} grams + ${lsiCount} LSI terms`}>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">LSI Keywords</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {store.step7?.combined?.foundInContent?.lsiKeywords?.slice(0, 15).map((k, i) => (
                                                <Badge key={i} variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs">{k.term}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Tri-Grams & Four-Grams</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {store.step6?.generated?.trigrams?.slice(0, 8).map((g, i) => (
                                                <Badge key={`t-${i}`} variant="secondary" className="text-xs">{g}</Badge>
                                            ))}
                                            {store.step6?.generated?.fourgrams?.slice(0, 8).map((g, i) => (
                                                <Badge key={`f-${i}`} variant="secondary" className="text-xs">{g}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ReportSection>

                            {/* Skip-Grams & Grammar */}
                            <ReportSection title="🧠 Skip-Grams & Grammar" subtitle={`${skipGramCount} conceptual links + ${synonymCount} synonyms`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Skip-Grams (Conceptual Links)</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {store.step8?.skipGrams?.slice(0, 12).map((sg, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">{sg}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Synonyms & Related Words</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {store.step10?.grammar?.synonyms?.slice(0, 10).map((k, i) => (
                                                <Badge key={`s-${i}`} variant="outline" className="text-xs">{k}</Badge>
                                            ))}
                                            {store.step10?.grammar?.meronyms?.slice(0, 6).map((k, i) => (
                                                <Badge key={`m-${i}`} variant="outline" className="text-xs">{k}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ReportSection>

                            {/* AutoSuggest */}
                            <ReportSection title="🔍 Google AutoSuggest" subtitle={`${autoSuggestCount} filtered keywords`}>
                                <div className="flex flex-wrap gap-1.5">
                                    {store.step9?.autoKeywords?.slice(0, 20).map((k, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>
                                    ))}
                                </div>
                            </ReportSection>
                        </div>

                        {/* Toggle Logs */}
                        <button
                            onClick={() => setShowLogs(v => !v)}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                        >
                            {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {showLogs ? 'Hide Engine Logs' : 'Show Engine Logs'}
                        </button>

                        {showLogs && (
                            <div className="bg-black/5 dark:bg-black/40 border rounded-lg p-4 font-mono text-xs max-h-[200px] overflow-y-auto animate-in fade-in duration-200">
                                {logs.map((log) => (
                                    <div key={log.id} className="flex gap-3">
                                        <span className="text-muted-foreground/50 shrink-0">
                                            [{new Date(log.time).toLocaleTimeString()}]
                                        </span>
                                        <span className={{
                                            info: 'text-foreground',
                                            success: 'text-green-600 dark:text-green-400',
                                            warning: 'text-yellow-600 dark:text-yellow-400',
                                            error: 'text-red-600 dark:text-red-400'
                                        }[log.type]}>
                                            {log.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </StepContainer>
    );
}

// ── Sub-components ──

function StatusBadge({ label, active }: { label: string; active: boolean }) {
    return (
        <div className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors ${active ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-muted/10 border-muted text-muted-foreground/50'}`}>
            {active ? <CheckCircle2 className="w-4 h-4 mb-1" /> : <div className="w-4 h-4 mb-1 rounded-full border-2 border-muted-foreground/30" />}
            <span className="text-[10px] sm:text-xs font-medium leading-tight">{label}</span>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-700 dark:text-purple-400',
        blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-700 dark:text-blue-400',
        indigo: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-700 dark:text-indigo-400',
        violet: 'from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-700 dark:text-violet-400',
        fuchsia: 'from-fuchsia-500/10 to-fuchsia-600/5 border-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-400',
        pink: 'from-pink-500/10 to-pink-600/5 border-pink-500/20 text-pink-700 dark:text-pink-400',
        rose: 'from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-700 dark:text-rose-400',
        green: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-700 dark:text-green-400',
    };
    return (
        <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.purple} border rounded-xl p-3 text-center`}>
            <div className="text-2xl font-black">{value}</div>
            <div className="text-[10px] sm:text-xs font-medium opacity-80 leading-tight mt-0.5">{label}</div>
        </div>
    );
}

function ReportSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
                <h4 className="font-bold text-sm">{title}</h4>
                <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}

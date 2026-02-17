'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Loader2, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AuditorAgentProps {
    keyword: string;
    content: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: any;
    onRegenSection: (heading: string, fix?: string) => Promise<void>;
}

export function AuditorAgent({ keyword, content, store, onRegenSection }: AuditorAgentProps) {
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [audit, setAudit] = useState<any>(null);

    const handleAudit = async () => {
        if (!content) return;
        setLoading(true);
        try {
            // Collect outline headings for structure check
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outlineHeadings = store.step2?.merged?.headings?.map((h: any) => h.text) || [];
            // Collect entities for coverage check
            const entities: string[] = [];
            if (store.step4?.merged) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Object.values(store.step4.merged.entities).forEach(items => { (items as any[]).forEach(e => entities.push(e.name)); });
            }
            // W7-8: Pass active rule IDs so auditor validates rule-specific elements
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const activeRuleIds = store.step11?.rules?.filter((r: any) => r.enabled).map((r: any) => r.id) || [];
            const res = await fetch('/api/ai/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, articleHtml: content, outlineHeadings, entities, activeRuleIds, lang: store.location?.lang || 'ar' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAudit(data.audit);
        } catch {
            toast.error('فشل في تنفيذ التدقيق');
        } finally {
            setLoading(false);
        }
    };

    const severityColor: Record<string, string> = {
        critical: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400',
        warning: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400',
        info: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400',
    };

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                    القاضي الشرس (SEO Auditor)
                    {audit && (
                        <Badge variant={audit.verdict === 'pass' ? 'default' : 'destructive'} className="text-[10px]">
                            {audit.verdict === 'pass' ? '✓ ناجح' : '✗ راسب'} — {audit.overallScore}/100
                        </Badge>
                    )}
                </h4>
                <div className="flex items-center gap-2">
                    {/* Multi-Pass Auto-Fix: fix 2-3 worst sections automatically */}
                    {audit?.verdict === 'fail' && audit?.sectionsAnalysis?.some((s: { quality: string }) => s.quality === 'failing' || s.quality === 'weak') && (
                        <Button
                            variant="default"
                            size="sm"
                            className="gap-1 text-xs bg-amber-600 hover:bg-amber-700"
                            disabled={loading}
                            onClick={async () => {
                                const failingSections = (audit.sectionsAnalysis as { heading: string; quality: string; note: string }[])
                                    .filter(s => s.quality === 'failing' || s.quality === 'weak')
                                    .slice(0, 3);
                                if (failingSections.length === 0) return;
                                setLoading(true);
                                toast.info(`إصلاح تلقائي لـ ${failingSections.length} أقسام ضعيفة...`);
                                for (const sec of failingSections) {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const issue = audit.issues?.find((i: any) => i.sectionHeading === sec.heading);
                                    const fixContext = issue ? `${issue.description}: ${issue.fix}` : `Section quality: ${sec.quality}. ${sec.note || ''}`;
                                    await onRegenSection(sec.heading, fixContext);
                                    await new Promise(r => setTimeout(r, 1000));
                                }
                                toast.success(`تم إصلاح ${failingSections.length} أقسام — أعد التدقيق للتأكد`);
                                setLoading(false);
                            }}
                        >
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            ⚡ إصلاح تلقائي ({(audit.sectionsAnalysis as any[]).filter((s: any) => s.quality === 'failing' || s.quality === 'weak').length} أقسام)
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleAudit} disabled={loading}>
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                        {audit ? 'إعادة التدقيق' : 'تدقيق المقال (T=0.0)'}
                    </Button>
                </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
                مراجعة بـ Temperature 0.0 — يكشف الكليشيهات، الأقسام الضعيفة، فجوات الكيانات، ومشاكل الكثافة. يمكن الإصلاح التلقائي بنقرة واحدة.
            </p>
            {audit?.issues?.length > 0 && (
                <div className="space-y-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {audit.issues.map((issue: any, idx: number) => (
                        <div key={idx} className={`rounded-md border p-3 space-y-1 ${severityColor[issue.severity] || ''}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px]">{issue.severity === 'critical' ? 'حرج' : issue.severity === 'warning' ? 'تحذير' : 'معلومة'}</Badge>
                                    <span className="text-xs font-medium">{issue.description}</span>
                                </div>
                                {issue.sectionHeading && (
                                    <Button variant="ghost" size="sm" className="text-[10px] h-6 gap-1" onClick={() => onRegenSection(issue.sectionHeading!, `${issue.description}: ${issue.fix}`)}>
                                        ↻ إصلاح
                                    </Button>
                                )}
                            </div>
                            <p className="text-[10px] opacity-80">{issue.fix}</p>
                        </div>
                    ))}
                </div>
            )}
            {audit?.clichesFound?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] text-red-600 font-medium">كليشيهات مكتشفة:</span>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {audit.clichesFound.map((c: string, i: number) => (
                        <Badge key={i} variant="destructive" className="text-[9px]">{c}</Badge>
                    ))}
                </div>
            )}
            {/* W7-11: Section-level analysis */}
            {audit?.sectionsAnalysis?.length > 0 && (
                <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">تحليل الأقسام:</p>
                    <div className="grid gap-1">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {audit.sectionsAnalysis.map((sec: any, i: number) => {
                            const qColor: Record<string, string> = { excellent: 'text-green-600', good: 'text-blue-600', weak: 'text-yellow-600', failing: 'text-red-600' };
                            const qLabel: Record<string, string> = { excellent: 'ممتاز', good: 'جيد', weak: 'ضعيف', failing: 'راسب' };
                            return (
                                <div key={i} className="flex items-center gap-2 text-[10px]">
                                    <span className={`font-bold ${qColor[sec.quality] || ''}`}>{qLabel[sec.quality] || sec.quality}</span>
                                    <span className="text-muted-foreground">{sec.wordCount}w</span>
                                    <span className="flex-1 truncate">{sec.heading}</span>
                                    {sec.quality === 'weak' || sec.quality === 'failing' ? (
                                        <Button variant="ghost" size="sm" className="text-[9px] h-5 px-1" onClick={() => onRegenSection(sec.heading)}>↻</Button>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {/* Keyword density display */}
            {audit?.keywordDensityActual !== undefined && (
                <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-muted-foreground">كثافة الكلمة المفتاحية:</span>
                    <Badge variant={audit.keywordDensityActual >= 0.5 && audit.keywordDensityActual <= 2.5 ? 'default' : 'destructive'} className="text-[9px]">
                        {audit.keywordDensityActual.toFixed(2)}%
                    </Badge>
                    {audit.entityCoveragePercent !== undefined && (
                        <>
                            <span className="text-muted-foreground mr-2">تغطية الكيانات:</span>
                            <Badge variant={audit.entityCoveragePercent >= 60 ? 'default' : 'secondary'} className="text-[9px]">
                                {audit.entityCoveragePercent}%
                            </Badge>
                        </>
                    )}
                </div>
            )}
            {audit && audit.issues?.length === 0 && (
                <div className="text-center p-4 text-green-600 dark:text-green-400">
                    <Check className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">المقال يجتاز جميع الفحوصات — جاهز للنشر!</p>
                </div>
            )}
        </div>
    );
}

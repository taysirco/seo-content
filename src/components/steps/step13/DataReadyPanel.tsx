'use client';

import { Badge } from '@/components/ui/badge';

interface DataReadyPanelProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: any;
}

export function DataReadyPanel({ store }: DataReadyPanelProps) {
    const dataSources = [
        { step: 2, label: 'المخطط', labelEn: 'Outline', data: store.step2, detail: store.step2 ? `${store.step2.merged.headings.length} عنوان` : null },
        { step: 3, label: 'المحتوى', labelEn: 'Content', data: store.step3, detail: store.step3 ? `${store.step3.contents.filter((c: { wordCount: number }) => c.wordCount > 0).length} صفحة` : null },
        { step: 4, label: 'كيانات المنافسين', labelEn: 'Entities', data: store.step4, detail: store.step4 ? `${store.step4.merged.totalUnique} كيان` : null },
        { step: 5, label: 'كيانات AI', labelEn: 'AI Entities', data: store.step5, detail: store.step5 ? `${store.step5.aiEntities.entities.length} كيان` : null },
        { step: 6, label: 'N-Grams', labelEn: 'N-Grams', data: store.step6, detail: store.step6 ? `${(store.step6.picked.length - (store.step6.excludedPicked?.length || 0)) + (store.step6.unique.length - (store.step6.excludedUnique?.length || 0)) + (store.step6.generated ? (Object.values(store.step6.generated) as unknown[][]).reduce((s: number, a: unknown[]) => s + (Array.isArray(a) ? a.length : 0), 0) : 0)} عبارة` : null },
        { step: 7, label: 'NLP', labelEn: 'Keywords', data: store.step7, detail: store.step7 ? `نقاط: ${store.step7.combined.contentScore}` : null },
        { step: 8, label: 'Skip-Grams', labelEn: 'Skip-Grams', data: store.step8, detail: store.step8 ? `${store.step8.skipGrams.length - (store.step8.excludedIndices?.length || 0)} زوج` : null },
        { step: 9, label: 'اقتراحات', labelEn: 'Suggest', data: store.step9, detail: store.step9 ? `${store.step9.autoKeywords.length - (store.step9.excludedIndices?.length || 0)} كلمة` : null },
        { step: 10, label: 'لغويات', labelEn: 'Grammar', data: store.step10, detail: store.step10 ? '10 فئات' : null },
        { step: 11, label: 'قواعد SEO', labelEn: 'Rules', data: store.step11, detail: store.step11 ? `${store.step11.rules.filter((r: { enabled: boolean }) => r.enabled).length} قاعدة` : null },
        { step: 12, label: 'تعليمات', labelEn: 'Config', data: store.step12, detail: store.step12 ? store.step12.config.contentLength : null },
    ];
    const readyCount = dataSources.filter(s => s.data).length;

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">مصادر البيانات للمحتوى</h4>
                <Badge variant={readyCount >= 9 ? 'default' : 'secondary'}>
                    {readyCount}/11 جاهز
                </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {dataSources.map(src => (
                    <div
                        key={src.step}
                        className={`flex items-center gap-2 p-2 rounded-md text-xs transition-colors ${src.data
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                : 'bg-muted/30 text-muted-foreground'
                            }`}
                    >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${src.data ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                        <div className="min-w-0">
                            <span className="font-medium">{src.label}</span>
                            {src.detail && <span className="block text-[10px] opacity-70 truncate">{src.detail}</span>}
                        </div>
                    </div>
                ))}
            </div>
            {readyCount < 5 && (
                <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
                    ⚠ يُفضل إكمال أكبر عدد من الخطوات قبل التوليد للحصول على أفضل نتيجة.
                </p>
            )}
        </div>
    );
}

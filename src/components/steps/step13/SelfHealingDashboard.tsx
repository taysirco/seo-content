'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SelfHealingDashboardProps {
    keyword: string;
    content: string;
    onInjectContent: (html: string) => void;
}

// P6-6: Self-Healing SEO Dashboard Component
export function SelfHealingDashboard({ keyword, content, onInjectContent }: SelfHealingDashboardProps) {
    const [pageUrl, setPageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [expanding, setExpanding] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!pageUrl.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/search-console', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageUrl: pageUrl.trim(), days: 28 }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'فشل في جلب البيانات');
                if (data.configured === false) setError('Google Search Console غير مُهيأ — أضف GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL في .env.local');
                return;
            }
            setResult(data);
        } catch {
            setError('فشل في الاتصال');
        } finally {
            setLoading(false);
        }
    };

    const handleExpand = async (target: { keyword: string; currentPosition: number; impressions: number; suggestedHeading: string; headingLevel: string; priority: string }) => {
        setExpanding(target.keyword);
        try {
            const res = await fetch('/api/ai/expand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articleKeyword: keyword,
                    target,
                    existingArticleSnippet: content.slice(0, 500),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onInjectContent(data.html);
            toast.success(`تم توليد قسم "${target.keyword}" — أُضيف للمقال`);
        } catch {
            toast.error('فشل في توليد المحتوى التوسيعي');
        } finally {
            setExpanding(null);
        }
    };

    const priorityColor: Record<string, string> = {
        critical: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400',
        high: 'border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-400',
        medium: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400',
    };

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-semibold">التحسين الذاتي (Self-Healing SEO)</h4>
            </div>
            <p className="text-[10px] text-muted-foreground">
                يحلل بيانات Google Search Console ويكتشف كلمات الصفحة الثانية لتوسيع المقال تلقائياً.
            </p>

            <div className="flex gap-2">
                <input
                    type="url"
                    placeholder="https://example.com/article-url"
                    value={pageUrl}
                    onChange={e => setPageUrl(e.target.value)}
                    className="flex-1 rounded-md border px-3 py-1.5 text-xs bg-background"
                    dir="ltr"
                />
                <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0" onClick={handleAnalyze} disabled={loading || !pageUrl.trim()}>
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                    تحليل GSC
                </Button>
            </div>

            {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2 text-[10px] text-red-700 dark:text-red-400">{error}</div>
            )}

            {result && (
                <div className="space-y-3">
                    {/* Summary stats */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="rounded-md border p-2 text-center">
                            <div className="text-lg font-bold text-blue-600">{result.summary.totalKeywords}</div>
                            <div className="text-[9px] text-muted-foreground">إجمالي الكلمات</div>
                        </div>
                        <div className="rounded-md border p-2 text-center">
                            <div className="text-lg font-bold text-green-600">{result.summary.page1Count}</div>
                            <div className="text-[9px] text-muted-foreground">الصفحة الأولى</div>
                        </div>
                        <div className="rounded-md border p-2 text-center">
                            <div className="text-lg font-bold text-orange-600">{result.summary.page2Count}</div>
                            <div className="text-[9px] text-muted-foreground">الصفحة الثانية</div>
                        </div>
                        <div className="rounded-md border p-2 text-center">
                            <div className="text-lg font-bold">{result.summary.avgPosition}</div>
                            <div className="text-[9px] text-muted-foreground">متوسط الترتيب</div>
                        </div>
                    </div>

                    {/* Page 2 keywords — expansion opportunities */}
                    {result.performance?.page2Keywords?.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-medium">فرص التوسيع (كلمات الصفحة الثانية):</p>
                            {result.performance.page2Keywords.slice(0, 8).map((kw: { query: string; position: number; impressions: number; clicks: number }, i: number) => {
                                const priority = kw.position <= 13 ? 'critical' : kw.position <= 16 ? 'high' : 'medium';
                                const target = {
                                    keyword: kw.query,
                                    currentPosition: kw.position,
                                    impressions: kw.impressions,
                                    suggestedHeading: kw.query,
                                    headingLevel: kw.query.split(/\s+/).length >= 4 ? 'h3' : 'h2',
                                    priority,
                                };
                                return (
                                    <div key={i} className={`rounded-md border p-2 flex items-center justify-between ${priorityColor[priority]}`}>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[8px]">{priority === 'critical' ? 'حرج' : priority === 'high' ? 'عالي' : 'متوسط'}</Badge>
                                                <span className="text-xs font-medium" dir="auto">{kw.query}</span>
                                            </div>
                                            <div className="text-[9px] opacity-70 mt-0.5">
                                                الموقع: {kw.position.toFixed(1)} — {kw.impressions} ظهور — {kw.clicks} نقرة
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-[10px] h-6 gap-1 shrink-0"
                                            disabled={!!expanding}
                                            onClick={() => handleExpand(target)}
                                        >
                                            {expanding === kw.query ? <Loader2 className="w-3 h-3 animate-spin" /> : '✍️'}
                                            توسيع
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {result.performance?.page2Keywords?.length === 0 && (
                        <div className="text-center p-3 text-green-600 dark:text-green-400 text-xs">
                            <Check className="w-6 h-6 mx-auto mb-1" />
                            لا توجد كلمات في الصفحة الثانية — المقال يؤدي بشكل ممتاز!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

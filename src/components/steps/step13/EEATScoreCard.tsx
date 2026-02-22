'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface EEATScoreCardProps {
    content: string;
    keyword: string;
}

// W14-E: E-E-A-T Score Calculator
export function EEATScoreCard({ content, keyword }: EEATScoreCardProps) {
    const score = useMemo(() => {
        if (!content) return null;

        const d = document.createElement('div');
        d.innerHTML = content;
        const plain = d.textContent || '';

        // Extract Links
        const links = Array.from(d.querySelectorAll('a')).map(a => a.href);
        const currentDomain = window.location.hostname; // Approximation, though usually we might want store.clientMeta.domain
        const externalLinks = links.filter(l => l.startsWith('http') && !l.includes(currentDomain) && !l.includes('localhost'));
        const internalLinks = links.filter(l => l.startsWith('/') || l.includes(currentDomain));

        const checks: { label: string; found: boolean; weight: number; tip: string }[] = [];

        // Experience signals - Deep Arabic Matching
        const experienceRegex = /(تجربت(?:ي|نا)|في (ممارستنا|تجربتنا)|قمت بـ|قمنا بـ|لاحظنا|اكتشفنا|مما رأيناه|من واقع التعامل|عملياً سنجد|experience|practical|real-world)/i;
        checks.push({ label: 'خبرة شخصية / أمثلة واقعية (Personal Experience)', found: experienceRegex.test(plain), weight: 15, tip: 'أضف أمثلة واقعية وعبارات مثل "من تجربتنا" لتعزيز الـ E-E-A-T' });

        const dataRegex = /(\d+%|\d+٪|دراسة (حديثة|جديدة)|أبحاث|إحصائيات|وفقاً لـ|حسب تقرير|أظهرت البيانات|study|research|according to|report)/i;
        checks.push({ label: 'إحصائيات وبيانات (Data & Statistics)', found: dataRegex.test(plain), weight: 15, tip: 'ادعم المحتوى بأرقام وإحصائيات موثوقة' });

        // Expertise signals
        checks.push({ label: 'روابط خارجية لمصادر (External Authority Links)', found: externalLinks.length > 0 || /المصدر:|المرجع:|وفقاً لـ(وزارة|هيئة|منظمة)/i.test(plain), weight: 15, tip: 'أضف روابط صالحة لمصادر خارجية عالية الموثوقية' });
        checks.push({ label: 'روابط داخلية (Internal Linking)', found: internalLinks.length > 0, weight: 10, tip: 'قم بربط هذا المقال بمقالات أخرى في موقعك لتقوية السيلو (Silo)' });

        const expertRegex = /(قال الخبير|يقول المتخصص|صرح المهندس|أوضح الدكتور|أشار البروفيسور|بحسب خبراء|رأي خبير|said|stated|according to Dr|Professor)/i;
        checks.push({ label: 'اقتباسات خبراء (Expert Quotes)', found: expertRegex.test(plain), weight: 10, tip: 'استعن باقتباسات لخبراء في مجالك لإثبات السلطة (Authority)' });

        // Authoritativeness / UX
        checks.push({ label: 'هيكلة عناوين سليمة (H2/H3 Hierarchy)', found: (content.match(/<h2/gi) || []).length >= 3, weight: 10, tip: 'قسّم المحتوى لترويسات H2 واضحة (3 على الأقل)' });
        checks.push({ label: 'قسم الأسئلة الشائعة (FAQ)', found: /(أسئلة شائعة|الأسئلة المتكررة|FAQ|frequently asked|؟)/.test(plain) && (content.match(/<h3/gi) || []).length >= 2, weight: 10, tip: 'أضف قسم أسئلة شائعة باستخدام H3' });

        // Trust
        checks.push({ label: 'تغطية واسعة (>1000 كلمة)', found: plain.split(/\s+/).filter(Boolean).length >= 1000, weight: 10, tip: 'اكتب محتوى شاملاً يغطي الموضوع من كافة الجوانب (Thin Content يعاقب من جوجل)' });
        checks.push({ label: 'جداول أو قوائم لتسهيل القراءة', found: /<table|<ul|<ol/i.test(content), weight: 5, tip: 'استخدم القوائم النقطية والجداول لزيادة فرص المقتطف المميز (Featured Snippet)' });

        const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
        const earnedWeight = checks.filter(c => c.found).reduce((sum, c) => sum + c.weight, 0);
        const pct = Math.round((earnedWeight / totalWeight) * 100);
        const grade = pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D';

        return { checks, pct, grade, keyword };
    }, [content, keyword]);

    if (!score) return null;

    const gradeColor: Record<string, string> = { A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600', D: 'text-red-600' };

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    E-E-A-T Score
                </h4>
                <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${gradeColor[score.grade]}`}>{score.grade}</span>
                    <Badge variant={score.pct >= 60 ? 'default' : 'destructive'} className="text-[10px]">{score.pct}%</Badge>
                </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${score.pct >= 80 ? 'bg-green-500' : score.pct >= 60 ? 'bg-blue-500' : score.pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${score.pct}%` }}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {score.checks.map((c, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[11px] p-1.5 rounded ${c.found ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                        <span className="shrink-0">{c.found ? '✅' : '❌'}</span>
                        <span className={c.found ? '' : 'text-muted-foreground'}>{c.label}</span>
                        <span className="text-[9px] text-muted-foreground mr-auto">({c.weight})</span>
                    </div>
                ))}
            </div>
            {score.checks.filter(c => !c.found).length > 0 && (
                <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2 space-y-1">
                    <p className="text-[10px] font-medium text-blue-700 dark:text-blue-400">💡 Suggestions to improve score:</p>
                    {score.checks.filter(c => !c.found).slice(0, 3).map((c, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground">• {c.tip}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

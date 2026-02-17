'use client';

import { useState } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { StepContainer } from '@/components/pipeline/StepContainer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GLOBAL_COUNTRIES, getCountry } from '@/lib/global-locations-db';
import { ExternalLink, Search, Globe, CheckCircle2, XCircle } from 'lucide-react';
import type { CompetitorResult } from '@/types/pipeline';
import { extractDomain } from '@/lib/utils/extract-domain';

function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function Step01CompetitorResearch() {
  const {
    keyword, setKeyword, location, setLocation,
    clientMeta, setClientMeta,
    step1, setStep1, setStatus, setError,
  } = usePipelineStore();

  const [serpMode, setSerpMode] = useState<'auto' | 'manual'>('manual');
  const [manualUrls, setManualUrls] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [serpUrl, setSerpUrl] = useState('');
  const [showClientMeta, setShowClientMeta] = useState(!!clientMeta?.clientName);
  const [tagInput, setTagInput] = useState('');

  const [selectedCountry, setSelectedCountry] = useState<string>(location?.country || '');
  const [cityInput, setCityInput] = useState<string>(location?.cityLocal || location?.cityAr || '');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [intentData, setIntentData] = useState<any>(null);

  const countryConfig = selectedCountry ? getCountry(selectedCountry) : null;

  const handleCountrySelect = (code: string) => {
    setSelectedCountry(code);
    setCityInput('');
    const country = getCountry(code);
    if (country && country.cities.length > 0) {
      const c = country.cities[0];
      setLocation({
        city: c.city, cityAr: c.cityLocal, cityLocal: c.cityLocal,
        country: country.code, lang: country.lang, lat: c.lat, lng: c.lng,
        googleTld: country.googleTld, countryName: country.name,
      });
      setCityInput(c.cityLocal);
    }
  };

  const handleCitySelect = (cityLocal: string) => {
    if (!countryConfig) return;
    const c = countryConfig.cities.find(ct => ct.cityLocal === cityLocal);
    if (c) {
      setLocation({
        city: c.city, cityAr: c.cityLocal, cityLocal: c.cityLocal,
        country: countryConfig.code, lang: countryConfig.lang, lat: c.lat, lng: c.lng,
        googleTld: countryConfig.googleTld, countryName: countryConfig.name,
      });
      setCityInput(c.cityLocal);
    }
  };

  const handleCustomCity = (value: string) => {
    setCityInput(value);
    if (countryConfig && value.trim()) {
      setLocation({
        city: value.trim(), cityAr: value.trim(), cityLocal: value.trim(),
        country: countryConfig.code, lang: countryConfig.lang,
        lat: countryConfig.cities[0]?.lat || 0, lng: countryConfig.cities[0]?.lng || 0,
        googleTld: countryConfig.googleTld, countryName: countryConfig.name,
      });
    }
  };

  const handleBuildSerpUrl = async () => {
    if (!keyword || !location) return;
    setIsProcessing(true);
    setStatus('processing');
    try {
      const res = await fetch('/api/serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, location, mode: serpMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      if (serpMode === 'auto' && data.competitors) {
        setStep1(data.competitors, data.serpFeatures || undefined);
        // Auto-classify search intent in background (non-blocking)
        if (data.competitors.length > 0) {
          fetch('/api/ai/classify-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              keyword,
              competitors: data.competitors.slice(0, 5).map((c: { title: string; metaDescription: string }) => ({
                title: c.title, snippet: c.metaDescription,
              })),
              lang: location?.lang || 'ar',
            }),
          }).then(r => r.json()).then(intent => {
            if (intent && !intent.error) setIntentData(intent);
          }).catch(() => { /* non-blocking */ });
        }
      } else if (data.serpUrl) {
        setSerpUrl(data.serpUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsProcessing(false);
      setStatus('idle');
    }
  };

  const handleManualSubmit = () => {
    const rawUrls = manualUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    // S1: Validate URLs + deduplicate by domain
    const seenDomains = new Set<string>();
    const competitors: CompetitorResult[] = [];
    let position = 1;
    for (const raw of rawUrls) {
      try {
        const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        if (seenDomains.has(parsed.hostname)) continue;
        seenDomains.add(parsed.hostname);
        competitors.push({
          position: position++,
          url: parsed.href,
          title: '',
          metaDescription: '',
          domain: parsed.hostname,
          selected: true,
        });
      } catch {
        // Skip invalid URLs silently
      }
    }
    if (competitors.length > 0) setStep1(competitors);
  };

  const toggleCompetitor = usePipelineStore(s => s.toggleCompetitor);

  return (
    <StepContainer
      canProceed={!!step1 && step1.competitors.some(c => c.selected)}
    >
      <div className="space-y-6">
        {/* Keyword + Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Keyword</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter keyword..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={selectedCountry} onValueChange={handleCountrySelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select country..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {GLOBAL_COUNTRIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.nameNative} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* City selection — dropdown for known cities + free text for custom */}
        {selectedCountry && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              {countryConfig && countryConfig.cities.length > 0 ? (
                <Select value={cityInput} onValueChange={handleCitySelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city..." />
                  </SelectTrigger>
                  <SelectContent>
                    {countryConfig.cities.map(c => (
                      <SelectItem key={c.city} value={c.cityLocal}>
                        {c.cityLocal} — {c.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Enter city name..."
                  value={cityInput}
                  onChange={(e) => handleCustomCity(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Custom City</Label>
              <Input
                placeholder="Or type a custom city..."
                value={cityInput}
                onChange={(e) => handleCustomCity(e.target.value)}
              />
            </div>
          </div>
        )}


        {/* S4: Client/Site Metadata (SaaS multi-site) */}
        <div className="rounded-lg border bg-card">
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/30 transition-colors rounded-lg"
            onClick={() => setShowClientMeta(!showClientMeta)}
          >
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Client / Site Info
              {clientMeta?.clientName && (
                <Badge variant="secondary" className="text-[10px]">{clientMeta.clientName}</Badge>
              )}
              {clientMeta?.domain && (
                <Badge variant="outline" className="text-[10px]" dir="ltr">{clientMeta.domain}</Badge>
              )}
            </span>
            <span className="text-muted-foreground text-xs">{showClientMeta ? '▲' : '▼'}</span>
          </button>
          {showClientMeta && (
            <div className="px-4 pb-4 space-y-3 border-t pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Client Name</Label>
                  <Input
                    placeholder="e.g. Acme Corp"
                    value={clientMeta?.clientName || ''}
                    onChange={(e) => setClientMeta({ ...clientMeta, clientName: e.target.value, domain: clientMeta?.domain || '' })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Domain</Label>
                  <Input
                    placeholder="example.com"
                    dir="ltr"
                    value={clientMeta?.domain || ''}
                    onChange={(e) => setClientMeta({ ...clientMeta, clientName: clientMeta?.clientName || '', domain: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Logo URL (optional)</Label>
                <Input
                  placeholder="https://example.com/logo.png"
                  dir="ltr"
                  value={clientMeta?.logoUrl || ''}
                  onChange={(e) => setClientMeta({ ...clientMeta, clientName: clientMeta?.clientName || '', domain: clientMeta?.domain || '', logoUrl: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input
                  placeholder="Project-specific notes..."
                  value={clientMeta?.notes || ''}
                  onChange={(e) => setClientMeta({ ...clientMeta, clientName: clientMeta?.clientName || '', domain: clientMeta?.domain || '', notes: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tags</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        const tags = [...(clientMeta?.tags || []), tagInput.trim()];
                        setClientMeta({ ...clientMeta, clientName: clientMeta?.clientName || '', domain: clientMeta?.domain || '', tags });
                        setTagInput('');
                      }
                    }}
                  />
                </div>
                {clientMeta?.tags && clientMeta.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {clientMeta.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                        {tag}
                        <button
                          type="button"
                          className="hover:text-destructive"
                          onClick={() => {
                            const tags = clientMeta.tags!.filter((_, idx) => idx !== i);
                            setClientMeta({ ...clientMeta, tags });
                          }}
                        >×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SERP Mode Toggle */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <Label>Search Mode:</Label>
          </div>
          <div className="flex items-center gap-2">
            <span className={serpMode === 'manual' ? 'font-bold' : 'text-muted-foreground'}>Manual (free)</span>
            <Switch
              checked={serpMode === 'auto'}
              onCheckedChange={(checked) => setSerpMode(checked ? 'auto' : 'manual')}
            />
            <span className={serpMode === 'auto' ? 'font-bold' : 'text-muted-foreground'}>Auto (Serper.dev)</span>
          </div>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleBuildSerpUrl}
          disabled={!keyword || !location || isProcessing}
          className="w-full gap-2"
          size="lg"
        >
          <Search className="w-4 h-4" />
          {serpMode === 'auto' ? 'Auto Search' : 'Build Search URL'}
        </Button>

        {/* Manual Mode: Show SERP URL + URL Input */}
        {serpMode === 'manual' && serpUrl && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm mb-2 font-medium">Google Search URL:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background p-2 rounded flex-1 overflow-x-auto block" dir="ltr">
                  {serpUrl}
                </code>
                <Button variant="outline" size="sm" asChild>
                  <a href={serpUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Open URL → Copy top 10 result URLs → Paste below
              </p>
            </div>

            <div className="space-y-2">
              <Label>Paste competitor URLs (one per line)</Label>
              <Textarea
                rows={8}
                placeholder="https://example.com/article-1&#10;https://example.com/article-2&#10;..."
                value={manualUrls}
                onChange={(e) => setManualUrls(e.target.value)}
                dir="ltr"
                className="font-mono text-sm"
              />
              <Button onClick={handleManualSubmit} disabled={!manualUrls.trim()}>
                Add Competitors
              </Button>
            </div>
          </div>
        )}

        {/* Search Intent Classification */}
        {intentData && (
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">🎯 Search Intent Classification</p>
              <Badge variant="default" className="text-[10px]">
                {intentData.intent?.replace('_', ' ')} ({intentData.intentConfidence}%)
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {intentData.contentFormat && (
                <div className="p-2 rounded bg-background">
                  <p className="text-[9px] text-muted-foreground">Format</p>
                  <p className="text-xs font-medium">{intentData.contentFormat?.replace(/_/g, ' ')}</p>
                </div>
              )}
              {intentData.recommendedLength && (
                <div className="p-2 rounded bg-background">
                  <p className="text-[9px] text-muted-foreground">Length</p>
                  <p className="text-xs font-medium">{intentData.recommendedLength.optimal} words</p>
                </div>
              )}
              {intentData.topicalDepthRequired && (
                <div className="p-2 rounded bg-background">
                  <p className="text-[9px] text-muted-foreground">Depth</p>
                  <p className="text-xs font-medium">{intentData.topicalDepthRequired}</p>
                </div>
              )}
              {intentData.featuredSnippetType && intentData.featuredSnippetType !== 'none' && (
                <div className="p-2 rounded bg-background">
                  <p className="text-[9px] text-muted-foreground">Snippet Type</p>
                  <p className="text-xs font-medium">{intentData.featuredSnippetType}</p>
                </div>
              )}
            </div>
            {intentData.contentAngle && (
              <p className="text-[11px] text-muted-foreground italic">{intentData.contentAngle}</p>
            )}
            {intentData.serpFeatureTargets && intentData.serpFeatureTargets.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[9px] text-muted-foreground">Target:</span>
                {intentData.serpFeatureTargets.map((f: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[8px]">{f.replace(/_/g, ' ')}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SERP Intelligence Panel */}
        {step1?.serpFeatures && (
          <div className="space-y-3">
            {/* Detected SERP Features */}
            {step1.serpFeatures.detected && step1.serpFeatures.detected.length > 0 && (
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <p className="text-xs font-semibold mb-2">SERP Features Detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {step1.serpFeatures.detected.map(f => (
                    <Badge key={f} variant="secondary" className="text-[10px]">
                      {f.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* People Also Ask */}
            {step1.serpFeatures.peopleAlsoAsk && step1.serpFeatures.peopleAlsoAsk.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs font-semibold mb-2">People Also Ask ({step1.serpFeatures.peopleAlsoAsk.length})</p>
                <ul className="space-y-1">
                  {step1.serpFeatures.peopleAlsoAsk.map((p, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">❓ {p.question}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Auto-injected into FAQ &amp; content generation
                </p>
              </div>
            )}

            {/* Related Searches */}
            {step1.serpFeatures.relatedSearches && step1.serpFeatures.relatedSearches.length > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs font-semibold mb-2">Related Searches</p>
                <div className="flex flex-wrap gap-1.5">
                  {step1.serpFeatures.relatedSearches.map((q, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{q}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge Graph */}
            {step1.serpFeatures.knowledgeGraph?.title && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs font-semibold mb-1">Knowledge Graph</p>
                <p className="text-sm font-medium">{step1.serpFeatures.knowledgeGraph.title}</p>
                {step1.serpFeatures.knowledgeGraph.type && (
                  <Badge variant="secondary" className="text-[10px] mt-1">{step1.serpFeatures.knowledgeGraph.type}</Badge>
                )}
                {step1.serpFeatures.knowledgeGraph.description && (
                  <p className="text-xs text-muted-foreground mt-1">{step1.serpFeatures.knowledgeGraph.description}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Competitor Results Table */}
        {step1 && step1.competitors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Competitors</h3>
              <div className="flex items-center gap-2">
                <Badge variant="default">{step1.competitors.filter(c => c.selected).length} selected</Badge>
                <Badge variant="outline">{step1.competitors.length} total</Badge>
                <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setStep1(step1.competitors.map(c => ({ ...c, selected: true })), step1.serpFeatures)}>Select All</Button>
                <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => setStep1(step1.competitors.map(c => ({ ...c, selected: false })), step1.serpFeatures)}>Deselect All</Button>
              </div>
            </div>
            <div className="space-y-2">
              {step1.competitors.map((comp, idx) => {
                const domain = extractDomain(comp.url);
                const valid = isValidUrl(comp.url);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      comp.selected
                        ? 'bg-primary/5 border-primary/30 shadow-sm'
                        : 'bg-muted/20 border-muted opacity-60'
                    }`}
                    onClick={() => toggleCompetitor(idx)}
                  >
                    <Badge variant={comp.selected ? 'default' : 'outline'} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full p-0">
                      {comp.position}
                    </Badge>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                      alt=""
                      className="w-5 h-5 rounded shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {comp.title && <p className="font-medium text-sm truncate">{comp.title}</p>}
                        {valid ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] text-primary/70 font-medium" dir="ltr">{domain}</p>
                        {(() => {
                          const strength = (step1.serpFeatures?.competitorStrength as { domain: string; domainType: string }[] | undefined)?.find(s => s.domain === comp.domain);
                          if (!strength) return null;
                          const typeColors: Record<string, string> = {
                            authority: 'bg-red-100 text-red-700', blog: 'bg-gray-100 text-gray-600',
                            ecommerce: 'bg-purple-100 text-purple-700', forum: 'bg-orange-100 text-orange-700',
                            news: 'bg-blue-100 text-blue-700', social: 'bg-pink-100 text-pink-700',
                          };
                          return <span className={`text-[8px] px-1 py-0.5 rounded ${typeColors[strength.domainType] || 'bg-gray-100 text-gray-600'}`}>{strength.domainType}</span>;
                        })()}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{comp.url}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <Switch checked={comp.selected} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

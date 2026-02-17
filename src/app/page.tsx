'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Copy, BarChart3, Search, Brain, FileText } from "lucide-react";
import { STEPS_META } from "@/types/pipeline";
import { usePipelineStore } from "@/store/pipeline-store";
import { listProjects, deleteProject, type ProjectSummary } from '@/lib/firebase';
import { toast } from 'sonner';

// Components
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ProjectList } from '@/components/dashboard/ProjectList';
import { LocalProjectCard } from '@/components/dashboard/LocalProjectCard';
import { BulkProjectCreator } from '@/components/dashboard/BulkProjectCreator';

export default function Home() {
  const router = useRouter();
  const keyword = usePipelineStore(s => s.keyword);
  const location = usePipelineStore(s => s.location);
  const clientMeta = usePipelineStore(s => s.clientMeta);
  const currentStep = usePipelineStore(s => s.currentStep);
  const resetPipeline = usePipelineStore(s => s.resetPipeline);
  const cloneProject = usePipelineStore(s => s.cloneProject);

  const [cloudProjects, setCloudProjects] = useState<ProjectSummary[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const hasSaved = !!keyword;

  useEffect(() => {
    async function fetchProjects() {
      setLoadingCloud(true);
      try {
        const projects = await listProjects();
        setCloudProjects(projects);
      } catch {
        // Firebase not configured — silently skip
      } finally {
        setLoadingCloud(false);
      }
    }
    fetchProjects();
  }, []);

  const handleDelete = () => {
    resetPipeline();
    toast.success('Local project deleted');
  };

  const handleDeleteCloud = async (id: string) => {
    try {
      await deleteProject(id);
      setCloudProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const handleClone = () => {
    const newKw = prompt('Enter the new keyword:');
    if (!newKw?.trim()) return;
    const newId = cloneProject(newKw.trim());
    toast.success(`Project cloned → ${newKw.trim()}`);
    router.push(`/project/${newId}`);
  };

  const completedSteps = (() => {
    const state = usePipelineStore.getState();
    let count = 0;
    for (let i = 1; i <= 13; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((state as any)[`step${i}`]) count++;
    }
    return count;
  })();

  // S6: Stats
  const stats = useMemo(() => {
    const uniqueDomains = new Set(cloudProjects.map(p => p.domain).filter(Boolean));
    const total = cloudProjects.length + (hasSaved ? 1 : 0);
    const completed = cloudProjects.filter(p => p.currentStep >= 13).length + (completedSteps === 13 ? 1 : 0);
    const sites = uniqueDomains.size;
    return { total, completed, sites };
  }, [cloudProjects, hasSaved, completedSteps]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SEO Content System</h1>
              <p className="text-xs text-muted-foreground">SEO Content Writing System — SaaS</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-8">

          <DashboardStats stats={stats} />

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <Link
              href="/project/new"
              className="inline-flex items-center gap-3 px-8 py-3 bg-primary text-primary-foreground rounded-xl text-base font-semibold hover:opacity-90 transition-opacity"
            >
              New Project
              <ArrowLeft className="w-5 h-5" />
            </Link>
            {hasSaved && (
              <Button variant="outline" className="gap-2" onClick={handleClone}>
                <Copy className="w-4 h-4" />
                Clone Current Project
              </Button>
            )}
            {hasSaved && (
              <Button variant="outline" className="gap-2" onClick={() => setShowBulk(!showBulk)}>
                <BarChart3 className="w-4 h-4" />
                Bulk Projects
              </Button>
            )}
          </div>

          {showBulk && hasSaved && (
            <BulkProjectCreator
              onClone={cloneProject}
              onClose={() => setShowBulk(false)}
            />
          )}

          {hasSaved && (
            <LocalProjectCard
              keyword={keyword}
              clientMeta={clientMeta}
              location={location}
              currentStep={currentStep}
              completedSteps={completedSteps}
              onDelete={handleDelete}
            />
          )}

          <ProjectList
            projects={cloudProjects}
            loading={loadingCloud}
            onDelete={handleDeleteCloud}
          />

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border bg-card space-y-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Search className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-semibold text-lg">Competitor Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Analyze top 10 Google competitors for any keyword in 50+ countries worldwide
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card space-y-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-semibold text-lg">Multi-Site Management</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Manage multiple clients and sites with separate projects — each with its own domain and settings
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-card space-y-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg">Professional Content</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate comprehensive SEO articles with Schema + White-Label Export per client
              </p>
            </div>
          </div>

          {/* Pipeline Steps Overview */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-center">The 13-Step Pipeline</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STEPS_META.map(step => (
                <div key={step.number} className="p-3 rounded-lg border bg-card/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                    {step.number}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{step.titleAr}</p>
                    <p className="text-[10px] text-muted-foreground">{step.titleEn}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

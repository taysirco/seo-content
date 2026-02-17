'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usePipelineStore } from '@/store/pipeline-store';
import { ProjectShell } from '@/components/pipeline/ProjectShell';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProjectByIdPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { loadFromCloud, setProjectId } = usePipelineStore();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const currentProjectId = usePipelineStore.getState().projectId;
        if (currentProjectId === projectId && usePipelineStore.getState().keyword) {
          setLoading(false);
          return;
        }
        const loaded = await loadFromCloud(projectId);
        if (!loaded) {
          setProjectId(projectId);
        }
      } catch {
        setLoadError('Failed to load project');
      } finally {
        setLoading(false);
      }
    }
    if (projectId) load();
  }, [projectId, loadFromCloud, setProjectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading project...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-destructive text-lg">{loadError}</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <ProjectShell />;
}

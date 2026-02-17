'use client';

import { useEffect } from 'react';
import { usePipelineStore } from '@/store/pipeline-store';
import { ProjectShell } from '@/components/pipeline/ProjectShell';

export default function ProjectNewPage() {
  useEffect(() => {
    if (!usePipelineStore.getState().projectId) {
      usePipelineStore.getState().setProjectId(crypto.randomUUID());
    }
  }, []);

  return <ProjectShell />;
}

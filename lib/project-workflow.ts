import type { Project, ProjectStatus, ProjectSummary, ProjectWorkflow, RenderJob } from './types';

export const PROJECT_STEP_COUNT = 5;

type ProjectWithOptionalWorkflow = Omit<Project, 'workflow'> & {
  workflow?: Partial<ProjectWorkflow> | null;
};

function clampStep(step: number): number {
  if (!Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(PROJECT_STEP_COUNT - 1, Math.round(step)));
}

function latestRenderJob(jobs: RenderJob[]): RenderJob | undefined {
  return jobs.reduce<RenderJob | undefined>((latest, job) => {
    if (!latest) return job;
    return job.updatedAt > latest.updatedAt ? job : latest;
  }, undefined);
}

export function deriveProjectStatus(project: ProjectWithOptionalWorkflow, jobs: RenderJob[] = []): ProjectStatus {
  const latestJob = latestRenderJob(jobs);
  if (latestJob?.status === 'queued' || latestJob?.status === 'rendering') return 'rendering';
  if (latestJob?.status === 'completed') return 'completed';
  if (latestJob?.status === 'failed') return 'render-failed';
  if (project.schema?.scenes?.length) return 'preview-ready';
  if (project.script?.length) return 'script-ready';
  if (project.outline?.length) return 'outline-ready';
  return 'draft';
}

export function deriveResumeStep(project: ProjectWithOptionalWorkflow, jobs: RenderJob[] = []): number {
  const savedStep = project.workflow?.currentStep;
  if (typeof savedStep === 'number' && Number.isFinite(savedStep)) return clampStep(savedStep);

  const status = deriveProjectStatus(project, jobs);
  if (status === 'completed' || status === 'rendering' || status === 'render-failed') return 4;
  if (status === 'preview-ready') return 3;
  if (status === 'script-ready') return 2;
  if (status === 'outline-ready') return 1;
  return 0;
}

export function normalizeProjectWorkflow(
  project: ProjectWithOptionalWorkflow,
  jobs: RenderJob[] = []
): ProjectWorkflow {
  return {
    currentStep: deriveResumeStep(project, jobs),
    lastVisitedAt: project.workflow?.lastVisitedAt || project.updatedAt || project.createdAt,
  };
}

export function withProjectStep(project: Project, currentStep: number, visitedAt = new Date().toISOString()): Project {
  return {
    ...project,
    workflow: {
      currentStep: clampStep(currentStep),
      lastVisitedAt: visitedAt,
    },
  };
}

export function getProjectProgress(
  project: ProjectWithOptionalWorkflow,
  jobs: RenderJob[] = []
): Pick<ProjectSummary, 'status' | 'progress' | 'completedStages' | 'totalStages' | 'renderProgress'> {
  const status = deriveProjectStatus(project, jobs);
  const latestJob = latestRenderJob(jobs);
  const baseByStatus: Record<ProjectStatus, { progress: number; completedStages: number }> = {
    draft: { progress: 20, completedStages: 1 },
    'outline-ready': { progress: 40, completedStages: 2 },
    'script-ready': { progress: 60, completedStages: 3 },
    'preview-ready': { progress: 80, completedStages: 4 },
    rendering: { progress: 80 + Math.round((latestJob?.progress || 0) * 20), completedStages: 4 },
    completed: { progress: 100, completedStages: 5 },
    'render-failed': { progress: 80, completedStages: 4 },
  };
  const base = baseByStatus[status];
  return {
    status,
    progress: Math.max(0, Math.min(100, base.progress)),
    completedStages: base.completedStages,
    totalStages: PROJECT_STEP_COUNT,
    ...(status === 'rendering' ? { renderProgress: latestJob?.progress || 0 } : {}),
  };
}

export function buildProjectSummary(project: ProjectWithOptionalWorkflow, jobs: RenderJob[] = []): ProjectSummary {
  const workflow = normalizeProjectWorkflow(project, jobs);
  return {
    id: project.id,
    topic: project.requirements.topic,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    currentStep: workflow.currentStep,
    ...getProjectProgress(project, jobs),
  };
}

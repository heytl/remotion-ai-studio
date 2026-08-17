'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Article, ArrowLeft, Check, Export, GearSix, ListBullets, MonitorPlay, SlidersHorizontal } from '@phosphor-icons/react';
import { apiGet, apiPut } from '@/lib/api';
import { withProjectStep } from '@/lib/project-workflow';
import { buildSchema } from '@/lib/schema-builder';
import { Project } from '@/lib/types';
import { Brand } from './Brand';
import { OutlineEditor } from './OutlineEditor';
import { PreviewEditor } from './PreviewEditor';
import { Patch, RequirementsForm } from './RequirementsForm';
import { RenderPanel } from './RenderPanel';
import { ScriptEditor } from './ScriptEditor';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ErrorBanner, Spinner } from './ui/feedback';
import { cn } from '@/lib/cn';

const STEPS = [
  { label: '需求', description: '定义目标与格式', icon: SlidersHorizontal },
  { label: '大纲', description: '规划叙事结构', icon: ListBullets },
  { label: '文稿', description: '撰写分镜脚本', icon: Article },
  { label: '预览', description: '调整视觉效果', icon: MonitorPlay },
  { label: '导出', description: '渲染最终视频', icon: Export },
];

const STEP_SLUGS = ['requirements', 'outline', 'script', 'preview', 'export'] as const;

function replaceStepUrl(projectId: string, step: number): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('step', STEP_SLUGS[step]);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function getRequestedStep(): number | null {
  if (typeof window === 'undefined') return null;
  const requested = new URL(window.location.href).searchParams.get('step');
  const index = STEP_SLUGS.findIndex((slug) => slug === requested);
  return index >= 0 ? index : null;
}

export const ProjectEditor: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const projectRef = useRef<Project | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSavesRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGet<{ project: Project }>(`/api/projects/${projectId}`);
        if (mounted) {
          const requestedStep = getRequestedStep();
          const restoredStep = requestedStep ?? data.project.workflow.currentStep;
          const restoredProject = restoredStep === data.project.workflow.currentStep
            ? data.project
            : withProjectStep(data.project, restoredStep);
          projectRef.current = restoredProject;
          setProject(restoredProject);
          setStep(restoredStep);
          replaceStepUrl(projectId, restoredStep);
          if (restoredProject !== data.project) void apiPut(`/api/projects/${projectId}`, restoredProject);
        }
      } catch (e) { if (mounted) setError((e as Error).message); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [projectId]);

  const flushSave = useCallback((nextProject: Project): Promise<void> => {
    pendingSavesRef.current += 1;
    setSaving(true);
    const operation = saveQueueRef.current.then(async () => {
      await apiPut(`/api/projects/${nextProject.id}`, nextProject);
    });
    const settled = operation
      .then(() => setSavedAt(new Date()))
      .catch((e) => setError((e as Error).message))
      .finally(() => {
        pendingSavesRef.current -= 1;
        if (pendingSavesRef.current === 0) setSaving(false);
      });
    saveQueueRef.current = settled;
    return settled;
  }, []);

  const scheduleSave = useCallback((nextProject: Project) => {
    setSaving(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flushSave(nextProject), 700);
  }, [flushSave]);

  const patch: Patch = useCallback((partial) => {
    const previous = projectRef.current;
    if (!previous) return;
    const next = typeof partial === 'function' ? partial(previous) : { ...previous, ...partial };
    projectRef.current = next;
    setProject(next);
    scheduleSave(next);
  }, [scheduleSave]);

  const goToStep = useCallback((nextStep: number) => {
    const current = projectRef.current;
    if (!current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const next = withProjectStep(current, nextStep);
    projectRef.current = next;
    setProject(next);
    setStep(next.workflow.currentStep);
    replaceStepUrl(next.id, next.workflow.currentStep);
    void flushSave(next);
  }, [flushSave]);

  const handleNext = useCallback(() => {
    const current = projectRef.current;
    if (!current) return;
    const nextStep = Math.min(STEPS.length - 1, step + 1);
    let next = current;
    if (step === 2 && current.script.length) {
      next = { ...current, schema: buildSchema(current, current.schema) };
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    next = withProjectStep(next, nextStep);
    projectRef.current = next;
    setProject(next);
    setStep(nextStep);
    replaceStepUrl(next.id, nextStep);
    void flushSave(next);
  }, [step, flushSave]);

  if (loading) return <div className="flex min-h-screen items-center justify-center gap-3 text-sm text-muted-foreground"><Spinner />加载项目工作区…</div>;
  if (!project) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center"><p className="text-red-200">{error || '项目加载失败'}</p><Button asChild variant="outline"><Link href="/"><ArrowLeft className="h-4 w-4" />返回创作空间</Link></Button></div>;

  const completed = [
    Boolean(project.requirements.topic.trim()),
    project.outline.length > 0,
    project.script.length > 0,
    Boolean(project.schema?.scenes.length),
    false,
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 flex min-h-[70px] items-center justify-between gap-4 border-b border-border/15 bg-background/80 px-4 backdrop-blur-2xl sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block" aria-label="返回创作空间"><Brand compact /></Link>
          <span className="hidden h-7 w-px bg-border/15 sm:block" />
          <div className="min-w-0">
            <div className="flex items-center gap-2"><p className="truncate text-sm font-semibold text-foreground sm:text-base">{project.requirements.topic || '未命名项目'}</p><Badge variant="secondary" className="hidden sm:inline-flex">第 {step + 1}/5 步 · {STEPS[step].label}</Badge>{saving ? <span className="hidden text-[11px] text-muted-foreground sm:inline">保存中…</span> : savedAt ? <span className="hidden items-center gap-1 text-[11px] text-emerald-200 sm:inline-flex"><Check className="h-3 w-3" weight="bold" />已保存</span> : null}</div>
            <p className="mt-0.5 hidden text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:block">Project workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link href="/"><ArrowLeft className="h-4 w-4" />首页</Link></Button><Button asChild variant="outline" size="icon-sm"><Link href="/settings" aria-label="系统设置"><GearSix className="h-4 w-4" /></Link></Button></div>
      </header>

      <div className="mx-auto grid w-full min-w-0 max-w-[1580px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-border/15 px-4 py-4 lg:sticky lg:top-[70px] lg:h-[calc(100vh-70px)] lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
          <p className="mb-3 hidden px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70 lg:block">Production flow</p>
          <nav className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible" aria-label="项目步骤">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              return (
                <button key={item.label} onClick={() => goToStep(index)} aria-current={step === index ? 'step' : undefined} className={cn('group flex min-h-12 shrink-0 items-center gap-3 rounded-xl border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full', step === index ? 'border-primary/25 bg-primary/12 text-foreground' : 'border-transparent text-muted-foreground hover:bg-accent/55 hover:text-foreground')}>
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-xs font-bold', step === index ? 'border-primary/25 bg-primary text-white' : completed[index] ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-border/15 bg-secondary/70 text-muted-foreground')}>
                    {completed[index] && step !== index ? <Check className="h-4 w-4" weight="bold" /> : <Icon className="h-4 w-4" weight={step === index ? 'fill' : 'regular'} />}
                  </span>
                  <span><strong className="block whitespace-nowrap text-xs font-semibold lg:text-sm">{index + 1}. {item.label}</strong><span className="mt-0.5 hidden text-[11px] text-muted-foreground lg:block">{item.description}</span></span>
                </button>
              );
            })}
          </nav>
          <div className="mt-auto hidden rounded-2xl border border-border/15 bg-card/55 p-4 lg:block">
            <p className="text-xs font-semibold">项目进度</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-300" style={{ width: `${(completed.filter(Boolean).length / 4) * 100}%` }} /></div>
            <p className="mt-2 text-[11px] text-muted-foreground">已完成 {completed.filter(Boolean).length} / 4 个创作阶段</p>
          </div>
        </aside>

        <main id="main-content" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {error && <div className="mb-5"><ErrorBanner message={error} onClose={() => setError(null)} /></div>}
          {step === 0 && <RequirementsForm project={project} patch={patch} onNext={handleNext} />}
          {step === 1 && <OutlineEditor project={project} patch={patch} onNext={handleNext} />}
          {step === 2 && <ScriptEditor project={project} patch={patch} onNext={handleNext} />}
          {step === 3 && <PreviewEditor project={project} patch={patch} onNext={handleNext} />}
          {step === 4 && <RenderPanel project={project} patch={patch} />}
          {step > 0 && <div className="mt-7 border-t border-border/15 pt-5"><Button variant="ghost" onClick={() => goToStep(step - 1)}><ArrowLeft className="h-4 w-4" />上一步</Button></div>}
        </main>
      </div>
    </div>
  );
};

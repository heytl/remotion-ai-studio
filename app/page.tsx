'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, FilmSlate, MagicWand, MonitorPlay, Stack, Trash, VideoCamera } from '@phosphor-icons/react';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { Project, ProjectStatus, ProjectSummary, Requirements } from '@/lib/types';
import { StudioShell } from '@/components/StudioShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBanner, EmptyState, SuccessBanner } from '@/components/ui/feedback';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';

const STYLES = ['科普', '营销', '故事化', '教程', '产品宣传', 'Vlog'];
const STEP_LABELS = ['需求设置', '大纲编辑', '文稿编辑', '视频预览', '导出视频'];
const STEP_SLUGS = ['requirements', 'outline', 'script', 'preview', 'export'];
const STATUS_META: Record<ProjectStatus, { label: string; variant: 'secondary' | 'default' | 'success' | 'warning' | 'destructive' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  'outline-ready': { label: '大纲完成', variant: 'default' },
  'script-ready': { label: '文稿完成', variant: 'default' },
  'preview-ready': { label: '可预览', variant: 'warning' },
  rendering: { label: '渲染中', variant: 'warning' },
  completed: { label: '已完成', variant: 'success' },
  'render-failed': { label: '渲染失败', variant: 'destructive' },
};

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [form, setForm] = useState<Requirements>({
    topic: '', durationSeconds: 60, style: '科普', audience: '大众', language: '中文', aspectRatio: '16:9',
  });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ projects: ProjectSummary[] }>('/api/projects');
      setProjects(data.projects);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!form.topic.trim()) {
      setError('请填写视频主题后再创建项目');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const data = await apiPost<{ project: Project }>('/api/projects', form);
      router.push(`/project/${data.project.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const removeProject = async (project: ProjectSummary) => {
    const name = project.topic || '未命名项目';
    const confirmed = window.confirm(`确认删除“${name}”吗？\n\n项目内容、渲染记录和已导出视频都会被永久删除，此操作无法撤销。`);
    if (!confirmed) return;
    setDeletingId(project.id);
    setError(null);
    setNotice(null);
    try {
      await apiDelete<{ ok: true; deletedJobs: number; deletedOutputs: number }>(`/api/projects/${project.id}`);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setNotice(`项目“${name}”已删除`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <StudioShell active="home">
      <section className="mb-8 pt-1 sm:mb-10 sm:pt-3" aria-labelledby="home-title">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Good evening, creator</p>
        <h1 id="home-title" className="mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-5xl lg:text-[56px]">
          把一个想法，变成一段<span className="text-gradient">有质感的影片。</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          从主题、大纲到分镜和渲染，在同一个创作空间里完成你的下一支 AI 视频。
        </p>
      </section>

      <ErrorBanner message={error} onClose={() => setError(null)} />
      <SuccessBanner message={notice} onClose={() => setNotice(null)} />

      <Card className="glass-panel studio-grid mt-5 overflow-hidden border-border/25">
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
          <div className="flex min-h-[390px] flex-col p-5 sm:p-7 lg:p-9">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-indigo-200">
                <MagicWand className="h-4 w-4" weight="fill" aria-hidden="true" />
              </span>
              Start with an idea
            </div>

            <Field label="视频主题" required className="mt-6">
              <Input
                className="min-h-14 border-0 bg-transparent px-0 text-xl font-semibold tracking-[-0.025em] shadow-none hover:border-0 focus-visible:border-0 focus-visible:ring-0 sm:text-2xl"
                placeholder="例如：介绍一下 DeepSeek 的技术演进"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && void create()}
                required
              />
            </Field>
            <p className="mt-1 text-xs leading-5 text-muted-foreground/70">描述主题和预期效果，AI 将为你构建完整的叙事结构。</p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="画面比例">
                <NativeSelect value={form.aspectRatio} onChange={(e) => setForm({ ...form, aspectRatio: e.target.value as Requirements['aspectRatio'] })}>
                  <option value="16:9">16:9 横屏</option><option value="9:16">9:16 竖屏</option><option value="1:1">1:1 方形</option>
                </NativeSelect>
              </Field>
              <Field label="目标时长">
                <NativeSelect value={form.durationSeconds} onChange={(e) => setForm({ ...form, durationSeconds: Number(e.target.value) })}>
                  <option value={30}>30 秒</option><option value={60}>1 分钟</option><option value={90}>1 分半</option><option value={180}>3 分钟</option><option value={300}>5 分钟</option>
                </NativeSelect>
              </Field>
              <Field label="视频风格">
                <NativeSelect value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>
                  {STYLES.map((style) => <option key={style}>{style}</option>)}
                </NativeSelect>
              </Field>
              <Field label="语言">
                <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
              </Field>
            </div>

            <div className="mt-auto flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
              <Field label="目标受众" className="flex-1">
                <Input value={form.audience} placeholder="例如：对科技感兴趣的普通观众" onChange={(e) => setForm({ ...form, audience: e.target.value })} />
              </Field>
              <Button size="lg" className="sm:min-w-36" loading={creating} onClick={create}>
                创建项目 <ArrowRight className="h-4 w-4" weight="bold" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="relative grid min-h-[280px] place-items-center overflow-hidden border-t border-border/15 bg-[radial-gradient(circle_at_50%_42%,rgba(113,128,255,.35),transparent_42%),linear-gradient(145deg,rgba(113,128,255,.1),rgba(39,214,233,.04))] lg:min-h-[390px] lg:border-l lg:border-t-0">
            <div className="absolute h-[280px] w-[280px] rounded-full border border-primary/20 shadow-[inset_0_0_70px_rgba(113,128,255,.08),0_0_80px_rgba(62,87,255,.1)]" />
            <div className="absolute h-[190px] w-[190px] animate-[spin_24s_linear_infinite] rounded-full border border-dashed border-cyan-300/25 motion-reduce:animate-none" />
            <div className="absolute h-[76px] w-[230px] -rotate-[17deg] rounded-[50%] border border-cyan-300/35 shadow-[0_0_18px_rgba(39,214,233,.15)]" />
            <div className="relative h-36 w-36 rounded-full bg-[radial-gradient(circle_at_35%_30%,#bdc5ff,#6577fa_34%,#28355d_70%,#12182a)] shadow-[0_0_70px_rgba(113,128,255,.4),inset_-18px_-20px_38px_rgba(8,10,24,.65),inset_12px_10px_24px_rgba(255,255,255,.18)]">
              <span className="absolute inset-0 grid place-items-center"><span className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-background/45 backdrop-blur"><VideoCamera className="h-5 w-5" weight="fill" aria-hidden="true" /></span></span>
            </div>
            <span className="absolute bottom-5 right-5 rounded-lg border border-border/15 bg-background/65 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-foreground/80">00:00:12:18</span>
          </div>
        </div>
      </Card>

      <section className="mt-9" aria-labelledby="recent-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="recent-title" className="text-lg font-semibold tracking-tight">最近创作</h2>
          <Badge variant="secondary">{projects.length} 个项目</Badge>
        </div>

        {projects.length === 0 ? (
          <EmptyState icon={<FilmSlate className="h-6 w-6" aria-hidden="true" />} title="还没有项目" description="从上方输入一个视频主题，创建你的第一支 AI 视频。" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => {
              const status = STATUS_META[project.status];
              const projectHref = `/project/${project.id}?step=${STEP_SLUGS[project.currentStep]}`;
              return (
                <article key={project.id} className="group overflow-hidden rounded-2xl border border-border/15 bg-card/70 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-panel motion-reduce:transition-none">
                  <Link href={projectHref} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`继续编辑${project.topic || '未命名项目'}`}>
                    <div className={`relative h-36 overflow-hidden border-b border-border/15 ${index % 3 === 0 ? 'bg-[radial-gradient(circle_at_72%_30%,#606bd4,transparent_24%),radial-gradient(circle_at_35%_90%,#172450,transparent_48%),#090d18]' : index % 3 === 1 ? 'bg-[repeating-linear-gradient(90deg,transparent_0_36px,rgba(48,219,233,.07)_37px),linear-gradient(135deg,#07101a,#0b2a38)]' : 'bg-[radial-gradient(circle_at_50%_40%,rgba(198,152,255,.52),transparent_18%),linear-gradient(145deg,#140d1e,#241437_60%,#0d0a12)]'}`}>
                      <div className="absolute left-4 top-4"><Badge variant={status.variant}>{status.label}</Badge></div>
                      <div className="absolute inset-x-5 bottom-5 flex items-center gap-2"><span className="h-px flex-1 bg-white/20" /><span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.7)]" /></div>
                    </div>
                    <div className="px-4 pb-3 pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-foreground">{project.topic || '未命名项目'}</h3><p className="mt-1 text-xs text-muted-foreground">更新于 {new Date(project.updatedAt).toLocaleString()}</p></div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                      </div>
                      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground"><span>进度 {project.completedStages}/{project.totalStages}</span><span>{project.progress}%</span></div>
                      <Progress value={project.progress} className="mt-2 h-1.5" />
                    </div>
                  </Link>
                  <div className="flex items-center justify-between gap-3 border-t border-border/10 px-4 py-3">
                    <Button asChild variant="ghost" size="sm" className="min-w-0 justify-start px-0 text-indigo-200 hover:bg-transparent hover:text-indigo-100">
                      <Link href={projectHref}>继续到{STEP_LABELS[project.currentStep]} <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-red-400/10 hover:text-red-200" loading={deletingId === project.id} disabled={Boolean(deletingId && deletingId !== project.id)} onClick={() => void removeProject(project)} aria-label={`删除项目${project.topic || '未命名项目'}`} title="删除项目">
                      <Trash className="h-4 w-4" weight="bold" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-4 grid overflow-hidden rounded-2xl border border-border/15 bg-card/45 sm:grid-cols-3" aria-label="工作区摘要">
        <StudioStat icon={<Stack />} value={String(projects.length)} label="工作区项目" />
        <StudioStat icon={<MonitorPlay />} value="5 stages" label="完整创作流程" className="border-t sm:border-l sm:border-t-0" />
        <StudioStat icon={<Clock />} value="MP4" label="Remotion 原生导出" className="border-t sm:border-l sm:border-t-0" />
      </section>
    </StudioShell>
  );
}

function StudioStat({ icon, value, label, className = '' }: { icon: React.ReactElement; value: string; label: string; className?: string }) {
  return <div className={`flex min-h-24 items-center gap-4 border-border/15 px-5 py-4 ${className}`}><span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-indigo-200 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><strong className="block text-lg font-semibold tabular-nums">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></div></div>;
}

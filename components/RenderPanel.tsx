'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, DownloadSimple, Export, FilmSlate, Queue, SpeakerHigh, WarningCircle } from '@phosphor-icons/react';
import { apiGet, apiPost } from '@/lib/api';
import { Project, RenderJob } from '@/lib/types';
import { formatSeconds } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { EmptyState, ErrorBanner, PageHeading } from './ui/feedback';
import { Progress } from './ui/progress';
import { Patch } from './RequirementsForm';

const STATUS_LABEL: Record<RenderJob['status'], string> = { queued: '排队中', rendering: '渲染中', completed: '已完成', failed: '失败' };

export const RenderPanel: React.FC<{ project: Project; patch: Patch }> = ({ project }) => {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadJobs = useCallback(async () => { try { const data = await apiGet<{ jobs: RenderJob[] }>(`/api/render?projectId=${project.id}`); setJobs(data.jobs); } catch { /* polling can retry */ } }, [project.id]);
  useEffect(() => { void loadJobs(); }, [loadJobs]);
  const hasActive = jobs.some((job) => job.status === 'queued' || job.status === 'rendering');
  useEffect(() => { if (!hasActive) return; const timer = setInterval(() => void loadJobs(), 1000); return () => clearInterval(timer); }, [hasActive, loadJobs]);
  const start = async () => { setStarting(true); setError(null); try { await apiPost<{ job: RenderJob }>('/api/render', { projectId: project.id, schema: project.schema }); await loadJobs(); } catch (e) { setError((e as Error).message); } finally { setStarting(false); } };
  const schema = project.schema;
  const totalSeconds = schema ? schema.scenes.reduce((sum, scene) => sum + (scene.durationSeconds || 0), 0) : 0;
  const hasAudio = schema?.scenes.some((scene) => Boolean(scene.audioDataUrl)) ?? false;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeading eyebrow="Step 05 · Render queue" title="导出最终视频" description="提交 Remotion 服务端渲染任务，并在这里查看实时进度和历史结果。" actions={<Button loading={starting} disabled={!schema || hasActive} onClick={start}><Export className="h-4 w-4" weight="bold" />{hasActive ? '任务进行中' : '开始渲染 MP4'}</Button>} />
      <ErrorBanner message={error} onClose={() => setError(null)} />

      <Card className="overflow-hidden">
        <div className="studio-grid grid gap-5 bg-primary/[0.045] p-5 sm:grid-cols-3 sm:p-6">
          <RenderMetric icon={<Clock />} label="视频时长" value={formatSeconds(totalSeconds)} />
          <RenderMetric icon={<FilmSlate />} label="场景与画幅" value={`${schema?.scenes.length || 0} scenes · ${schema?.aspectRatio || '-'}`} />
          <RenderMetric icon={<SpeakerHigh />} label="音轨状态" value={hasAudio ? '已包含 TTS 配音' : '纯画面与字幕'} />
        </div>
      </Card>

      <section aria-labelledby="render-history">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="render-history" className="text-lg font-semibold">渲染历史</h2><Badge variant="secondary">{jobs.length} 个任务</Badge></div>
        {jobs.length === 0 ? <EmptyState icon={<Queue className="h-6 w-6" />} title="暂无渲染记录" description="完成预览后，点击“开始渲染 MP4”创建第一个任务。" /> : <div className="space-y-3">{jobs.map((job) => <RenderJobCard key={job.id} job={job} />)}</div>}
      </section>
    </div>
  );
};

function RenderMetric({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-indigo-200 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div></div>;
}

function RenderJobCard({ job }: { job: RenderJob }) {
  const variant = job.status === 'completed' ? 'success' : job.status === 'failed' ? 'destructive' : job.status === 'rendering' ? 'default' : 'warning';
  return <Card><CardContent className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${job.status === 'completed' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : job.status === 'failed' ? 'border-red-400/20 bg-red-400/10 text-red-200' : 'border-primary/20 bg-primary/10 text-indigo-200'}`}>{job.status === 'completed' ? <CheckCircle className="h-5 w-5" weight="fill" /> : job.status === 'failed' ? <WarningCircle className="h-5 w-5" weight="fill" /> : <Queue className="h-5 w-5" weight="fill" />}</span><div className="min-w-0"><p className="truncate font-mono text-xs text-foreground">{job.id}</p><p className="mt-1 text-[11px] text-muted-foreground">更新于 {new Date(job.updatedAt).toLocaleString()}</p></div></div><div className="flex items-center gap-2"><Badge variant={variant}>{STATUS_LABEL[job.status]}</Badge>{job.status === 'completed' && <Button asChild size="sm"><a href={`/api/render/${job.id}/download`} download><DownloadSimple className="h-4 w-4" weight="bold" />下载 MP4</a></Button>}</div></div>{(job.status === 'rendering' || job.status === 'queued') && <div className="mt-4"><div className="mb-2 flex justify-between text-[11px] text-muted-foreground"><span>{job.status === 'queued' ? '等待渲染资源' : '正在合成视频'}</span><span className="font-mono">{Math.round(job.progress * 100)}%</span></div><Progress value={job.progress * 100} /></div>}{job.status === 'failed' && job.error && <div className="mt-4 rounded-xl border border-red-400/15 bg-red-400/8 px-3 py-2.5 text-xs leading-5 text-red-200" role="alert">{job.error}</div>}</CardContent></Card>;
}

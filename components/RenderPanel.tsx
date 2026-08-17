'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Project, RenderJob } from '@/lib/types';
import { formatSeconds } from '@/lib/utils';
import { Button, ErrorBanner, ProgressBar } from './ui';
import { Patch } from './RequirementsForm';

const STATUS_LABEL: Record<RenderJob['status'], string> = {
  queued: '排队中',
  rendering: '渲染中',
  completed: '已完成',
  failed: '失败',
};

export const RenderPanel: React.FC<{ project: Project; patch: Patch }> = ({ project, patch }) => {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const data = await apiGet<{ jobs: RenderJob[] }>(`/api/render?projectId=${project.id}`);
      setJobs(data.jobs);
    } catch {
      /* ignore transient poll errors */
    }
  }, [project.id]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const hasActive = jobs.some((j) => j.status === 'queued' || j.status === 'rendering');
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => void loadJobs(), 1000);
    return () => clearInterval(t);
  }, [hasActive, loadJobs]);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await apiPost<{ job: RenderJob }>('/api/render', {
        projectId: project.id,
        schema: project.schema,
      });
      await loadJobs();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const schema = project.schema;
  const totalSeconds = schema ? schema.scenes.reduce((a, s) => a + (s.durationSeconds || 0), 0) : 0;
  const hasAudio = schema?.scenes.some((s) => Boolean(s.audioDataUrl)) ?? false;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">步骤 5 · 导出 MP4</h2>
        <p className="mt-1 text-sm text-slate-400">
          使用 Remotion 服务端渲染。渲染耗时，提交后进入任务队列，实时显示进度。
        </p>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-300">
            <div>
              视频时长：<span className="text-white">{formatSeconds(totalSeconds)}</span>
              {' · '}画面比例：<span className="text-white">{schema?.aspectRatio || '-'}</span>
              {' · '}场景数：<span className="text-white">{schema?.scenes.length || 0}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {hasAudio ? '已包含 TTS 配音音轨' : '未包含配音（纯画面 + 字幕），可在文稿步骤生成配音'}
            </div>
          </div>
          <Button variant="primary" loading={starting} disabled={!schema || hasActive} onClick={start}>
            {hasActive ? '已有任务进行中' : '开始渲染 MP4'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">渲染历史</h3>
        {jobs.length === 0 && (
          <div className="card py-8 text-center text-slate-500">暂无渲染记录</div>
        )}
        {jobs.map((job) => (
          <div key={job.id} className="card space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-slate-400">{job.id}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    job.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : job.status === 'failed'
                        ? 'bg-red-500/20 text-red-300'
                        : job.status === 'rendering'
                          ? 'bg-accent/20 text-accent'
                          : 'bg-slate-500/20 text-slate-300'
                  }`}
                >
                  {STATUS_LABEL[job.status]}
                </span>
                {job.status === 'completed' && (
                  <a
                    className="btn-primary !py-1 text-xs"
                    href={`/api/render/${job.id}/download`}
                    download
                  >
                    ⬇ 下载 MP4
                  </a>
                )}
              </div>
            </div>

            {(job.status === 'rendering' || job.status === 'queued') && (
              <div className="space-y-1">
                <ProgressBar value={job.progress} />
                <div className="text-right text-xs text-slate-400">
                  {Math.round(job.progress * 100)}%
                </div>
              </div>
            )}

            {job.status === 'failed' && job.error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {job.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPut } from '@/lib/api';
import { buildSchema } from '@/lib/schema-builder';
import { Project } from '@/lib/types';
import { OutlineEditor } from './OutlineEditor';
import { PreviewEditor } from './PreviewEditor';
import { Patch, RequirementsForm } from './RequirementsForm';
import { RenderPanel } from './RenderPanel';
import { ScriptEditor } from './ScriptEditor';
import { ErrorBanner, StepBadge } from './ui';

const STEPS = ['需求', '大纲', '文稿', '预览', '导出'];

export const ProjectEditor: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const projectRef = useRef<Project | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGet<{ project: Project }>(`/api/projects/${projectId}`);
        if (mounted) {
          projectRef.current = data.project;
          setProject(data.project);
        }
      } catch (e) {
        if (mounted) setError((e as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [projectId]);

  const flushSave = useCallback(async (p: Project) => {
    try {
      await apiPut(`/api/projects/${p.id}`, p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, []);

  const scheduleSave = useCallback(
    (p: Project) => {
      setSaving(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flushSave(p);
      }, 700);
    },
    [flushSave]
  );

  const patch: Patch = useCallback(
    (partial) => {
      const prev = projectRef.current;
      if (!prev) return;
      const next = typeof partial === 'function' ? partial(prev) : { ...prev, ...partial };
      projectRef.current = next;
      setProject(next);
      scheduleSave(next);
    },
    [scheduleSave]
  );

  const handleNext = useCallback(() => {
    const p = projectRef.current;
    if (!p) return;
    // 离开「文稿」步骤时自动把（可能已编辑的）文稿转换为 Remotion Schema
    if (step === 2 && p.script.length) {
      const next = { ...p, schema: buildSchema(p, p.schema) };
      projectRef.current = next;
      setProject(next);
      void flushSave(next);
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }, [step, flushSave]);

  const handlePrev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-400">加载中…</div>;
  }
  if (!project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="text-red-400">{error || '项目加载失败'}</div>
        <Link href="/" className="text-accent hover:underline">
          ← 返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 transition-colors hover:text-white">
            ← 首页
          </Link>
          <h1 className="truncate text-lg font-semibold text-white">
            {project.requirements.topic || '未命名项目'}
          </h1>
          {saving && <span className="text-xs text-slate-500">保存中…</span>}
        </div>
        <Link href="/settings" className="btn-secondary !py-1.5 text-xs">
          ⚙ 设置
        </Link>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-700/60 bg-panel/60 p-2">
        {STEPS.map((label, i) => (
          <StepBadge
            key={label}
            index={i + 1}
            label={label}
            active={step === i}
            done={step > i}
            onClick={() => setStep(i)}
          />
        ))}
      </nav>

      {error && step !== 0 && (
        <div className="mb-4">
          <ErrorBanner message={error} onClose={() => setError(null)} />
        </div>
      )}

      <main>
        {step === 0 && <RequirementsForm project={project} patch={patch} onNext={handleNext} />}
        {step === 1 && <OutlineEditor project={project} patch={patch} onNext={handleNext} />}
        {step === 2 && <ScriptEditor project={project} patch={patch} onNext={handleNext} />}
        {step === 3 && <PreviewEditor project={project} patch={patch} onNext={handleNext} />}
        {step === 4 && <RenderPanel project={project} patch={patch} />}
      </main>

      {step > 0 && step < 4 && (
        <div className="mt-6 flex justify-start">
          <button className="btn-ghost" onClick={handlePrev}>
            ← 上一步
          </button>
        </div>
      )}
    </div>
  );
};

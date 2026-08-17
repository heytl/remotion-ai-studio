'use client';

import React, { useState } from 'react';
import { apiPost } from '@/lib/api';
import { OutlineScene, Project } from '@/lib/types';
import { parseLines, toLines, uid } from '@/lib/utils';
import { Button, ErrorBanner, Field, Spinner } from './ui';
import { Patch } from './RequirementsForm';

export const OutlineEditor: React.FC<{
  project: Project;
  patch: Patch;
  onNext: () => void;
}> = ({ project, patch, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const scenes = project.outline;

  const updateScene = (index: number, partial: Partial<OutlineScene>) => {
    const next = scenes.slice();
    next[index] = { ...next[index], ...partial };
    patch({ outline: next });
  };

  const moveScene = (from: number, to: number) => {
    if (to < 0 || to >= scenes.length || from === to) return;
    const next = scenes.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    patch({ outline: next });
  };

  const generateAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ outline: OutlineScene[] }>('/api/generate/outline', {
        projectId: project.id,
      });
      patch({ outline: data.outline });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async (index: number) => {
    setRegenerating(index);
    setError(null);
    try {
      const data = await apiPost<{ scene: OutlineScene }>('/api/generate/outline/scene', {
        projectId: project.id,
        sceneIndex: index,
      });
      updateScene(index, data.scene);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">步骤 2 · 视频大纲</h2>
          <p className="mt-1 text-sm text-slate-400">AI 生成结构化大纲，可拖拽排序、编辑文本或重新生成单节。</p>
        </div>
        <Button variant="primary" loading={loading} onClick={generateAll}>
          {scenes.length ? '重新生成全部' : '生成大纲'}
        </Button>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      {loading && scenes.length === 0 && (
        <div className="card flex items-center justify-center gap-3 py-12 text-slate-300">
          <Spinner /> 正在生成大纲，请稍候…
        </div>
      )}

      {!loading && scenes.length === 0 && (
        <div className="card py-12 text-center text-slate-400">
          还没有大纲。点击右上角「生成大纲」开始。
        </div>
      )}

      <div className="space-y-3">
        {scenes.map((scene, i) => (
          <div
            key={scene.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) moveScene(dragIndex, i);
              setDragIndex(null);
            }}
            className={`card space-y-3 ${dragIndex === i ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="cursor-grab text-slate-500" title="拖拽排序">⠿</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                {i + 1}
              </span>
              <input
                className="input flex-1 font-medium"
                value={scene.title}
                onChange={(e) => updateScene(i, { title: e.target.value })}
              />
              <div className="flex items-center gap-1">
                <Button variant="ghost" disabled={i === 0} onClick={() => moveScene(i, i - 1)} title="上移">
                  ↑
                </Button>
                <Button variant="ghost" disabled={i === scenes.length - 1} onClick={() => moveScene(i, i + 1)} title="下移">
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => patch({ outline: scenes.filter((_, idx) => idx !== i) })}
                  title="删除"
                >
                  🗑
                </Button>
              </div>
            </div>

            <Field label="核心要点（每行一条）">
              <textarea
                className="input min-h-[72px]"
                value={toLines(scene.keyPoints)}
                onChange={(e) => updateScene(i, { keyPoints: parseLines(e.target.value) })}
              />
            </Field>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">时长占比</span>
                <input
                  className="input w-20"
                  type="number"
                  min={1}
                  max={100}
                  value={scene.durationShare}
                  onChange={(e) => updateScene(i, { durationShare: Number(e.target.value) || 0 })}
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
              <Button variant="ghost" loading={regenerating === i} onClick={() => regenerate(i)}>
                ↻ 重新生成本节
              </Button>
            </div>
          </div>
        ))}
      </div>

      {scenes.length > 0 && (
        <Button
          onClick={() => {
            const share = Math.max(1, Math.round(100 / (scenes.length + 1)));
            patch({ outline: [...scenes, { id: uid('o_'), title: '新场景', keyPoints: [], durationShare: share }] });
          }}
        >
          + 添加场景
        </Button>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="primary" disabled={!scenes.length} onClick={onNext}>
          保存并进入下一步 →
        </Button>
      </div>
    </div>
  );
};

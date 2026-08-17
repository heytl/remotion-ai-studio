'use client';

import React, { useState } from 'react';
import { apiPost } from '@/lib/api';
import { Project, SceneType, ScriptScene } from '@/lib/types';
import { formatSeconds, parseLines, toLines, uid } from '@/lib/utils';
import { Button, ErrorBanner, Field, Spinner } from './ui';
import { Patch } from './RequirementsForm';

const SCENE_TYPES: Array<{ value: SceneType; label: string }> = [
  { value: 'title', label: '片头标题' },
  { value: 'bullets', label: '要点列表' },
  { value: 'imageText', label: '图文' },
  { value: 'caption', label: '纯字幕' },
  { value: 'transition', label: '转场' },
];

export const ScriptEditor: React.FC<{
  project: Project;
  patch: Patch;
  onNext: () => void;
}> = ({ project, patch, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [ttsIndex, setTtsIndex] = useState<number | null>(null);
  const [ttsAll, setTtsAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scenes = project.script;

  const updateScene = (index: number, partial: Partial<ScriptScene>) => {
    const next = scenes.slice();
    next[index] = { ...next[index], ...partial };
    patch({ script: next });
  };

  const moveScene = (from: number, to: number) => {
    if (to < 0 || to >= scenes.length || from === to) return;
    const next = scenes.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    patch({ script: next });
  };

  const generateAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ script: ScriptScene[] }>('/api/generate/script', {
        projectId: project.id,
      });
      patch({ script: data.script });
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
      const data = await apiPost<{ scene: ScriptScene }>('/api/generate/script/scene', {
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

  const generateTts = async (index: number) => {
    const scene = scenes[index];
    if (!scene.narration.trim()) {
      setError('该场景没有旁白文本，无法生成配音');
      return;
    }
    setTtsIndex(index);
    setError(null);
    try {
      const data = await apiPost<{ audioDataUrl: string }>('/api/tts', { text: scene.narration });
      updateScene(index, { audioDataUrl: data.audioDataUrl });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTtsIndex(null);
    }
  };

  const generateAllTts = async () => {
    setTtsAll(true);
    setError(null);
    try {
      for (let i = 0; i < scenes.length; i++) {
        if (!scenes[i].narration.trim()) continue;
        setTtsIndex(i);
        const data = await apiPost<{ audioDataUrl: string }>('/api/tts', { text: scenes[i].narration });
        updateScene(i, { audioDataUrl: data.audioDataUrl });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTtsIndex(null);
      setTtsAll(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">步骤 3 · 视频文稿（分镜脚本）</h2>
          <p className="mt-1 text-sm text-slate-400">逐场景编辑旁白、画面描述与时长，可单场景重新生成、生成配音。</p>
        </div>
        <div className="flex gap-2">
          {scenes.length > 0 && (
            <Button loading={ttsAll} onClick={generateAllTts} title="为所有场景生成配音（需配置 TTS）">
              🔊 全部配音
            </Button>
          )}
          <Button variant="primary" loading={loading} onClick={generateAll}>
            {scenes.length ? '重新生成全部' : '生成文稿'}
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      {loading && scenes.length === 0 && (
        <div className="card flex items-center justify-center gap-3 py-12 text-slate-300">
          <Spinner /> 正在撰写分镜脚本…
        </div>
      )}

      {!loading && scenes.length === 0 && (
        <div className="card py-12 text-center text-slate-400">
          还没有文稿。点击右上角「生成文稿」开始（需先完成大纲）。
        </div>
      )}

      <div className="space-y-3">
        {scenes.map((scene, i) => (
          <div key={scene.id} className="card space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                {i + 1}
              </span>
              <input
                className="input flex-1 font-medium"
                value={scene.title}
                onChange={(e) => updateScene(i, { title: e.target.value })}
                placeholder="场景标题"
              />
              <span className="whitespace-nowrap text-xs text-slate-500">{formatSeconds(scene.durationSeconds)}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" disabled={i === 0} onClick={() => moveScene(i, i - 1)} title="上移">
                  ↑
                </Button>
                <Button variant="ghost" disabled={i === scenes.length - 1} onClick={() => moveScene(i, i + 1)} title="下移">
                  ↓
                </Button>
                <Button variant="ghost" onClick={() => patch({ script: scenes.filter((_, idx) => idx !== i) })} title="删除">
                  🗑
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="场景类型">
                <select
                  className="input"
                  value={scene.sceneType}
                  onChange={(e) => updateScene(i, { sceneType: e.target.value as SceneType })}
                >
                  {SCENE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="时长（秒）">
                <input
                  className="input"
                  type="number"
                  min={2}
                  value={scene.durationSeconds}
                  onChange={(e) => updateScene(i, { durationSeconds: Math.max(1, Number(e.target.value) || 2) })}
                />
              </Field>
            </div>

            <Field label="旁白 / 字幕">
              <textarea
                className="input min-h-[64px]"
                value={scene.narration}
                onChange={(e) => updateScene(i, { narration: e.target.value })}
              />
            </Field>

            <Field label="画面描述（视觉元素 / 配色 / 动画建议）">
              <textarea
                className="input min-h-[56px]"
                value={scene.visual}
                onChange={(e) => updateScene(i, { visual: e.target.value })}
              />
            </Field>

            <Field label="要点列表（每行一条，用于要点类画面）">
              <textarea
                className="input min-h-[56px]"
                value={toLines(scene.bullets)}
                onChange={(e) => updateScene(i, { bullets: parseLines(e.target.value) })}
              />
            </Field>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                loading={ttsIndex === i}
                disabled={!scene.narration.trim()}
                onClick={() => generateTts(i)}
                title={scene.audioDataUrl ? '已生成配音，点击重新生成' : '生成配音（需配置 TTS）'}
              >
                {scene.audioDataUrl ? '🔊 重新配音' : '🔊 生成配音'}
              </Button>
              <Button variant="ghost" loading={regenerating === i} onClick={() => regenerate(i)}>
                ↻ 重新生成此场景
              </Button>
            </div>
          </div>
        ))}
      </div>

      {scenes.length > 0 && (
        <Button
          onClick={() =>
            patch({
              script: [
                ...scenes,
                {
                  id: uid('s_'),
                  title: '新场景',
                  narration: '',
                  visual: '',
                  bullets: [],
                  durationSeconds: 8,
                  sceneType: 'caption',
                },
              ],
            })
          }
        >
          + 添加场景
        </Button>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="primary" disabled={!scenes.length} onClick={onNext}>
          生成可视化预览 →
        </Button>
      </div>
    </div>
  );
};

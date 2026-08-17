'use client';

import React, { useEffect, useRef, useState } from 'react';
import { type PlayerRef } from '@remotion/player';
import { FONT_OPTIONS, buildSchema, getSceneStartFrame } from '@/lib/schema-builder';
import { Animation, BackgroundType, Project, SceneType, VideoScene } from '@/lib/types';
import { formatSeconds, toLines, parseLines } from '@/lib/utils';
import { PreviewPlayer } from './PreviewPlayer';
import { Button, Field } from './ui';
import { Patch } from './RequirementsForm';

const SCENE_TYPES: Array<{ value: SceneType; label: string }> = [
  { value: 'title', label: '片头标题' },
  { value: 'bullets', label: '要点列表' },
  { value: 'imageText', label: '图文' },
  { value: 'caption', label: '纯字幕' },
  { value: 'transition', label: '转场' },
];

const ANIMATIONS: Array<{ value: Animation; label: string }> = [
  { value: 'fade', label: '淡入' },
  { value: 'slide', label: '上滑' },
  { value: 'zoom', label: '缩放' },
  { value: 'none', label: '无动画' },
];

export const PreviewEditor: React.FC<{
  project: Project;
  patch: Patch;
  onNext: () => void;
}> = ({ project, patch, onNext }) => {
  const playerRef = useRef<PlayerRef | null>(null);
  const [active, setActive] = useState(0);
  const schema = project.schema;

  useEffect(() => {
    setActive(0);
  }, [schema?.id]);

  if (!schema || schema.scenes.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h2 className="text-xl font-semibold text-white">步骤 4 · Remotion 可视化预览</h2>
        <div className="card py-12 text-center text-slate-400">
          还没有可预览的场景。请先完成文稿，或点击下方按钮从现有文稿生成。
        </div>
        <div className="flex justify-center">
          <Button
            variant="primary"
            disabled={!project.script.length}
            onClick={() => patch({ schema: buildSchema(project) })}
          >
            从文稿生成可视化 Schema
          </Button>
        </div>
      </div>
    );
  }

  const updateTheme = (partial: Partial<typeof schema.theme>) =>
    patch({ schema: { ...schema, theme: { ...schema.theme, ...partial } } });

  const updateScene = (index: number, partial: Partial<VideoScene>) => {
    const scenes = schema.scenes.slice();
    scenes[index] = { ...scenes[index], ...partial };
    patch({ schema: { ...schema, scenes } });
  };

  const selectScene = (i: number) => {
    setActive(i);
    const frame = getSceneStartFrame(schema, i);
    playerRef.current?.seekTo(frame);
  };

  const scene = schema.scenes[active];
  const totalSeconds = schema.scenes.reduce((a, s) => a + (s.durationSeconds || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">步骤 4 · Remotion 实时预览</h2>
          <p className="mt-1 text-sm text-slate-400">
            调整下方参数，预览实时热更新。共 {schema.scenes.length} 个场景 / {formatSeconds(totalSeconds)}。
          </p>
        </div>
        <Button variant="primary" onClick={onNext}>
          进入导出 →
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* 播放器 */}
        <div>
          <PreviewPlayer schema={schema} playerRef={playerRef} />
          {/* 场景跳转 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {schema.scenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => selectScene(i)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  i === active
                    ? 'bg-accent text-white'
                    : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {i + 1}. {s.title || s.type}
              </button>
            ))}
          </div>
        </div>

        {/* 控制面板 */}
        <div className="card max-h-[80vh] space-y-4 overflow-y-auto">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white">全局主题</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="字体">
                <select className="input" value={schema.theme.fontFamily} onChange={(e) => updateTheme({ fontFamily: e.target.value })}>
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="标题字号">
                  <input className="input" type="number" min={30} max={160} value={schema.theme.headingSize} onChange={(e) => updateTheme({ headingSize: Number(e.target.value) || 80 })} />
                </Field>
                <Field label="正文字号">
                  <input className="input" type="number" min={20} max={100} value={schema.theme.bodySize} onChange={(e) => updateTheme({ bodySize: Number(e.target.value) || 42 })} />
                </Field>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <ColorField label="主色" value={schema.theme.primaryColor} onChange={(v) => updateTheme({ primaryColor: v })} />
              <ColorField label="强调色" value={schema.theme.accentColor} onChange={(v) => updateTheme({ accentColor: v })} />
              <ColorField label="背景色" value={schema.theme.backgroundColor} onChange={(v) => updateTheme({ backgroundColor: v })} />
              <ColorField label="文字色" value={schema.theme.textColor} onChange={(v) => updateTheme({ textColor: v })} />
            </div>
          </div>

          {scene && (
            <div className="space-y-3 border-t border-slate-700 pt-4">
              <h3 className="text-sm font-semibold text-white">
                场景 {active + 1} · 编辑
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="类型">
                  <select className="input" value={scene.type} onChange={(e) => updateScene(active, { type: e.target.value as SceneType })}>
                    {SCENE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="动画">
                  <select className="input" value={scene.animation} onChange={(e) => updateScene(active, { animation: e.target.value as Animation })}>
                    {ANIMATIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="标题">
                <input className="input" value={scene.title} onChange={(e) => updateScene(active, { title: e.target.value })} />
              </Field>
              <Field label="副标题">
                <input className="input" value={scene.subtitle} onChange={(e) => updateScene(active, { subtitle: e.target.value })} />
              </Field>
              <Field label="旁白 / 字幕">
                <textarea className="input min-h-[56px]" value={scene.narration} onChange={(e) => updateScene(active, { narration: e.target.value })} />
              </Field>
              <Field label="要点（每行一条）">
                <textarea className="input min-h-[56px]" value={toLines(scene.bullets)} onChange={(e) => updateScene(active, { bullets: parseLines(e.target.value) })} />
              </Field>
              <Field label="图片 URL（可选）">
                <input className="input" value={scene.imageUrl} onChange={(e) => updateScene(active, { imageUrl: e.target.value })} />
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 text-xs text-slate-400"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => updateScene(active, { imageUrl: String(reader.result) });
                    reader.readAsDataURL(file);
                  }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="时长（秒）">
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={scene.durationSeconds}
                    onChange={(e) => updateScene(active, { durationSeconds: Math.max(1, Number(e.target.value) || 2) })}
                  />
                </Field>
                <Field label="背景类型">
                  <select className="input" value={scene.backgroundType} onChange={(e) => updateScene(active, { backgroundType: e.target.value as BackgroundType })}>
                    <option value="solid">纯色</option>
                    <option value="gradient">渐变</option>
                  </select>
                </Field>
              </div>

              {scene.backgroundType === 'solid' ? (
                <ColorField label="场景背景色" value={scene.backgroundColor} onChange={(v) => updateScene(active, { backgroundColor: v })} />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="渐变起色" value={scene.gradientFrom} onChange={(v) => updateScene(active, { gradientFrom: v })} />
                  <ColorField label="渐变止色" value={scene.gradientTo} onChange={(v) => updateScene(active, { gradientTo: v })} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input
        type="color"
        className="h-9 w-12 cursor-pointer rounded border border-slate-600 bg-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input className="input flex-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  </Field>
);

'use client';

import React from 'react';
import { Project, Requirements } from '@/lib/types';
import { Button, Field } from './ui';

export type Patch = (partial: Partial<Project> | ((p: Project) => Project)) => void;

const STYLES = ['科普', '营销', '故事化', '教程', '产品宣传', 'Vlog'];
const DURATIONS = [
  { value: 30, label: '30 秒' },
  { value: 60, label: '1 分钟' },
  { value: 90, label: '1 分半' },
  { value: 180, label: '3 分钟' },
  { value: 300, label: '5 分钟' },
];

export const RequirementsForm: React.FC<{
  project: Project;
  patch: Patch;
  onNext: () => void;
}> = ({ project, patch, onNext }) => {
  const r = project.requirements;
  const set = (partial: Partial<Requirements>) => patch({ requirements: { ...r, ...partial } });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">步骤 1 · 需求输入</h2>
        <p className="mt-1 text-sm text-slate-400">填写视频主题与基础参数，后续每一步都可以回来修改。</p>
      </div>

      <Field label="视频主题 *">
        <input
          className="input"
          value={r.topic}
          placeholder="例如：什么是量子计算？3 分钟看懂"
          onChange={(e) => set({ topic: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="目标时长">
          <select className="input" value={r.durationSeconds} onChange={(e) => set({ durationSeconds: Number(e.target.value) })}>
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="画面比例">
          <select className="input" value={r.aspectRatio} onChange={(e) => set({ aspectRatio: e.target.value as Requirements['aspectRatio'] })}>
            <option value="16:9">16:9（横屏）</option>
            <option value="9:16">9:16（竖屏）</option>
            <option value="1:1">1:1（方形）</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="视频风格">
          <select className="input" value={r.style} onChange={(e) => set({ style: e.target.value })}>
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="语言">
          <input className="input" value={r.language} onChange={(e) => set({ language: e.target.value })} />
        </Field>
      </div>

      <Field label="目标受众">
        <input
          className="input"
          value={r.audience}
          placeholder="例如：对科技感兴趣的普通观众"
          onChange={(e) => set({ audience: e.target.value })}
        />
      </Field>

      <div className="flex justify-end pt-2">
        <Button variant="primary" disabled={!r.topic.trim()} onClick={onNext}>
          保存并进入下一步 →
        </Button>
      </div>
    </div>
  );
};

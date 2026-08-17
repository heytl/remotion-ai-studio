'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Project, Requirements } from '@/lib/types';
import { Button, ErrorBanner, Field } from '@/components/ui';

interface ProjectMeta {
  id: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
}

const STYLES = ['科普', '营销', '故事化', '教程', '产品宣传', 'Vlog'];

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [form, setForm] = useState<Requirements>({
    topic: '',
    durationSeconds: 60,
    style: '科普',
    audience: '大众',
    language: '中文',
    aspectRatio: '16:9',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ projects: ProjectMeta[] }>('/api/projects');
      setProjects(data.projects);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!form.topic.trim()) {
      setError('请填写视频主题');
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🎬 AI 视频生成器</h1>
          <p className="mt-1 text-sm text-slate-400">
            需求 → 大纲 → 文稿 → Remotion 预览 → 导出 MP4，全流程可编辑
          </p>
        </div>
        <Link href="/settings" className="btn-secondary">
          ⚙ 设置
        </Link>
      </header>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
        {/* 新建项目 */}
        <div className="card h-fit space-y-4">
          <h2 className="text-lg font-semibold text-white">新建视频项目</h2>
          <Field label="视频主题 *">
            <input
              className="input"
              placeholder="例如：什么是量子计算？"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && void create()}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="时长">
              <select
                className="input"
                value={form.durationSeconds}
                onChange={(e) => setForm({ ...form, durationSeconds: Number(e.target.value) })}
              >
                <option value={30}>30 秒</option>
                <option value={60}>1 分钟</option>
                <option value={90}>1 分半</option>
                <option value={180}>3 分钟</option>
                <option value={300}>5 分钟</option>
              </select>
            </Field>
            <Field label="比例">
              <select
                className="input"
                value={form.aspectRatio}
                onChange={(e) => setForm({ ...form, aspectRatio: e.target.value as Requirements['aspectRatio'] })}
              >
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="风格">
              <select
                className="input"
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value })}
              >
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="语言">
              <input
                className="input"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              />
            </Field>
          </div>
          <Field label="目标受众">
            <input
              className="input"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            />
          </Field>
          <Button variant="primary" className="w-full" loading={creating} onClick={create}>
            创建并开始 →
          </Button>
        </div>

        {/* 项目列表 */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">我的项目</h2>
          {projects.length === 0 && (
            <div className="card py-12 text-center text-slate-500">
              还没有项目，左侧创建一个开始体验。
            </div>
          )}
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="card flex items-center justify-between gap-4 transition-colors hover:border-accent"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-white">{p.topic || '未命名项目'}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  更新于 {new Date(p.updatedAt).toLocaleString()}
                </div>
              </div>
              <span className="shrink-0 text-slate-500">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

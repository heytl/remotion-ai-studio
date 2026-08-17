'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { AppConfig } from '@/lib/types';
import { Button, ErrorBanner, Field, Spinner } from '@/components/ui';

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    apiGet<{ config: AppConfig }>('/api/config')
      .then((d) => setConfig(d.config))
      .catch((e) => setError((e as Error).message));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const d = await apiPut<{ config: AppConfig }>('/api/config', config);
      setConfig(d.config);
      setTestResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!config) return;
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await apiPost<{ ok: boolean; message: string }>('/api/config/test', {
        baseUrl: config.llm.baseUrl,
        apiKey: config.llm.apiKey,
        model: config.llm.model,
      });
      setTestResult(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-slate-400">
        <Spinner /> 加载配置…
      </div>
    );
  }

  const setLlm = (partial: Partial<AppConfig['llm']>) =>
    setConfig({ ...config, llm: { ...config.llm, ...partial } });
  const setTts = (partial: Partial<AppConfig['tts']>) =>
    setConfig({ ...config, tts: { ...config.tts, ...partial } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white">
            ← 首页
          </Link>
          <h1 className="text-xl font-bold text-white">⚙ 设置</h1>
        </div>
        <Button variant="primary" loading={saving} onClick={save}>
          保存配置
        </Button>
      </header>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      <div className="space-y-5">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">大模型（OpenAI 兼容 Chat Completions）</h2>
          <p className="text-xs text-slate-500">
            支持任意 OpenAI 兼容服务（OpenAI / DeepSeek / Moonshot / Qwen / 本地 Ollama 等），修改后无需改代码。
            也可通过环境变量 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 注入（优先级更高）。
          </p>
          <Field label="API Base URL（含 /v1 前缀，视服务商而定）">
            <input className="input" value={config.llm.baseUrl} onChange={(e) => setLlm({ baseUrl: e.target.value })} />
          </Field>
          <Field label="API Key">
            <input
              className="input"
              type="password"
              value={config.llm.apiKey}
              onChange={(e) => setLlm({ apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="模型名称">
              <input className="input" value={config.llm.model} onChange={(e) => setLlm({ model: e.target.value })} />
            </Field>
            <Field label="温度（0-2）">
              <input
                className="input"
                type="number"
                step={0.1}
                min={0}
                max={2}
                value={config.llm.temperature}
                onChange={(e) => setLlm({ temperature: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <Button loading={testing} onClick={test}>
              测试连接
            </Button>
            {testResult && (
              <span className={`text-sm ${testResult.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                {testResult.ok ? '✓ ' : '✗ '}
                {testResult.message}
              </span>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">TTS 语音合成（可选）</h2>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.tts.enabled}
                onChange={(e) => setTts({ enabled: e.target.checked })}
              />
              启用
            </label>
          </div>
          <p className="text-xs text-slate-500">
            基于 OpenAI audio/speech 协议。启用后可在「文稿」步骤为每个场景生成旁白配音并合成进最终视频。
          </p>
          <Field label="TTS Base URL">
            <input className="input" value={config.tts.baseUrl} onChange={(e) => setTts({ baseUrl: e.target.value })} />
          </Field>
          <Field label="TTS API Key">
            <input
              className="input"
              type="password"
              value={config.tts.apiKey}
              onChange={(e) => setTts({ apiKey: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="TTS 模型">
              <input className="input" value={config.tts.model} onChange={(e) => setTts({ model: e.target.value })} />
            </Field>
            <Field label="音色">
              <input className="input" value={config.tts.voice} onChange={(e) => setTts({ voice: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

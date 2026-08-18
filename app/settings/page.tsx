'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, FloppyDisk, Key, MagnifyingGlass, PlugsConnected, Robot, SpeakerHigh, WarningCircle } from '@phosphor-icons/react';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { AppConfig } from '@/lib/types';
import { StudioShell } from '@/components/StudioShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBanner, PageHeading, Spinner } from '@/components/ui/feedback';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingSearch, setTestingSearch] = useState(false);
  const [searchTestResult, setSearchTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    apiGet<{ config: AppConfig }>('/api/config').then((d) => setConfig(d.config)).catch((e) => setError((e as Error).message));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true); setError(null);
    try { const d = await apiPut<{ config: AppConfig }>('/api/config', config); setConfig(d.config); setTestResult(null); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const test = async () => {
    if (!config) return;
    setTesting(true); setTestResult(null); setError(null);
    try {
      setTestResult(await apiPost<{ ok: boolean; message: string }>('/api/config/test', { baseUrl: config.llm.baseUrl, apiKey: config.llm.apiKey, model: config.llm.model }));
    } catch (e) { setError((e as Error).message); }
    finally { setTesting(false); }
  };

  const testSearch = async () => {
    if (!config) return;
    setTestingSearch(true); setSearchTestResult(null); setError(null);
    try {
      setSearchTestResult(await apiPost<{ ok: boolean; message: string }>('/api/config/search-test', { provider: config.search.provider, apiKey: config.search.apiKey, maxResults: config.search.maxResults }));
    } catch (e) { setError((e as Error).message); }
    finally { setTestingSearch(false); }
  };

  if (!config) return <StudioShell active="settings"><div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground"><Spinner />加载配置…</div></StudioShell>;

  const setLlm = (partial: Partial<AppConfig['llm']>) => setConfig({ ...config, llm: { ...config.llm, ...partial } });
  const setTts = (partial: Partial<AppConfig['tts']>) => setConfig({ ...config, tts: { ...config.tts, ...partial } });
  const setSearch = (partial: Partial<AppConfig['search']>) => setConfig({ ...config, search: { ...config.search, ...partial } });

  return (
    <StudioShell active="settings">
      <PageHeading eyebrow="Workspace configuration" title="系统设置" description="连接你的模型服务与语音引擎。配置只保存在当前工作区。" actions={<Button loading={saving} onClick={save}><FloppyDisk className="h-4 w-4" weight="bold" aria-hidden="true" />保存配置</Button>} />
      <div className="mt-6"><ErrorBanner message={error} onClose={() => setError(null)} /></div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="border-b border-border/15">
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-indigo-200"><Robot className="h-5 w-5" weight="fill" aria-hidden="true" /></span><div><CardTitle>大模型服务</CardTitle><CardDescription>兼容 OpenAI Chat Completions 协议，支持 OpenAI、DeepSeek、Qwen、Ollama 等服务。</CardDescription></div></div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5 sm:pt-6">
            <Field label="API Base URL" hint="通常包含 /v1 前缀，具体以服务商文档为准。"><Input value={config.llm.baseUrl} onChange={(e) => setLlm({ baseUrl: e.target.value })} autoComplete="url" /></Field>
            <Field label="API Key"><Input type="password" value={config.llm.apiKey} onChange={(e) => setLlm({ apiKey: e.target.value })} placeholder="sk-..." autoComplete="off" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="模型名称"><Input value={config.llm.model} onChange={(e) => setLlm({ model: e.target.value })} /></Field>
              <Field label="温度（0–2）"><Input type="number" step={0.1} min={0} max={2} value={config.llm.temperature} onChange={(e) => setLlm({ temperature: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex flex-col gap-3 border-t border-border/15 pt-5 sm:flex-row sm:items-center"><Button variant="outline" loading={testing} onClick={test}><PlugsConnected className="h-4 w-4" aria-hidden="true" />测试连接</Button>{testResult && <div className={`flex items-start gap-2 text-sm ${testResult.ok ? 'text-emerald-200' : 'text-red-200'}`} role="status">{testResult.ok ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" /> : <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />}<span>{testResult.message}</span></div>}</div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="border-b border-border/15">
              <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><SpeakerHigh className="h-5 w-5" weight="fill" aria-hidden="true" /></span><div><CardTitle>TTS 语音合成</CardTitle><CardDescription>为场景生成旁白音轨。</CardDescription></div></div><Switch id="tts-enabled" checked={config.tts.enabled} onCheckedChange={(enabled) => setTts({ enabled })} aria-label="启用 TTS 语音合成" /></div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5 sm:pt-6">
              <div className="flex items-center justify-between rounded-xl border border-border/15 bg-background/35 px-3 py-2.5"><Label htmlFor="tts-enabled">启用语音服务</Label><span className={`text-xs font-semibold ${config.tts.enabled ? 'text-emerald-200' : 'text-muted-foreground'}`}>{config.tts.enabled ? '已启用' : '未启用'}</span></div>
              <Field label="TTS Base URL"><Input value={config.tts.baseUrl} disabled={!config.tts.enabled} onChange={(e) => setTts({ baseUrl: e.target.value })} /></Field>
              <Field label="TTS API Key"><Input type="password" value={config.tts.apiKey} disabled={!config.tts.enabled} onChange={(e) => setTts({ apiKey: e.target.value })} autoComplete="off" /></Field>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><Field label="TTS 模型"><Input value={config.tts.model} disabled={!config.tts.enabled} onChange={(e) => setTts({ model: e.target.value })} /></Field><Field label="音色"><Input value={config.tts.voice} disabled={!config.tts.enabled} onChange={(e) => setTts({ voice: e.target.value })} /></Field></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-b border-border/15">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"><MagnifyingGlass className="h-5 w-5" weight="fill" aria-hidden="true" /></span>
                  <div><CardTitle>联网搜索</CardTitle><CardDescription>生成前检索最新资料。</CardDescription></div>
                </div>
                <Switch id="search-enabled" checked={config.search.enabled} onCheckedChange={(enabled) => setSearch({ enabled })} aria-label="启用联网搜索" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5 sm:pt-6">
              <div className="flex items-center justify-between rounded-xl border border-border/15 bg-background/35 px-3 py-2.5"><Label htmlFor="search-enabled">启用搜索服务</Label><span className={`text-xs font-semibold ${config.search.enabled ? 'text-emerald-200' : 'text-muted-foreground'}`}>{config.search.enabled ? '已启用' : '未启用'}</span></div>
              <Field label="搜索服务商"><NativeSelect value={config.search.provider} disabled={!config.search.enabled} onChange={(e) => setSearch({ provider: e.target.value as AppConfig['search']['provider'] })}><option value="tavily">Tavily</option><option value="serper">Serper（Google）</option><option value="bocha">Bocha（博查）</option></NativeSelect></Field>
              <Field label="搜索 API Key"><Input type="password" value={config.search.apiKey} disabled={!config.search.enabled} onChange={(e) => setSearch({ apiKey: e.target.value })} placeholder="tvly-..." autoComplete="off" /></Field>
              <Field label="每次查询结果数（1–10）"><Input type="number" min={1} max={10} value={config.search.maxResults} disabled={!config.search.enabled} onChange={(e) => setSearch({ maxResults: Number(e.target.value) || 5 })} /></Field>
              <div className="flex flex-col gap-3 border-t border-border/15 pt-5 sm:flex-row sm:items-center"><Button variant="outline" loading={testingSearch} disabled={!config.search.apiKey} onClick={testSearch}><PlugsConnected className="h-4 w-4" aria-hidden="true" />测试搜索连接</Button>{searchTestResult && <div className={`flex items-start gap-2 text-sm ${searchTestResult.ok ? 'text-emerald-200' : 'text-red-200'}`} role="status">{searchTestResult.ok ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" /> : <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />}<span>{searchTestResult.message}</span></div>}</div>
            </CardContent>
          </Card>
          <Card className="border-primary/15 bg-primary/[0.045] p-5"><div className="flex gap-3"><Key className="mt-0.5 h-5 w-5 shrink-0 text-indigo-200" weight="fill" aria-hidden="true" /><div><h3 className="text-sm font-semibold">环境变量优先</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">如果配置了 LLM_BASE_URL、LLM_API_KEY 或 LLM_MODEL，运行环境中的值会覆盖此页面。</p></div></div></Card>
        </div>
      </div>
    </StudioShell>
  );
}

'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, ArrowsClockwise, Article, Plus, SpeakerHigh, Sparkle, Trash, Waveform } from '@phosphor-icons/react';
import { apiPost } from '@/lib/api';
import { Project, SceneType, ScriptScene, SourceRef, VisualLayout } from '@/lib/types';
import { getMinimumSceneDuration, VIDEO_LAYOUT_OPTIONS } from '@/lib/video-planner';
import { formatSeconds, parseLines, toLines, uid } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { EmptyState, ErrorBanner, PageHeading, Spinner } from './ui/feedback';
import { Field } from './ui/field';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';
import { Patch } from './RequirementsForm';
import { SourceList } from './SourceList';

const SCENE_TYPES: Array<{ value: SceneType; label: string }> = [
  { value: 'title', label: '片头标题' }, { value: 'bullets', label: '要点列表' }, { value: 'imageText', label: '图文' }, { value: 'caption', label: '纯字幕' }, { value: 'transition', label: '转场' },
];

function getAudioDuration(audioDataUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => reject(new Error('无法读取配音时长'));
    audio.src = audioDataUrl;
  });
}

export const ScriptEditor: React.FC<{ project: Project; patch: Patch; onNext: () => void }> = ({ project, patch, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [ttsIndex, setTtsIndex] = useState<number | null>(null);
  const [ttsAll, setTtsAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scenes = project.script;

  const updateScene = (index: number, partial: Partial<ScriptScene>) => { const next = scenes.slice(); next[index] = { ...next[index], ...partial }; patch({ script: next }); };
  const moveScene = (from: number, to: number) => { if (to < 0 || to >= scenes.length || from === to) return; const next = scenes.slice(); const [item] = next.splice(from, 1); next.splice(to, 0, item); patch({ script: next }); };
  const generateAll = async () => { setLoading(true); setError(null); try { const data = await apiPost<{ script: ScriptScene[]; sources?: SourceRef[] }>('/api/generate/script', { projectId: project.id }); patch({ script: data.script, sources: data.sources || [] }); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } };
  const regenerate = async (index: number) => { setRegenerating(index); setError(null); try { const data = await apiPost<{ scene: ScriptScene }>('/api/generate/script/scene', { projectId: project.id, sceneIndex: index }); updateScene(index, data.scene); } catch (e) { setError((e as Error).message); } finally { setRegenerating(null); } };
  const generateTts = async (index: number) => { const scene = scenes[index]; if (!scene.narration.trim()) { setError('该场景没有旁白文本，无法生成配音'); return; } setTtsIndex(index); setError(null); try { const data = await apiPost<{ audioDataUrl: string }>('/api/tts', { text: scene.narration }); const audioDurationSeconds = await getAudioDuration(data.audioDataUrl); updateScene(index, { audioDataUrl: data.audioDataUrl, audioDurationSeconds, durationSeconds: Math.max(scene.durationSeconds, Math.ceil((audioDurationSeconds + 0.35) * 10) / 10) }); } catch (e) { setError((e as Error).message); } finally { setTtsIndex(null); } };
  const generateAllTts = async () => { setTtsAll(true); setError(null); try { const nextScenes = [...scenes]; for (let index = 0; index < scenes.length; index++) { if (!scenes[index].narration.trim()) continue; setTtsIndex(index); const data = await apiPost<{ audioDataUrl: string }>('/api/tts', { text: scenes[index].narration }); const audioDurationSeconds = await getAudioDuration(data.audioDataUrl); nextScenes[index] = { ...nextScenes[index], audioDataUrl: data.audioDataUrl, audioDurationSeconds, durationSeconds: Math.max(nextScenes[index].durationSeconds, Math.ceil((audioDurationSeconds + 0.35) * 10) / 10) }; patch({ script: [...nextScenes] }); } } catch (e) { setError((e as Error).message); } finally { setTtsIndex(null); setTtsAll(false); } };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeading eyebrow="Step 03 · Storyboard script" title="编写分镜文稿" description="逐场景校准旁白、视觉描述、镜头类型和节奏，并可为每段旁白生成音轨。" actions={<><Button variant="outline" loading={ttsAll} disabled={!scenes.length} onClick={generateAllTts}><SpeakerHigh className="h-4 w-4" weight="fill" />全部配音</Button><Button loading={loading} onClick={generateAll}><Sparkle className="h-4 w-4" weight="fill" />{scenes.length ? '重新生成全部' : '生成文稿'}</Button></>} />
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <SourceList sources={project.sources} />
      {loading && scenes.length === 0 && <Card className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground"><Spinner />正在撰写分镜脚本…</Card>}
      {!loading && scenes.length === 0 && <EmptyState icon={<Article className="h-6 w-6" />} title="还没有分镜文稿" description="完成大纲后，让 AI 为每个场景生成旁白和视觉建议。" action={<Button onClick={generateAll}><Sparkle className="h-4 w-4" weight="fill" />生成文稿</Button>} />}

      <div className="space-y-4">
        {scenes.map((scene, index) => {
          const minimumDuration = getMinimumSceneDuration(scene);
          return (
          <Card key={scene.id}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-bold text-indigo-200">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <Input className="font-semibold" value={scene.title} onChange={(e) => updateScene(index, { title: e.target.value })} placeholder="场景标题" aria-label={`场景 ${index + 1} 标题`} />
                    <div className="flex shrink-0 items-center gap-1"><Badge variant={scene.durationSeconds + 0.05 < minimumDuration ? 'destructive' : 'secondary'} className="min-h-9 rounded-lg font-mono">{formatSeconds(scene.durationSeconds)}</Badge><Button variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => moveScene(index, index - 1)} aria-label={`上移场景 ${index + 1}`}><ArrowUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" disabled={index === scenes.length - 1} onClick={() => moveScene(index, index + 1)} aria-label={`下移场景 ${index + 1}`}><ArrowDown className="h-4 w-4" /></Button><Button variant="destructive" size="icon-sm" onClick={() => patch({ script: scenes.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`删除场景 ${index + 1}`}><Trash className="h-4 w-4" /></Button></div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2"><Field label="场景类型"><NativeSelect value={scene.sceneType} onChange={(e) => updateScene(index, { sceneType: e.target.value as SceneType })}>{SCENE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</NativeSelect></Field><Field label="时长（秒）"><Input type="number" min={2} value={scene.durationSeconds} onChange={(e) => updateScene(index, { durationSeconds: Math.max(1, Number(e.target.value) || 2) })} /></Field></div>
                  <Field label="旁白（预览时自动拆成逐句字幕）"><div><Textarea value={scene.narration} onChange={(e) => updateScene(index, { narration: e.target.value, audioDataUrl: undefined, audioDurationSeconds: undefined })} />{scene.durationSeconds + 0.05 < minimumDuration ? <p className="mt-2 text-xs text-amber-200">按当前字数建议至少 {minimumDuration.toFixed(1)} 秒；生成预览时会自动延长。</p> : null}</div></Field>
                  <Field label="画面描述（视觉元素 / 配色 / 动画建议）"><Textarea className="min-h-20" value={scene.visual} onChange={(e) => updateScene(index, { visual: e.target.value })} /></Field>
                  <Field label="要点列表（每行一条）"><Textarea className="min-h-20" value={toLines(scene.bullets)} onChange={(e) => updateScene(index, { bullets: parseLines(e.target.value) })} /></Field>
                  <details className="rounded-xl border border-border/15 bg-background/25 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-foreground">高级视觉编排</summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="画面版式"><NativeSelect value={scene.visualPlan?.layout || ''} onChange={(e) => updateScene(index, { visualPlan: { ...(scene.visualPlan || {}), layout: e.target.value as VisualLayout } })}><option value="">自动选择</option>{VIDEO_LAYOUT_OPTIONS.map((layout) => <option key={layout.value} value={layout.value}>{layout.label}</option>)}</NativeSelect></Field><Field label="主视觉短句"><Input value={scene.visualPlan?.focusText || ''} onChange={(e) => updateScene(index, { visualPlan: { ...(scene.visualPlan || {}), focusText: e.target.value } })} placeholder="画面中心强调内容" /></Field></div>
                    <Field label="视觉节拍短句（每行一条）"><Textarea className="mt-2 min-h-20" value={toLines((scene.beats || []).map((beat) => beat.displayText))} onChange={(e) => { const lines = parseLines(e.target.value); updateScene(index, { beats: lines.map((displayText, beatIndex) => ({ narration: scene.beats?.[beatIndex]?.narration || '', displayText, visualAction: scene.beats?.[beatIndex]?.visualAction || '突出当前核心概念' })) }); }} /></Field>
                  </details>
                  <div className="flex flex-col gap-2 border-t border-border/15 pt-4 sm:flex-row sm:items-center sm:justify-between"><Button variant="outline" loading={ttsIndex === index} disabled={!scene.narration.trim()} onClick={() => generateTts(index)}><Waveform className="h-4 w-4" />{scene.audioDataUrl ? '重新生成配音' : '生成配音'}</Button><Button variant="ghost" loading={regenerating === index} onClick={() => regenerate(index)}><ArrowsClockwise className="h-4 w-4" />重新生成此场景</Button></div>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {scenes.length > 0 && <div className="flex flex-col justify-between gap-3 sm:flex-row"><Button variant="outline" onClick={() => patch({ script: [...scenes, { id: uid('s_'), title: '新场景', narration: '', visual: '', bullets: [], durationSeconds: 8, sceneType: 'caption' }] })}><Plus className="h-4 w-4" />添加场景</Button><Button onClick={onNext}>生成可视化预览<ArrowRight className="h-4 w-4" weight="bold" /></Button></div>}
    </div>
  );
};

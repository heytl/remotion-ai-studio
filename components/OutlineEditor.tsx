'use client';

import React, { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, ArrowsClockwise, DotsSixVertical, ListBullets, Plus, Sparkle, Trash } from '@phosphor-icons/react';
import { apiPost } from '@/lib/api';
import { OutlineScene, Project, SourceRef } from '@/lib/types';
import { parseLines, toLines, uid } from '@/lib/utils';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { EmptyState, ErrorBanner, PageHeading, Spinner } from './ui/feedback';
import { Field } from './ui/field';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Patch } from './RequirementsForm';
import { SourceList } from './SourceList';
import { cn } from '@/lib/cn';

export const OutlineEditor: React.FC<{ project: Project; patch: Patch; onNext: () => void }> = ({ project, patch, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const scenes = project.outline;

  const updateScene = (index: number, partial: Partial<OutlineScene>) => {
    const next = scenes.slice(); next[index] = { ...next[index], ...partial }; patch({ outline: next });
  };
  const moveScene = (from: number, to: number) => {
    if (to < 0 || to >= scenes.length || from === to) return;
    const next = scenes.slice(); const [item] = next.splice(from, 1); next.splice(to, 0, item); patch({ outline: next });
  };
  const generateAll = async () => {
    setLoading(true); setError(null);
    try { const data = await apiPost<{ outline: OutlineScene[]; sources?: SourceRef[] }>('/api/generate/outline', { projectId: project.id }); patch({ outline: data.outline, sources: data.sources || [] }); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  const regenerate = async (index: number) => {
    setRegenerating(index); setError(null);
    try { const data = await apiPost<{ scene: OutlineScene }>('/api/generate/outline/scene', { projectId: project.id, sceneIndex: index }); updateScene(index, data.scene); }
    catch (e) { setError((e as Error).message); }
    finally { setRegenerating(null); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeading eyebrow="Step 02 · Narrative architecture" title="规划视频大纲" description="生成结构化叙事，再通过排序、时长占比和要点编辑校准故事节奏。" actions={<Button loading={loading} onClick={generateAll}><Sparkle className="h-4 w-4" weight="fill" />{scenes.length ? '重新生成全部' : '生成大纲'}</Button>} />
      <ErrorBanner message={error} onClose={() => setError(null)} />
      <SourceList sources={project.sources} />

      {loading && scenes.length === 0 && <Card className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground"><Spinner />正在构建叙事大纲…</Card>}
      {!loading && scenes.length === 0 && <EmptyState icon={<ListBullets className="h-6 w-6" />} title="还没有大纲" description="AI 会根据创作需求生成结构化场景和时长建议。" action={<Button onClick={generateAll}><Sparkle className="h-4 w-4" weight="fill" />生成大纲</Button>} />}

      <div className="space-y-4">
        {scenes.map((scene, index) => (
          <Card key={scene.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragIndex !== null) moveScene(dragIndex, index); setDragIndex(null); }} className={cn('transition-opacity motion-reduce:transition-none', dragIndex === index && 'opacity-45')}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-2 hidden cursor-grab text-muted-foreground sm:block" title="拖拽排序" aria-hidden="true"><DotsSixVertical className="h-5 w-5" weight="bold" /></span>
                <span className="mt-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-bold text-indigo-200">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <Input className="font-semibold" value={scene.title} onChange={(e) => updateScene(index, { title: e.target.value })} aria-label={`场景 ${index + 1} 标题`} />
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => moveScene(index, index - 1)} aria-label={`上移场景 ${index + 1}`}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon-sm" disabled={index === scenes.length - 1} onClick={() => moveScene(index, index + 1)} aria-label={`下移场景 ${index + 1}`}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="icon-sm" onClick={() => patch({ outline: scenes.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`删除场景 ${index + 1}`}><Trash className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Field label="核心要点（每行一条）"><Textarea value={toLines(scene.keyPoints)} onChange={(e) => updateScene(index, { keyPoints: parseLines(e.target.value) })} /></Field>
                  <div className="flex flex-col gap-3 border-t border-border/15 pt-4 sm:flex-row sm:items-end sm:justify-between">
                    <Field label="时长占比" className="w-full sm:w-32"><Input type="number" min={1} max={100} value={scene.durationShare} onChange={(e) => updateScene(index, { durationShare: Number(e.target.value) || 0 })} /></Field>
                    <Button variant="ghost" loading={regenerating === index} onClick={() => regenerate(index)}><ArrowsClockwise className="h-4 w-4" />重新生成本节</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {scenes.length > 0 && <div className="flex flex-col justify-between gap-3 sm:flex-row"><Button variant="outline" onClick={() => { const share = Math.max(1, Math.round(100 / (scenes.length + 1))); patch({ outline: [...scenes, { id: uid('o_'), title: '新场景', keyPoints: [], durationShare: share }] }); }}><Plus className="h-4 w-4" />添加场景</Button><Button onClick={onNext}>保存并进入文稿<ArrowRight className="h-4 w-4" weight="bold" /></Button></div>}
    </div>
  );
};

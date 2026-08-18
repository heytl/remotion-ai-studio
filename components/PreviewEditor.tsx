'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { type PlayerRef } from '@remotion/player';
import { ArrowRight, CheckCircle, FilmSlate, MonitorPlay, Palette, SlidersHorizontal, WarningCircle } from '@phosphor-icons/react';
import { FONT_OPTIONS, buildSchema, getSceneStartFrame } from '@/lib/schema-builder';
import { Animation, BackgroundType, Project, SceneType, VideoScene, VisualLayout } from '@/lib/types';
import { retimeVideoScene, VIDEO_LAYOUT_OPTIONS } from '@/lib/video-planner';
import { withQualityReport } from '@/lib/video-quality';
import { formatSeconds, parseLines, toLines } from '@/lib/utils';
import { PreviewPlayer } from './PreviewPlayer';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { EmptyState, PageHeading } from './ui/feedback';
import { Field } from './ui/field';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';
import { Patch } from './RequirementsForm';
import { cn } from '@/lib/cn';

const SCENE_TYPES: Array<{ value: SceneType; label: string }> = [{ value: 'title', label: '片头标题' }, { value: 'bullets', label: '要点列表' }, { value: 'imageText', label: '图文' }, { value: 'caption', label: '纯字幕' }, { value: 'transition', label: '转场' }];
const ANIMATIONS: Array<{ value: Animation; label: string }> = [{ value: 'fade', label: '淡入' }, { value: 'slide', label: '上滑' }, { value: 'zoom', label: '缩放' }, { value: 'none', label: '无动画' }];

export const PreviewEditor: React.FC<{ project: Project; patch: Patch; onNext: () => void }> = ({ project, patch, onNext }) => {
  const playerRef = useRef<PlayerRef | null>(null);
  const [active, setActive] = useState(0);
  const schema = project.schema;
  useEffect(() => { setActive(0); }, [schema?.id]);

  if (!schema || schema.scenes.length === 0) {
    return <div className="mx-auto max-w-4xl space-y-6"><PageHeading eyebrow="Step 04 · Visual studio" title="实时预览" description="从分镜文稿生成 Remotion Schema 后，就可以在这里调整视觉参数。" /><EmptyState icon={<MonitorPlay className="h-6 w-6" />} title="还没有可预览的场景" description="请先完成分镜文稿，或从现有文稿重新生成可视化 Schema。" action={<Button disabled={!project.script.length} onClick={() => patch({ schema: buildSchema(project) })}><FilmSlate className="h-4 w-4" weight="fill" />从文稿生成预览</Button>} /></div>;
  }

  const updateTheme = (partial: Partial<typeof schema.theme>) => patch({ schema: withQualityReport({ ...schema, theme: { ...schema.theme, ...partial } }) });
  const updateScene = (index: number, partial: Partial<VideoScene>) => { const scenes = schema.scenes.slice(); scenes[index] = retimeVideoScene({ ...scenes[index], ...partial }, index); patch({ schema: withQualityReport({ ...schema, scenes }) }); };
  const selectScene = (index: number) => { setActive(index); playerRef.current?.seekTo(getSceneStartFrame(schema, index)); };
  const scene = schema.scenes[active];
  const totalSeconds = schema.scenes.reduce((sum, item) => sum + (item.durationSeconds || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeading eyebrow="Step 04 · Visual studio" title="Remotion 实时预览" description={`共 ${schema.scenes.length} 个场景 · ${formatSeconds(totalSeconds)} · ${schema.qualityReport.metrics.totalCaptions} 条逐句字幕，调整参数后播放器会实时更新。`} actions={<Button onClick={onNext}>进入导出<ArrowRight className="h-4 w-4" weight="bold" /></Button>} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="min-w-0 space-y-4">
          <PreviewPlayer schema={schema} playerRef={playerRef} />
          <Card className={schema.qualityReport.score >= 90 ? 'border-emerald-400/20' : 'border-amber-400/20'}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex items-center gap-3">{schema.qualityReport.score >= 90 ? <CheckCircle className="h-6 w-6 text-emerald-300" weight="fill" /> : <WarningCircle className="h-6 w-6 text-amber-300" weight="fill" />}<div><p className="text-sm font-semibold">生成质量 {schema.qualityReport.score} / 100</p><p className="mt-1 text-xs text-muted-foreground">{schema.qualityReport.metrics.totalBeats} 个视觉节拍 · {schema.qualityReport.metrics.layoutVariety} 种版式 · 平均 {schema.qualityReport.metrics.averageVisualElements} 个视觉元素</p></div></div>
              <div className="flex flex-wrap gap-2">{schema.qualityReport.issues.slice(0, 3).map((issue) => <Badge key={`${issue.code}-${issue.sceneId || ''}`} variant={issue.severity === 'error' ? 'destructive' : 'outline'} title={issue.suggestion}>{issue.message}</Badge>)}{schema.qualityReport.issues.length === 0 ? <Badge variant="secondary">全部检查通过</Badge> : null}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b border-border/15 py-4"><div><CardTitle className="text-sm">场景轨道</CardTitle><p className="mt-1 text-xs text-muted-foreground">选择场景并跳转到对应时间点</p></div><Badge variant="secondary" className="font-mono">{formatSeconds(totalSeconds)}</Badge></CardHeader>
            <CardContent className="p-3 sm:p-4"><div className="flex gap-2 overflow-x-auto pb-1">{schema.scenes.map((item, index) => <button key={item.id} onClick={() => selectScene(index)} aria-pressed={active === index} className={cn('group min-w-40 flex-1 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active === index ? 'border-primary/35 bg-primary/12' : 'border-border/15 bg-background/35 hover:border-border/35 hover:bg-accent/50')}><span className="flex items-center justify-between gap-3"><span className={cn('grid h-7 w-7 place-items-center rounded-lg text-[10px] font-bold', active === index ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')}>{String(index + 1).padStart(2, '0')}</span><span className="font-mono text-[10px] text-muted-foreground">{formatSeconds(item.durationSeconds)}</span></span><strong className="mt-3 block truncate text-xs font-semibold text-foreground">{item.title || item.type}</strong></button>)}</div></CardContent>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-[90px] xl:max-h-[calc(100vh-110px)] xl:overflow-y-auto">
          <CardHeader className="border-b border-border/15"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-indigo-200"><SlidersHorizontal className="h-4 w-4" weight="fill" /></span><div><CardTitle>Inspector</CardTitle><p className="mt-1 text-xs text-muted-foreground">主题与场景属性</p></div></div></CardHeader>
          <CardContent className="space-y-6 pt-5">
            <section className="space-y-4" aria-labelledby="theme-settings"><div className="flex items-center gap-2"><Palette className="h-4 w-4 text-indigo-200" weight="fill" /><h3 id="theme-settings" className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">全局主题</h3></div>
              <Field label="字体"><NativeSelect value={schema.theme.fontFamily} onChange={(e) => updateTheme({ fontFamily: e.target.value })}>{FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}</NativeSelect></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="标题字号"><Input type="number" min={30} max={160} value={schema.theme.headingSize} onChange={(e) => updateTheme({ headingSize: Number(e.target.value) || 80 })} /></Field><Field label="正文字号"><Input type="number" min={20} max={100} value={schema.theme.bodySize} onChange={(e) => updateTheme({ bodySize: Number(e.target.value) || 42 })} /></Field></div>
              <div className="grid grid-cols-2 gap-3"><ColorField label="主色" value={schema.theme.primaryColor} onChange={(value) => updateTheme({ primaryColor: value })} /><ColorField label="强调色" value={schema.theme.accentColor} onChange={(value) => updateTheme({ accentColor: value })} /><ColorField label="背景色" value={schema.theme.backgroundColor} onChange={(value) => updateTheme({ backgroundColor: value })} /><ColorField label="文字色" value={schema.theme.textColor} onChange={(value) => updateTheme({ textColor: value })} /></div>
            </section>

            {scene && <section className="space-y-4 border-t border-border/15 pt-5" aria-labelledby="scene-settings"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FilmSlate className="h-4 w-4 text-cyan-200" weight="fill" /><h3 id="scene-settings" className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">场景 {active + 1}</h3></div><Badge variant="outline">{formatSeconds(scene.durationSeconds)}</Badge></div>
              <div className="grid grid-cols-2 gap-3"><Field label="类型"><NativeSelect value={scene.type} onChange={(e) => updateScene(active, { type: e.target.value as SceneType })}>{SCENE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</NativeSelect></Field><Field label="动画"><NativeSelect value={scene.animation} onChange={(e) => updateScene(active, { animation: e.target.value as Animation })}>{ANIMATIONS.map((animation) => <option key={animation.value} value={animation.value}>{animation.label}</option>)}</NativeSelect></Field></div>
              <Field label="画面版式"><NativeSelect value={scene.visualPlan.layout} onChange={(e) => updateScene(active, { visualPlan: { ...scene.visualPlan, layout: e.target.value as VisualLayout } })}>{VIDEO_LAYOUT_OPTIONS.map((layout) => <option key={layout.value} value={layout.value}>{layout.label}</option>)}</NativeSelect></Field>
              <Field label="标题"><Input value={scene.title} onChange={(e) => updateScene(active, { title: e.target.value })} /></Field>
              <Field label="副标题"><Input value={scene.subtitle} onChange={(e) => updateScene(active, { subtitle: e.target.value })} /></Field>
              <Field label="主视觉短句"><Input value={scene.visualPlan.focusText} onChange={(e) => updateScene(active, { visualPlan: { ...scene.visualPlan, focusText: e.target.value } })} /></Field>
              <Field label="旁白（自动重新分句）"><Textarea className="min-h-20" value={scene.narration} onChange={(e) => updateScene(active, { narration: e.target.value })} /></Field>
              <Field label="要点（每行一条）"><Textarea className="min-h-20" value={toLines(scene.bullets)} onChange={(e) => { const bullets = parseLines(e.target.value); updateScene(active, { bullets, visualPlan: { ...scene.visualPlan, elements: bullets.slice(0, 5).map((label, elementIndex) => ({ id: `element-${elementIndex + 1}`, kind: scene.visualPlan.elements[elementIndex]?.kind || 'concept', label, description: '', value: undefined })) } }); }} /></Field>
              <div className="rounded-xl border border-border/15 bg-background/25 p-3"><p className="text-xs font-semibold text-foreground">逐句字幕 · {scene.captions.length} 条</p><div className="mt-2 space-y-1.5">{scene.captions.map((caption) => <div key={caption.id} className="flex items-start gap-2 text-[11px] text-muted-foreground"><span className="shrink-0 font-mono text-indigo-200">{(caption.startMs / 1000).toFixed(1)}s</span><span>{caption.text}</span></div>)}</div></div>
              <Field label="图片 URL"><Input value={scene.imageUrl} onChange={(e) => updateScene(active, { imageUrl: e.target.value })} placeholder="https://..." /></Field>
              <div><Label htmlFor="scene-image-upload">上传图片</Label><Input id="scene-image-upload" type="file" accept="image/*" className="mt-2" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => updateScene(active, { imageUrl: String(reader.result) }); reader.readAsDataURL(file); }} /></div>
              <div className="grid grid-cols-2 gap-3"><Field label="时长（秒）"><Input type="number" min={1} value={scene.durationSeconds} onChange={(e) => updateScene(active, { durationSeconds: Math.max(1, Number(e.target.value) || 2) })} /></Field><Field label="背景类型"><NativeSelect value={scene.backgroundType} onChange={(e) => updateScene(active, { backgroundType: e.target.value as BackgroundType })}><option value="solid">纯色</option><option value="gradient">渐变</option></NativeSelect></Field></div>
              {scene.backgroundType === 'solid' ? <ColorField label="场景背景色" value={scene.backgroundColor} onChange={(value) => updateScene(active, { backgroundColor: value })} /> : <div className="grid grid-cols-2 gap-3"><ColorField label="渐变起色" value={scene.gradientFrom} onChange={(value) => updateScene(active, { gradientFrom: value })} /><ColorField label="渐变止色" value={scene.gradientTo} onChange={(value) => updateScene(active, { gradientTo: value })} /></div>}
            </section>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="flex items-center gap-2"><input id={id} type="color" className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-input/25 bg-background p-1" value={value} onChange={(e) => onChange(e.target.value)} /><Input className="min-w-0 font-mono text-xs" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label}十六进制色值`} /></div></div>;
}

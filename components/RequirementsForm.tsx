'use client';

import React from 'react';
import { ArrowRight, Clock, MagnifyingGlass, Monitor, Palette, UsersThree } from '@phosphor-icons/react';
import { Project, Requirements } from '@/lib/types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PageHeading } from './ui/feedback';
import { Field } from './ui/field';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { Switch } from './ui/switch';

export type Patch = (partial: Partial<Project> | ((project: Project) => Project)) => void;

const STYLES = ['科普', '营销', '故事化', '教程', '产品宣传', 'Vlog'];
const DURATIONS = [{ value: 30, label: '30 秒' }, { value: 60, label: '1 分钟' }, { value: 90, label: '1 分半' }, { value: 180, label: '3 分钟' }, { value: 300, label: '5 分钟' }];

export const RequirementsForm: React.FC<{ project: Project; patch: Patch; onNext: () => void }> = ({ project, patch, onNext }) => {
  const requirements = project.requirements;
  const set = (partial: Partial<Requirements>) => patch({ requirements: { ...requirements, ...partial } });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeading eyebrow="Step 01 · Creative brief" title="定义这支视频" description="先明确主题、受众和输出格式。后续所有 AI 生成结果都会以这些信息为基础。" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader className="border-b border-border/15"><CardTitle>创作需求</CardTitle><CardDescription>所有字段都可以在生成后再次调整。</CardDescription></CardHeader>
          <CardContent className="space-y-5 pt-5 sm:pt-6">
            <Field label="视频主题" hint="使用一句具体、清晰的话描述内容目标。" required><Input value={requirements.topic} placeholder="例如：3 分钟看懂量子计算" onChange={(e) => set({ topic: e.target.value })} required /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="目标时长"><NativeSelect value={requirements.durationSeconds} onChange={(e) => set({ durationSeconds: Number(e.target.value) })}>{DURATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</NativeSelect></Field>
              <Field label="画面比例"><NativeSelect value={requirements.aspectRatio} onChange={(e) => set({ aspectRatio: e.target.value as Requirements['aspectRatio'] })}><option value="16:9">16:9（横屏）</option><option value="9:16">9:16（竖屏）</option><option value="1:1">1:1（方形）</option></NativeSelect></Field>
              <Field label="视频风格"><NativeSelect value={requirements.style} onChange={(e) => set({ style: e.target.value })}>{STYLES.map((style) => <option key={style}>{style}</option>)}</NativeSelect></Field>
              <Field label="语言"><Input value={requirements.language} onChange={(e) => set({ language: e.target.value })} /></Field>
            </div>
            <Field label="目标受众"><Input value={requirements.audience} placeholder="例如：对科技感兴趣的普通观众" onChange={(e) => set({ audience: e.target.value })} /></Field>
            <div className="flex items-center justify-between rounded-xl border border-border/15 bg-background/35 px-3 py-2.5">
              <Label htmlFor="enable-search" className="flex items-center gap-2 text-foreground">
                <MagnifyingGlass className="h-4 w-4 text-indigo-200" weight="fill" aria-hidden="true" />
                生成时联网搜索最新资料
              </Label>
              <Switch id="enable-search" checked={requirements.enableSearch !== false} onCheckedChange={(enabled) => set({ enableSearch: enabled })} aria-label="生成时联网搜索最新资料" />
            </div>
            <div className="flex justify-end border-t border-border/15 pt-5"><Button disabled={!requirements.topic.trim()} onClick={onNext}>保存并进入大纲<ArrowRight className="h-4 w-4" weight="bold" /></Button></div>
          </CardContent>
        </Card>

        <Card className="h-fit overflow-hidden">
          <div className="studio-grid border-b border-border/15 bg-primary/[0.05] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Project signal</p><h3 className="mt-3 text-balance text-xl font-semibold tracking-tight">{requirements.topic || '等待输入视频主题'}</h3></div>
          <CardContent className="space-y-4 pt-5">
            <SummaryItem icon={<Clock />} label="时长" value={`${requirements.durationSeconds} 秒`} />
            <SummaryItem icon={<Monitor />} label="画幅" value={requirements.aspectRatio} />
            <SummaryItem icon={<Palette />} label="风格" value={requirements.style} />
            <SummaryItem icon={<UsersThree />} label="受众" value={requirements.audience || '未设置'} />
            <div className="pt-2"><Badge variant="success"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />自动保存已开启</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function SummaryItem({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/15 bg-secondary/65 text-indigo-200 [&>svg]:h-4 [&>svg]:w-4">{icon}</span><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="truncate text-sm font-medium text-foreground">{value}</p></div></div>;
}

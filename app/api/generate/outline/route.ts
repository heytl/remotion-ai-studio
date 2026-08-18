import { NextRequest, NextResponse } from 'next/server';
import { chatJSON } from '@/lib/llm';
import { outlineSystemPrompt, outlineUserPrompt } from '@/lib/prompts';
import { researchTopic } from '@/lib/search';
import { getProject, saveProject } from '@/lib/store';
import { OutlineScene } from '@/lib/types';
import { isRecord, uid } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { projectId, enableSearch } = (await req.json()) as { projectId: string; enableSearch?: boolean };
    const project = getProject(projectId);
    if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    if (!project.requirements.topic.trim()) {
      return NextResponse.json({ error: '请先填写视频主题' }, { status: 400 });
    }

    // 联网检索最新资料（开关默认打开；未配置搜索服务时自动降级为纯 LLM 生成）
    const research = await researchTopic(
      project.requirements.topic,
      enableSearch ?? project.requirements.enableSearch ?? true
    );

    const data = await chatJSON<{ scenes?: unknown }>(
      [
        { role: 'system', content: outlineSystemPrompt() },
        { role: 'user', content: outlineUserPrompt(project.requirements, research?.context) },
      ],
      { temperature: 0.7 }
    );

    const raw = isRecord(data) && Array.isArray(data.scenes) ? data.scenes : null;
    if (!raw || raw.length === 0) throw new Error('模型未返回有效的场景列表');

    const scenes: OutlineScene[] = raw.map((s, i) => {
      const obj = isRecord(s) ? s : {};
      const keyPoints = Array.isArray(obj.keyPoints)
        ? obj.keyPoints.map((k) => String(k)).filter(Boolean)
        : [];
      return {
        id: uid('o_'),
        title: String(obj.title || `场景 ${i + 1}`),
        keyPoints,
        durationShare: Number(obj.durationShare) || Math.round(100 / raw.length),
      };
    });

    // 归一化时长占比到 100
    const total = scenes.reduce((a, s) => a + s.durationShare, 0) || 1;
    scenes.forEach((s) => {
      s.durationShare = Math.round((s.durationShare / total) * 100);
    });

    project.outline = scenes;
    project.sources = research?.sources || [];
    saveProject(project);
    return NextResponse.json({ outline: scenes, sources: research?.sources || [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

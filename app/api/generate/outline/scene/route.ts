import { NextRequest, NextResponse } from 'next/server';
import { chatJSON } from '@/lib/llm';
import { outlineSceneUserPrompt, outlineSystemPrompt } from '@/lib/prompts';
import { getProject, saveProject } from '@/lib/store';
import { OutlineScene } from '@/lib/types';
import { isRecord } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex } = (await req.json()) as { projectId: string; sceneIndex: number };
    const project = getProject(projectId);
    if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    const current = project.outline[sceneIndex];
    if (!current) return NextResponse.json({ error: '场景不存在' }, { status: 404 });

    const data = await chatJSON<Record<string, unknown>>(
      [
        { role: 'system', content: outlineSystemPrompt() },
        { role: 'user', content: outlineSceneUserPrompt(project.requirements, current) },
      ],
      { temperature: 0.8 }
    );

    if (!isRecord(data)) throw new Error('模型返回格式错误');
    const regenerated: OutlineScene = {
      ...current,
      title: String(data.title || current.title),
      keyPoints: Array.isArray(data.keyPoints)
        ? data.keyPoints.map((k) => String(k)).filter(Boolean)
        : current.keyPoints,
      durationShare: Number(data.durationShare) || current.durationShare,
    };

    project.outline[sceneIndex] = regenerated;
    saveProject(project);
    return NextResponse.json({ scene: regenerated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

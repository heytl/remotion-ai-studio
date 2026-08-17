import { NextRequest, NextResponse } from 'next/server';
import { chatJSON } from '@/lib/llm';
import { scriptSceneUserPrompt, scriptSystemPrompt } from '@/lib/prompts';
import { getProject, saveProject } from '@/lib/store';
import { SceneType } from '@/lib/types';
import { isRecord } from '@/lib/utils';

const VALID_TYPES: SceneType[] = ['title', 'bullets', 'imageText', 'caption', 'transition'];

export async function POST(req: NextRequest) {
  try {
    const { projectId, sceneIndex } = (await req.json()) as { projectId: string; sceneIndex: number };
    const project = getProject(projectId);
    if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    const current = project.script[sceneIndex];
    if (!current) return NextResponse.json({ error: '场景不存在' }, { status: 404 });
    const outlineTitle = project.outline[sceneIndex]?.title || current.title;

    const data = await chatJSON<Record<string, unknown>>(
      [
        { role: 'system', content: scriptSystemPrompt() },
        { role: 'user', content: scriptSceneUserPrompt(project.requirements, current, outlineTitle) },
      ],
      { temperature: 0.8 }
    );

    if (!isRecord(data)) throw new Error('模型返回格式错误');
    const rawType = String(data.sceneType || current.sceneType);
    const sceneType = VALID_TYPES.includes(rawType as SceneType)
      ? (rawType as SceneType)
      : current.sceneType;

    const regenerated = {
      ...current,
      title: String(data.title || current.title),
      narration: String(data.narration || current.narration),
      visual: String(data.visual || current.visual),
      bullets: Array.isArray(data.bullets)
        ? data.bullets.map((b) => String(b)).filter(Boolean)
        : current.bullets,
      durationSeconds: Math.max(2, Math.round(Number(data.durationSeconds) || current.durationSeconds)),
      sceneType,
      // 重新生成后旁白可能变化，丢弃旧配音
      audioDataUrl: undefined,
    };

    project.script[sceneIndex] = regenerated;
    saveProject(project);
    return NextResponse.json({ scene: regenerated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

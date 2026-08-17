import { NextRequest, NextResponse } from 'next/server';
import { chatJSON } from '@/lib/llm';
import { scriptSystemPrompt, scriptUserPrompt } from '@/lib/prompts';
import { getProject, saveProject } from '@/lib/store';
import { SceneType, ScriptScene } from '@/lib/types';
import { isRecord, uid } from '@/lib/utils';

const VALID_TYPES: SceneType[] = ['title', 'bullets', 'imageText', 'caption', 'transition'];

function parseScene(obj: Record<string, unknown>, index: number): ScriptScene {
  const rawType = String(obj.sceneType || (index === 0 ? 'title' : 'caption'));
  const sceneType = VALID_TYPES.includes(rawType as SceneType)
    ? (rawType as SceneType)
    : index === 0
      ? 'title'
      : 'caption';
  return {
    id: uid('s_'),
    title: String(obj.title || ''),
    narration: String(obj.narration || ''),
    visual: String(obj.visual || ''),
    bullets: Array.isArray(obj.bullets) ? obj.bullets.map((b) => String(b)).filter(Boolean) : [],
    durationSeconds: Math.max(2, Math.round(Number(obj.durationSeconds) || 8)),
    sceneType,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { projectId } = (await req.json()) as { projectId: string };
    const project = getProject(projectId);
    if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    if (!project.outline.length) {
      return NextResponse.json({ error: '请先生成大纲' }, { status: 400 });
    }

    const data = await chatJSON<{ scenes?: unknown }>(
      [
        { role: 'system', content: scriptSystemPrompt() },
        { role: 'user', content: scriptUserPrompt(project.requirements, project.outline) },
      ],
      { temperature: 0.75 }
    );

    const raw = isRecord(data) && Array.isArray(data.scenes) ? data.scenes : null;
    if (!raw || raw.length === 0) throw new Error('模型未返回有效的文稿场景');

    const scenes = raw.map((s, i) => parseScene(isRecord(s) ? s : {}, i));

    // 按目标时长等比缩放各场景时长
    const target = Math.max(10, project.requirements.durationSeconds || 60);
    const total = scenes.reduce((a, s) => a + s.durationSeconds, 0) || 1;
    let acc = 0;
    scenes.forEach((s, i) => {
      if (i === scenes.length - 1) {
        s.durationSeconds = Math.max(2, target - acc);
      } else {
        s.durationSeconds = Math.max(2, Math.round((s.durationSeconds / total) * target));
        acc += s.durationSeconds;
      }
    });

    project.script = scenes;
    saveProject(project);
    return NextResponse.json({ script: scenes });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

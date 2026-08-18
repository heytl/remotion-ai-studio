import { NextRequest, NextResponse } from 'next/server';
import { chatJSON } from '@/lib/llm';
import { scriptSystemPrompt, scriptUserPrompt } from '@/lib/prompts';
import { researchTopic } from '@/lib/search';
import { getProject, saveProject } from '@/lib/store';
import { SceneType, ScriptScene } from '@/lib/types';
import { isRecord, uid } from '@/lib/utils';
import { allocateSceneDurations, normalizeScriptScene } from '@/lib/video-planner';

const VALID_TYPES: SceneType[] = ['title', 'bullets', 'imageText', 'caption', 'transition'];

function parseScene(obj: Record<string, unknown>, index: number): ScriptScene {
  const rawType = String(obj.sceneType || (index === 0 ? 'title' : 'caption'));
  const sceneType = VALID_TYPES.includes(rawType as SceneType)
    ? (rawType as SceneType)
    : index === 0
      ? 'title'
      : 'caption';
  return normalizeScriptScene({
    id: uid('s_'),
    title: String(obj.title || ''),
    narration: String(obj.narration || ''),
    visual: String(obj.visual || ''),
    bullets: Array.isArray(obj.bullets) ? obj.bullets.map((b) => String(b)).filter(Boolean) : [],
    durationSeconds: Math.max(2, Math.round(Number(obj.durationSeconds) || 8)),
    sceneType,
    beats: Array.isArray(obj.beats) ? (obj.beats as ScriptScene['beats']) : undefined,
    visualPlan: isRecord(obj.visualPlan) ? obj.visualPlan : undefined,
  }, index);
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, enableSearch } = (await req.json()) as { projectId: string; enableSearch?: boolean };
    const project = getProject(projectId);
    if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    if (!project.outline.length) {
      return NextResponse.json({ error: '请先生成大纲' }, { status: 400 });
    }

    // 联网检索最新资料（开关默认打开；未配置搜索服务时自动降级为纯 LLM 生成）
    const research = await researchTopic(
      project.requirements.topic,
      enableSearch ?? project.requirements.enableSearch ?? true
    );

    const data = await chatJSON<{ scenes?: unknown }>(
      [
        { role: 'system', content: scriptSystemPrompt() },
        { role: 'user', content: scriptUserPrompt(project.requirements, project.outline, research?.context) },
      ],
      { temperature: 0.75 }
    );

    const raw = isRecord(data) && Array.isArray(data.scenes) ? data.scenes : null;
    if (!raw || raw.length === 0) throw new Error('模型未返回有效的文稿场景');

    const parsed = raw.map((s, i) => parseScene(isRecord(s) ? s : {}, i));
    // 目标时长足够时按权重分配；不足时自动延长，避免旁白或配音被截断。
    const scenes = allocateSceneDurations(parsed, Math.max(10, project.requirements.durationSeconds || 60));

    project.script = scenes;
    project.sources = research?.sources || [];
    saveProject(project);
    return NextResponse.json({ script: scenes, sources: research?.sources || [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

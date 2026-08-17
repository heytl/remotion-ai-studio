// ============ 提示词模板 ============

import { OutlineScene, Requirements, ScriptScene } from './types';

export function outlineSystemPrompt(): string {
  return [
    '你是一名专业的视频策划与导演。根据用户给出的需求，规划视频的结构化大纲。',
    '要求：',
    '1. 大纲包含若干个"章节/场景"，覆盖视频从开头到结尾的完整叙事。',
    '2. 每个场景包含：标题(title)、核心要点(keyPoints，字符串数组)、时长占比(durationShare，整数百分比)。',
    '3. 所有场景的 durationShare 之和应约等于 100。',
    '4. 场景数量根据目标时长合理分配（通常 4-10 个）。',
    '5. 严格只输出 JSON，不要输出任何解释文字。输出格式：',
    '{"scenes":[{"title":"章节标题","keyPoints":["要点1","要点2"],"durationShare":25}]}',
  ].join('\n');
}

export function outlineUserPrompt(req: Requirements): string {
  return [
    '请为以下视频需求生成大纲：',
    JSON.stringify(
      {
        topic: req.topic,
        durationSeconds: req.durationSeconds,
        style: req.style,
        audience: req.audience,
        language: req.language,
        aspectRatio: req.aspectRatio,
      },
      null,
      2
    ),
    '请输出 JSON。',
  ].join('\n');
}

export function outlineSceneUserPrompt(req: Requirements, current: OutlineScene): string {
  return [
    '请为以下视频需求，重新生成其中某一个场景的大纲（保持原场景标题风格与整体连贯性）：',
    JSON.stringify({ requirements: req, currentScene: current }, null, 2),
    '只输出一个场景对象的 JSON，格式：{"title":"...","keyPoints":["..."],"durationShare":数字}',
  ].join('\n');
}

export function scriptSystemPrompt(): string {
  return [
    '你是一名专业的视频分镜脚本撰写人。基于大纲，为每个场景撰写详细的视频文稿（分镜脚本）。',
    '要求：',
    '1. 每个场景输出：标题(title)、旁白/字幕全文(narration)、画面描述(visual，包含视觉元素/建议配色/动画建议)、',
    '   要点列表(bullets，字符串数组，供要点类画面使用)、时长(durationSeconds，秒)、场景类型(sceneType)。',
    '2. sceneType 取值：title(片头)、bullets(要点列表)、imageText(图文)、caption(纯字幕/口播)。',
    '   第一个场景的 sceneType 必须为 "title"，其余场景根据内容合理选择。',
    '3. narration 应口语化、适合朗读与字幕展示，语言与用户要求一致。',
    '4. visual 描述画面构图、颜色、氛围与动画建议。',
    '5. 各场景 durationSeconds 之和应接近用户目标时长。',
    '6. 严格只输出 JSON，不要输出任何解释文字。输出格式：',
    '{"scenes":[{"title":"...","narration":"...","visual":"...","bullets":["..."],"durationSeconds":10,"sceneType":"bullets"}]}',
  ].join('\n');
}

export function scriptUserPrompt(
  req: Requirements,
  outline: OutlineScene[]
): string {
  return [
    '请为以下大纲撰写逐场景视频文稿：',
    JSON.stringify(
      {
        requirements: req,
        outline: outline.map((o) => ({
          title: o.title,
          keyPoints: o.keyPoints,
          durationShare: o.durationShare,
        })),
      },
      null,
      2
    ),
    '请输出 JSON。',
  ].join('\n');
}

export function scriptSceneUserPrompt(
  req: Requirements,
  scene: ScriptScene,
  outlineTitle: string
): string {
  return [
    '请为以下视频，重新生成其中某一个场景的文稿（分镜脚本），保持整体风格一致：',
    JSON.stringify(
      {
        requirements: req,
        outlineTitle,
        currentScene: {
          title: scene.title,
          narration: scene.narration,
          visual: scene.visual,
          sceneType: scene.sceneType,
          durationSeconds: scene.durationSeconds,
        },
      },
      null,
      2
    ),
    '只输出一个场景对象的 JSON，格式：{"title":"...","narration":"...","visual":"...","bullets":["..."],"durationSeconds":数字,"sceneType":"bullets|imageText|caption|title"}',
  ].join('\n');
}

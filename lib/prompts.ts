// ============ 提示词模板 ============

import { OutlineScene, Requirements, ScriptScene } from './types';

export function outlineSystemPrompt(): string {
  return [
    '你是一名专业的视频策划与导演。根据用户给出的需求，规划视频的结构化大纲。',
    '要求：',
    '1. 大纲包含若干个"章节/场景"，覆盖视频从开头到结尾的完整叙事。',
    '2. 每个场景包含：标题(title)、核心要点(keyPoints，字符串数组)、时长占比(durationShare，整数百分比)。',
    '3. 所有场景的 durationShare 之和应约等于 100。',
    '4. 场景数量根据目标时长合理分配：30 秒约 5-7 个，60 秒约 7-10 个，90 秒约 10-14 个；避免单个场景超过 9 秒。',
    '5. 每个场景只承载一个核心观点；相邻场景应形成清晰的提问、解释、例证、对比或总结关系。',
    '6. 严格只输出 JSON，不要输出任何解释文字。输出格式：',
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
    '你是一名专业的视频导演、信息设计师和分镜脚本撰写人。基于大纲生成可直接执行的结构化视频分镜。',
    '要求：',
    '1. 每个场景输出 title、narration、visual、bullets、durationSeconds、sceneType、beats、visualPlan。',
    '2. sceneType 取值：title、bullets、imageText、caption、transition。第一个必须为 title；普通场景控制在 4-8 秒。',
    '3. narration 是口语化配音稿。中文按每秒约 4 个汉字控制总字数，英文按每秒约 2.5 个词控制，禁止把几十字塞进 5 秒。',
    '4. beats 为 2-5 个语义节拍；每项包含 narration、displayText、visualAction。所有 beat.narration 顺序连接后应覆盖 narration。',
    '5. displayText 是画面短文案，不是字幕：中文 4-14 字、英文 2-8 词，禁止复制整句旁白。',
    '6. bullets 为 2-4 个短要点，每项中文不超过 18 字；画面上不能出现长段落。',
    '7. visualPlan.layout 取值：hero、split、cards、timeline、comparison、diagram。连续场景不要重复同一版式。',
    '8. visualPlan 包含 focusText、supportingText、motionPreset、elements。motionPreset 取 calm、explain、flow、compare、energetic。',
    '9. elements 为 2-5 个可直接渲染的信息元素，每项包含 kind、label、description、value；kind 取 concept、metric、step、comparison、quote。',
    '10. visualAction 必须描述与当前旁白同步的有意义变化，例如高亮、连线、数值增长或步骤推进，不要只写“淡入”。',
    '11. 各场景 durationSeconds 之和接近目标时长，片头不超过 5 秒，结尾不超过 6 秒。',
    '12. 严格只输出 JSON，不要解释。输出格式：',
    '{"scenes":[{"title":"...","narration":"...","visual":"...","bullets":["..."],"durationSeconds":7,"sceneType":"bullets","beats":[{"narration":"...","displayText":"...","visualAction":"..."}],"visualPlan":{"layout":"cards","focusText":"...","supportingText":"...","motionPreset":"explain","elements":[{"kind":"concept","label":"...","description":"...","value":""}]}}]}',
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
          beats: scene.beats,
          visualPlan: scene.visualPlan,
          sceneType: scene.sceneType,
          durationSeconds: scene.durationSeconds,
        },
      },
      null,
      2
    ),
    '沿用系统要求的 beats 与 visualPlan 结构。只输出一个完整场景对象 JSON，不要解释。',
  ].join('\n');
}

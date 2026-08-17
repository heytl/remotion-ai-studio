// ============ 文稿 → Remotion Schema 的确定性转换 ============
// 该文件为纯函数模块：同时被前端、Remotion 组件、服务端渲染引用。

import {
  AspectRatio,
  Project,
  ScriptScene,
  SceneType,
  VideoSchema,
  VideoScene,
  VideoTheme,
} from './types';
import {
  allocateSceneDurations,
  normalizeScriptScene,
  normalizeVisualPlan,
  retimeVideoScene,
} from './video-planner';
import { withQualityReport } from './video-quality';

export const FPS = 30;

export function getCompositionSize(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16':
      return { width: 1080, height: 1920 };
    case '1:1':
      return { width: 1080, height: 1080 };
    default:
      return { width: 1920, height: 1080 };
  }
}

export const defaultTheme: VideoTheme = {
  primaryColor: '#1e293b',
  accentColor: '#6366f1',
  backgroundColor: '#0b1020',
  textColor: '#f8fafc',
  fontFamily: 'sans-serif',
  headingSize: 80,
  bodySize: 42,
  surfaceColor: 'rgba(15, 23, 42, 0.78)',
  mutedTextColor: '#cbd5e1',
  captionBackgroundColor: 'rgba(2, 6, 23, 0.88)',
  captionTextColor: '#f8fafc',
};

export const FONT_OPTIONS = [
  { value: 'sans-serif', label: '无衬线 (sans-serif)' },
  { value: 'serif', label: '衬线 (serif)' },
  { value: 'monospace', label: '等宽 (monospace)' },
  { value: "'Noto Sans SC', sans-serif", label: 'Noto Sans SC（黑体）' },
  { value: "'Noto Serif SC', serif", label: 'Noto Serif SC（宋体）' },
  { value: "'Microsoft YaHei', 'PingFang SC', sans-serif", label: '微软雅黑 / 苹方' },
];

export function normalizeSceneType(index: number, suggested?: SceneType): SceneType {
  if (index === 0) return 'title';
  if (
    suggested === 'bullets' ||
    suggested === 'imageText' ||
    suggested === 'caption' ||
    suggested === 'transition'
  ) {
    return suggested;
  }
  return 'caption';
}

function scriptToVideoScene(
  scene: ScriptScene,
  index: number,
  theme: VideoTheme,
  projectTitle: string
): VideoScene {
  const normalized = normalizeScriptScene(scene, index);
  const type = normalizeSceneType(index, normalized.sceneType);
  const isFirst = index === 0;
  const base: VideoScene = {
    id: normalized.id,
    type,
    title: isFirst ? projectTitle : normalized.title || '',
    subtitle: isFirst ? normalized.title || '' : '',
    bullets: normalized.bullets,
    narration: normalized.narration,
    imageUrl: '',
    audioDataUrl: normalized.audioDataUrl,
    audioDurationSeconds: normalized.audioDurationSeconds,
    durationSeconds: Math.max(2, normalized.durationSeconds || 5),
    animation: isFirst ? 'fade' : 'slide',
    backgroundType: index % 2 === 0 ? 'gradient' : 'solid',
    backgroundColor: theme.backgroundColor,
    gradientFrom: theme.primaryColor,
    gradientTo: theme.accentColor,
    captions: [],
    beats: [],
    visualPlan: normalizeVisualPlan(normalized.visualPlan, normalized, index),
  };
  return retimeVideoScene(base, index);
}

export function buildSchema(
  project: Pick<Project, 'id' | 'requirements' | 'script'> & { theme?: VideoTheme },
  previous?: VideoSchema | null
): VideoSchema {
  const theme: VideoTheme = { ...defaultTheme, ...(project.theme || previous?.theme || {}) };
  const prevById = new Map((previous?.scenes || []).map((scene) => [scene.id, scene]));
  const timedScript = allocateSceneDurations(project.script, project.requirements.durationSeconds);
  const scenes = timedScript.map((scriptScene, index) => {
    const fresh = scriptToVideoScene(scriptScene, index, theme, project.requirements.topic);
    const previousScene = prevById.get(scriptScene.id);
    if (previousScene) {
      // 保留预览步骤中的自定义项，重新生成文稿时不丢失人工设计。
      fresh.animation = previousScene.animation || fresh.animation;
      fresh.backgroundType = previousScene.backgroundType || fresh.backgroundType;
      fresh.backgroundColor = previousScene.backgroundColor || fresh.backgroundColor;
      fresh.gradientFrom = previousScene.gradientFrom || fresh.gradientFrom;
      fresh.gradientTo = previousScene.gradientTo || fresh.gradientTo;
      fresh.imageUrl = previousScene.imageUrl || fresh.imageUrl;
      fresh.visualPlan = normalizeVisualPlan(
        previousScene.visualPlan,
        normalizeScriptScene(scriptScene, index),
        index
      );
    }
    return retimeVideoScene(fresh, index);
  });

  return withQualityReport({
    schemaVersion: 2,
    id: project.id,
    title: project.requirements.topic,
    aspectRatio: project.requirements.aspectRatio,
    fps: FPS,
    theme,
    scenes,
  });
}

/** 读取旧项目时补齐 v2 字段，不破坏用户已调整的颜色、图片与动画。 */
export function normalizeVideoSchema(schema: VideoSchema): VideoSchema {
  const theme: VideoTheme = { ...defaultTheme, ...(schema.theme || {}) };
  const scenes = (schema.scenes || []).map((scene, index) => {
    const scriptLike: ScriptScene = {
      id: scene.id || `scene-${index + 1}`,
      title: scene.title || '',
      narration: scene.narration || '',
      visual: '',
      bullets: Array.isArray(scene.bullets) ? scene.bullets : [],
      durationSeconds: Math.max(2, Number(scene.durationSeconds) || 5),
      sceneType: normalizeSceneType(index, scene.type),
      beats: Array.isArray(scene.beats) ? scene.beats : undefined,
      visualPlan: scene.visualPlan,
      audioDataUrl: scene.audioDataUrl,
      audioDurationSeconds: scene.audioDurationSeconds,
    };
    const normalizedScript = normalizeScriptScene(scriptLike, index);
    const complete: VideoScene = {
      ...scene,
      id: scriptLike.id,
      type: normalizedScript.sceneType,
      title: scene.title || '',
      subtitle: scene.subtitle || '',
      bullets: normalizedScript.bullets,
      narration: normalizedScript.narration,
      imageUrl: scene.imageUrl || '',
      durationSeconds: scriptLike.durationSeconds,
      animation: scene.animation || (index === 0 ? 'fade' : 'slide'),
      backgroundType: scene.backgroundType || (index % 2 === 0 ? 'gradient' : 'solid'),
      backgroundColor: scene.backgroundColor || theme.backgroundColor,
      gradientFrom: scene.gradientFrom || theme.primaryColor,
      gradientTo: scene.gradientTo || theme.accentColor,
      captions: Array.isArray(scene.captions) ? scene.captions : [],
      beats: Array.isArray(scene.beats) ? scene.beats : [],
      visualPlan: normalizeVisualPlan(scene.visualPlan, normalizedScript, index),
    };
    return retimeVideoScene(complete, index);
  });

  return withQualityReport({
    ...schema,
    schemaVersion: 2,
    theme,
    scenes,
  });
}

/** 用于 Remotion Composition 默认 props 的示例 Schema */
export function defaultSchema(): VideoSchema {
  const script: ScriptScene[] = [
    {
      id: 'demo-1',
      title: '让每个观点都被看见',
      narration: '把复杂内容，变成清晰、有节奏的动态视频。',
      visual: '科技感主视觉',
      bullets: ['逐句字幕', '动态版式', '质量检查'],
      durationSeconds: 3,
      sceneType: 'title',
    },
    {
      id: 'demo-2',
      title: '核心亮点',
      bullets: ['Schema 驱动', '实时预览与热更新', '一键导出 MP4'],
      narration: '每一句旁白都有独立字幕，每一个观点都有对应的视觉变化。',
      visual: '三张信息卡依次出现',
      durationSeconds: 4,
      sceneType: 'bullets',
    },
    {
      id: 'demo-3',
      title: '从主题到成片',
      bullets: ['输入主题', '生成分镜', '验证画面'],
      narration: '输入主题，自动生成大纲、文稿、视觉节拍与可验证的成片。',
      visual: '流程时间轴',
      durationSeconds: 3,
      sceneType: 'caption',
    },
  ];
  return buildSchema({
    id: 'demo',
    requirements: {
      topic: 'Remotion AI Studio',
      durationSeconds: 10,
      style: '科技科普',
      audience: '大众',
      language: '中文',
      aspectRatio: '16:9',
    },
    script,
  });
}

export function getDurationInFrames(schema: VideoSchema): number {
  return schema.scenes.reduce(
    (total, scene) => total + Math.max(1, Math.round((scene.durationSeconds || 0) * schema.fps)),
    0
  );
}

export function getComposition(schema: VideoSchema): {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
} {
  const { width, height } = getCompositionSize(schema.aspectRatio);
  return {
    width,
    height,
    fps: schema.fps,
    durationInFrames: getDurationInFrames(schema),
  };
}

/** 计算某个场景在时间轴上的起始帧（用于预览跳转） */
export function getSceneStartFrame(schema: VideoSchema, sceneIndex: number): number {
  let frame = 0;
  for (let index = 0; index < sceneIndex && index < schema.scenes.length; index += 1) {
    frame += Math.max(1, Math.round((schema.scenes[index].durationSeconds || 0) * schema.fps));
  }
  return frame;
}

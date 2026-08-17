// ============ 文稿 → Remotion Schema 的确定性转换 ============
// 该文件为纯函数模块：同时被前端（预览）、Remotion 组件、服务端渲染引用，
// 因此只允许相对导入，不允许使用 @/ 别名。

import {
  AspectRatio,
  Project,
  ScriptScene,
  SceneType,
  VideoSchema,
  VideoScene,
  VideoTheme,
} from './types';

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
  if (suggested === 'bullets' || suggested === 'imageText' || suggested === 'caption' || suggested === 'transition') {
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
  const type = normalizeSceneType(index, scene.sceneType);
  const isFirst = index === 0;
  return {
    id: scene.id,
    type,
    title: isFirst ? projectTitle : scene.title || '',
    subtitle: isFirst ? scene.title || scene.narration || '' : '',
    bullets: Array.isArray(scene.bullets) ? scene.bullets.filter((b) => b && b.trim()) : [],
    narration: scene.narration || '',
    imageUrl: '',
    audioDataUrl: scene.audioDataUrl,
    durationSeconds: Math.max(2, Math.round(scene.durationSeconds || 5)),
    animation: isFirst ? 'fade' : 'slide',
    backgroundType: index % 2 === 0 ? 'gradient' : 'solid',
    backgroundColor: theme.backgroundColor,
    gradientFrom: theme.primaryColor,
    gradientTo: theme.accentColor,
  };
}

export function buildSchema(
  project: Pick<Project, 'id' | 'requirements' | 'script'> & { theme?: VideoTheme },
  previous?: VideoSchema | null
): VideoSchema {
  const theme: VideoTheme = { ...defaultTheme, ...(project.theme || previous?.theme || {}) };
  const prevById = new Map((previous?.scenes || []).map((s) => [s.id, s]));
  const scenes = project.script.map((s, i) => {
    const fresh = scriptToVideoScene(s, i, theme, project.requirements.topic);
    const prev = prevById.get(s.id);
    if (prev) {
      // 保留预览步骤中的自定义项（动画/背景/图片），避免重新生成文稿后丢失
      fresh.animation = prev.animation;
      fresh.backgroundType = prev.backgroundType;
      fresh.backgroundColor = prev.backgroundColor;
      fresh.gradientFrom = prev.gradientFrom;
      fresh.gradientTo = prev.gradientTo;
      fresh.imageUrl = prev.imageUrl;
    }
    return fresh;
  });
  return {
    id: project.id,
    title: project.requirements.topic,
    aspectRatio: project.requirements.aspectRatio,
    fps: FPS,
    theme,
    scenes,
  };
}

/** 用于 Remotion Composition 默认 props 的示例 Schema */
export function defaultSchema(): VideoSchema {
  return {
    id: 'demo',
    title: '演示视频',
    aspectRatio: '16:9',
    fps: FPS,
    theme: defaultTheme,
    scenes: [
      {
        id: 'demo-1',
        type: 'title',
        title: '演示视频',
        subtitle: '基于 Remotion 的 AI 视频生成',
        bullets: [],
        narration: '',
        imageUrl: '',
        durationSeconds: 3,
        animation: 'fade',
        backgroundType: 'gradient',
        backgroundColor: defaultTheme.backgroundColor,
        gradientFrom: defaultTheme.primaryColor,
        gradientTo: defaultTheme.accentColor,
      },
      {
        id: 'demo-2',
        type: 'bullets',
        title: '核心亮点',
        subtitle: '',
        bullets: ['Schema 驱动，无需为每个视频写代码', '实时预览、热更新', '一键导出 MP4'],
        narration: '这是一个可交互的 Remotion 播放器预览。',
        imageUrl: '',
        durationSeconds: 4,
        animation: 'slide',
        backgroundType: 'solid',
        backgroundColor: '#111827',
        gradientFrom: '#111827',
        gradientTo: '#111827',
      },
      {
        id: 'demo-3',
        type: 'caption',
        title: '',
        subtitle: '',
        bullets: [],
        narration: '输入主题，自动生成大纲、文稿与可视化效果。',
        imageUrl: '',
        durationSeconds: 3,
        animation: 'fade',
        backgroundType: 'solid',
        backgroundColor: '#111827',
        gradientFrom: '#111827',
        gradientTo: '#111827',
      },
    ],
  };
}

export function getDurationInFrames(schema: VideoSchema): number {
  return schema.scenes.reduce(
    (acc, s) => acc + Math.max(1, Math.round((s.durationSeconds || 0) * schema.fps)),
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
  for (let i = 0; i < sceneIndex && i < schema.scenes.length; i++) {
    frame += Math.max(1, Math.round((schema.scenes[i].durationSeconds || 0) * schema.fps));
  }
  return frame;
}

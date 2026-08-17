// ============ 全局共享类型定义 ============
// 注意：此文件被 Next.js 前端、Remotion 组件、服务端渲染共同引用，
// 只允许使用纯类型/接口，不引入任何运行时依赖。

export type AspectRatio = '16:9' | '9:16' | '1:1';

/** 步骤 1：需求输入 */
export interface Requirements {
  topic: string;
  durationSeconds: number; // 目标时长（秒）
  style: string; // 科普 / 营销 / 故事化 / 教程 ...
  audience: string;
  language: string;
  aspectRatio: AspectRatio;
}

/** 步骤 2：大纲 */
export interface OutlineScene {
  id: string;
  title: string;
  keyPoints: string[];
  durationShare: number; // 时长占比（百分比，0-100，总和约 100）
}

/** 步骤 3：文稿（分镜脚本） */
export type SceneType = 'title' | 'bullets' | 'imageText' | 'caption' | 'transition';

export interface ScriptScene {
  id: string;
  title: string;
  narration: string; // 旁白 / 字幕文本
  visual: string; // 画面描述（视觉元素、配色、动画建议）
  bullets: string[]; // 要点列表（bullets 场景使用）
  durationSeconds: number;
  sceneType: SceneType;
  /** 可选：由 TTS 生成的配音（data URL） */
  audioDataUrl?: string;
}

/** 步骤 4/5：Remotion 可视化 Schema（驱动渲染的结构化数据） */
export type Animation = 'fade' | 'slide' | 'zoom' | 'none';
export type BackgroundType = 'solid' | 'gradient';

export interface VideoTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  headingSize: number;
  bodySize: number;
}

export interface VideoScene {
  id: string;
  type: SceneType;
  title: string;
  subtitle: string;
  bullets: string[];
  narration: string;
  imageUrl: string; // http(s) URL 或 data URL
  audioDataUrl?: string;
  durationSeconds: number;
  animation: Animation;
  backgroundType: BackgroundType;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface VideoSchema {
  id: string;
  title: string;
  aspectRatio: AspectRatio;
  fps: number;
  theme: VideoTheme;
  scenes: VideoScene[];
}

/** 项目（持久化到 data/projects/<id>.json） */
export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  requirements: Requirements;
  outline: OutlineScene[];
  script: ScriptScene[];
  schema: VideoSchema | null;
}

/** 大模型 / TTS 配置（持久化到 data/config.json，可用环境变量覆盖） */
export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
}

export interface TtsConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
}

export interface AppConfig {
  llm: LlmConfig;
  tts: TtsConfig;
}

/** 渲染任务 */
export type RenderStatus = 'queued' | 'rendering' | 'completed' | 'failed';

export interface RenderJob {
  id: string;
  projectId: string;
  status: RenderStatus;
  progress: number; // 0-1
  error?: string;
  outputPath?: string;
  createdAt: string;
  updatedAt: string;
}

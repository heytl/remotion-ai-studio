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
  /** 生成大纲/文稿时是否联网检索最新资料（默认开启，未设置时视为开启） */
  enableSearch?: boolean;
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

export type VisualLayout = 'hero' | 'split' | 'cards' | 'timeline' | 'comparison' | 'diagram';
export type MotionPreset = 'calm' | 'explain' | 'flow' | 'compare' | 'energetic';
export type VisualElementKind = 'concept' | 'metric' | 'step' | 'comparison' | 'quote';

/** 供模型生成的语义节拍。渲染时会按旁白长度自动计算时间。 */
export interface ScriptBeat {
  narration: string;
  displayText: string;
  visualAction: string;
}

/** 结构化视觉元素，避免 free-form visual 生成后无法渲染。 */
export interface VisualElement {
  id: string;
  kind: VisualElementKind;
  label: string;
  description: string;
  value?: string;
}

export interface VisualPlan {
  layout: VisualLayout;
  focusText: string;
  supportingText: string;
  motionPreset: MotionPreset;
  elements: VisualElement[];
}

export interface ScriptScene {
  id: string;
  title: string;
  narration: string; // 旁白 / 字幕文本
  visual: string; // 画面描述（视觉元素、配色、动画建议）
  bullets: string[]; // 要点列表（bullets 场景使用）
  durationSeconds: number;
  sceneType: SceneType;
  beats?: ScriptBeat[];
  visualPlan?: Partial<VisualPlan>;
  /** 可选：由 TTS 生成的配音（data URL） */
  audioDataUrl?: string;
  /** 浏览器读取的真实音频时长，用于避免配音被截断。 */
  audioDurationSeconds?: number;
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
  surfaceColor: string;
  mutedTextColor: string;
  captionBackgroundColor: string;
  captionTextColor: string;
}

export interface CaptionCue {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  emphasis: string[];
}

export interface VideoBeat extends ScriptBeat {
  id: string;
  startMs: number;
  endMs: number;
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
  audioDurationSeconds?: number;
  durationSeconds: number;
  animation: Animation;
  backgroundType: BackgroundType;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  captions: CaptionCue[];
  beats: VideoBeat[];
  visualPlan: VisualPlan;
}

export type QualitySeverity = 'info' | 'warning' | 'error';

export interface QualityIssue {
  code: string;
  severity: QualitySeverity;
  sceneId?: string;
  message: string;
  suggestion: string;
}

export interface QualityReport {
  score: number;
  generatedAt: string;
  issues: QualityIssue[];
  metrics: {
    totalScenes: number;
    totalBeats: number;
    totalCaptions: number;
    averageVisualElements: number;
    layoutVariety: number;
  };
}

export interface VideoSchema {
  schemaVersion: 2;
  id: string;
  title: string;
  aspectRatio: AspectRatio;
  fps: number;
  theme: VideoTheme;
  scenes: VideoScene[];
  qualityReport: QualityReport;
}

/** 项目在五步创作流程中的持久化位置。 */
export interface ProjectWorkflow {
  currentStep: number;
  lastVisitedAt: string;
}

export type ProjectStatus =
  | 'draft'
  | 'outline-ready'
  | 'script-ready'
  | 'preview-ready'
  | 'rendering'
  | 'completed'
  | 'render-failed';

/** 项目（持久化到 data/projects/<id>.json） */
export interface Project {
  id: string;
  createdAt: string;
  updatedAt: string;
  requirements: Requirements;
  outline: OutlineScene[];
  script: ScriptScene[];
  schema: VideoSchema | null;
  workflow: ProjectWorkflow;
  /** 最近一次联网检索到的参考来源 */
  sources?: SourceRef[];
}

/** 首页项目管理列表所需的轻量摘要。 */
export interface ProjectSummary {
  id: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  progress: number;
  completedStages: number;
  totalStages: number;
  currentStep: number;
  renderProgress?: number;
}

/** 大模型 / TTS / 搜索配置（持久化到 data/config.json，可用环境变量覆盖） */
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

export type SearchProvider = 'tavily' | 'serper' | 'bocha';

/** 联网搜索配置（生成前检索最新资料用） */
export interface SearchConfig {
  enabled: boolean;
  provider: SearchProvider;
  apiKey: string;
  maxResults: number;
}

export interface AppConfig {
  llm: LlmConfig;
  tts: TtsConfig;
  search: SearchConfig;
}

/** 检索到的参考来源，用于在文稿/大纲中展示与核对 */
export interface SourceRef {
  title: string;
  url: string;
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

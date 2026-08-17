// ============ 轻量 JSON 文件持久化（本地文件系统） ============
// 所有数据落在 ./data 目录（已在 .gitignore 中忽略）。
// 结构：
//   data/config.json          应用配置（大模型 / TTS）
//   data/projects/<id>.json   项目（含大纲、文稿、Schema）
//   data/renders/<jobId>.json 渲染任务
//   data/renders/output/      渲染产物 MP4

import fs from 'fs';
import path from 'path';
import { AppConfig, Project, RenderJob, Requirements } from './types';
import { uid } from './utils';

export const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const RENDERS_DIR = path.join(DATA_DIR, 'renders');
export const OUTPUT_DIR = path.join(RENDERS_DIR, 'output');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

function ensureDirs(): void {
  for (const d of [DATA_DIR, PROJECTS_DIR, RENDERS_DIR, OUTPUT_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }
}
ensureDirs();

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

// ---------------- 配置 ----------------

export const DEFAULT_CONFIG: AppConfig = {
  llm: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
  },
  tts: {
    enabled: false,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'tts-1',
    voice: 'alloy',
  },
};

/** 环境变量覆盖 config.json 中的对应字段 */
function applyEnvOverrides(config: AppConfig): AppConfig {
  const env = process.env;
  const next: AppConfig = JSON.parse(JSON.stringify(config));
  if (env.LLM_BASE_URL) next.llm.baseUrl = env.LLM_BASE_URL;
  if (env.LLM_API_KEY) next.llm.apiKey = env.LLM_API_KEY;
  if (env.LLM_MODEL) next.llm.model = env.LLM_MODEL;
  if (env.LLM_TEMPERATURE) {
    const t = Number(env.LLM_TEMPERATURE);
    if (!Number.isNaN(t)) next.llm.temperature = t;
  }
  if (env.TTS_ENABLED) next.tts.enabled = env.TTS_ENABLED === 'true' || env.TTS_ENABLED === '1';
  if (env.TTS_BASE_URL) next.tts.baseUrl = env.TTS_BASE_URL;
  if (env.TTS_API_KEY) next.tts.apiKey = env.TTS_API_KEY;
  if (env.TTS_MODEL) next.tts.model = env.TTS_MODEL;
  if (env.TTS_VOICE) next.tts.voice = env.TTS_VOICE;
  return next;
}

export function getConfig(): AppConfig {
  const raw = readJson<Partial<AppConfig>>(CONFIG_FILE, {});
  const merged: AppConfig = {
    llm: { ...DEFAULT_CONFIG.llm, ...(raw.llm || {}) },
    tts: { ...DEFAULT_CONFIG.tts, ...(raw.tts || {}) },
  };
  return applyEnvOverrides(merged);
}

/** 保存到文件（不含环境变量覆盖，环境变量运行时仍然优先生效） */
export function saveConfig(config: AppConfig): void {
  writeJson(CONFIG_FILE, config);
}

// ---------------- 项目 ----------------

const DEFAULT_REQUIREMENTS: Requirements = {
  topic: '',
  durationSeconds: 60,
  style: '科普',
  audience: '大众',
  language: '中文',
  aspectRatio: '16:9',
};

export function createProject(requirements: Partial<Requirements>): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: uid('p_'),
    createdAt: now,
    updatedAt: now,
    requirements: { ...DEFAULT_REQUIREMENTS, ...requirements },
    outline: [],
    script: [],
    schema: null,
  };
  saveProject(project);
  return project;
}

export function getProject(id: string): Project | null {
  const p = readJson<Project | null>(path.join(PROJECTS_DIR, `${id}.json`), null);
  if (!p) return null;
  return {
    ...p,
    outline: p.outline || [],
    script: p.script || [],
    schema: p.schema || null,
  };
}

export function saveProject(project: Project): void {
  project.updatedAt = new Date().toISOString();
  writeJson(path.join(PROJECTS_DIR, `${project.id}.json`), project);
}

export function deleteProject(id: string): void {
  const file = path.join(PROJECTS_DIR, `${id}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function listProjects(): Array<{ id: string; topic: string; createdAt: string; updatedAt: string }> {
  const files = fs.existsSync(PROJECTS_DIR) ? fs.readdirSync(PROJECTS_DIR) : [];
  const out: Array<{ id: string; topic: string; createdAt: string; updatedAt: string }> = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const p = readJson<Project | null>(path.join(PROJECTS_DIR, f), null);
    if (p) out.push({ id: p.id, topic: p.requirements.topic, createdAt: p.createdAt, updatedAt: p.updatedAt });
  }
  return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

// ---------------- 渲染任务 ----------------

export function getRenderJob(id: string): RenderJob | null {
  return readJson<RenderJob | null>(path.join(RENDERS_DIR, `${id}.json`), null);
}

export function saveRenderJob(job: RenderJob): void {
  job.updatedAt = new Date().toISOString();
  writeJson(path.join(RENDERS_DIR, `${job.id}.json`), job);
}

export function listRenderJobs(projectId?: string): RenderJob[] {
  const files = fs.existsSync(RENDERS_DIR) ? fs.readdirSync(RENDERS_DIR) : [];
  const out: RenderJob[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const j = readJson<RenderJob | null>(path.join(RENDERS_DIR, f), null);
    if (j && (!projectId || j.projectId === projectId)) out.push(j);
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** 服务重启后，把遗留的 "rendering" 任务标记为失败 */
export function resetStaleRenderJobs(): void {
  for (const j of listRenderJobs()) {
    if (j.status === 'rendering' || j.status === 'queued') {
      j.status = 'failed';
      j.error = '服务重启导致渲染中断，请重新发起渲染';
      saveRenderJob(j);
    }
  }
}

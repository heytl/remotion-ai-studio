// ============ 轻量 JSON 文件持久化（本地文件系统） ============
// 所有数据落在 ./data 目录（已在 .gitignore 中忽略）。
// 结构：
//   data/config.json          应用配置（大模型 / TTS）
//   data/projects/<id>.json   项目（含大纲、文稿、Schema）
//   data/renders/<jobId>.json 渲染任务
//   data/renders/output/      渲染产物 MP4

import fs from 'fs';
import path from 'path';
import { AppConfig, Project, ProjectSummary, RenderJob, Requirements } from './types';
import { uid } from './utils';
import { normalizeVideoSchema } from './schema-builder';
import { buildProjectSummary, normalizeProjectWorkflow } from './project-workflow';

export const DATA_DIR = path.join(process.cwd(), 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const RENDERS_DIR = path.join(DATA_DIR, 'renders');
export const OUTPUT_DIR = path.join(RENDERS_DIR, 'output');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PROJECT_ID_PATTERN = /^p_[A-Za-z0-9_-]+$/;
const RENDER_ID_PATTERN = /^r_[A-Za-z0-9_-]+$/;

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
  search: {
    enabled: false,
    provider: 'tavily',
    apiKey: '',
    maxResults: 5,
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
  if (env.SEARCH_ENABLED) next.search.enabled = env.SEARCH_ENABLED === 'true' || env.SEARCH_ENABLED === '1';
  if (env.SEARCH_PROVIDER === 'tavily' || env.SEARCH_PROVIDER === 'serper') next.search.provider = env.SEARCH_PROVIDER;
  if (env.SEARCH_API_KEY) next.search.apiKey = env.SEARCH_API_KEY;
  if (env.SEARCH_MAX_RESULTS) {
    const n = Number(env.SEARCH_MAX_RESULTS);
    if (!Number.isNaN(n)) next.search.maxResults = n;
  }
  return next;
}

export function getConfig(): AppConfig {
  const raw = readJson<Partial<AppConfig>>(CONFIG_FILE, {});
  const merged: AppConfig = {
    llm: { ...DEFAULT_CONFIG.llm, ...(raw.llm || {}) },
    tts: { ...DEFAULT_CONFIG.tts, ...(raw.tts || {}) },
    search: { ...DEFAULT_CONFIG.search, ...(raw.search || {}) },
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
  enableSearch: true,
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
    workflow: { currentStep: 0, lastVisitedAt: now },
  };
  saveProject(project);
  return project;
}

export function getProject(id: string): Project | null {
  if (!PROJECT_ID_PATTERN.test(id)) return null;
  const p = readJson<Project | null>(path.join(PROJECTS_DIR, `${id}.json`), null);
  if (!p) return null;
  return {
    ...p,
    requirements: { ...DEFAULT_REQUIREMENTS, ...p.requirements },
    outline: p.outline || [],
    script: p.script || [],
    schema: p.schema ? normalizeVideoSchema(p.schema) : null,
    workflow: normalizeProjectWorkflow(p, listRenderJobs(id)),
  };
}

export function saveProject(project: Project): void {
  if (!PROJECT_ID_PATTERN.test(project.id)) throw new Error('项目 ID 无效');
  project.updatedAt = new Date().toISOString();
  project.workflow = normalizeProjectWorkflow(project, listRenderJobs(project.id));
  writeJson(path.join(PROJECTS_DIR, `${project.id}.json`), project);
}

export interface ProjectDeletionResult {
  deletedJobs: number;
  deletedOutputs: number;
}

function isInsideOutputDirectory(file: string): boolean {
  const relative = path.relative(OUTPUT_DIR, path.resolve(file));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/** 删除项目以及只属于该项目的渲染记录和导出文件。 */
export function deleteProject(id: string): ProjectDeletionResult | null {
  if (!PROJECT_ID_PATTERN.test(id)) return null;
  const file = path.join(PROJECTS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;

  let deletedJobs = 0;
  let deletedOutputs = 0;
  for (const job of listRenderJobs(id)) {
    if (!RENDER_ID_PATTERN.test(job.id)) continue;
    const outputCandidates = new Set([
      path.join(OUTPUT_DIR, `${job.id}.mp4`),
      ...(job.outputPath ? [job.outputPath] : []),
    ]);
    for (const output of outputCandidates) {
      if (isInsideOutputDirectory(output) && fs.existsSync(output)) {
        fs.unlinkSync(output);
        deletedOutputs += 1;
      }
    }
    const jobFile = path.join(RENDERS_DIR, `${job.id}.json`);
    if (fs.existsSync(jobFile)) {
      fs.unlinkSync(jobFile);
      deletedJobs += 1;
    }
  }

  fs.unlinkSync(file);
  return { deletedJobs, deletedOutputs };
}

export function listProjects(): ProjectSummary[] {
  const files = fs.existsSync(PROJECTS_DIR) ? fs.readdirSync(PROJECTS_DIR) : [];
  const jobsByProject = new Map<string, RenderJob[]>();
  for (const job of listRenderJobs()) {
    jobsByProject.set(job.projectId, [...(jobsByProject.get(job.projectId) || []), job]);
  }
  const out: ProjectSummary[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const p = readJson<Project | null>(path.join(PROJECTS_DIR, f), null);
    if (p && PROJECT_ID_PATTERN.test(p.id)) out.push(buildProjectSummary(p, jobsByProject.get(p.id) || []));
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

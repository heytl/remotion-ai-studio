// ============ 异步渲染任务队列 ============
// 使用 @remotion/bundler 打包 remotion/ 下的 Composition，
// 再用 @remotion/renderer 服务端渲染为 MP4。
// 单进程内存队列（配合磁盘持久化状态），一次只渲染一个任务。

import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import {
  getComposition,
} from './schema-builder';
import { getProject, getRenderJob, OUTPUT_DIR, resetStaleRenderJobs, saveRenderJob } from './store';
import { RenderJob, VideoSchema } from './types';

const ENTRY_POINT = path.join(process.cwd(), 'remotion', 'index.ts');
const COMPOSITION_ID = 'AiVideo';

let cachedServeUrl: string | null = null;
const queue: string[] = [];
let processing = false;

// 服务重启后清理遗留状态
resetStaleRenderJobs();

function updateJob(id: string, patch: Partial<RenderJob>): void {
  const job = getRenderJob(id);
  if (job) saveRenderJob({ ...job, ...patch });
}

async function getServeUrl(): Promise<string> {
  if (cachedServeUrl) return cachedServeUrl;
  // 首次渲染时打包 Remotion Composition（后续渲染复用缓存，加快速度）
  cachedServeUrl = await bundle({
    entryPoint: ENTRY_POINT,
    onProgress: (p: number) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[remotion] bundling ${Math.round(p * 100)}%`);
      }
    },
  });
  return cachedServeUrl;
}

export function enqueueRender(jobId: string): void {
  const job = getRenderJob(jobId);
  if (!job) return;
  if (queue.includes(jobId)) return; // 避免重复入队
  queue.push(jobId);
  void processQueue();
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      const jobId = queue.shift()!;
      await runRender(jobId);
    }
  } finally {
    processing = false;
  }
}

async function runRender(jobId: string): Promise<void> {
  const job = getRenderJob(jobId);
  if (!job) return;
  updateJob(jobId, { status: 'rendering', progress: 0, error: undefined });

  const project = getProject(job.projectId);
  if (!project || !project.schema) {
    updateJob(jobId, { status: 'failed', error: '项目或 Schema 不存在' });
    return;
  }
  const schema: VideoSchema = project.schema;
  const { width, height, fps, durationInFrames } = getComposition(schema);
  const inputProps = { schema };
  const outputLocation = path.join(OUTPUT_DIR, `${jobId}.mp4`);
  const hasAudio = schema.scenes.some((s) => Boolean(s.audioDataUrl));

  try {
    const serveUrl = await getServeUrl();
    const browser = await openBrowser('chrome');
    try {
      const composition = await selectComposition({
        serveUrl,
        id: COMPOSITION_ID,
        inputProps,
        puppeteerInstance: browser,
      });

      await renderMedia({
        composition: {
          ...composition,
          width,
          height,
          fps,
          durationInFrames,
        },
        serveUrl,
        codec: 'h264',
        outputLocation,
        inputProps,
        audioCodec: hasAudio ? 'aac' : undefined,
        enforceAudioTrack: hasAudio,
        crf: 18,
        pixelFormat: 'yuv420p',
        onProgress: ({ progress }: { progress: number }) => {
          updateJob(jobId, { progress: Math.min(1, Math.max(0, progress)) });
        },
      });
    } finally {
      await browser.close({ silent: true }).catch(() => undefined);
    }

    updateJob(jobId, { status: 'completed', progress: 1, outputPath: outputLocation });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    updateJob(jobId, { status: 'failed', error: message });
    console.error('[render] failed', message);
  }
}

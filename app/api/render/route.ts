import { NextRequest, NextResponse } from 'next/server';
import { enqueueRender } from '@/lib/render-queue';
import { getProject, listRenderJobs, saveProject, saveRenderJob } from '@/lib/store';
import { RenderJob, VideoSchema } from '@/lib/types';
import { uid } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId') || undefined;
  return NextResponse.json({ jobs: listRenderJobs(projectId) });
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, schema } = (await req.json()) as { projectId: string; schema: VideoSchema };
    const project = getProject(projectId);
    if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    if (!schema || !Array.isArray(schema.scenes) || schema.scenes.length === 0) {
      return NextResponse.json({ error: '请先生成可视化 Schema（预览步骤）' }, { status: 400 });
    }

    // 保存最终 Schema，作为渲染依据
    project.schema = schema;
    saveProject(project);

    const now = new Date().toISOString();
    const job: RenderJob = {
      id: uid('r_'),
      projectId,
      status: 'queued',
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };
    saveRenderJob(job);
    enqueueRender(job.id);

    return NextResponse.json({ job });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

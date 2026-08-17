import { NextRequest, NextResponse } from 'next/server';
import { deleteProject, getProject, listRenderJobs, saveProject } from '@/lib/store';
import { Project } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const existing = getProject(id);
    if (!existing) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    const patch = (await req.json()) as Partial<Project>;
    const project: Project = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      requirements: { ...existing.requirements, ...(patch.requirements || {}) },
    };
    saveProject(project);
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const project = getProject(id);
    if (!project) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    const hasActiveRender = listRenderJobs(id).some((job) => job.status === 'queued' || job.status === 'rendering');
    if (hasActiveRender) {
      return NextResponse.json({ error: '项目正在渲染，完成或失败后才能删除' }, { status: 409 });
    }
    const result = deleteProject(id);
    if (!result) return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

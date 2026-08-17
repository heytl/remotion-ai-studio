import { NextRequest, NextResponse } from 'next/server';
import { getRenderJob } from '@/lib/store';

type Ctx = { params: Promise<{ jobId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { jobId } = await params;
  const job = getRenderJob(jobId);
  if (!job) return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  return NextResponse.json({ job });
}

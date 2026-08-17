import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getRenderJob, OUTPUT_DIR } from '@/lib/store';

type Ctx = { params: Promise<{ jobId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { jobId } = await params;
  const job = getRenderJob(jobId);
  if (!job || job.status !== 'completed' || !job.outputPath) {
    return NextResponse.json({ error: '视频尚未完成渲染' }, { status: 404 });
  }
  const file = path.join(OUTPUT_DIR, path.basename(job.outputPath));
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: '视频文件不存在，可能已被清理' }, { status: 404 });
  }
  const stat = fs.statSync(file);
  const stream = fs.createReadStream(file);
  const readable = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: string | Buffer) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        controller.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
      });
      stream.on('end', () => controller.close());
      stream.on('error', (e) => controller.error(e));
    },
    cancel() {
      stream.destroy();
    },
  });
  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="video-${jobId}.mp4"`,
    },
  });
}

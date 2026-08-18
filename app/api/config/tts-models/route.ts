import { NextRequest, NextResponse } from 'next/server';
import { listTtsOptions } from '@/lib/tts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { baseUrl?: string; apiKey?: string };
    const options = await listTtsOptions(body);
    return NextResponse.json(options);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

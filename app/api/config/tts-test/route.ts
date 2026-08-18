import { NextRequest, NextResponse } from 'next/server';
import { testTtsConnection } from '@/lib/tts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      baseUrl?: string;
      apiKey?: string;
      model?: string;
      voice?: string;
    };
    const result = await testTtsConnection(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message }, { status: 500 });
  }
}

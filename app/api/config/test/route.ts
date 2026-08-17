import { NextRequest, NextResponse } from 'next/server';
import { testLlmConnection } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { baseUrl?: string; apiKey?: string; model?: string };
    const result = await testLlmConnection(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, message: (e as Error).message });
  }
}

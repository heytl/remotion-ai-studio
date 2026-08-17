import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/tts';

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text || !text.trim()) {
      return NextResponse.json({ error: '文本为空' }, { status: 400 });
    }
    const audioDataUrl = await synthesizeSpeech(text.trim());
    return NextResponse.json({ audioDataUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

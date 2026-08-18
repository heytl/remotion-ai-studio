import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/store';
import { AppConfig } from '@/lib/types';

export async function GET() {
  return NextResponse.json({ config: getConfig() });
}

export async function PUT(req: NextRequest) {
  try {
    const config = (await req.json()) as AppConfig;
    if (!config.llm || !config.tts || !config.search) {
      return NextResponse.json({ error: '配置格式错误' }, { status: 400 });
    }
    saveConfig(config);
    return NextResponse.json({ config: getConfig() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

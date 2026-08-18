import { NextRequest, NextResponse } from 'next/server';
import { getConfig, isMaskedKey, maskKey, saveConfig } from '@/lib/store';
import { AppConfig } from '@/lib/types';

/** 返回给前端的配置：API Key 打码，避免在浏览器泄露。 */
function maskConfigKeys(config: AppConfig): AppConfig {
  return {
    ...config,
    llm: { ...config.llm, apiKey: maskKey(config.llm.apiKey) },
    tts: { ...config.tts, apiKey: maskKey(config.tts.apiKey) },
    search: { ...config.search, apiKey: maskKey(config.search.apiKey) },
  };
}

export async function GET() {
  return NextResponse.json({ config: maskConfigKeys(getConfig()) });
}

export async function PUT(req: NextRequest) {
  try {
    const config = (await req.json()) as AppConfig;
    if (!config.llm || !config.tts || !config.search) {
      return NextResponse.json({ error: '配置格式错误' }, { status: 400 });
    }
    const existing = getConfig();
    // 打码值（未修改）沿用现有 Key；新值直接采用；清空则清除。
    const merged: AppConfig = {
      ...config,
      llm: { ...config.llm, apiKey: isMaskedKey(config.llm.apiKey) ? existing.llm.apiKey : config.llm.apiKey },
      tts: { ...config.tts, apiKey: isMaskedKey(config.tts.apiKey) ? existing.tts.apiKey : config.tts.apiKey },
      search: { ...config.search, apiKey: isMaskedKey(config.search.apiKey) ? existing.search.apiKey : config.search.apiKey },
    };
    saveConfig(merged);
    return NextResponse.json({ config: maskConfigKeys(getConfig()) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

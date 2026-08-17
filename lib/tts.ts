// ============ 可选 TTS（OpenAI audio/speech 协议） ============

import { getConfig } from './store';
import { normalizeBaseUrl } from './utils';

export async function synthesizeSpeech(text: string): Promise<string> {
  const { tts } = getConfig();
  if (!tts.enabled || !tts.apiKey) {
    throw new Error('未启用 TTS 或未配置 TTS API Key（可在「设置」页面配置）');
  }
  const url = `${normalizeBaseUrl(tts.baseUrl)}/audio/speech`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tts.apiKey}`,
    },
    body: JSON.stringify({
      model: tts.model,
      voice: tts.voice,
      input: text.slice(0, 4000),
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`TTS 请求失败 (HTTP ${res.status})：${errText.slice(0, 500)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:audio/mpeg;base64,${buf.toString('base64')}`;
}

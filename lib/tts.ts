// ============ 可选 TTS（OpenAI audio/speech 协议） ============

import { getConfig, isMaskedKey } from './store';
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

/** 验证 TTS 服务连通性（用于设置页“测试连接”）。 */
export async function testTtsConnection(override?: {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  voice?: string;
}): Promise<{ ok: boolean; message: string; audioDataUrl?: string }> {
  const { tts } = getConfig();
  const baseUrl = normalizeBaseUrl(override?.baseUrl || tts.baseUrl);
  const apiKey = override?.apiKey && !isMaskedKey(override.apiKey) ? override.apiKey : tts.apiKey;
  const model = override?.model || tts.model;
  const voice = override?.voice || tts.voice;

  if (!apiKey) {
    return { ok: false, message: '未填写 TTS API Key' };
  }
  try {
    const res = await fetch(`${baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        voice,
        input: '连接测试',
        response_format: 'mp3',
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, message: `HTTP ${res.status}：${text.slice(0, 500)}` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      ok: true,
      message: '连接成功，已生成测试音频',
      audioDataUrl: `data:audio/mpeg;base64,${buf.toString('base64')}`,
    };
  } catch (e) {
    return { ok: false, message: `连接失败：${(e as Error).message}` };
  }
}

/** 标准 OpenAI TTS 模型与音色（当远端 /v1/models 不可用时作为默认选项） */
export const DEFAULT_TTS_MODELS = ['tts-1', 'tts-1-hd'];
export const DEFAULT_TTS_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];

/** 从远端 /v1/models 解析可用模型与音色，用于设置页下拉选择。 */
export async function listTtsOptions(override?: {
  baseUrl?: string;
  apiKey?: string;
}): Promise<{ models: string[]; voices: string[] }> {
  const { tts } = getConfig();
  const baseUrl = normalizeBaseUrl(override?.baseUrl || tts.baseUrl);
  const apiKey = override?.apiKey && !isMaskedKey(override.apiKey) ? override.apiKey : tts.apiKey;

  if (!apiKey) {
    return { models: DEFAULT_TTS_MODELS, voices: DEFAULT_TTS_VOICES };
  }
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return { models: DEFAULT_TTS_MODELS, voices: DEFAULT_TTS_VOICES };
    }
    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    const ids = (data.data || []).map((m) => String(m.id || '')).filter(Boolean);

    const models = ids.filter((id) => /^tts-1(?:-hd)?$/.test(id));
    const voices = new Set<string>();
    for (const id of ids) {
      const match = id.match(/^tts-1(?:-hd)?-([a-z-]+)$/);
      if (match) voices.add(match[1]);
    }
    return {
      models: models.length ? models : DEFAULT_TTS_MODELS,
      voices: voices.size ? [...voices] : DEFAULT_TTS_VOICES,
    };
  } catch {
    return { models: DEFAULT_TTS_MODELS, voices: DEFAULT_TTS_VOICES };
  }
}

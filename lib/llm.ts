// ============ OpenAI 兼容 Chat Completions 客户端 ============
// 通过配置 baseUrl / apiKey / model 即可切换任意兼容服务商。

import { getConfig } from './store';
import { extractJson, normalizeBaseUrl } from './utils';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  json?: boolean;
  temperature?: number;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const { llm } = getConfig();
  if (!llm.apiKey) {
    throw new Error('尚未配置大模型 API Key，请到「设置」页面填写，或通过环境变量 LLM_API_KEY 注入');
  }
  const url = `${normalizeBaseUrl(llm.baseUrl)}/chat/completions`;
  const temperature = options.temperature ?? llm.temperature ?? 0.7;
  const wantJson = options.json !== false;

  const body = (withJsonFormat: boolean) => ({
    model: llm.model,
    messages,
    temperature,
    ...(wantJson && withJsonFormat ? { response_format: { type: 'json_object' } } : {}),
  });

  let res: Response;
  let useJsonFormat = wantJson;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify(body(useJsonFormat)),
    });
    // 部分兼容服务不支持 response_format，去掉后重试一次
    if (res.status === 400 && useJsonFormat) {
      useJsonFormat = false;
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${llm.apiKey}`,
        },
        body: JSON.stringify(body(false)),
      });
    }
  } catch (e) {
    throw new Error(`无法连接大模型服务 (${url})：${(e as Error).message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`大模型请求失败 (HTTP ${res.status})：${text.slice(0, 800)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('大模型返回内容为空，请检查模型配置');
  }
  return content;
}

export async function chatJSON<T>(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<T> {
  const content = await chatCompletion(messages, { ...options, json: true });
  return extractJson(content) as T;
}

export async function testLlmConnection(override?: {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}): Promise<{ ok: boolean; message: string; model?: string }> {
  const { llm } = getConfig();
  const baseUrl = normalizeBaseUrl(override?.baseUrl || llm.baseUrl);
  const apiKey = override?.apiKey || llm.apiKey;
  const model = override?.model || llm.model;

  if (!apiKey) {
    return { ok: false, message: '未填写 API Key' };
  }
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: '请回复两个字：正常' }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, message: `HTTP ${res.status}：${text.slice(0, 500)}` };
    }
    const data = (await res.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    return {
      ok: true,
      message: data.choices?.[0]?.message?.content || '连接成功',
      model: data.model,
    };
  } catch (e) {
    return { ok: false, message: `连接失败：${(e as Error).message}` };
  }
}

// ============ 联网检索（为生成大纲/文稿提供最新资料） ============
// 通过搜索服务商获取网页结果，拼装成受限长度的“研究上下文”并注入提示词，
// 让大模型基于最新数据撰写文稿，而不是只依赖训练时固化的知识。

import { getConfig } from './store';
import type { SearchProvider, SourceRef } from './types';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  publishedAt?: string;
}

const MAX_CONTEXT_CHARS = 3200;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟内复用，避免短时间重复扣费

interface CacheEntry {
  context: string;
  sources: SourceRef[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function truncate(value: string, max: number): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

async function searchTavily(query: string, apiKey: string, maxResults: number): Promise<SearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: Math.max(1, Math.min(10, maxResults)),
      include_answer: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Tavily 搜索失败 (HTTP ${res.status})：${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string; published_date?: string }>;
  };
  return (data.results || [])
    .map((r) => ({
      title: String(r.title || ''),
      url: String(r.url || ''),
      snippet: truncate(String(r.content || ''), 600),
      content: String(r.content || ''),
      publishedAt: r.published_date,
    }))
    .filter((r) => r.url);
}

async function searchSerper(query: string, apiKey: string, maxResults: number): Promise<SearchResult[]> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: Math.max(1, Math.min(10, maxResults)) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Serper 搜索失败 (HTTP ${res.status})：${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  return (data.organic || [])
    .map((r) => ({
      title: String(r.title || ''),
      url: String(r.link || ''),
      snippet: truncate(String(r.snippet || ''), 600),
    }))
    .filter((r) => r.url);
}

async function searchBocha(query: string, apiKey: string, maxResults: number): Promise<SearchResult[]> {
  const res = await fetch('https://api.bochaai.com/v1/web-search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, summary: true, count: Math.max(1, Math.min(10, maxResults)) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bocha 搜索失败 (HTTP ${res.status})：${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    data?: { webPages?: { value?: Array<{ name?: string; url?: string; snippet?: string; summary?: string }> } };
  };
  const value = data.data?.webPages?.value || [];
  return value
    .map((r) => ({
      title: String(r.name || ''),
      url: String(r.url || ''),
      snippet: truncate(String(r.snippet || r.summary || ''), 600),
      content: String(r.summary || r.snippet || ''),
    }))
    .filter((r) => r.url);
}

export async function searchWeb(query: string, maxResults?: number): Promise<SearchResult[]> {
  const { search } = getConfig();
  if (!search.apiKey) throw new Error('尚未配置搜索服务 API Key');
  const limit = maxResults ?? search.maxResults ?? 5;
  if (search.provider === 'serper') return searchSerper(query, search.apiKey, limit);
  if (search.provider === 'bocha') return searchBocha(query, search.apiKey, limit);
  return searchTavily(query, search.apiKey, limit);
}

function buildQueries(topic: string): string[] {
  const year = new Date().getFullYear();
  const base = topic.trim();
  if (!base) return [];
  return [base, `${base} 最新进展`, `${base} 关键数据 ${year}`];
}

/**
 * 检索主题相关资料，返回可注入提示词的上下文与来源列表。
 * 未开启、未配置 Key、或检索全部失败时返回 null（调用方降级为纯 LLM 生成）。
 */
export async function researchTopic(
  topic: string,
  enableSearch: boolean
): Promise<{ context: string; sources: SourceRef[] } | null> {
  if (!enableSearch || !topic.trim()) return null;
  const { search } = getConfig();
  if (!search.enabled || !search.apiKey) return null;

  // 按“主题 + 小时”做进程内缓存，同一小时内的重复生成复用结果。
  const cacheKey = `${topic.trim().toLowerCase()}|${new Date().toISOString().slice(0, 13)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { context: cached.context, sources: cached.sources };
  }

  const queries = buildQueries(topic).slice(0, 2);
  const results: SearchResult[] = [];
  for (const query of queries) {
    try {
      const found = await searchWeb(query, search.maxResults);
      for (const item of found) {
        if (!results.some((r) => r.url === item.url)) results.push(item);
      }
    } catch (e) {
      // 单个查询失败不阻断整体；全部失败时 results 为空，返回 null 触发降级。
      console.warn(`[search] 查询失败：${query}`, (e as Error).message);
    }
  }

  if (!results.length) return null;

  const sources: SourceRef[] = results.map((r) => ({ title: r.title, url: r.url }));
  const parts: string[] = [];
  let used = 0;
  for (const item of results) {
    const body = truncate(item.content && item.content.trim() ? item.content : item.snippet, 600);
    const block = `■ ${item.title}\n  来源：${item.url}\n  ${body}`;
    if (used + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    used += block.length;
  }

  const entry: CacheEntry = { context: parts.join('\n\n'), sources, expiresAt: Date.now() + CACHE_TTL_MS };
  cache.set(cacheKey, entry);
  return { context: entry.context, sources: entry.sources };
}

/** 验证搜索服务连通性（用于设置页“测试连接”）。 */
export async function testSearchConnection(override?: {
  provider?: SearchProvider;
  apiKey?: string;
  maxResults?: number;
}): Promise<{ ok: boolean; message: string; results?: SourceRef[] }> {
  const { search } = getConfig();
  const provider = override?.provider || search.provider;
  const apiKey = override?.apiKey || search.apiKey;
  const maxResults = override?.maxResults ?? search.maxResults ?? 1;

  if (!apiKey) {
    return { ok: false, message: '未填写搜索 API Key' };
  }
  try {
    const results = provider === 'serper'
      ? await searchSerper('连接测试', apiKey, Math.max(1, maxResults))
      : provider === 'bocha'
        ? await searchBocha('连接测试', apiKey, Math.max(1, maxResults))
        : await searchTavily('连接测试', apiKey, Math.max(1, maxResults));
    const sources: SourceRef[] = results.map((r) => ({ title: r.title, url: r.url }));
    return {
      ok: true,
      message: results.length ? `连接成功，返回 ${results.length} 条结果` : '连接成功，但未返回结果',
      results: sources,
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

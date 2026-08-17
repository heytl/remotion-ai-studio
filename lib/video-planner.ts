import type {
  CaptionCue,
  MotionPreset,
  ScriptBeat,
  ScriptScene,
  VideoBeat,
  VideoScene,
  VisualElement,
  VisualElementKind,
  VisualLayout,
  VisualPlan,
} from './types';

const VISUAL_LAYOUTS: VisualLayout[] = ['hero', 'split', 'cards', 'timeline', 'comparison', 'diagram'];
const MOTION_PRESETS: MotionPreset[] = ['calm', 'explain', 'flow', 'compare', 'energetic'];
const ELEMENT_KINDS: VisualElementKind[] = ['concept', 'metric', 'step', 'comparison', 'quote'];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const normalizeWhitespace = (value: string): string =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([。！？!?；;，,、：:])/g, '$1')
    .trim();

function hasCjk(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value);
}

function characterCount(value: string): number {
  return Array.from(value).length;
}

function hardWrap(value: string, limit: number): string[] {
  const chars = Array.from(value);
  const parts: string[] = [];
  for (let index = 0; index < chars.length; index += limit) {
    parts.push(chars.slice(index, index + limit).join('').trim());
  }
  return parts.filter(Boolean);
}

function splitLongSentence(sentence: string): string[] {
  const limit = hasCjk(sentence) ? 22 : 58;
  if (characterCount(sentence) <= limit) return [sentence];

  const tokens = sentence.split(/([，,、：:])/u).filter(Boolean);
  const clauses: string[] = [];
  for (let index = 0; index < tokens.length; index += 2) {
    clauses.push(`${tokens[index] || ''}${tokens[index + 1] || ''}`.trim());
  }

  const lines: string[] = [];
  let current = '';
  for (const clause of clauses) {
    if (characterCount(clause) > limit) {
      if (current) lines.push(current);
      lines.push(...hardWrap(clause, limit));
      current = '';
      continue;
    }
    if (!current || characterCount(current + clause) <= limit) {
      current += clause;
    } else {
      lines.push(current);
      current = clause;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : hardWrap(sentence, limit);
}

/** 按语义标点和字幕行宽拆分，保证每次只显示一条可读短句。 */
export function splitNarrationIntoCaptions(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  const sentences = normalized.match(/[^。！？!?；;\n]+[。！？!?；;]?/gu) || [normalized];
  return sentences.flatMap((sentence) => splitLongSentence(sentence.trim())).filter(Boolean);
}

function speechWeight(text: string): number {
  const cjk = (text.match(/[\u3400-\u9fff]/gu) || []).length;
  const latinWords = (text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || []).length;
  const punctuation = (text.match(/[。！？!?；;，,、：:]/gu) || []).length;
  return Math.max(1, cjk + latinWords * 2.1 + punctuation * 0.7);
}

/** 中文按约 4.6 字/秒、英文按约 2.7 词/秒估算，并计入自然停顿。 */
export function estimateSpeechSeconds(text: string): number {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return 0;
  const cjk = (normalized.match(/[\u3400-\u9fff]/gu) || []).length;
  const latinWords = (normalized.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || []).length;
  const punctuation = (normalized.match(/[。！？!?；;，,、：:]/gu) || []).length;
  return cjk / 4.6 + latinWords / 2.7 + punctuation * 0.08;
}

export function getMinimumSceneDuration(scene: Pick<ScriptScene, 'narration' | 'sceneType' | 'audioDurationSeconds'>): number {
  const captions = splitNarrationIntoCaptions(scene.narration);
  const readingTime = estimateSpeechSeconds(scene.narration) + 0.65;
  const captionTime = captions.length ? captions.length * 0.9 + 0.55 : 0;
  const audioTime = Number(scene.audioDurationSeconds || 0) + (scene.audioDurationSeconds ? 0.35 : 0);
  const visualMinimum = scene.sceneType === 'title' || scene.sceneType === 'transition' ? 3.2 : 4.2;
  return Math.max(visualMinimum, readingTime, captionTime, audioTime);
}

/**
 * 目标时长足够时把余量按原始权重分配；不足时优先保证旁白、字幕和音频不被截断。
 */
export function allocateSceneDurations(scenes: ScriptScene[], targetSeconds: number): ScriptScene[] {
  if (!scenes.length) return [];
  const minima = scenes.map(getMinimumSceneDuration);
  const minimumTotal = minima.reduce((sum, value) => sum + value, 0);
  const target = Math.max(targetSeconds || 0, minimumTotal);
  const extra = Math.max(0, target - minimumTotal);
  const weights = scenes.map((scene) => Math.max(1, Number(scene.durationSeconds) || 1));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);

  const durations = minima.map((minimum, index) => minimum + (extra * weights[index]) / weightTotal);
  const rounded = durations.map((value) => Math.round(value * 10) / 10);
  const roundedTotal = rounded.reduce((sum, value) => sum + value, 0);
  rounded[rounded.length - 1] = Math.max(
    minima[minima.length - 1],
    Math.round((rounded[rounded.length - 1] + target - roundedTotal) * 10) / 10
  );

  return scenes.map((scene, index) => ({ ...scene, durationSeconds: rounded[index] }));
}

function extractEmphasis(text: string): string[] {
  const quoted = Array.from(text.matchAll(/[“「『"]([^”」』"]{2,12})[”」』"]/gu)).map((match) => match[1]);
  const values = (text.match(/\d+(?:\.\d+)?%?|[A-Za-z][A-Za-z0-9-]{2,}/g) || []).slice(0, 2);
  return [...quoted, ...values].slice(0, 3);
}

export function buildCaptionCues(text: string, durationSeconds: number): CaptionCue[] {
  const captions = splitNarrationIntoCaptions(text);
  if (!captions.length) return [];
  const durationMs = Math.max(1000, Math.round(durationSeconds * 1000));
  const startPadding = Math.min(420, durationMs * 0.08);
  const endPadding = Math.min(320, durationMs * 0.06);
  const available = Math.max(500, durationMs - startPadding - endPadding);
  const weights = captions.map(speechWeight);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = startPadding;

  return captions.map((caption, index) => {
    const remaining = captions.length - index;
    const proportional = (available * weights[index]) / totalWeight;
    const maxForCue = durationMs - endPadding - cursor - Math.max(0, remaining - 1) * 420;
    const cueDuration = index === captions.length - 1
      ? durationMs - endPadding - cursor
      : clamp(proportional, 620, Math.max(620, maxForCue));
    const startMs = Math.round(cursor);
    const endMs = Math.max(startMs + 1, Math.round(cursor + cueDuration));
    cursor += cueDuration;
    return {
      id: `caption-${index + 1}`,
      text: caption,
      startMs,
      endMs,
      emphasis: extractEmphasis(caption),
    };
  });
}

function truncateText(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value);
  const chars = Array.from(normalized);
  return chars.length <= maxLength ? normalized : `${chars.slice(0, maxLength - 1).join('')}…`;
}

function deriveScriptBeats(narration: string): ScriptBeat[] {
  const captions = splitNarrationIntoCaptions(narration);
  return captions.map((caption) => ({
    narration: caption,
    displayText: truncateText(caption.replace(/[。！？!?；;]$/u, ''), 18),
    visualAction: '跟随旁白突出当前核心概念',
  }));
}

export function normalizeScriptBeats(value: unknown, narration: string): ScriptBeat[] {
  if (!Array.isArray(value)) return deriveScriptBeats(narration);
  const beats = value
    .map((item) => {
      const object = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      return {
        narration: normalizeWhitespace(String(object.narration || '')),
        displayText: truncateText(String(object.displayText || ''), 24),
        visualAction: normalizeWhitespace(String(object.visualAction || '')),
      };
    })
    .filter((beat) => beat.narration || beat.displayText);
  return beats.length ? beats.slice(0, 8) : deriveScriptBeats(narration);
}

function timedBeatsFromScript(beats: ScriptBeat[], durationSeconds: number): VideoBeat[] {
  if (!beats.length) return [];
  const durationMs = Math.round(durationSeconds * 1000);
  const startPadding = Math.min(360, durationMs * 0.07);
  const endPadding = Math.min(260, durationMs * 0.05);
  const available = Math.max(500, durationMs - startPadding - endPadding);
  const weights = beats.map((beat) => speechWeight(beat.narration || beat.displayText));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = startPadding;
  return beats.map((beat, index) => {
    const beatDuration = index === beats.length - 1
      ? durationMs - endPadding - cursor
      : (available * weights[index]) / total;
    const startMs = Math.round(cursor);
    const endMs = Math.max(startMs + 1, Math.round(cursor + beatDuration));
    cursor += beatDuration;
    return {
      ...beat,
      id: `beat-${index + 1}`,
      startMs,
      endMs,
      displayText: truncateText(beat.displayText || beat.narration, 24),
    };
  });
}

function splitLabel(value: string): { label: string; description: string } {
  const normalized = normalizeWhitespace(value);
  const parts = normalized.split(/[：:]/u);
  if (parts.length > 1) {
    return { label: truncateText(parts.shift() || normalized, 14), description: truncateText(parts.join('：'), 30) };
  }
  return { label: truncateText(normalized, 20), description: '' };
}

function visualKindFor(value: string, index: number): VisualElementKind {
  if (/\d|%|倍|级|率/u.test(value)) return 'metric';
  return ELEMENT_KINDS[index % 3];
}

function deriveVisualElements(scene: Pick<ScriptScene, 'title' | 'bullets' | 'beats' | 'narration'>): VisualElement[] {
  const bulletSources = (scene.bullets || []).map(normalizeWhitespace).filter(Boolean);
  const beatSources = (scene.beats || []).map((beat) => normalizeWhitespace(beat.displayText)).filter(Boolean);
  // bullets 已经是屏幕要点时不再追加 beat 文案，避免语义重复和信息卡过量。
  const sources = bulletSources.length >= 2 ? bulletSources : [...bulletSources, ...beatSources];
  const unique = sources.filter((value, index) => sources.indexOf(value) === index).slice(0, 5);
  if (unique.length < 2 && scene.title) unique.push(scene.title);
  if (unique.length < 2) unique.push(...splitNarrationIntoCaptions(scene.narration).slice(0, 2));
  return unique.slice(0, 5).map((value, index) => {
    const { label, description } = splitLabel(value);
    const metric = value.match(/\d+(?:\.\d+)?%?|千亿|百亿|万亿/u)?.[0];
    return {
      id: `element-${index + 1}`,
      kind: visualKindFor(value, index),
      label,
      description,
      value: metric,
    };
  });
}

function defaultLayout(sceneType: ScriptScene['sceneType'], index: number): VisualLayout {
  if (sceneType === 'title' || sceneType === 'transition') return 'hero';
  const byType: Record<Exclude<ScriptScene['sceneType'], 'title' | 'transition'>, VisualLayout[]> = {
    bullets: ['cards', 'timeline', 'comparison'],
    imageText: ['split', 'diagram', 'comparison'],
    caption: ['diagram', 'split', 'cards'],
  };
  const choices = byType[sceneType as keyof typeof byType] || VISUAL_LAYOUTS;
  return choices[index % choices.length];
}

function defaultMotion(layout: VisualLayout): MotionPreset {
  if (layout === 'timeline' || layout === 'diagram') return 'flow';
  if (layout === 'comparison') return 'compare';
  if (layout === 'hero') return 'calm';
  return 'explain';
}

function parseVisualElements(value: unknown): VisualElement[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const object = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const kindValue = String(object.kind || 'concept') as VisualElementKind;
    return {
      id: String(object.id || `element-${index + 1}`),
      kind: ELEMENT_KINDS.includes(kindValue) ? kindValue : 'concept',
      label: truncateText(String(object.label || ''), 20),
      description: truncateText(String(object.description || ''), 34),
      value: truncateText(String(object.value || ''), 12) || undefined,
    };
  }).filter((item) => item.label || item.value).slice(0, 5);
}

export function normalizeVisualPlan(
  value: unknown,
  scene: Pick<ScriptScene, 'title' | 'narration' | 'bullets' | 'beats' | 'sceneType'>,
  index: number
): VisualPlan {
  const object = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const proposedLayout = String(object.layout || '') as VisualLayout;
  const layout = VISUAL_LAYOUTS.includes(proposedLayout) ? proposedLayout : defaultLayout(scene.sceneType, index);
  const proposedMotion = String(object.motionPreset || '') as MotionPreset;
  const elements = parseVisualElements(object.elements);
  const fallbackElements = deriveVisualElements(scene);
  return {
    layout,
    focusText: truncateText(String(object.focusText || scene.title || fallbackElements[0]?.label || ''), 30),
    supportingText: truncateText(
      String(object.supportingText || fallbackElements[1]?.label || (scene.beats || [])[0]?.displayText || ''),
      48
    ),
    motionPreset: MOTION_PRESETS.includes(proposedMotion) ? proposedMotion : defaultMotion(layout),
    elements: elements.length >= 2 ? elements : fallbackElements,
  };
}

export function normalizeScriptScene(scene: ScriptScene, index: number): ScriptScene {
  const narration = normalizeWhitespace(scene.narration);
  const beats = normalizeScriptBeats(scene.beats, narration);
  const normalized = {
    ...scene,
    title: normalizeWhitespace(scene.title),
    narration,
    visual: normalizeWhitespace(scene.visual),
    bullets: (scene.bullets || []).map(normalizeWhitespace).filter(Boolean).slice(0, 5),
    beats,
  };
  return {
    ...normalized,
    visualPlan: normalizeVisualPlan(scene.visualPlan, normalized, index),
  };
}

/** 为现有或编辑后的场景重建时序字段。 */
export function retimeVideoScene(scene: VideoScene, sceneIndex = 0): VideoScene {
  const durationSeconds = Math.max(
    scene.durationSeconds || 0,
    getMinimumSceneDuration({
      narration: scene.narration,
      sceneType: scene.type,
      audioDurationSeconds: scene.audioDurationSeconds,
    })
  );
  const scriptBeats: ScriptBeat[] = scene.beats?.length
    ? scene.beats.map(({ narration, displayText, visualAction }) => ({ narration, displayText, visualAction }))
    : normalizeScriptBeats(undefined, scene.narration);
  const sceneLike: ScriptScene = {
    id: scene.id,
    title: scene.title,
    narration: scene.narration,
    visual: '',
    bullets: scene.bullets,
    durationSeconds,
    sceneType: scene.type,
    beats: scriptBeats,
    visualPlan: scene.visualPlan,
    audioDataUrl: scene.audioDataUrl,
    audioDurationSeconds: scene.audioDurationSeconds,
  };
  return {
    ...scene,
    durationSeconds: Math.round(durationSeconds * 10) / 10,
    captions: buildCaptionCues(scene.narration, durationSeconds),
    beats: timedBeatsFromScript(scriptBeats, durationSeconds),
    visualPlan: normalizeVisualPlan(scene.visualPlan, sceneLike, sceneIndex),
  };
}

export const VIDEO_LAYOUT_OPTIONS: Array<{ value: VisualLayout; label: string }> = [
  { value: 'hero', label: '主视觉' },
  { value: 'split', label: '左右图文' },
  { value: 'cards', label: '信息卡片' },
  { value: 'timeline', label: '流程时间轴' },
  { value: 'comparison', label: '双栏对比' },
  { value: 'diagram', label: '中心示意图' },
];

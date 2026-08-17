import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocateSceneDurations,
  buildCaptionCues,
  getMinimumSceneDuration,
  normalizeScriptScene,
  splitNarrationIntoCaptions,
} from '../lib/video-planner.ts';
import type { ScriptScene } from '../lib/types.ts';

const baseScene = (overrides: Partial<ScriptScene> = {}): ScriptScene => ({
  id: 'scene-1',
  title: '不确定性原理',
  narration: '粒子的位置和动量不能同时精确确定。你越准确地知道它的位置，就越难知道它的速度。观测行为也会影响结果。',
  visual: '位置和动量的关系图',
  bullets: ['位置与动量相互制约', '观测会影响结果', '量子态具有概率性'],
  durationSeconds: 5,
  sceneType: 'bullets',
  ...overrides,
});

test('长旁白会拆成短句字幕，而不是整段常驻', () => {
  const captions = splitNarrationIntoCaptions(baseScene().narration);
  assert.ok(captions.length >= 3);
  assert.ok(captions.every((caption) => Array.from(caption).length <= 22));
});

test('字幕 cue 按顺序分配且不重叠', () => {
  const duration = getMinimumSceneDuration(baseScene());
  const cues = buildCaptionCues(baseScene().narration, duration);
  assert.ok(cues.length >= 3);
  for (let index = 1; index < cues.length; index += 1) {
    assert.ok(cues[index].startMs >= cues[index - 1].endMs);
  }
  assert.ok(cues.at(-1)!.endMs <= duration * 1000);
});

test('场景时长会保护旁白与真实音频，不会被目标时长硬截断', () => {
  const scenes = [baseScene({ audioDurationSeconds: 12.4 }), baseScene({ id: 'scene-2', narration: '一句简短总结。' })];
  const allocated = allocateSceneDurations(scenes, 10);
  assert.ok(allocated[0].durationSeconds >= 12.75);
  assert.ok(allocated.reduce((sum, scene) => sum + scene.durationSeconds, 0) > 10);
});

test('旧场景会自动生成视觉节拍和至少两个可视元素', () => {
  const normalized = normalizeScriptScene(baseScene({ beats: undefined, visualPlan: undefined }), 1);
  assert.ok((normalized.beats?.length || 0) >= 3);
  assert.ok((normalized.visualPlan?.elements?.length || 0) >= 2);
  assert.ok(normalized.visualPlan?.layout);
});


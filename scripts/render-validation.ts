import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { buildSchema, getSceneStartFrame } from '../lib/schema-builder';
import type { ScriptScene, VisualLayout } from '../lib/types';

const layouts: VisualLayout[] = ['hero', 'split', 'cards', 'timeline', 'comparison', 'diagram'];
const titles = ['逐句字幕与主视觉', '概念拆解', '核心信息卡', '知识演进过程', '两种方案对比', '关系示意图'];
const narrations = [
  '字幕现在一句一句出现。正文和字幕拥有各自的安全区域。',
  '左右布局把解释和视觉主体分开。信息更完整，也更容易阅读。',
  '多个要点会依次进入画面。当前讲到的内容会获得明确高亮。',
  '流程线会跟随旁白逐步推进。观众可以清楚看到内容发展的顺序。',
  '对比画面把差异放在同一视野。颜色、文字和结构共同传达变化。',
  '中心概念与周围节点建立关系。画面持续运动，但不会干扰阅读。',
];

const script: ScriptScene[] = layouts.map((layout, index) => ({
  id: `validation-${index + 1}`,
  title: titles[index],
  narration: narrations[index],
  visual: `${layout} 自动验证场景`,
  bullets: [
    index === 4 ? '优化前：文字堆叠' : '信息层级清晰',
    index === 4 ? '优化后：分区呈现' : '动画跟随语义',
    '字幕保持独立',
  ],
  durationSeconds: 6,
  sceneType: index === 0 ? 'title' : index === 1 ? 'imageText' : 'bullets',
  visualPlan: { layout, focusText: titles[index] },
}));

const schema = buildSchema({
  id: 'visual-validation',
  requirements: {
    topic: '视频生成质量优化',
    durationSeconds: 36,
    style: '科技科普',
    audience: '大众',
    language: '中文',
    aspectRatio: '16:9',
  },
  script,
});

const portraitSchema = buildSchema({
  id: 'visual-validation-portrait',
  requirements: {
    topic: '竖屏安全区验证',
    durationSeconds: 36,
    style: '科技科普',
    audience: '大众',
    language: '中文',
    aspectRatio: '9:16',
  },
  script,
});

const squareSchema = buildSchema({
  id: 'visual-validation-square',
  requirements: {
    topic: '方形安全区验证',
    durationSeconds: 36,
    style: '科技科普',
    audience: '大众',
    language: '中文',
    aspectRatio: '1:1',
  },
  script,
});

async function main(): Promise<void> {
  const outputDirectory = path.join(process.cwd(), 'artifacts', 'validation');
  fs.mkdirSync(outputDirectory, { recursive: true });

  const serveUrl = await bundle({ entryPoint: path.join(process.cwd(), 'remotion', 'index.ts') });
  const browser = await openBrowser('chrome');
  try {
    const composition = await selectComposition({
      serveUrl,
      id: 'AiVideo',
      inputProps: { schema },
      puppeteerInstance: browser,
    });
    for (let index = 0; index < schema.scenes.length; index += 1) {
      const scene = schema.scenes[index];
      const frame = getSceneStartFrame(schema, index) + Math.round(scene.durationSeconds * schema.fps * 0.58);
      await renderStill({
        composition,
        serveUrl,
        inputProps: { schema },
        frame,
        imageFormat: 'png',
        output: path.join(outputDirectory, `${String(index + 1).padStart(2, '0')}-${scene.visualPlan.layout}.png`),
        puppeteerInstance: browser,
        overwrite: true,
      });
    }

    for (const validation of [
      { name: '07-portrait-cards.png', schema: portraitSchema, sceneIndex: 2 },
      { name: '08-square-diagram.png', schema: squareSchema, sceneIndex: 5 },
    ]) {
      const variantComposition = await selectComposition({
        serveUrl,
        id: 'AiVideo',
        inputProps: { schema: validation.schema },
        puppeteerInstance: browser,
      });
      const scene = validation.schema.scenes[validation.sceneIndex];
      const frame = getSceneStartFrame(validation.schema, validation.sceneIndex) + Math.round(scene.durationSeconds * validation.schema.fps * 0.58);
      await renderStill({
        composition: variantComposition,
        serveUrl,
        inputProps: { schema: validation.schema },
        frame,
        imageFormat: 'png',
        output: path.join(outputDirectory, validation.name),
        puppeteerInstance: browser,
        overwrite: true,
      });
    }

    const motionSceneIndex = 2;
    const motionScene = schema.scenes[motionSceneIndex];
    for (const [label, progress] of [['start', 0.15], ['middle', 0.35], ['late', 0.6]] as const) {
      const frame = getSceneStartFrame(schema, motionSceneIndex) + Math.round(motionScene.durationSeconds * schema.fps * progress);
      await renderStill({
        composition,
        serveUrl,
        inputProps: { schema },
        frame,
        imageFormat: 'png',
        output: path.join(outputDirectory, `motion-${label}.png`),
        puppeteerInstance: browser,
        overwrite: true,
      });
    }
  } finally {
    await browser.close({ silent: true });
  }

  const motionHashes = ['start', 'middle', 'late'].map((label) =>
    crypto.createHash('sha256').update(fs.readFileSync(path.join(outputDirectory, `motion-${label}.png`))).digest('hex')
  );
  console.log(JSON.stringify({
    outputDirectory,
    score: schema.qualityReport.score,
    issues: schema.qualityReport.issues,
    motionFramesDistinct: new Set(motionHashes).size === motionHashes.length,
    scenes: schema.scenes.map((scene) => ({
      layout: scene.visualPlan.layout,
      durationSeconds: scene.durationSeconds,
      captions: scene.captions.length,
      beats: scene.beats.length,
      elements: scene.visualPlan.elements.length,
    })),
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

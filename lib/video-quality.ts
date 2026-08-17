import type { QualityIssue, QualityReport, VideoSchema } from './types';
import { estimateSpeechSeconds } from './video-planner';

function issue(
  code: string,
  severity: QualityIssue['severity'],
  message: string,
  suggestion: string,
  sceneId?: string
): QualityIssue {
  return { code, severity, message, suggestion, sceneId };
}

/**
 * 渲染前的确定性质量门禁。布局组件本身通过上下分区保证字幕不会与正文相交，
 * 此处负责检查输入密度、阅读速度、节拍和版式多样性。
 */
export function assessVideoQuality(schema: Omit<VideoSchema, 'qualityReport'> | VideoSchema): QualityReport {
  const issues: QualityIssue[] = [];
  const scenes = schema.scenes || [];

  if (scenes.length < 6 && scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) >= 45) {
    issues.push(issue(
      'LOW_SCENE_COUNT',
      'warning',
      `中长视频只有 ${scenes.length} 个场景，视觉节奏可能偏慢。`,
      '建议生成 6–10 个章节，或确保每个场景至少包含 2 个语义节拍。'
    ));
  }

  let repeatedLayouts = 1;
  scenes.forEach((scene, sceneIndex) => {
    const label = `场景 ${sceneIndex + 1}${scene.title ? `「${scene.title}」` : ''}`;
    const elements = scene.visualPlan?.elements || [];
    const captions = scene.captions || [];
    const beats = scene.beats || [];

    if (elements.length < 2 && scene.type !== 'transition') {
      issues.push(issue(
        'LOW_VISUAL_DENSITY',
        'warning',
        `${label} 的可视元素少于 2 个。`,
        '补充要点或视觉元素，避免只出现标题和纯色背景。',
        scene.id
      ));
    }

    if (!beats.length && scene.durationSeconds > 4) {
      issues.push(issue(
        'NO_VISUAL_BEATS',
        'error',
        `${label} 没有可同步的视觉节拍。`,
        '重新生成字幕节拍，或将场景缩短到 4 秒以内。',
        scene.id
      ));
    }

    const longestBeatMs = beats.reduce((max, beat) => Math.max(max, beat.endMs - beat.startMs), 0);
    if (longestBeatMs > 5200) {
      issues.push(issue(
        'LONG_STATIC_BEAT',
        'warning',
        `${label} 存在超过 ${(longestBeatMs / 1000).toFixed(1)} 秒的单一节拍。`,
        '把长句继续拆分，确保约每 1.5–3 秒发生一次语义变化。',
        scene.id
      ));
    }

    const longCaption = captions.find((caption) => Array.from(caption.text).length > 58);
    if (longCaption) {
      issues.push(issue(
        'LONG_CAPTION',
        'error',
        `${label} 存在过长字幕。`,
        '将字幕拆成最多两行的短句。',
        scene.id
      ));
    }

    const spoken = estimateSpeechSeconds(scene.narration);
    if (spoken > scene.durationSeconds - 0.3) {
      issues.push(issue(
        'NARRATION_TOO_FAST',
        'error',
        `${label} 的旁白预计需要 ${spoken.toFixed(1)} 秒，但场景只有 ${scene.durationSeconds.toFixed(1)} 秒。`,
        '延长场景或精简旁白，避免配音被截断。',
        scene.id
      ));
    }

    if (Array.from(scene.title || '').length > 30) {
      issues.push(issue(
        'LONG_TITLE',
        'warning',
        `${label} 的标题较长。`,
        '标题建议控制在 18 个汉字左右，详细信息放入卡片。',
        scene.id
      ));
    }

    if (sceneIndex > 0 && scene.visualPlan?.layout === scenes[sceneIndex - 1]?.visualPlan?.layout) {
      repeatedLayouts += 1;
      if (repeatedLayouts >= 3) {
        issues.push(issue(
          'REPEATED_LAYOUT',
          'warning',
          `连续 ${repeatedLayouts} 个场景使用「${scene.visualPlan.layout}」版式。`,
          '切换为左右图文、时间轴、对比或示意图版式。',
          scene.id
        ));
      }
    } else {
      repeatedLayouts = 1;
    }
  });

  const penalty = issues.reduce((sum, item) => {
    if (item.severity === 'error') return sum + 14;
    if (item.severity === 'warning') return sum + 6;
    return sum + 2;
  }, 0);
  const totalElements = scenes.reduce((sum, scene) => sum + (scene.visualPlan?.elements.length || 0), 0);
  const layouts = new Set(scenes.map((scene) => scene.visualPlan?.layout).filter(Boolean));

  return {
    score: Math.max(0, 100 - penalty),
    generatedAt: new Date().toISOString(),
    issues,
    metrics: {
      totalScenes: scenes.length,
      totalBeats: scenes.reduce((sum, scene) => sum + (scene.beats?.length || 0), 0),
      totalCaptions: scenes.reduce((sum, scene) => sum + (scene.captions?.length || 0), 0),
      averageVisualElements: scenes.length ? Math.round((totalElements / scenes.length) * 10) / 10 : 0,
      layoutVariety: layouts.size,
    },
  };
}

export function withQualityReport(schema: Omit<VideoSchema, 'qualityReport'> | VideoSchema): VideoSchema {
  return { ...schema, qualityReport: assessVideoQuality(schema) } as VideoSchema;
}


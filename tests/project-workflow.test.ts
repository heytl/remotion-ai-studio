import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildProjectSummary,
  deriveProjectStatus,
  deriveResumeStep,
  withProjectStep,
} from '../lib/project-workflow.ts';
import type { Project, RenderJob } from '../lib/types.ts';

const now = '2026-08-18T08:00:00.000Z';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p_testproject',
    createdAt: now,
    updatedAt: now,
    requirements: {
      topic: '测试项目',
      durationSeconds: 60,
      style: '科普',
      audience: '大众',
      language: '中文',
      aspectRatio: '16:9',
    },
    outline: [],
    script: [],
    schema: null,
    workflow: { currentStep: 0, lastVisitedAt: now },
    ...overrides,
  };
}

function renderJob(status: RenderJob['status'], progress = 0, updatedAt = now): RenderJob {
  return {
    id: 'r_testjob',
    projectId: 'p_testproject',
    status,
    progress,
    createdAt: now,
    updatedAt,
  };
}

test('旧项目会根据已有内容推断恢复步骤', () => {
  const legacy = {
    ...project({ outline: [{ id: 'o1', title: '大纲', keyPoints: ['要点'], durationShare: 100 }] }),
    workflow: undefined,
  };
  assert.equal(deriveResumeStep(legacy), 1);
  assert.equal(deriveProjectStatus(legacy), 'outline-ready');
});

test('用户主动停留的步骤优先于自动推断状态', () => {
  const advanced = project({
    schema: { scenes: [{}] } as unknown as Project['schema'],
    workflow: { currentStep: 1, lastVisitedAt: now },
  });
  assert.equal(deriveProjectStatus(advanced), 'preview-ready');
  assert.equal(deriveResumeStep(advanced), 1);
});

test('渲染任务状态会覆盖内容阶段并生成准确进度', () => {
  const source = project({ schema: { scenes: [{}] } as unknown as Project['schema'] });
  const summary = buildProjectSummary(source, [renderJob('rendering', 0.5)]);
  assert.equal(summary.status, 'rendering');
  assert.equal(summary.progress, 90);
  assert.equal(summary.completedStages, 4);
  assert.equal(summary.renderProgress, 0.5);

  assert.equal(buildProjectSummary(source, [renderJob('completed', 1)]).progress, 100);
  assert.equal(buildProjectSummary(source, [renderJob('failed', 0.3)]).status, 'render-failed');
});

test('切换步骤会持久化最后访问位置并限制在五步流程内', () => {
  const changed = withProjectStep(project(), 99, '2026-08-18T09:00:00.000Z');
  assert.equal(changed.workflow.currentStep, 4);
  assert.equal(changed.workflow.lastVisitedAt, '2026-08-18T09:00:00.000Z');
});

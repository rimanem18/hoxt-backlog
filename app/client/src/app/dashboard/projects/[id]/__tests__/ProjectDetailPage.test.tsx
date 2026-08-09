import { describe, expect, test } from 'bun:test';
import type React from 'react';
import ProjectDetail from '@/features/project/components/ProjectDetail';
import TaskCreateForm from '@/features/todo/components/TaskCreateForm';
import TaskList from '@/features/todo/components/TaskList';
import ProjectDetailClient from '../ProjectDetailClient';
import ProjectDetailPage from '../page';

function findElementByType(
  node: unknown,
  targetType: unknown,
): React.ReactElement | undefined {
  if (node === null || node === undefined || typeof node !== 'object') {
    return undefined;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementByType(child, targetType);
      if (found) return found;
    }
    return undefined;
  }

  if ('type' in node && 'props' in node) {
    const element = node as React.ReactElement;
    if (element.type === targetType) {
      return element;
    }
    const props = element.props as Record<string, unknown> | null;
    if (props && typeof props === 'object') {
      for (const value of Object.values(props)) {
        const found = findElementByType(value, targetType);
        if (found) return found;
      }
    }
    return undefined;
  }

  return undefined;
}

describe('ProjectDetailPage', () => {
  test('URLの動的セグメントidがprojectIdとしてProjectDetailClientへ渡される', async () => {
    // Given: 動的ルートセグメントidを含むparams
    const params = Promise.resolve({ id: 'proj-123' });

    // When: ProjectDetailPageをparams付きで呼び出す
    const element = (await ProjectDetailPage({
      params,
    })) as React.ReactElement;

    // Then: ProjectDetailClientにprojectIdとしてidが渡される
    expect(element.type).toBe(ProjectDetailClient);
    expect((element.props as { projectId: string }).projectId).toBe('proj-123');
  });

  test('静的生成用のプレースホルダーparamsが公開されていない', async () => {
    // Given: pageモジュール全体
    const pageModule = await import('../page');

    // When & Then: generateStaticParamsがexportされていない
    expect('generateStaticParams' in pageModule).toBe(false);
  });
});

describe('ProjectDetailClient', () => {
  test('projectIdがprops経由で各セクションへ伝播する', () => {
    // Given: 呼び出し元から渡されるprojectId
    const projectId = 'proj-123';

    // When: ProjectDetailClientをprojectId付きで呼び出す
    const tree = ProjectDetailClient({ projectId }) as React.ReactElement;

    // Then: ProjectDetail/TaskList/TaskCreateFormにprojectIdが伝播する
    const projectDetailElement = findElementByType(tree, ProjectDetail);
    expect(
      (projectDetailElement?.props as { projectId: string } | undefined)
        ?.projectId,
    ).toBe(projectId);

    const taskListElement = findElementByType(tree, TaskList);
    expect(
      (taskListElement?.props as { projectId: string } | undefined)?.projectId,
    ).toBe(projectId);

    const taskCreateFormElement = findElementByType(tree, TaskCreateForm);
    expect(
      (taskCreateFormElement?.props as { fixedProjectId: string } | undefined)
        ?.fixedProjectId,
    ).toBe(projectId);
  });
});

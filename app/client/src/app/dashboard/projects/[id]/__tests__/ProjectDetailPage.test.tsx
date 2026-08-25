import { describe, expect, test } from 'bun:test';
import type React from 'react';
import ProjectDetail from '@/features/project/components/ProjectDetail';
import EditableTaskList from '@/features/todo/components/EditableTaskList';
import TaskCreateForm from '@/features/todo/components/TaskCreateForm';
import ViewerInviteForm from '@/features/viewer-management/components/ViewerInviteForm';
import ViewerList from '@/features/viewer-management/components/ViewerList';
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
  test('静的生成用のプレースホルダーparamsが公開されていない', async () => {
    // Given: pageモジュール全体
    const pageModule = await import('../page');

    // When & Then: generateStaticParamsがexportされていない
    expect('generateStaticParams' in pageModule).toBe(false);
  });

  test('URLの動的セグメントidがprojectIdとして各セクションへ伝播する', async () => {
    // Given: 動的ルートセグメントidを含むparams
    const params = Promise.resolve({ id: 'proj-123' });
    const projectId = 'proj-123';

    // When: ProjectDetailPageをparams付きで呼び出す
    const tree = (await ProjectDetailPage({ params })) as React.ReactElement;

    // Then: ProjectDetail/EditableTaskList/TaskCreateForm/viewer管理UIにprojectIdが伝播する
    const projectDetailElement = findElementByType(tree, ProjectDetail);
    expect(
      (projectDetailElement?.props as { projectId: string } | undefined)
        ?.projectId,
    ).toBe(projectId);

    const editableTaskListElement = findElementByType(tree, EditableTaskList);
    expect(
      (editableTaskListElement?.props as { projectId: string } | undefined)
        ?.projectId,
    ).toBe(projectId);

    const taskCreateFormElement = findElementByType(tree, TaskCreateForm);
    expect(
      (taskCreateFormElement?.props as { fixedProjectId: string } | undefined)
        ?.fixedProjectId,
    ).toBe(projectId);

    const viewerInviteFormElement = findElementByType(tree, ViewerInviteForm);
    expect(
      (viewerInviteFormElement?.props as { projectId: string } | undefined)
        ?.projectId,
    ).toBe(projectId);

    const viewerListElement = findElementByType(tree, ViewerList);
    expect(
      (viewerListElement?.props as { projectId: string } | undefined)
        ?.projectId,
    ).toBe(projectId);
  });
});

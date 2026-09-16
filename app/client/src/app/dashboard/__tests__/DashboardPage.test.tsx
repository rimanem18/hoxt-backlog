import { describe, expect, test } from 'bun:test';
import type React from 'react';
import { DashboardSessionMonitor } from '@/features/dashboard/components/DashboardSessionMonitor';
import { ProjectsShell } from '@/features/dashboard/components/ProjectsShell';
import { DashboardServicesProvider } from '@/features/dashboard/lib/DashboardServicesContext';
import ProjectCreateForm from '@/features/project/components/ProjectCreateForm';
import ProjectList from '@/features/project/components/ProjectList';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';
import TaskCreateForm from '@/features/todo/components/TaskCreateForm';
import { TaskServicesProvider } from '@/features/todo/lib/TaskServicesContext';
import DashboardPage from '../page';

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

describe('DashboardPage', () => {
  test('プロジェクト作成フォームとプロジェクト一覧が配置される', () => {
    // Given & When: DashboardPageの返す要素ツリー
    const tree = DashboardPage() as React.ReactElement;

    // Then: プロジェクト作成フォームとプロジェクト一覧が存在する
    expect(findElementByType(tree, ProjectCreateForm)).toBeDefined();
    expect(findElementByType(tree, ProjectList)).toBeDefined();
  });

  test('ProjectServicesProvider配下のProjectsShellに描画される', () => {
    // Given & When: DashboardPageの返す要素ツリー
    const tree = DashboardPage() as React.ReactElement;

    // Then: ProjectServicesProviderとProjectsShellが存在する
    expect(findElementByType(tree, ProjectServicesProvider)).toBeDefined();
    expect(findElementByType(tree, ProjectsShell)).toBeDefined();
  });

  test('全タスク横断のタスク作成フォームとタスク取得用Providerが配置されない', () => {
    // Given & When: DashboardPageの返す要素ツリー
    const tree = DashboardPage() as React.ReactElement;

    // Then: TaskCreateFormとTaskServicesProviderが存在しない
    expect(findElementByType(tree, TaskCreateForm)).toBeUndefined();
    expect(findElementByType(tree, TaskServicesProvider)).toBeUndefined();
  });

  test('セッション監視がDashboardServicesProvider配下に配置される', () => {
    // Given & When: DashboardPageの返す要素ツリー
    const tree = DashboardPage() as React.ReactElement;

    // Then: DashboardServicesProviderとDashboardSessionMonitorが存在する
    expect(findElementByType(tree, DashboardServicesProvider)).toBeDefined();
    expect(findElementByType(tree, DashboardSessionMonitor)).toBeDefined();
  });
});

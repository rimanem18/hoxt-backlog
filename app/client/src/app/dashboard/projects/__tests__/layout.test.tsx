import { describe, expect, test } from 'bun:test';
import type React from 'react';
import { ProjectsShell } from '@/features/dashboard/components/ProjectsShell';
import { ProjectServicesProvider } from '@/features/project/lib/ProjectServicesContext';
import ProjectsLayout from '../layout';

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

describe('ProjectsLayout', () => {
  test('ProjectServicesProvider配下でProjectsShellへchildrenを渡す', () => {
    // Given: 任意のchildren要素
    const children = <div>CHILD</div>;

    // When: ProjectsLayoutをchildren付きで呼び出す
    const element = ProjectsLayout({ children }) as React.ReactElement;

    // Then: ProjectServicesProviderでラップされ、その配下のProjectsShellにchildrenがそのまま渡される
    expect(element.type).toBe(ProjectServicesProvider);

    const shellElement = findElementByType(element, ProjectsShell);
    expect(shellElement).toBeDefined();
    expect(
      (shellElement?.props as { children: React.ReactNode } | undefined)
        ?.children,
    ).toBe(children);
  });
});

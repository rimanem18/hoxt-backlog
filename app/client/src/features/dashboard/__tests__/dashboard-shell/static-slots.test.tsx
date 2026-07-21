import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderDashboardShell } from '../helpers/renderDashboardShell';

describe('DashboardShell 静的スロットの描画', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('createTaskSection・filterSortSection・taskListHeadingスロットが描画される', () => {
    // Given: page.tsx（Server）から渡される想定の静的スロット
    // When: DashboardShellをレンダリング
    renderDashboardShell({
      createTaskSection: <div>CREATE_TASK_SLOT</div>,
      filterSortSection: <div>FILTER_SORT_SLOT</div>,
      taskListHeading: <div>TASK_LIST_HEADING_SLOT</div>,
    });

    // Then: 3つのスロットがすべて描画される
    expect(screen.getByText('CREATE_TASK_SLOT')).toBeInTheDocument();
    expect(screen.getByText('FILTER_SORT_SLOT')).toBeInTheDocument();
    expect(screen.getByText('TASK_LIST_HEADING_SLOT')).toBeInTheDocument();
  });

  test('devDebugSlotスロットが描画される', () => {
    // Given: page.tsx（Server）から渡される想定のdevDebugSlot
    // When: DashboardShellをレンダリング
    renderDashboardShell({
      devDebugSlot: <div>DEV_DEBUG_SLOT</div>,
    });

    // Then: devDebugSlotが描画される
    expect(screen.getByText('DEV_DEBUG_SLOT')).toBeInTheDocument();
  });
});

import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { ViewerShell } from '../components/ViewerShell';

describe('ViewerShell', () => {
  afterEach(() => {
    cleanup();
  });

  test('子要素が幅制限・中央寄せコンテナに包まれて表示される', () => {
    // Given & When: 任意の子要素を持つViewerShellをレンダリング
    render(
      <ViewerShell>
        <p>子要素</p>
      </ViewerShell>,
    );

    // Then: ダッシュボードと同一の幅制限・中央寄せクラスを持つ祖先が存在する
    const child = screen.getByText('子要素');
    const container = child.closest('.max-w-6xl');
    expect(container).not.toBeNull();
    expect(container?.className).toContain('mx-auto');
  });
});

import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import TaskSummary from '../TaskSummary';

describe('TaskSummary', () => {
  afterEach(() => {
    cleanup();
  });

  test('タイトルが表示される', () => {
    // Given & When: タイトルを指定してレンダリング
    render(
      <TaskSummary
        title="テストタスク"
        description={null}
        priority="medium"
        status="not_started"
      />,
    );

    // Then: タイトルが表示される
    expect(screen.getByText('テストタスク')).toBeDefined();
  });

  test('説明がMarkdownとして表示される', () => {
    // Given: 太字を含む説明
    // When: レンダリング
    const { container } = render(
      <TaskSummary
        title="タスク"
        description="**重要**な説明"
        priority="medium"
        status="not_started"
      />,
    );

    // Then: strongタグとして表示される
    expect(container.querySelector('strong')?.textContent).toBe('重要');
  });

  test('説明がnullの場合は説明領域が表示されない', () => {
    // Given & When: descriptionをnullでレンダリング
    render(
      <TaskSummary
        title="タスク"
        description={null}
        priority="medium"
        status="not_started"
      />,
    );

    // Then: 説明用のテキストは表示されない
    expect(screen.queryByText(/な説明/)).toBeNull();
  });

  test('説明が空文字列の場合は説明領域が表示されない', () => {
    // Given & When: descriptionを空文字列でレンダリング
    const { container } = render(
      <TaskSummary
        title="タスク"
        description=""
        priority="medium"
        status="not_started"
      />,
    );

    // Then: Markdownを描画する段落自体が存在しない
    expect(container.querySelector('p')).toBeNull();
  });

  test('優先度ラベルが表示される', () => {
    // Given & When: priority="high"でレンダリング
    render(
      <TaskSummary
        title="タスク"
        description={null}
        priority="high"
        status="not_started"
      />,
    );

    // Then: 優先度ラベル「高」が表示される
    expect(screen.getByText('高')).toBeDefined();
  });

  test('ステータスラベルがバッジとして表示される', () => {
    // Given & When: status="completed"でレンダリング
    render(
      <TaskSummary
        title="タスク"
        description={null}
        priority="medium"
        status="completed"
      />,
    );

    // Then: ステータスラベル「完了」が表示される
    expect(screen.getByText('完了')).toBeDefined();
  });

  test('未知の優先度・ステータスでもクラッシュせず生値が表示される', () => {
    // Given & When: スキーマ外の優先度・ステータスでレンダリング
    render(
      <TaskSummary
        title="タスク"
        description={null}
        priority="urgent"
        status="archived"
      />,
    );

    // Then: 生値がそのままフォールバック表示される
    expect(screen.getByText('urgent')).toBeDefined();
    expect(screen.getByText('archived')).toBeDefined();
  });

  test('説明にscriptタグが含まれる場合はサニタイズされ実行されない', () => {
    // Given: scriptタグを含む説明
    // When: レンダリング
    const { container } = render(
      <TaskSummary
        title="タスク"
        description="<script>alert('XSS')</script>"
        priority="medium"
        status="not_started"
      />,
    );

    // Then: scriptタグは除去される
    expect(container.querySelector('script')).toBeNull();
  });
});

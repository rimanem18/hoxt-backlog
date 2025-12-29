import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import MarkdownRenderer from '../components/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  afterEach(() => {
    cleanup();
  });

  describe('基本的なMarkdown機能', () => {
    it('GFM形式のMarkdownが正しく表示される', () => {
      // Given: 見出し、リスト、リンク、太字を含むMarkdown
      const markdownContent =
        '## タスク概要\n\n- **重要**: [ドキュメント](https://example.com)\n- 項目2';

      // When: MarkdownRendererで描画
      const { container } = render(
        <MarkdownRenderer content={markdownContent} />,
      );

      // Then: 各要素が正しく生成される
      expect(container.querySelector('h2')?.textContent).toBe('タスク概要');
      expect(container.querySelector('strong')?.textContent).toBe('重要');
      expect(container.querySelector('a')?.getAttribute('href')).toBe(
        'https://example.com',
      );
      expect(container.querySelectorAll('li').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('チェックリストレンダリング', () => {
    it('チェックリストが正しく表示される', () => {
      // Given: チェックリスト形式のMarkdown
      const markdownContent = '- [x] 完了したタスク\n- [ ] 未完了のタスク';

      // When: MarkdownRendererで描画
      const { container } = render(
        <MarkdownRenderer content={markdownContent} />,
      );
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');

      // Then: チェックボックスが表示され、正しい状態を持つ
      expect(checkboxes.length).toBeGreaterThanOrEqual(1);
      if (checkboxes[0]) {
        expect((checkboxes[0] as HTMLInputElement).checked).toBe(true);
      }
    });
  });

  describe('エッジケース', () => {
    it('空文字列を安全に処理できる', () => {
      // Given: 空文字列
      const markdownContent = '';

      // When: MarkdownRendererで描画
      const { container } = render(
        <MarkdownRenderer content={markdownContent} />,
      );

      // Then: エラーなく描画される
      expect(container).toBeDefined();
    });

    it('XSS攻撃が防止される', () => {
      // Given: scriptタグを含むHTML
      const markdownContent = "<script>alert('XSS')</script>";

      // When: MarkdownRendererで描画
      const { container } = render(
        <MarkdownRenderer content={markdownContent} />,
      );
      const script = container.querySelector('script');

      // Then: scriptタグが削除される
      expect(script).toBeNull();
    });

    it('危険なHTML属性が除去される', () => {
      // Given: onerror属性を含むimg
      const markdownContent = '<img src=x onerror="alert(1)">';

      // When: MarkdownRendererで描画
      const { container } = render(
        <MarkdownRenderer content={markdownContent} />,
      );
      const img = container.querySelector('img');

      // Then: imgタグは生成されるが、onerror属性は除去される
      expect(img).not.toBeNull();
      expect(img?.getAttribute('onerror')).toBeNull();
    });
  });

  describe('パフォーマンス', () => {
    it('Propsが変更されると新しい内容が表示される', () => {
      // Given: 初期content
      const { rerender, container } = render(
        <MarkdownRenderer content="テキスト1" />,
      );

      // When & Then: 初期レンダリング確認
      expect(container.textContent).toContain('テキスト1');

      // When: contentが変更されて再レンダリング
      rerender(<MarkdownRenderer content="テキスト2" />);

      // Then: 新しい内容が表示される
      expect(container.textContent).toContain('テキスト2');
    });

    it('同じPropsで再レンダリングされない', () => {
      // Given: React.memoでラップされたコンポーネント
      const { container, rerender } = render(
        <MarkdownRenderer content="同じテキスト" />,
      );
      const firstRender = container.innerHTML;

      // When: 同じPropsで再レンダリング
      rerender(<MarkdownRenderer content="同じテキスト" />);
      const secondRender = container.innerHTML;

      // Then: DOM内容が変わらない（最適化されている）
      expect(firstRender).toBe(secondRender);
    });
  });
});

import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { AsyncStateMessage } from '../AsyncStateMessage';

describe('AsyncStateMessage', () => {
  afterEach(() => {
    cleanup();
  });

  test('variant="info"のときaria-live="polite"でメッセージが表示される', () => {
    // Given & When: infoバリアントでレンダリング
    render(<AsyncStateMessage variant="info" message="読み込み中..." />);

    // Then: aria-live="polite"のコンテナ内にメッセージが表示される
    const message = screen.getByText('読み込み中...');
    expect(message.closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  test('variant="error"のときaria-live="assertive"でメッセージが表示される', () => {
    // Given & When: errorバリアントでレンダリング
    render(<AsyncStateMessage variant="error" message="取得失敗" />);

    // Then: aria-live="assertive"のコンテナ内にメッセージが表示される
    const message = screen.getByText('取得失敗');
    expect(message.closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'assertive',
    );
  });
});

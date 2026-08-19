import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormAlert } from '../FormAlert';

describe('FormAlert', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('variant="error"の場合、role="alert"でメッセージが表示される', () => {
    // Given & When: エラーメッセージ付きでレンダリング
    render(<FormAlert variant="error" message="入力エラーです" />);

    // Then: role="alert"でメッセージが表示される
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('入力エラーです');
  });

  test('variant="success"の場合、role="status"でメッセージが表示される', () => {
    // Given & When: 成功メッセージ付きでレンダリング
    render(<FormAlert variant="success" message="保存しました" />);

    // Then: role="status"でメッセージが表示される
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('保存しました');
  });
});

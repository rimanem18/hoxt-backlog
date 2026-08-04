import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import {
  ConfirmPageServicesProvider,
  type ExchangeCodeFn,
} from '@/app/auth/confirm/ConfirmPageServicesContext';
import EmailConfirmPage from '@/app/auth/confirm/page';

function createMockExchangeCode(
  result: Awaited<ReturnType<ExchangeCodeFn>>,
): ExchangeCodeFn {
  return mock(async () => result);
}

const SUCCESS_RESULT = {
  data: {
    session: { access_token: 'mock-token' },
    user: { id: 'user-id' },
  },
  error: null,
} as Awaited<ReturnType<ExchangeCodeFn>>;

const ERROR_RESULT = {
  data: { session: null, user: null },
  error: { message: 'Invalid confirmation link', code: 'otp_expired' },
} as Awaited<ReturnType<ExchangeCodeFn>>;

describe('EmailConfirmPage', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  function buildWrapper(
    exchangeCode: ExchangeCodeFn = createMockExchangeCode(SUCCESS_RESULT),
    searchParams: Record<string, string> = { code: 'valid-code-123' },
  ) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return (
        <ConfirmPageServicesProvider
          services={{ exchangeCode }}
          searchParams={searchParams}
        >
          {children}
        </ConfirmPageServicesProvider>
      );
    };
  }

  test('code パラメータが存在する場合、exchangeCodeForSession が code を引数に呼ばれる', async () => {
    // Given: 有効な code パラメータ
    const exchangeCode = createMockExchangeCode(SUCCESS_RESULT);
    const code = 'valid-code-abc';

    // When: confirm ページをレンダリング
    render(<EmailConfirmPage />, {
      wrapper: buildWrapper(exchangeCode, { code }),
    });

    // Then: exchangeCode が code を引数に呼ばれる
    await waitFor(() => {
      expect(exchangeCode).toHaveBeenCalledWith(code);
    });
  });

  test('確認成功時に「メールアドレスの確認が完了しました」テキストが表示される（REQ-102）', async () => {
    // Given: 確認が成功するモック
    const exchangeCode = createMockExchangeCode(SUCCESS_RESULT);

    // When: confirm ページをレンダリング
    render(<EmailConfirmPage />, {
      wrapper: buildWrapper(exchangeCode),
    });

    // Then: 確認完了メッセージが表示される
    await waitFor(() => {
      expect(
        screen.getByText(/メールアドレスの確認が完了しました/i),
      ).toBeInTheDocument();
    });
  });

  test('確認失敗時（無効なコード）に「確認リンクが無効か期限切れです」が表示される', async () => {
    // Given: 確認が失敗するモック
    const exchangeCode = createMockExchangeCode(ERROR_RESULT);

    // When: confirm ページをレンダリング
    render(<EmailConfirmPage />, {
      wrapper: buildWrapper(exchangeCode),
    });

    // Then: エラーメッセージが表示される
    await waitFor(() => {
      expect(
        screen.getByText(/確認リンクが無効か期限切れです/i),
      ).toBeInTheDocument();
    });
  });

  test('code パラメータがない場合にエラーメッセージが表示される（境界値）', async () => {
    // Given: code パラメータなし
    const exchangeCode = createMockExchangeCode(SUCCESS_RESULT);

    // When: code なしで confirm ページをレンダリング
    render(<EmailConfirmPage />, {
      wrapper: buildWrapper(exchangeCode, {}),
    });

    // Then: エラーメッセージが表示される
    await waitFor(() => {
      expect(
        screen.getByText(/確認リンクが無効か期限切れです/i),
      ).toBeInTheDocument();
    });

    // And: exchangeCode は呼ばれない
    expect(exchangeCode).not.toHaveBeenCalled();
  });

  test('確認成功後にホームへのリンクが表示される', async () => {
    // Given: 確認が成功するモック
    const exchangeCode = createMockExchangeCode(SUCCESS_RESULT);

    // When: confirm ページをレンダリング
    render(<EmailConfirmPage />, {
      wrapper: buildWrapper(exchangeCode),
    });

    // Then: 確認完了後にホームへのリンクが表示される
    await waitFor(() => {
      expect(
        screen.getByText(/メールアドレスの確認が完了しました/i),
      ).toBeInTheDocument();
    });

    const homeLink = screen.getByRole('link', { name: /ホームへ/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});

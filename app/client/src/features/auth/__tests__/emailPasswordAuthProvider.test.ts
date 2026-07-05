import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';
import { AuthApiError } from '@supabase/supabase-js';
import { EmailPasswordAuthProvider } from '../services/providers/emailPasswordAuthProvider';

const MOCK_SESSION: Session = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'test-user-id',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00Z',
  },
};

function createMockSupabase(auth: {
  signInWithPassword?: ReturnType<typeof mock>;
  resetPasswordForEmail?: ReturnType<typeof mock>;
  updateUser?: ReturnType<typeof mock>;
  onAuthStateChange?: ReturnType<typeof mock>;
}): SupabaseClient {
  return { auth } as unknown as SupabaseClient;
}

describe('EmailPasswordAuthProvider', () => {
  const originalTrustedDomains = process.env.NEXT_PUBLIC_TRUSTED_DOMAINS;
  let mockSignInWithPassword: ReturnType<typeof mock>;
  let mockResetPasswordForEmail: ReturnType<typeof mock>;
  let mockUpdateUser: ReturnType<typeof mock>;
  let mockUnsubscribe: ReturnType<typeof mock>;
  let capturedInternalHandler: ((event: AuthChangeEvent) => void) | null;
  let provider: EmailPasswordAuthProvider;

  beforeEach(() => {
    // 実行環境の .env (CLIENT_PORT/SERVER_PORT) から独立させるため明示的に固定する
    process.env.NEXT_PUBLIC_TRUSTED_DOMAINS = 'example.com';
    mockSignInWithPassword = mock();
    mockResetPasswordForEmail = mock();
    mockUpdateUser = mock();
    mockUnsubscribe = mock(() => {});
    capturedInternalHandler = null;
    const mockOnAuthStateChange = mock(
      (handler: (event: AuthChangeEvent) => void) => {
        capturedInternalHandler = handler;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
    );
    const supabase = createMockSupabase({
      signInWithPassword: mockSignInWithPassword,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      onAuthStateChange: mockOnAuthStateChange,
    });
    provider = new EmailPasswordAuthProvider(supabase);
  });

  afterEach(() => {
    if (originalTrustedDomains === undefined) {
      delete process.env.NEXT_PUBLIC_TRUSTED_DOMAINS;
    } else {
      process.env.NEXT_PUBLIC_TRUSTED_DOMAINS = originalTrustedDomains;
    }
    mock.restore();
    mock.clearAllMocks();
  });

  describe('signInWithPassword', () => {
    test('成功時に success: true とセッションを返す', async () => {
      // Given: Supabase がセッションを返す
      mockSignInWithPassword.mockResolvedValue({
        data: { user: MOCK_SESSION.user, session: MOCK_SESSION },
        error: null,
      });

      // When: サインインを実行
      const result = await provider.signInWithPassword(
        'test@example.com',
        'password123',
      );

      // Then: 成功結果とセッションが返される
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.session).toBeDefined();
        expect(result.session.access_token).toBe('test-access-token');
      }
    });

    test('email と password を Supabase に正しく転送する', async () => {
      // Given: Supabase がセッションを返す
      mockSignInWithPassword.mockResolvedValue({
        data: { user: MOCK_SESSION.user, session: MOCK_SESSION },
        error: null,
      });

      // When: サインインを実行
      await provider.signInWithPassword('user@example.com', 'secret-pass');

      // Then: Supabase に正しい引数で呼ばれる
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret-pass',
      });
    });

    test('ネットワークエラー時に success: false と汎用エラーメッセージを返す', async () => {
      // Given: Supabase が rejected promise を返す
      mockSignInWithPassword.mockRejectedValue(new Error('Network error'));

      // When: サインインを実行
      const result = await provider.signInWithPassword(
        'test@example.com',
        'password123',
      );

      // Then: 失敗結果が返される（例外は throw されない）
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorMessage).toBeDefined();
      }
    });

    test('invalid_grant エラー時に認証失敗メッセージを返す（REQ-301）', async () => {
      // Given: Supabase が invalid_grant エラーを返す
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError('Invalid grant', 400, 'invalid_grant'),
      });

      // When: サインインを実行
      const result = await provider.signInWithPassword(
        'wrong@example.com',
        'wrongpassword',
      );

      // Then: 失敗結果と統一メッセージが返される
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorMessage).toBe(
          'メールアドレスまたはパスワードが間違っています',
        );
      }
    });

    test('email_not_confirmed エラー時にメール確認要求メッセージを返す（REQ-303）', async () => {
      // Given: Supabase が email_not_confirmed エラーを返す
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError(
          'Email not confirmed',
          400,
          'email_not_confirmed',
        ),
      });

      // When: サインインを実行
      const result = await provider.signInWithPassword(
        'unconfirmed@example.com',
        'password123',
      );

      // Then: 失敗結果とメール確認要求メッセージが返される
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorMessage).toBe(
          'メールアドレスの確認が必要です。受信したメール内のリンクから確認を完了してください',
        );
      }
    });

    test('"Invalid login credentials" メッセージのエラーは invalid_grant と同一メッセージを返す（NFR-101）', async () => {
      // Given: Supabase が "Invalid login credentials" メッセージのエラーを返す
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError('Invalid login credentials', 401, 'some_code'),
      });

      // When: サインインを実行
      const result = await provider.signInWithPassword(
        'test@example.com',
        'wrongpassword',
      );

      // Then: 列挙攻撃対策として原因を区別しない同一メッセージが返される
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorMessage).toBe(
          'メールアドレスまたはパスワードが間違っています',
        );
      }
    });
  });

  describe('resetPasswordForEmail', () => {
    test('成功時にエラーなしで解決する（REQ-104）', async () => {
      // Given: Supabase がリセットメール送信に成功
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      // When: パスワードリセット要求を実行
      const result = await provider.resetPasswordForEmail(
        'test@example.com',
        'https://example.com/auth/reset-password',
      );

      // Then: エラーメッセージなしで解決する
      expect(result.errorMessage).toBeUndefined();
    });

    test('email と redirectTo を Supabase に正しく転送する', async () => {
      // Given: Supabase がリセットメール送信に成功
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });
      const redirectTo = 'https://example.com/auth/reset-password';

      // When: パスワードリセット要求を実行
      await provider.resetPasswordForEmail('test@example.com', redirectTo);

      // Then: Supabase に正しい引数で呼ばれる
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        { redirectTo },
      );
    });

    test('ネットワークエラー時にエラーメッセージを返す（例外を throw しない）', async () => {
      // Given: Supabase が rejected promise を返す
      mockResetPasswordForEmail.mockRejectedValue(new Error('Network error'));

      // When: パスワードリセット要求を実行
      const result = await provider.resetPasswordForEmail(
        'test@example.com',
        'https://example.com/auth/reset-password',
      );

      // Then: 失敗結果が返される（例外は throw されない）
      expect(result.errorMessage).toBeDefined();
    });

    test('レート制限エラー時にエラーメッセージを返す', async () => {
      // Given: Supabase がレート制限エラーを返す
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: new AuthApiError(
          'Over email send rate limit',
          429,
          'over_email_send_rate_limit',
        ),
      });

      // When: パスワードリセット要求を実行
      const result = await provider.resetPasswordForEmail(
        'test@example.com',
        'https://example.com/auth/reset-password',
      );

      // Then: レート制限メッセージが返される
      expect(result.errorMessage).toBe(
        'リクエストが多すぎます。しばらくしてから再度お試しください',
      );
    });

    test('信頼ドメイン外の redirectTo は拒否されSupabaseを呼ばない', async () => {
      // Given: 信頼ドメイン一覧に含まれない redirectTo
      const untrustedRedirectTo = 'https://attacker.example/phishing';

      // When: パスワードリセット要求を実行
      const result = await provider.resetPasswordForEmail(
        'test@example.com',
        untrustedRedirectTo,
      );

      // Then: エラーメッセージが返され、Supabase は呼ばれない
      expect(result.errorMessage).toBeDefined();
      expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    test('成功時にエラーなしで解決する（REQ-105）', async () => {
      // Given: Supabase がパスワード更新に成功
      mockUpdateUser.mockResolvedValue({
        data: { user: MOCK_SESSION.user },
        error: null,
      });

      // When: パスワード更新を実行
      const result = await provider.updatePassword('newPassword123');

      // Then: エラーメッセージなしで解決する
      expect(result.errorMessage).toBeUndefined();
    });

    test('newPassword を Supabase に正しく転送する', async () => {
      // Given: Supabase がパスワード更新に成功
      mockUpdateUser.mockResolvedValue({ data: {}, error: null });

      // When: パスワード更新を実行
      await provider.updatePassword('newPassword123');

      // Then: Supabase に正しい引数で呼ばれる
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'newPassword123',
      });
    });

    test('ネットワークエラー時にエラーメッセージを返す（例外を throw しない）', async () => {
      // Given: Supabase が rejected promise を返す
      mockUpdateUser.mockRejectedValue(new Error('Network error'));

      // When: パスワード更新を実行
      const result = await provider.updatePassword('newPassword123');

      // Then: 失敗結果が返される（例外は throw されない）
      expect(result.errorMessage).toBeDefined();
    });

    test('otp_expired エラー時にリンク無効メッセージを返す（REQ-305）', async () => {
      // Given: Supabase がリンク無効エラーを返す
      mockUpdateUser.mockResolvedValue({
        data: {},
        error: new AuthApiError('otp expired', 403, 'otp_expired'),
      });

      // When: パスワード更新を実行
      const result = await provider.updatePassword('newPassword123');

      // Then: リンク無効メッセージが返される
      expect(result.errorMessage).toBe(
        'リンクが無効か期限切れです。再度パスワードリセットを要求してください',
      );
    });
  });

  describe('onAuthStateChange', () => {
    test('イベント発火時にコールバックへ生のイベントが渡される', () => {
      // Given: コールバックを登録
      const callback = mock();
      provider.onAuthStateChange(callback);

      // When: Supabase がイベントを発火
      capturedInternalHandler?.('PASSWORD_RECOVERY');

      // Then: コールバックにイベントが渡される
      expect(callback).toHaveBeenCalledWith('PASSWORD_RECOVERY');
    });

    test('購読前に発火済みのイベントは購読時に即座にリプレイされる（取りこぼし防止）', () => {
      // Given: 購読者がいない状態でPASSWORD_RECOVERYイベントが発火済み
      capturedInternalHandler?.('PASSWORD_RECOVERY');

      // When: その後にコールバックを登録
      const callback = mock();
      provider.onAuthStateChange(callback);

      // Then: 直近のイベントが登録時に即座にリプレイされる
      expect(callback).toHaveBeenCalledWith('PASSWORD_RECOVERY');
    });

    test('unsubscribe 呼び出し後はコールバックが呼ばれない', () => {
      // Given: コールバックを登録してunsubscribeを取得
      const callback = mock();
      const unsubscribe = provider.onAuthStateChange(callback);
      callback.mockClear();

      // When: unsubscribe した後にイベントが発火
      unsubscribe();
      capturedInternalHandler?.('PASSWORD_RECOVERY');

      // Then: コールバックは呼ばれない
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

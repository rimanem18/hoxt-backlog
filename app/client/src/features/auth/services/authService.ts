/**
 * 認証サービスの抽象化インターフェースとDI実装
 * DIパターンによりテスト分離を実現し、supabaseへの直接依存を排除
 */

import type { Provider } from '@supabase/supabase-js';
import { getApiBaseUrl } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { User } from '@/packages/shared-schemas/src/auth';
import { OAuthErrorHandler } from './oauthErrorHandler';
import {
  EmailPasswordAuthProvider,
  type SignInResult,
} from './providers/emailPasswordAuthProvider';

/**
 * OAuth認証レスポンスの型定義
 */
export interface AuthResponse {
  data: {
    user?: {
      id: string;
      email?: string;
    } | null;
    session?: {
      access_token: string;
      user: {
        id: string;
        email?: string;
      };
    } | null;
  };
  error: Error | null;
}

/**
 * OAuth認証オプションの型定義
 */
export interface AuthOptions {
  redirectTo?: string;
}

/**
 * メールサインアップ結果の型定義
 */
export type SignupResult =
  | { status: 'pending_confirmation' }
  | { status: 'error'; errorMessage: string };

/**
 * パスワードリセットリクエスト結果の型定義
 */
export type RequestPasswordResetResult =
  | { status: 'sent' }
  | { status: 'error'; errorMessage: string };

/**
 * 認証サービスインターフェース
 * テスト時の依存性注入とモック化を可能にする
 */
export interface AuthServiceInterface {
  /**
   * OAuth認証を開始する
   * @param provider - 認証プロバイダー（google, github等）
   * @param options - 認証オプション（redirectTo等）
   * @returns 認証結果のPromise
   */
  signInWithOAuth(
    provider: Provider,
    options?: AuthOptions,
  ): Promise<AuthResponse>;

  /**
   * メールパスワード認証でサインインする
   * @param email - メールアドレス
   * @param password - パスワード
   * @returns サインイン結果のPromise
   */
  signInWithEmailPassword(
    email: string,
    password: string,
  ): Promise<SignInResult>;

  /**
   * POST /api/auth/verify を呼び出し JIT プロビジョニングを行う
   * @param token - Supabase のアクセストークン
   * @returns ユーザー情報と新規ユーザーフラグのPromise
   */
  verifySession(token: string): Promise<{ user: User; isNewUser: boolean }>;

  /**
   * メールパスワードでサインアップする
   * @param email - メールアドレス
   * @param password - パスワード
   * @returns サインアップ結果のPromise
   */
  signup(email: string, password: string): Promise<SignupResult>;

  /**
   * パスワードリセットをリクエストする
   * @param email - メールアドレス
   * @param redirectTo - リセット後のリダイレクト先URL
   * @returns リクエスト結果のPromise
   */
  requestPasswordReset(
    email: string,
    redirectTo: string,
  ): Promise<RequestPasswordResetResult>;
}

/**
 * デフォルトの認証サービス実装（Supabase使用）
 */
export const createDefaultAuthService = (): AuthServiceInterface => {
  const emailPasswordProvider = new EmailPasswordAuthProvider(supabase);

  return {
    async signInWithEmailPassword(
      email: string,
      password: string,
    ): Promise<SignInResult> {
      return emailPasswordProvider.signInWithPassword(email, password);
    },

    async verifySession(
      token: string,
    ): Promise<{ user: User; isNewUser: boolean }> {
      // getApiBaseUrl() は末尾に /api を含むため /auth/verify を追加
      const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || 'セッション検証に失敗しました',
        );
      }

      const data = await response.json();
      const u = data.data.user;
      const user: User = {
        id: u.id,
        externalId: u.externalId,
        provider: u.provider,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl || null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLoginAt: u.lastLoginAt || null,
      };

      return { user, isNewUser: data.data.isNewUser };
    },

    async signInWithOAuth(
      provider: Provider,
      options?: AuthOptions,
    ): Promise<AuthResponse> {
      /**
       * Google OAuth認証のポップアップウィンドウを開く機能
       * E2Eテストで`page.waitForEvent('popup')`の検出を可能にする
       */

      // 開発環境限定のテスト機能（XSS対策とパフォーマンス向上）
      if (
        process.env.NODE_ENV === 'development' &&
        typeof window !== 'undefined'
      ) {
        // 許可されたテストエラータイプのホワイトリスト
        const ALLOWED_TEST_ERRORS = [
          'cancelled',
          'connection',
          'config',
        ] as const;

        const urlParams = new URLSearchParams(window.location.search);
        const testError = urlParams.get('test_oauth_error');

        // 厳格な入力値検証でXSS攻撃を防止
        if (
          testError &&
          (ALLOWED_TEST_ERRORS as readonly string[]).includes(testError)
        ) {
          console.log(`OAuth認証テストエラーを発生 [開発環境]: ${testError}`);

          // OAuthErrorHandlerで統合エラーハンドリング
          const errorDetail = OAuthErrorHandler.analyzeError(
            `test_${testError}_error`,
          );

          return {
            data: { user: null, session: null },
            error: new Error(errorDetail.userMessage),
          };
        } else if (testError) {
          // 不正なテストパラメータの検出をログに記録
          console.warn(
            `不正なテストエラーパラメータが検出されました: ${testError}`,
          );
        }
      }

      try {
        // Supabaseを通じてGoogle OAuthの認証URLを取得
        const response = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            ...options,
            // E2Eテストでポップアップ検出のためにskipBrowserRedirectをfalseに設定
            skipBrowserRedirect: false,
          },
        });

        // OAuth URL生成時のエラーを処理
        if (response.error) {
          /**
           * 統合エラーハンドラーで一元化されたエラー処理
           * OAuthErrorHandlerで安全なエラー分析とメッセージ生成
           */
          const errorDetail = OAuthErrorHandler.analyzeError(response.error);
          throw new Error(errorDetail.userMessage);
        }

        // window.openでポップアップウィンドウを開き、E2Eテストで検出可能にする
        if (response.data.url) {
          // テスト環境では実際のポップアップ無しでURL生成成功を返す
          if (process.env.NODE_ENV === 'test') {
            return {
              data: {
                user: null,
                session: null,
              },
              error: null,
            };
          }

          const popup = window.open(
            response.data.url,
            'oauth-popup',
            'width=500,height=600,scrollbars=yes,resizable=yes',
          );

          if (!popup) {
            // ポップアップがブロックされた場合、エラーを表示せずリダイレクト方式にフォールバック
            // この処理はサイレント（エラー表示なし）で行う
            console.log(
              'ポップアップがブロックされました。リダイレクト方式にフォールバックします。',
            );

            // 現在のページからGoogleの認証ページにリダイレクト
            window.location.assign(response.data.url);
            return {
              data: {
                user: null,
                session: null,
              },
              error: null,
            };
          }

          // ポップアップが一瞬開いた後にブロックされるケースへの対応
          // 500ms後にウィンドウが閉じていればリダイレクトにフォールバック
          setTimeout(() => {
            if (popup.closed) {
              console.log(
                'ポップアップが予期せず閉じられました。リダイレクト方式にフォールバックします。',
              );
              window.location.assign(response.data.url);
            }
          }, 500);
        }

        // OAuthフロー開始成功のレスポンス
        return {
          data: {
            user: null, // OAuthフローではコールバック後に取得
            session: null, // OAuthフローではコールバック後に取得
          },
          error: null,
        };
      } catch (error) {
        // OAuthErrorHandlerで統一された例外処理
        const errorDetail = OAuthErrorHandler.analyzeError(
          error instanceof Error
            ? error
            : new Error('OAuth認証でエラーが発生しました'),
        );
        return {
          data: {
            user: null,
            session: null,
          },
          error: new Error(errorDetail.userMessage),
        };
      }
    },

    async signup(email: string, password: string): Promise<SignupResult> {
      // getApiBaseUrl() は末尾に /api を含むため /auth/email/signup を追加
      const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/auth/email/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 201) {
        return { status: 'pending_confirmation' };
      }

      const body = await response.json();
      // サーバーは { success: false, error: { code, message } } 形式で返す
      const apiError = body?.error ?? body;
      const code = apiError?.code as string | undefined;

      if (
        response.status === 409 &&
        code === 'EMAIL_ALREADY_REGISTERED_GOOGLE'
      ) {
        return {
          status: 'error',
          errorMessage:
            apiError?.message ??
            'このメールアドレスは Google アカウントで登録済みです。',
        };
      }

      if (response.status === 409 && code === 'EMAIL_ALREADY_REGISTERED') {
        return {
          status: 'error',
          errorMessage:
            apiError?.message ?? 'このメールアドレスは既に登録されています',
        };
      }

      return {
        status: 'error',
        errorMessage:
          apiError?.message ?? 'サインアップに失敗しました。再度お試しください',
      };
    },

    async requestPasswordReset(
      email: string,
      redirectTo: string,
    ): Promise<RequestPasswordResetResult> {
      const { errorMessage } =
        await emailPasswordProvider.resetPasswordForEmail(email, redirectTo);

      if (errorMessage) {
        return { status: 'error', errorMessage };
      }

      return { status: 'sent' };
    },
  };
};

/**
 * デフォルトの認証サービスインスタンス
 * 通常の使用時はこれを使用
 */
export const defaultAuthService = createDefaultAuthService();

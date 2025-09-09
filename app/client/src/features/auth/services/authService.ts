/**
 * 認証サービスの抽象化インターフェースとDI実装
 * DIパターンによりテスト分離を実現し、supabaseへの直接依存を排除
 */

import type { Provider } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { OAuthErrorHandler } from './oauthErrorHandler';

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
}

/**
 * デフォルトの認証サービス実装（Supabase使用）
 */
export const createDefaultAuthService = (): AuthServiceInterface => {
  return {
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
            // ブラウザがポップアップをブロックした場合のエラー処理
            throw new Error(
              'ポップアップが開けませんでした。ブラウザの設定を確認してください。',
            );
          }
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
  };
};

/**
 * デフォルトの認証サービスインスタンス
 * 通常の使用時はこれを使用
 */
export const defaultAuthService = createDefaultAuthService();

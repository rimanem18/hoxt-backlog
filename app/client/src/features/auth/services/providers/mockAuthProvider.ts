/**
 * E2Eテスト用モック認証プロバイダー
 */

import type { User } from '@/packages/shared-schemas/src/auth';
import {
  type AuthCallbackResult,
  type AuthResult,
  BaseAuthProvider,
  type SessionInfo,
} from './authProviderInterface';

/**
 * E2Eテスト用モック認証プロバイダー
 *
 * テスト環境でのみ有効で、本番環境では無効化される。
 * モックトークン（'mock_access_token'）を使用した簡易認証を提供する。
 *
 * @example
 * ```typescript
 * const mockProvider = new MockAuthProvider();
 * await mockProvider.signIn(); // URLにモックトークンを設定
 * const result = await mockProvider.handleCallback(hashParams);
 * ```
 */
export class MockAuthProvider extends BaseAuthProvider {
  private static readonly MOCK_TOKEN = 'mock_access_token';
  private static readonly MOCK_USER: User = {
    id: 'mock-user-id',
    externalId: 'mock-user-id',
    provider: 'google',
    email: 'test.user@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  constructor() {
    super('mock');
  }

  /**
   * モックトークンかどうかを判定
   */
  validateToken(token: string): boolean {
    return token === MockAuthProvider.MOCK_TOKEN;
  }

  /**
   * モック認証のコールバック処理
   */
  async handleCallback(
    hashParams: URLSearchParams,
  ): Promise<AuthCallbackResult> {
    const accessToken = hashParams.get('access_token');

    if (!accessToken) {
      throw new Error('認証トークンが見つかりません');
    }

    // 本番環境での厳格な無効化チェック
    const isTestEnvironment =
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';

    if (!isTestEnvironment) {
      console.error(
        'モック認証は本番環境では使用できません。不正なアクセスの可能性があります。',
      );
      throw new Error('無効な認証方法です');
    }

    // モックトークンの検証
    if (!this.validateToken(accessToken)) {
      throw new Error('無効な認証トークンです');
    }

    console.log('モック認証が正常に完了しました:', MockAuthProvider.MOCK_USER);
    return {
      success: true,
      user: MockAuthProvider.MOCK_USER,
      isNewUser: false,
    };
  }

  /**
   * モック認証のログイン処理
   */
  async signIn(): Promise<AuthResult> {
    window.location.hash = `#access_token=${MockAuthProvider.MOCK_TOKEN}`;
    return this.createSuccessResult(MockAuthProvider.MOCK_USER);
  }

  /**
   * モック認証のログアウト処理
   */
  async signOut(): Promise<AuthResult> {
    return this.createSuccessResult();
  }

  /**
   * モックユーザー情報を取得
   */
  async getUser(): Promise<{ user: User | null }> {
    return { user: MockAuthProvider.MOCK_USER };
  }

  /**
   * モックセッション情報を取得
   */
  async getSession(): Promise<SessionInfo | null> {
    return {
      accessToken: MockAuthProvider.MOCK_TOKEN,
      user: MockAuthProvider.MOCK_USER,
    };
  }
}

/*
 * テスト用モックJWT検証器
 * 決定的な検証結果を提供し、ネットワーク呼び出し不要の高速テストを実現する。
 * 作成日: 2025年09月23日
 */

import type {
  ExternalUserInfo,
  IAuthProvider,
  JwtPayload,
  JwtVerificationResult,
} from '@/domain/services/IAuthProvider';

/**
 * テスト専用モックJWT検証器
 *
 * IAuthProviderインターフェースのテスト向け実装。
 * 決定的な検証結果を提供し、外部API呼び出しなしで高速テストを実現する。
 *
 * 特徴：
 * - ネットワーク呼び出し不要
 * - 決定的なテスト結果
 * - カスタマイズ可能な成功/失敗パターン
 * - 本番環境での誤用防止機能
 *
 * @example
 * ```typescript
 * const mockVerifier = new MockJwtVerifier();
 * const result = await mockVerifier.verifyToken('mock-valid-token');
 * // または
 * const failingVerifier = new MockJwtVerifier({ shouldSucceed: false });
 * ```
 */
export class MockJwtVerifier implements IAuthProvider {
  private readonly shouldSucceed: boolean;
  private readonly customError: string | undefined;
  private readonly customPayload: JwtPayload | undefined;

  /**
   * MockJwtVerifierのコンストラクタ
   *
   * @param options - モック検証器の動作設定
   */
  constructor(
    options: {
      shouldSucceed?: boolean;
      customError?: string;
      customPayload?: JwtPayload;
    } = {},
  ) {
    // 本番環境での誤用防止
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'MockJwtVerifier cannot be used in production environment',
      );
    }

    this.shouldSucceed = options.shouldSucceed ?? false;
    this.customError = options.customError || undefined;
    this.customPayload = options.customPayload || undefined;
  }

  /**
   * モックJWTトークンの検証を行う
   *
   * トークン文字列に基づいて決定論的な結果を返す。
   * - 'mock-valid-jwt-token': 成功
   * - 'invalid.jwt.token': 失敗（署名エラー）
   * - 'mock-expired-jwt-token': 失敗（期限切れ）
   * - その他: shouldSucceedフラグに基づく
   *
   * @param token - 検証対象のJWTトークン
   * @returns 設定された検証結果
   */
  async verifyToken(token: string): Promise<JwtVerificationResult> {
    // 入力値検証
    if (!token || token.trim() === '') {
      return {
        valid: false,
        error: 'Token is required',
      };
    }

    // トークンパターンによる分岐
    if (token === 'invalid.jwt.token') {
      return {
        valid: false,
        error: 'Invalid token signature',
      };
    }

    if (token === 'mock-expired-jwt-token') {
      return {
        valid: false,
        error: 'Token has expired',
      };
    }

    // 成功パターン（明示的なトークン文字列のみ）
    if (token === 'mock-valid-jwt-token') {
      const payload: JwtPayload = this.customPayload || {
        sub: '550e8400-e29b-41d4-a716-446655440000', // UUID形式のユーザーID
        email: 'test@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1時間後
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test.supabase.co/auth/v1',
        user_metadata: {
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
          email: 'test@example.com',
          full_name: 'Test User',
        },
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
      };

      return {
        valid: true,
        payload,
      };
    }

    // shouldSucceedフラグによるフォールバック（明示的に指定された場合のみ）
    if (this.shouldSucceed) {
      const payload: JwtPayload = this.customPayload || {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        iss: 'https://test.supabase.co/auth/v1',
        user_metadata: {
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
          email: 'test@example.com',
          full_name: 'Test User',
        },
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
      };

      return {
        valid: true,
        payload,
      };
    }

    // 失敗パターン（未定義トークンはすべて失敗）
    return {
      valid: false,
      error: this.customError || 'Mock verification failed',
    };
  }

  /**
   * モックJWTペイロードから外部ユーザー情報を抽出する
   *
   * @param payload - 検証済みJWTペイロード
   * @returns モック外部ユーザー情報
   */
  async getExternalUserInfo(payload: JwtPayload): Promise<ExternalUserInfo> {
    // モック環境では基本的なフィールド存在確認のみ
    if (!payload.sub) {
      throw new Error('Missing required field: sub');
    }

    if (!payload.email) {
      throw new Error('Missing required field: email');
    }

    const userInfo: ExternalUserInfo = {
      id: payload.sub,
      provider: payload.app_metadata?.provider || 'mock',
      email: payload.email,
      name: payload.user_metadata?.name || 'Mock User',
      // アバターURLはオプション
      ...(payload.user_metadata?.avatar_url && {
        avatarUrl: payload.user_metadata.avatar_url,
      }),
    };

    return userInfo;
  }
}

/**
 * 特定のエラーパターンをテストするためのファクトリー関数群
 */
export class MockJwtVerifierFactory {
  /**
   * 常に成功するモック検証器を作成
   */
  static createSuccessfulVerifier(customPayload?: JwtPayload): MockJwtVerifier {
    if (customPayload) {
      return new MockJwtVerifier({
        shouldSucceed: true,
        customPayload,
      });
    } else {
      return new MockJwtVerifier({
        shouldSucceed: true,
      });
    }
  }

  /**
   * 署名エラーをシミュレートするモック検証器を作成
   */
  static createSignatureErrorVerifier(): MockJwtVerifier {
    return new MockJwtVerifier({
      shouldSucceed: false,
      customError: 'Invalid signature',
    });
  }

  /**
   * トークン期限切れをシミュレートするモック検証器を作成
   */
  static createExpiredTokenVerifier(): MockJwtVerifier {
    return new MockJwtVerifier({
      shouldSucceed: false,
      customError: 'Token expired',
    });
  }

  /**
   * JWKS取得エラーをシミュレートするモック検証器を作成
   */
  static createJwksFetchErrorVerifier(): MockJwtVerifier {
    return new MockJwtVerifier({
      shouldSucceed: false,
      customError: 'Failed to fetch JWKS',
    });
  }

  /**
   * 無効なフォーマットをシミュレートするモック検証器を作成
   */
  static createInvalidFormatVerifier(): MockJwtVerifier {
    return new MockJwtVerifier({
      shouldSucceed: false,
      customError: 'Invalid token format',
    });
  }
}

import type {
  ExternalUserInfo,
  IAuthProvider,
  JwtPayload,
  JwtVerificationResult,
} from '@/domain/services/IAuthProvider';

/**
 * テスト用の認証プロバイダーモック実装
 *
 * CI環境やユニットテストで使用する認証プロバイダーのモック。
 * 実際のSupabase認証サーバーに依存せずにテストを実行可能にする。
 *
 * @example
 * ```typescript
 * const mockAuth = new MockAuthProvider();
 * const result = await mockAuth.verifyToken('valid-test-token');
 * // 常に有効なレスポンスを返す
 * ```
 */
export class MockAuthProvider implements IAuthProvider {
  private readonly testUsers: Map<string, ExternalUserInfo>;

  constructor() {
    // テスト用ユーザーデータを事前定義
    this.testUsers = new Map([
      [
        'test-user-1',
        {
          id: 'test-user-1',
          provider: 'google',
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      ],
      [
        'test-user-2',
        {
          id: 'test-user-2',
          provider: 'google',
          email: 'test2@example.com',
          name: 'Test User 2',
        },
      ],
    ]);
  }

  /**
   * JWT トークンの検証を模擬する
   *
   * 特定のテストトークンに対して定義済みのレスポンスを返す。
   * 実際の暗号学的検証は行わず、パターンマッチで判定する。
   *
   * @param token - 検証対象のJWTトークン
   * @returns JWT検証結果
   */
  async verifyToken(token: string): Promise<JwtVerificationResult> {
    // 無効トークンのテストケース
    if (!token || token.trim() === '') {
      return {
        valid: false,
        error: 'Token is required',
      };
    }

    if (token === 'invalid-token') {
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    if (token === 'expired-token') {
      return {
        valid: false,
        error: 'Token expired',
      };
    }

    // 有効トークンのテストケース
    let userId: string;
    if (
      token === 'valid-test-token' ||
      token.startsWith('Bearer valid-test-token')
    ) {
      userId = 'test-user-1';
    } else if (token === 'valid-test-token-2') {
      userId = 'test-user-2';
    } else {
      // 未知のトークンは無効として扱う
      return {
        valid: false,
        error: 'Invalid signature',
      };
    }

    // モックペイロードを生成
    const currentTime = Math.floor(Date.now() / 1000);
    const userInfo = this.testUsers.get(userId)!;

    const payload: JwtPayload = {
      sub: userInfo.id,
      email: userInfo.email,
      app_metadata: {
        provider: userInfo.provider,
        providers: [userInfo.provider],
      },
      user_metadata: {
        name: userInfo.name,
        email: userInfo.email,
        full_name: userInfo.name,
        ...(userInfo.avatarUrl && { avatar_url: userInfo.avatarUrl }),
      },
      iss: 'http://localhost:54321',
      iat: currentTime - 3600, // 1時間前発行
      exp: currentTime + 3600, // 1時間後期限切れ
    };

    return {
      valid: true,
      payload,
    };
  }

  /**
   * JWTペイロードから外部ユーザー情報を抽出する
   *
   * @param payload - 検証済みJWTペイロード
   * @returns 正規化された外部ユーザー情報
   */
  async getExternalUserInfo(payload: JwtPayload): Promise<ExternalUserInfo> {
    // 必須フィールド検証
    if (!payload.sub) {
      throw new Error('Missing required field: sub');
    }

    if (!payload.email) {
      throw new Error('Missing required field: email');
    }

    if (!payload.user_metadata?.name) {
      throw new Error('Missing required field: user_metadata.name');
    }

    if (!payload.app_metadata?.provider) {
      throw new Error('Missing required field: app_metadata.provider');
    }

    // ペイロードから ExternalUserInfo へのマッピング
    const userInfo: ExternalUserInfo = {
      id: payload.sub,
      provider: payload.app_metadata.provider,
      email: payload.email,
      name: payload.user_metadata.name,
      ...(payload.user_metadata.avatar_url && {
        avatarUrl: payload.user_metadata.avatar_url,
      }),
    };

    return userInfo;
  }

  /**
   * テスト用のユーザー情報を追加する
   *
   * テストケース毎に異なるユーザーデータが必要な場合に使用。
   *
   * @param userId - ユーザーID
   * @param userInfo - ユーザー情報
   */
  addTestUser(userId: string, userInfo: ExternalUserInfo): void {
    this.testUsers.set(userId, userInfo);
  }

  /**
   * 現在のテストユーザー一覧を取得する
   *
   * @returns テストユーザーのマップ
   */
  getTestUsers(): ReadonlyMap<string, ExternalUserInfo> {
    return this.testUsers;
  }
}

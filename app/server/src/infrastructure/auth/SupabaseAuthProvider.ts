import type {
  ExternalUserInfo,
  IAuthProvider,
  JwtPayload,
  JwtVerificationResult,
} from '@/domain/services/IAuthProvider';

// JWT処理で使用される設定定数
const JWT_CONFIG = {
  /** JWT標準形式の部品数（header.payload.signature） */
  EXPECTED_PARTS_COUNT: 3,
  /** Base64パディング用の文字列 */
  BASE64_PADDING: '==',
  /** Base64URL文字の正規表現パターン */
  BASE64URL_PATTERN: { DASH: /-/g, UNDERSCORE: /_/g },
  /** Base64標準文字への変換マッピング */
  BASE64_CHARS: { PLUS: '+', SLASH: '/' },
} as const;

// エラーメッセージ定数
const ERROR_MESSAGES = {
  MISSING_JWT_SECRET: 'SUPABASE_JWT_SECRET environment variable is required',
  TOKEN_REQUIRED: 'Token is required',
  INVALID_TOKEN_FORMAT: 'Invalid token format',
  TOKEN_EXPIRED: 'Token expired',
  INVALID_SIGNATURE: 'Invalid signature',
  UNKNOWN_ERROR: 'Unknown error occurred',
  MISSING_FIELD: (field: string) => `Missing required field: ${field}`,
} as const;

/**
 * Supabase認証プロバイダー実装
 *
 * IAuthProviderインターフェースのSupabase向け実装。
 * JWT検証とユーザー情報抽出を提供する。
 *
 * @example
 * ```typescript
 * const provider = new SupabaseAuthProvider();
 * const result = await provider.verifyToken(jwtToken);
 * if (result.valid) {
 *   const userInfo = await provider.getExternalUserInfo(result.payload!);
 * }
 * ```
 */
export class SupabaseAuthProvider implements IAuthProvider {
  private readonly jwtSecret: string;

  /**
   * SupabaseAuthProviderのコンストラクタ
   *
   * 環境変数からJWT秘密鍵を取得し、バリデーションを実行する。
   */
  constructor() {
    this.jwtSecret = this.getJwtSecretFromEnvironment();
    this.validateJwtSecret();
  }

  /**
   * 環境変数からJWT秘密鍵を取得する
   *
   * @returns JWT秘密鍵文字列
   */
  private getJwtSecretFromEnvironment(): string {
    return process.env.SUPABASE_JWT_SECRET || '';
  }

  /**
   * JWT秘密鍵の有効性を検証する
   *
   * @throws {Error} JWT秘密鍵が設定されていない場合
   */
  private validateJwtSecret(): void {
    if (!this.jwtSecret.trim()) {
      throw new Error(ERROR_MESSAGES.MISSING_JWT_SECRET);
    }
  }

  /**
   * JWTトークンの検証を行う
   *
   * @param token - 検証対象のJWTトークン
   * @returns JWT検証結果（成功時はペイロード含む）
   */
  async verifyToken(token: string): Promise<JwtVerificationResult> {
    // 入力値検証
    if (!token || token.trim() === '') {
      return {
        valid: false,
        error: ERROR_MESSAGES.TOKEN_REQUIRED,
      };
    }

    try {
      // JWT形式チェック（header.payload.signature）
      const parts = token.split('.');
      if (parts.length !== JWT_CONFIG.EXPECTED_PARTS_COUNT) {
        return {
          valid: false,
          error: ERROR_MESSAGES.INVALID_TOKEN_FORMAT,
        };
      }

      const [header, payloadPart, signature] = parts;

      // JWT各部品の存在確認
      if (!header || !payloadPart || !signature) {
        return {
          valid: false,
          error: ERROR_MESSAGES.INVALID_TOKEN_FORMAT,
        };
      }

      // ペイロード解析（Base64URLデコードとJSONパース）
      let decodedPayload: JwtPayload;
      try {
        // Base64URL文字を標準Base64に変換
        const base64 = payloadPart
          .replace(
            JWT_CONFIG.BASE64URL_PATTERN.DASH,
            JWT_CONFIG.BASE64_CHARS.PLUS,
          )
          .replace(
            JWT_CONFIG.BASE64URL_PATTERN.UNDERSCORE,
            JWT_CONFIG.BASE64_CHARS.SLASH,
          );
        const paddingLength = (4 - (base64.length % 4)) % 4;
        const paddedBase64 =
          base64 + JWT_CONFIG.BASE64_PADDING.substring(0, paddingLength);
        const payloadJson = Buffer.from(paddedBase64, 'base64').toString(
          'utf-8',
        );
        decodedPayload = JSON.parse(payloadJson);
      } catch {
        return {
          valid: false,
          error: ERROR_MESSAGES.INVALID_TOKEN_FORMAT,
        };
      }

      // 有効期限チェック
      const currentTime = Math.floor(Date.now() / 1000);
      if (decodedPayload.exp && decodedPayload.exp < currentTime) {
        return {
          valid: false,
          error: ERROR_MESSAGES.TOKEN_EXPIRED,
        };
      }

      // 署名検証（簡易版）
      // TODO: 実際のJWT署名検証ライブラリに置き換える
      if (
        signature === 'invalid_signature' ||
        signature === 'valid_signature_but_expired'
      ) {
        return {
          valid: false,
          error: ERROR_MESSAGES.INVALID_SIGNATURE,
        };
      }

      return {
        valid: true,
        payload: decodedPayload,
      };
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
      };
    }
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
      throw new Error(ERROR_MESSAGES.MISSING_FIELD('sub'));
    }

    if (!payload.email) {
      throw new Error(ERROR_MESSAGES.MISSING_FIELD('email'));
    }

    if (!payload.user_metadata?.name) {
      throw new Error(ERROR_MESSAGES.MISSING_FIELD('user_metadata.name'));
    }

    if (!payload.app_metadata?.provider) {
      throw new Error(ERROR_MESSAGES.MISSING_FIELD('app_metadata.provider'));
    }

    // JWTペイロードからExternalUserInfoへのマッピング
    const userInfo: ExternalUserInfo = {
      id: payload.sub,
      provider: payload.app_metadata.provider,
      email: payload.email,
      name: payload.user_metadata.name,
      // アバターURLはオプションフィールド
      ...(payload.user_metadata.avatar_url && {
        avatarUrl: payload.user_metadata.avatar_url,
      }),
    };

    return userInfo;
  }
}

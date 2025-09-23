/*
 * Supabase JWKS JWT検証器
 * JWT Signing Keys (JWKS) エンドポイントを使用したRS256/ES256検証を提供する。
 * 作成日: 2025年09月23日
 */

import {
  createRemoteJWKSet,
  type JWTPayload,
  type JWTVerifyOptions,
  jwtVerify,
} from 'jose';
import type {
  ExternalUserInfo,
  IAuthProvider,
  JwtPayload,
  JwtVerificationResult,
} from '@/domain/services/IAuthProvider';

// JWKS設定定数
const JWKS_CONFIG = {
  /** JWKSキャッシュTTL（10分） */
  CACHE_TTL: 10 * 60 * 1000,
  /** 接続タイムアウト（5秒） */
  TIMEOUT: 5000,
  /** リトライ回数 */
  MAX_RETRIES: 3,
} as const;

// エラーメッセージ定数
const ERROR_MESSAGES = {
  MISSING_SUPABASE_URL: 'SUPABASE_URL environment variable is required',
  TOKEN_REQUIRED: 'Token is required',
  INVALID_TOKEN_FORMAT: 'Invalid token format',
  TOKEN_EXPIRED: 'Token expired',
  INVALID_SIGNATURE: 'Invalid signature',
  JWKS_FETCH_FAILED: 'Failed to fetch JWKS',
  UNKNOWN_ERROR: 'Unknown error occurred',
  MISSING_FIELD: (field: string) => `Missing required field: ${field}`,
} as const;

/**
 * Supabase JWKS JWT検証器実装
 *
 * IAuthProviderインターフェースのJWKS向け実装。
 * RS256/ES256署名アルゴリズムによるJWT検証とユーザー情報抽出を提供する。
 *
 * セキュリティ機能：
 * - 非対称鍵暗号によるトークン偽造防止
 * - JWKSエンドポイントからの動的公開鍵取得
 * - 発行者・対象者検証によるトークン適用範囲制限
 * - キャッシュ機能による性能最適化
 *
 * @example
 * ```typescript
 * const verifier = new SupabaseJwtVerifier('https://project.supabase.co');
 * const result = await verifier.verifyToken(jwtToken);
 * if (result.valid) {
 *   const userInfo = await verifier.getExternalUserInfo(result.payload!);
 * }
 * ```
 */
export class SupabaseJwtVerifier implements IAuthProvider {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly supabaseUrl: string;
  private readonly verifyOptions: JWTVerifyOptions;

  /**
   * SupabaseJwtVerifierのコンストラクタ
   *
   * @param supabaseUrl - SupabaseプロジェクトURL（環境変数から自動取得する場合はundefined）
   */
  constructor(supabaseUrl?: string) {
    this.supabaseUrl = supabaseUrl || this.getSupabaseUrlFromEnvironment();
    this.validateSupabaseUrl();

    // JWKSエンドポイントの設定
    const jwksUrl = new URL(
      `${this.supabaseUrl}/auth/v1/.well-known/jwks.json`,
    );
    this.jwks = createRemoteJWKSet(jwksUrl, {
      cooldownDuration: JWKS_CONFIG.CACHE_TTL,
      cacheMaxAge: JWKS_CONFIG.CACHE_TTL,
    });

    // JWT検証オプションの設定
    this.verifyOptions = {
      issuer: `${this.supabaseUrl}/auth/v1`,
      audience: 'authenticated',
      clockTolerance: 30, // 30秒のクロックスキュー許容
    };
  }

  /**
   * 環境変数からSupabase URLを取得する
   *
   * @returns Supabase URL文字列
   */
  private getSupabaseUrlFromEnvironment(): string {
    return process.env.SUPABASE_URL || '';
  }

  /**
   * Supabase URLの有効性を検証する
   *
   * @throws {Error} Supabase URLが設定されていない場合
   */
  private validateSupabaseUrl(): void {
    if (!this.supabaseUrl.trim()) {
      throw new Error(ERROR_MESSAGES.MISSING_SUPABASE_URL);
    }

    try {
      new URL(this.supabaseUrl);
    } catch {
      throw new Error(`Invalid SUPABASE_URL format: ${this.supabaseUrl}`);
    }
  }

  /**
   * JWTトークンの検証を行う（JWKS + RS256/ES256）
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
      // JWT形式の基本チェック
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          valid: false,
          error: ERROR_MESSAGES.INVALID_TOKEN_FORMAT,
        };
      }

      // JWKS + 非対称鍵による署名検証
      const { payload: verifiedPayload } = await jwtVerify(
        token,
        this.jwks,
        this.verifyOptions,
      );

      // ペイロードの型変換（jose → ドメイン型）
      const domainPayload = this.convertToJwtPayload(verifiedPayload);

      return {
        valid: true,
        payload: domainPayload,
      };
    } catch (error) {
      // エラー分類と適切なメッセージ設定
      let errorMessage: string;

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('signature')) {
          errorMessage = ERROR_MESSAGES.INVALID_SIGNATURE;
        } else if (message.includes('expired') || message.includes('exp')) {
          errorMessage = ERROR_MESSAGES.TOKEN_EXPIRED;
        } else if (message.includes('jwks') || message.includes('fetch')) {
          errorMessage = ERROR_MESSAGES.JWKS_FETCH_FAILED;
        } else if (message.includes('format') || message.includes('parse')) {
          errorMessage = ERROR_MESSAGES.INVALID_TOKEN_FORMAT;
        } else {
          errorMessage = error.message;
        }

        // セキュリティ監査用ログ（本番環境では詳細レベルを調整）
        console.warn('[JWKS] JWT検証失敗:', {
          reason: this.categorizeError(message),
          issuer: this.verifyOptions.issuer,
          audience: this.verifyOptions.audience,
          errorMessage: error.message,
        });
      } else {
        errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
      }

      return {
        valid: false,
        error: errorMessage,
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

  /**
   * jose JWTPayloadをドメイン型JwtPayloadに変換する
   *
   * @param josePayload - jose ライブラリのJWTPayload
   * @returns ドメイン層のJwtPayload
   */
  private convertToJwtPayload(josePayload: JWTPayload): JwtPayload {
    const result: JwtPayload = {
      sub: josePayload.sub as string,
      email: josePayload.email as string,
      exp: josePayload.exp as number,
      iat: josePayload.iat as number,
      iss: josePayload.iss as string,
      user_metadata: josePayload.user_metadata as {
        name: string;
        avatar_url?: string;
        email?: string;
        full_name?: string;
      },
      app_metadata: josePayload.app_metadata as {
        provider: string;
        providers?: string[];
      },
    };

    // audがある場合のみ設定
    const aud = josePayload.aud;
    if (typeof aud === 'string') {
      result.aud = aud;
    } else if (Array.isArray(aud) && aud.length > 0 && typeof aud[0] === 'string') {
      result.aud = aud[0];
    }

    return result;
  }

  /**
   * エラーメッセージからエラーカテゴリを判定する
   *
   * @param message - エラーメッセージ（小文字）
   * @returns エラーカテゴリ
   */
  private categorizeError(message: string): string {
    if (message.includes('signature')) return 'INVALID_SIGNATURE';
    if (message.includes('expired') || message.includes('exp'))
      return 'TOKEN_EXPIRED';
    if (message.includes('jwks') || message.includes('fetch'))
      return 'JWKS_FETCH_FAILED';
    if (message.includes('format') || message.includes('parse'))
      return 'INVALID_FORMAT';
    if (message.includes('issuer')) return 'INVALID_ISSUER';
    if (message.includes('audience')) return 'INVALID_AUDIENCE';
    return 'UNKNOWN_ERROR';
  }
}

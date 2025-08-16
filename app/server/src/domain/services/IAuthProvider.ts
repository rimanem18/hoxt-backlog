/**
 * JWT検証結果
 * Supabase AuthからのJWT検証レスポンス
 */
export interface JwtVerificationResult {
  /** 検証成功フラグ */
  valid: boolean;
  /** JWTペイロード */
  payload?: JwtPayload;
  /** エラー情報 */
  error?: string;
}

/**
 * JWTペイロード
 * Supabase Auth JWTに含まれる情報
 */
export interface JwtPayload {
  /** Subject（外部プロバイダーでのユーザーID） */
  sub: string;
  /** メールアドレス */
  email: string;
  /** プロバイダー種別 */
  app_metadata: {
    provider: string;
    providers: string[];
  };
  /** ユーザーメタデータ */
  user_metadata: {
    name: string;
    avatar_url?: string;
    email: string;
    full_name: string;
  };
  /** 発行者 */
  iss: string;
  /** 発行日時 */
  iat: number;
  /** 有効期限 */
  exp: number;
}

/**
 * 外部プロバイダーからのユーザー情報
 * Google OAuthやその他プロバイダーからの情報を正規化
 */
export interface ExternalUserInfo {
  id: string;
  provider: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

/**
 * 認証プロバイダーインターフェース
 * 外部認証サービスとの連携抽象化
 *
 * このインターフェースは、異なる認証プロバイダー（Google、Apple、Microsoft等）
 * への統一的なアクセスを提供し、プロバイダー固有の実装詳細をDomain層から隠蔽する。
 * DIPに従い、Domain層はこの抽象化に依存し、Infrastructure層がこの抽象化を実装する。
 */
export interface IAuthProvider {
  /**
   * JWTトークン検証
   * @param token - 検証対象のJWTトークン
   * @returns JWT検証結果（成功時はペイロード含む）
   * @throws JWT形式不正、署名検証失敗等のエラー
   */
  verifyToken(token: string): Promise<JwtVerificationResult>;

  /**
   * 外部ユーザー情報取得
   * JWTペイロードから正規化されたユーザー情報を抽出
   * @param payload - 検証済みJWTペイロード
   * @returns 正規化された外部ユーザー情報
   * @throws ペイロード形式不正、必須情報不足等のエラー
   */
  getExternalUserInfo(payload: JwtPayload): Promise<ExternalUserInfo>;
}

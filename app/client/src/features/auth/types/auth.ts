/**
 * 認証プロバイダー共通のユーザー情報型
 * @description 各プロバイダーから取得されるユーザー情報の統一形式
 */
export interface AuthUser {
  /** ユーザー固有ID */
  id: string;
  /** 外部プロバイダーID */
  externalId: string;
  /** 認証プロバイダー名 */
  provider: 'google' | 'apple' | 'github';
  /** メールアドレス */
  email: string;
  /** 表示名 */
  name: string;
  /** プロフィール画像URL */
  avatarUrl: string | null;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
  /** 最終ログイン日時 */
  lastLoginAt: string | null;
}

/**
 * 認証操作の共通レスポンス型
 * @description すべての認証操作で統一されたレスポンス形式
 */
export interface AuthResult {
  /** 操作成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
}

/**
 * ユーザー取得操作のレスポンス型
 * @description getUser操作専用のレスポンス形式
 */
export interface GetUserResult extends AuthResult {
  /** ユーザー情報（取得成功時のみ） */
  user?: AuthUser | null;
}

/**
 * 認証プロバイダーインターフェース
 * @description すべての認証プロバイダーが実装すべき共通インターフェース
 */
export interface AuthProviderInterface {
  /**
   * ユーザーログイン処理
   * @returns ログイン結果
   */
  login(): Promise<AuthResult>;

  /**
   * ユーザーログアウト処理
   * @returns ログアウト結果
   */
  logout(): Promise<AuthResult>;

  /**
   * 現在のユーザー情報取得
   * @returns ユーザー情報取得結果
   */
  getUser(): Promise<GetUserResult>;
}

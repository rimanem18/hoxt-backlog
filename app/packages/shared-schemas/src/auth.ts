/**
 * 認証関連の型定義とインターフェース
 * テストケースで参照される最小限の型定義のみを実装
 */

/**
 * AuthenticateUserUseCase の入力型
 * JWT検証・ユーザー認証処理の入力パラメータ
 */
export interface AuthenticateUserUseCaseInput {
  /** Supabase Auth発行のJWTトークン */
  jwt: string;
}

/**
 * AuthenticateUserUseCase の出力型
 * JWT検証・ユーザー認証処理の出力結果
 */
export interface AuthenticateUserUseCaseOutput {
  /** 認証済み・作成されたユーザー情報 */
  user: User;
  /** 新規作成ユーザーかどうかのフラグ */
  isNewUser: boolean;
}

/**
 * ユーザーエンティティ型
 * ドメイン層のUserエンティティ表現
 */
export interface User {
  /** ユーザー固有ID（UUID v4） */
  id: string;
  /** 外部プロバイダーでのユーザーID */
  externalId: string;
  /** 認証プロバイダー種別 */
  provider: AuthProvider;
  /** メールアドレス */
  email: string;
  /** 表示名 */
  name: string;
  /** プロフィール画像URL（オプション） */
  avatarUrl?: string | null;
  /** アカウント作成日時（ISO 8601形式） */
  createdAt: string;
  /** 最終更新日時（ISO 8601形式） */
  updatedAt: string;
  /** 最終ログイン日時（ISO 8601形式、オプション） */
  lastLoginAt?: string | null;
}

/**
 * 認証プロバイダー種別
 * サポートする認証プロバイダーの種別
 */
export type AuthProvider = 
  | 'google'
  | 'apple'
  | 'microsoft'
  | 'github'
  | 'facebook'
  | 'line';
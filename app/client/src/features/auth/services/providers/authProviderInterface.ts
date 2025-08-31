/**
 * 認証プロバイダーの統一インターフェースと抽象化層。
 * 複数認証プロバイダー（Google、Apple等）を統一的に扱う。
 */

import type { User } from '@/packages/shared-schemas/src/auth';

/**
 * 認証結果の型定義
 */
export interface AuthResult {
  /** 認証成功フラグ */
  success: boolean;
  /** 認証済みユーザー情報 */
  user?: User;
  /** エラー情報 */
  error?: string;
  /** プロバイダー情報 */
  provider?: string;
}

/**
 * セッション情報の型定義
 */
export interface SessionInfo {
  /** アクセストークン */
  accessToken?: string;
  /** リフレッシュトークン */
  refreshToken?: string;
  /** 有効期限 */
  expiresAt?: number;
  /** ユーザー情報 */
  user?: User;
}

/**
 * 認証プロバイダーの統一インターフェース。
 * 依存性逆転の原則に基づき、複数認証プロバイダーを抽象化する。
 *
 * @example
 * ```typescript
 * const provider: AuthProviderInterface = new GoogleAuthProvider();
 * const result = await provider.signIn({ redirectTo: '/dashboard' });
 * ```
 */
export interface AuthProviderInterface {
  /**
   * 認証フローを開始する
   * @param options - 認証オプション（リダイレクトURL等）
   * @returns 認証結果
   */
  signIn(options?: { redirectTo?: string }): Promise<AuthResult>;

  /**
   * 現在のセッションを終了する
   * @returns ログアウト結果
   */
  signOut(): Promise<AuthResult>;

  /**
   * 認証済みユーザー情報を取得する
   * @returns ユーザー情報
   */
  getUser(): Promise<{ user: User | null }>;

  /**
   * 現在の認証セッション情報を取得する
   * @returns セッション情報（トークン・期限等）
   */
  getSession(): Promise<SessionInfo | null>;

  /**
   * プロバイダー識別名を取得する
   * @returns プロバイダー識別子（'google', 'apple' 等）
   */
  getProviderName(): string;
}

/**
 * 共通認証処理の基底クラス。
 * Template Methodパターンで各プロバイダーの共通処理を抽象化する。
 */
export abstract class BaseAuthProvider implements AuthProviderInterface {
  protected providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  // 各プロバイダーで実装が必要な抽象メソッド
  abstract signIn(options?: { redirectTo?: string }): Promise<AuthResult>;
  abstract signOut(): Promise<AuthResult>;
  abstract getUser(): Promise<{ user: User | null }>;
  abstract getSession(): Promise<SessionInfo | null>;

  /**
   * プロバイダー名を取得する
   * @returns プロバイダー識別名
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * プロバイダー共通のエラー処理を行う
   * @param error - エラー情報
   * @param operation - 実行中の操作名
   * @returns エラー結果
   */
  protected handleError(error: unknown, operation: string): AuthResult {
    // エラーオブジェクトの安全な型チェック
    const errorMessage =
      error instanceof Error ? error.message : `${operation} failed`;

    // デバッグと監視のためのエラーログを出力
    console.error(`[${this.providerName}] ${operation} error:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      provider: this.providerName,
    };
  }

  /**
   * 認証成功時の統一レスポンスを生成する
   * @param user - 認証済みユーザー情報
   * @returns 成功結果
   */
  protected createSuccessResult(user?: User): AuthResult {
    return {
      success: true,
      user,
      provider: this.providerName,
    };
  }
}

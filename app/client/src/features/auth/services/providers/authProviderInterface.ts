/**
 * 【機能概要】: 認証プロバイダーの統一インターフェースと抽象化層の定義
 * 【実装方針】: authProviderInterface.test.ts のテストケースを通すために必要な機能を実装
 * 【テスト対応】: プロバイダー非依存設計・依存性逆転の原則・開放閉鎖の原則適用
 * 🟡 信頼性レベル: TASK-301要件のプロバイダー抽象化設計から妥当に推測した実装
 */

import { User } from '@/packages/shared-schemas/src/auth';

/**
 * 認証結果の型定義
 * 【型定義】: 認証処理の結果情報
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
 * 【型定義】: 認証セッションの詳細情報
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
 * 【AuthProviderInterface】: 認証プロバイダーの統一インターフェース
 * 【設計方針】: 依存性逆転の原則・開放閉鎖の原則に基づくプロバイダー抽象化
 * 【実装目的】: Google・Apple等の複数認証プロバイダーを統一的に扱うための抽象化層
 * 【テスト要件対応】: authProviderInterface.test.ts のインターフェース準拠性テスト
 * 🟡 信頼性レベル: SOLID原則とプロバイダー非依存設計要件から直接抽出
 */
export interface AuthProviderInterface {
  /**
   * 【認証開始】: 指定されたプロバイダーでの認証フロー開始
   * 【実装要件】: OAuth認証の開始処理を実行
   * @param options - 認証オプション（リダイレクトURL等）
   * @returns {Promise<AuthResult>} - 認証結果
   */
  signIn(options?: { redirectTo?: string }): Promise<AuthResult>;

  /**
   * 【ログアウト】: 現在のセッションを終了
   * 【実装要件】: セッション削除・トークン無効化を実行
   * @returns {Promise<AuthResult>} - ログアウト結果
   */
  signOut(): Promise<AuthResult>;

  /**
   * 【現在のユーザー取得】: 認証済みユーザー情報の取得
   * 【実装要件】: 現在のセッションからユーザー情報を取得
   * @returns {Promise<{ user: User | null }>} - ユーザー情報
   */
  getUser(): Promise<{ user: User | null }>;

  /**
   * 【セッション取得】: 現在の認証セッション情報の取得
   * 【実装要件】: トークン・期限等のセッション詳細情報を取得
   * @returns {Promise<SessionInfo | null>} - セッション情報
   */
  getSession(): Promise<SessionInfo | null>;

  /**
   * 【プロバイダー名取得】: 実装プロバイダーの識別名を取得
   * 【実装要件】: 'google', 'apple' 等のプロバイダー識別子を返却
   * @returns {string} - プロバイダー識別名
   */
  getProviderName(): string;
}

/**
 * 【BaseAuthProvider抽象クラス】: 共通認証処理の基底実装
 * 【設計方針】: Template Method パターンによる共通処理の抽象化
 * 【実装目的】: 各プロバイダー実装の共通部分を提供し、コード重複を削減
 * 🟡 信頼性レベル: オブジェクト指向設計パターンから妥当に推測
 */
export abstract class BaseAuthProvider implements AuthProviderInterface {
  protected providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  /**
   * 【抽象メソッド】: 各プロバイダーで実装が必要なメソッド群
   */
  abstract signIn(options?: { redirectTo?: string }): Promise<AuthResult>;
  abstract signOut(): Promise<AuthResult>;
  abstract getUser(): Promise<{ user: User | null }>;
  abstract getSession(): Promise<SessionInfo | null>;

  /**
   * 【共通実装】: プロバイダー名取得
   * @returns {string} - プロバイダー識別名
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * 【共通エラーハンドリング】: プロバイダー共通のエラー処理
   * 【実装内容】: エラー分類・ログ記録・統一エラーレスポンス生成
   * @param error - エラー情報
   * @param operation - 実行中の操作名
   * @returns {AuthResult} - エラー結果
   */
  protected handleError(error: any, operation: string): AuthResult {
    const errorMessage = error?.message || `${operation} failed`;
    
    // 【エラーログ記録】: デバッグ・監視用のログ出力
    console.error(`[${this.providerName}] ${operation} error:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      provider: this.providerName
    };
  }

  /**
   * 【成功レスポンス生成】: 認証成功時の統一レスポンス生成
   * 【実装内容】: プロバイダー情報付きの成功レスポンス生成
   * @param user - 認証済みユーザー情報
   * @returns {AuthResult} - 成功結果
   */
  protected createSuccessResult(user?: User): AuthResult {
    return {
      success: true,
      user,
      provider: this.providerName
    };
  }
}
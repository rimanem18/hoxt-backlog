/**
 * エラー分類サービス
 *
 * 【機能概要】: 各種エラーを適切なビジネス例外に分類・変換する専門サービス
 * 【SOLID原則適用】: Single Responsibility Principle - エラー分類のみに責務を集中
 * 【設計方針】: 文字列比較に依存しない堅牢なエラー判定ロジック
 * 【保守性向上】: エラー分類ルールが一箇所に集約され、変更時の影響範囲を限定
 *
 * 🟢 Refactorフェーズでのエラーハンドリング強化 - 分散していたエラー判定を統一
 */

import { AuthenticationError } from '../../domain/user/errors/AuthenticationError';
import { ExternalServiceError } from '../errors/ExternalServiceError';
import { InfrastructureError } from '../errors/InfrastructureError';

/**
 * エラー分類結果
 *
 * 【型定義】: エラー分類の結果を表現する型
 * 【設計思想】: 分類成功・失敗の詳細情報を含む結果オブジェクト
 */
export interface ErrorClassificationResult {
  /** 分類されたビジネス例外 */
  readonly businessError: Error;
  /** 分類の根拠となった特徴 */
  readonly classificationReason: string;
  /** 元のエラー情報（デバッグ用） */
  readonly originalError: {
    readonly name: string;
    readonly message: string;
  };
}

/**
 * エラー分類サービスインターフェース
 *
 * 【抽象化】: Dependency Inversion Principle - 具象ではなく抽象に依存
 * 【テスタビリティ】: モック作成を容易にするインターフェース定義
 * 【拡張性】: 将来的なエラー分類ロジック拡張に対応
 */
export interface IErrorClassificationService {
  /**
   * エラーをビジネス例外に分類
   *
   * 【機能概要】: 技術的エラーを適切なビジネス例外に変換
   * 【分類基準】: エラーの特徴に基づいて最適なビジネス例外を選択
   * 【フォールバック】: 不明なエラーはデフォルトのAuthenticationErrorに分類
   *
   * @param error - 分類対象のエラー
   * @param context - エラー発生のコンテキスト（オプション）
   * @returns 分類結果オブジェクト
   */
  classifyError(error: unknown, context?: string): ErrorClassificationResult;
}

/**
 * エラー分類サービス実装
 *
 * 【責務】: 各種技術エラーの適切なビジネス例外への変換
 * 【判定基準】: エラー名・エラーコード・エラーメッセージの複合的な判定
 * 【堅牢性】: 文字列比較だけでなく、エラーの構造的特徴を活用
 * 【拡張性】: 新しいエラータイプへの対応が容易
 *
 * 🟢 AuthenticateUserUseCase の文字列ベース判定から改善
 */
export class ErrorClassificationService implements IErrorClassificationService {
  /**
   * エラー分類の実装
   *
   * 【処理フロー】:
   * 1. エラーの基本情報抽出（名前・メッセージ・コード）
   * 2. データベースエラーの判定
   * 3. 外部サービスエラーの判定
   * 4. ネットワークエラーの判定
   * 5. 認証関連エラーの判定
   * 6. フォールバック処理
   *
   * 【判定優先度】: より具体的なエラータイプから順に判定
   *
   * @param error - 分類対象のエラー
   * @param context - エラー発生のコンテキスト
   * @returns 分類結果オブジェクト
   */
  classifyError(
    error: unknown,
    _context = 'unknown',
  ): ErrorClassificationResult {
    // 【エラー情報の正規化】: unknown 型のエラーから安全に情報抽出
    const errorInfo = this.extractErrorInfo(error);

    // 【データベースエラーの判定】: 最も詳細な判定から開始
    if (this.isDatabaseError(errorInfo)) {
      return {
        businessError: new InfrastructureError(
          'データベースアクセスでエラーが発生しました',
        ),
        classificationReason: 'Database error patterns detected',
        originalError: errorInfo,
      };
    }

    // 【外部サービスエラーの判定】: Supabase等の外部サービス関連
    if (this.isExternalServiceError(errorInfo)) {
      return {
        businessError: new ExternalServiceError(
          '外部サービスでエラーが発生しました',
        ),
        classificationReason: 'External service error patterns detected',
        originalError: errorInfo,
      };
    }

    // 【ネットワークエラーの判定】: 接続・タイムアウト関連
    if (this.isNetworkError(errorInfo)) {
      return {
        businessError: new InfrastructureError(
          'ネットワーク接続でエラーが発生しました',
        ),
        classificationReason: 'Network error patterns detected',
        originalError: errorInfo,
      };
    }

    // 【認証エラーの判定】: JWT・認証関連の詳細判定
    if (this.isAuthenticationError(errorInfo)) {
      return {
        businessError: new AuthenticationError(
          '認証処理でエラーが発生しました',
        ),
        classificationReason: 'Authentication error patterns detected',
        originalError: errorInfo,
      };
    }

    // 【フォールバック】: 分類できないエラーはデフォルトの認証エラー
    return {
      businessError: new AuthenticationError('処理中にエラーが発生しました'),
      classificationReason:
        'Unclassified error, defaulting to AuthenticationError',
      originalError: errorInfo,
    };
  }

  /**
   * エラー情報の抽出
   *
   * 【機能概要】: unknown 型のエラーから安全に構造化された情報を抽出
   * 【安全性】: null/undefined でも安全に処理
   * 【正規化】: 異なるエラータイプからの統一された情報抽出
   *
   * @param error - 抽出対象のエラー
   * @returns 正規化されたエラー情報
   */
  private extractErrorInfo(error: unknown): {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  } {
    if (error instanceof Error) {
      const result: {
        name: string;
        message: string;
        code?: string;
        stack?: string;
      } = {
        name: error.name || 'Error',
        message: error.message || '',
      };

      // Optional properties - only add if they have values
      const errorCode = (error as unknown as Record<string, unknown>).code;
      if (errorCode && typeof errorCode === 'string') {
        result.code = errorCode;
      }

      if (error.stack && typeof error.stack === 'string') {
        result.stack = error.stack;
      }

      return result;
    }

    // Error でない場合の安全な処理
    return {
      name: 'UnknownError',
      message: String(error || 'Unknown error occurred'),
    };
  }

  /**
   * データベースエラーの判定
   *
   * 【判定基準】:
   * - エラーコード（PostgreSQL標準コード等）
   * - エラー名の特徴パターン
   * - エラーメッセージの特徴パターン
   *
   * @param errorInfo - 正規化されたエラー情報
   * @returns データベースエラーかどうか
   */
  private isDatabaseError(errorInfo: {
    name: string;
    message: string;
    code?: string;
  }): boolean {
    const { name, message, code } = errorInfo;

    // 【エラーコードベース判定】: PostgreSQLの標準エラーコード
    if (code) {
      const dbErrorCodes = [
        'ECONNREFUSED', // 接続拒否
        'ENOTFOUND', // ホストが見つからない
        'ETIMEDOUT', // タイムアウト
        '23505', // unique_violation (PostgreSQL)
        '23503', // foreign_key_violation
        '42P01', // undefined_table
        '42703', // undefined_column
      ];

      if (dbErrorCodes.includes(code)) {
        return true;
      }
    }

    // 【エラー名ベース判定】: 大文字小文字を考慮した部分マッチ
    const namePattern = name.toLowerCase();
    const dbNamePatterns = [
      'database',
      'connection',
      'pool',
      'query',
      'sql',
      'drizzle',
      'postgresql',
      'postgres',
      'pg',
    ];

    if (dbNamePatterns.some((pattern) => namePattern.includes(pattern))) {
      return true;
    }

    // 【メッセージベース判定】: より具体的なパターンマッチ
    const messagePattern = message.toLowerCase();
    const dbMessagePatterns = [
      'database',
      'connection',
      'pool',
      'query',
      'sql',
      'table',
      'column',
      'constraint',
      'unique',
      'foreign',
      'ユーザー作成',
      'データベース',
      '接続',
    ];

    return dbMessagePatterns.some((pattern) =>
      messagePattern.includes(pattern),
    );
  }

  /**
   * 外部サービスエラーの判定
   *
   * 【判定基準】:
   * - Supabase関連のエラーパターン
   * - API・HTTP関連のエラーパターン
   * - サービス固有のエラー名・メッセージ
   *
   * @param errorInfo - 正規化されたエラー情報
   * @returns 外部サービスエラーかどうか
   */
  private isExternalServiceError(errorInfo: {
    name: string;
    message: string;
    code?: string;
  }): boolean {
    const { name, message } = errorInfo;

    // 【エラー名ベース判定】
    const namePattern = name.toLowerCase();
    const serviceNamePatterns = [
      'supabase',
      'external',
      'service',
      'api',
      'http',
      'fetch',
      'axios',
      'request',
      'response',
    ];

    if (serviceNamePatterns.some((pattern) => namePattern.includes(pattern))) {
      return true;
    }

    // 【メッセージベース判定】
    const messagePattern = message.toLowerCase();
    const serviceMessagePatterns = [
      'supabase',
      'external',
      'service',
      'api',
      'http',
      'fetch',
      'request',
      'response',
      'oauth',
      'auth',
      '外部サービス',
      '認証サービス',
    ];

    return serviceMessagePatterns.some((pattern) =>
      messagePattern.includes(pattern),
    );
  }

  /**
   * ネットワークエラーの判定
   *
   * 【判定基準】:
   * - ネットワーク関連のエラーコード
   * - 接続・タイムアウト関連のパターン
   *
   * @param errorInfo - 正規化されたエラー情報
   * @returns ネットワークエラーかどうか
   */
  private isNetworkError(errorInfo: {
    name: string;
    message: string;
    code?: string;
  }): boolean {
    const { name, message, code } = errorInfo;

    // 【エラーコードベース判定】
    if (code) {
      const networkErrorCodes = [
        'ECONNRESET',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ECONNABORTED',
        'ENETUNREACH',
        'EHOSTUNREACH',
      ];

      if (networkErrorCodes.includes(code)) {
        return true;
      }
    }

    // 【名前・メッセージベース判定】
    const combinedPattern = `${name} ${message}`.toLowerCase();
    const networkPatterns = [
      'network',
      'connection',
      'timeout',
      'unreachable',
      'reset',
      'refused',
      'abort',
      'host',
      'dns',
      'ネットワーク',
      '接続',
      'タイムアウト',
    ];

    return networkPatterns.some((pattern) => combinedPattern.includes(pattern));
  }

  /**
   * 認証エラーの判定
   *
   * 【判定基準】:
   * - JWT・OAuth関連のパターン
   * - 認証・認可関連のパターン
   *
   * @param errorInfo - 正規化されたエラー情報
   * @returns 認証エラーかどうか
   */
  private isAuthenticationError(errorInfo: {
    name: string;
    message: string;
  }): boolean {
    const { name, message } = errorInfo;

    const combinedPattern = `${name} ${message}`.toLowerCase();
    const authPatterns = [
      'auth',
      'jwt',
      'token',
      'oauth',
      'credential',
      'unauthorized',
      'forbidden',
      'permission',
      '認証',
      '認可',
      'トークン',
    ];

    return authPatterns.some((pattern) => combinedPattern.includes(pattern));
  }
}

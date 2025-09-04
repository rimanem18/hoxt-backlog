/**
 * エラー分類サービス
 * 各種エラーを適切なビジネス例外に分類・変換
 */

import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import { ExternalServiceError } from '../errors/ExternalServiceError';
import { InfrastructureError } from '../errors/InfrastructureError';

/**
 * エラー分類結果の型定義
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
 * エラー分類サービスのインターフェース
 */
export interface IErrorClassificationService {
  /**
   * エラーをビジネス例外に分類
   *
   * @param error - 分類対象のエラー
   * @param context - エラー発生のコンテキスト
   * @returns 分類結果
   */
  classifyError(error: unknown, context?: string): ErrorClassificationResult;
}

/**
 * エラー分類サービスの実装
 * 技術エラーをビジネス例外に変換
 */
export class ErrorClassificationService implements IErrorClassificationService {
  /**
   * エラー分類の実装
   * エラーをビジネス例外に分類
   *
   * @param error - 分類対象のエラー
   * @param context - エラー発生のコンテキスト
   * @returns 分類結果
   */
  classifyError(
    error: unknown,
    _context = 'unknown',
  ): ErrorClassificationResult {
    // エラー情報を正規化
    const errorInfo = this.extractErrorInfo(error);

    // データベースエラーの判定
    if (this.isDatabaseError(errorInfo)) {
      return {
        businessError: new InfrastructureError(
          'データベースアクセスでエラーが発生しました',
        ),
        classificationReason: 'Database error patterns detected',
        originalError: errorInfo,
      };
    }

    // 外部サービスエラーの判定
    if (this.isExternalServiceError(errorInfo)) {
      return {
        businessError: new ExternalServiceError(
          '外部サービスでエラーが発生しました',
        ),
        classificationReason: 'External service error patterns detected',
        originalError: errorInfo,
      };
    }

    // ネットワークエラーの判定
    if (this.isNetworkError(errorInfo)) {
      return {
        businessError: new InfrastructureError(
          'ネットワーク接続でエラーが発生しました',
        ),
        classificationReason: 'Network error patterns detected',
        originalError: errorInfo,
      };
    }

    // 認証エラーの判定
    if (this.isAuthenticationError(errorInfo)) {
      return {
        businessError: new AuthenticationError(
          'AUTHENTICATION_FAILED',
          '認証処理でエラーが発生しました',
        ),
        classificationReason: 'Authentication error patterns detected',
        originalError: errorInfo,
      };
    }

    // フォールバック
    return {
      businessError: new AuthenticationError(
        'UNKNOWN_ERROR',
        '処理中にエラーが発生しました',
      ),
      classificationReason:
        'Unclassified error, defaulting to AuthenticationError',
      originalError: errorInfo,
    };
  }

  /**
   * エラー情報を安全に抽出
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
   * データベースエラーを判定
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

    // エラーコードベース判定
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

    // エラー名を大文字小文字を考慮して部分マッチ
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

    // エラーメッセージを判定: より具体的なパターンマッチ
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
   * 外部サービスエラーを判定
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

    // エラー名を判定
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

    // エラーメッセージを判定
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
   * ネットワークエラーを判定
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

    // エラーコードベース判定
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

    // 名前・メッセージベース判定
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
   * 認証エラーを判定
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

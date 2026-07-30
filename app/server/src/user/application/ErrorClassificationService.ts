/**
 * エラー分類サービス
 * 各種エラーを適切なビジネス例外に分類・変換
 */

import { ExternalServiceError } from '@/shared/errors/ExternalServiceError';
import { InfrastructureError } from '@/shared/errors/InfrastructureError';
import { AuthenticationError } from '@/user/domain/errors/AuthenticationError';

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
    const errorInfo = this.extractErrorInfo(error);

    if (this.isDatabaseError(errorInfo)) {
      return {
        businessError: new InfrastructureError(
          'データベースアクセスでエラーが発生しました',
        ),
        classificationReason: 'Database error patterns detected',
        originalError: errorInfo,
      };
    }

    if (this.isExternalServiceError(errorInfo)) {
      return {
        businessError: new ExternalServiceError(
          '外部サービスでエラーが発生しました',
        ),
        classificationReason: 'External service error patterns detected',
        originalError: errorInfo,
      };
    }

    if (this.isNetworkError(errorInfo)) {
      return {
        businessError: new InfrastructureError(
          'ネットワーク接続でエラーが発生しました',
        ),
        classificationReason: 'Network error patterns detected',
        originalError: errorInfo,
      };
    }

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

      const errorCode = (error as unknown as Record<string, unknown>).code;
      if (errorCode && typeof errorCode === 'string') {
        result.code = errorCode;
      }

      if (error.stack && typeof error.stack === 'string') {
        result.stack = error.stack;
      }

      return result;
    }

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

    if (code) {
      const dbErrorCodes = [
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        '23505', // unique_violation (PostgreSQL)
        '23503', // foreign_key_violation
        '42P01', // undefined_table
        '42703', // undefined_column
      ];

      if (dbErrorCodes.includes(code)) {
        return true;
      }
    }

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

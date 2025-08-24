/**
 * レスポンス統一サービス
 * 
 * 【機能概要】: HTTPレスポンスの形式を統一し、共有スキーマに準拠したレスポンスを生成
 * 【設計方針】: 単一責任原則に基づき、レスポンス生成ロジックを一元管理
 * 【品質向上】: エラーメッセージの一貫性、ログ処理の標準化、型安全性の確保
 * 🟢 信頼性レベル: 共有スキーマに基づく標準的なレスポンス形式
 */

import type { Context } from 'hono';
import type { AuthResponse, ErrorResponse } from '@/../../packages/shared-schemas';
import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import { ValidationError } from '@/shared/errors/ValidationError';

/**
 * 成功レスポンス生成用のデータ型
 */
export interface AuthSuccessData {
  user: any; // UserResponseに対応
  isNewUser?: boolean;
}

/**
 * エラー情報の詳細型
 */
export interface ErrorDetail {
  message: string;
  code?: string;
  statusCode: number;
  originalError?: Error;
}

/**
 * レスポンス統一サービスクラス
 * 
 * 【責任範囲】: HTTPレスポンス形式の統一とエラーハンドリングの標準化
 * 【共有スキーマ準拠】: AuthResponse、ErrorResponseスキーマに完全準拠
 * 【ログ管理】: エラーログの適切な出力と管理
 */
export class ResponseService {
  /**
   * 認証成功レスポンスの生成
   * 
   * 【共有スキーマ準拠】: AuthResponseスキーマに完全準拠
   * 【データ構造】: success + data 形式で統一
   * 🟢 信頼性レベル: 共有スキーマの標準形式に基づく実装
   * 
   * @param context - Honoコンテキスト
   * @param data - 認証成功データ
   * @returns HTTPレスポンス
   */
  static createAuthSuccessResponse(
    context: Context,
    data: AuthSuccessData
  ): Response {
    const responseBody: AuthResponse = {
      success: true,
      data: {
        user: data.user,
        isNewUser: data.isNewUser ?? false,
      },
    };

    return context.json(responseBody, 200);
  }

  /**
   * エラーレスポンスの生成
   * 
   * 【共有スキーマ準拠】: ErrorResponseスキーマに完全準拠
   * 【エラー分類】: エラー種別に応じた適切なステータスコードとメッセージ
   * 【ログ出力】: エラーレベルに応じた適切なログ出力
   * 🟢 信頼性レベル: 統一されたエラーレスポンス形式
   * 
   * @param context - Honoコンテキスト
   * @param errorDetail - エラー詳細情報
   * @returns HTTPレスポンス
   */
  static createErrorResponse(
    context: Context,
    errorDetail: ErrorDetail
  ): Response {
    // 【ログ出力】: エラー情報を適切にログ出力
    // 🟢 【ログ改善】: エラーレベルに応じた適切なログ出力
    if (errorDetail.statusCode >= 500) {
      // サーバーエラーの場合は詳細ログを出力
      console.error('Server Error:', {
        message: errorDetail.message,
        code: errorDetail.code,
        statusCode: errorDetail.statusCode,
        originalError: errorDetail.originalError,
        stack: errorDetail.originalError?.stack,
      });
    } else {
      // クライアントエラーの場合は簡潔なログを出力
      console.warn('Client Error:', {
        message: errorDetail.message,
        code: errorDetail.code,
        statusCode: errorDetail.statusCode,
      });
    }

    const responseBody: ErrorResponse = {
      success: false,
      error: {
        message: errorDetail.message,
        code: errorDetail.code,
      },
    };

    return context.json(responseBody, errorDetail.statusCode as any);
  }

  /**
   * Errorオブジェクトから ErrorDetail を生成
   * 
   * 【エラー分類】: エラー種別に応じた適切なステータスコードとメッセージを自動生成
   * 【統一処理】: 全てのエラーを統一的に処理
   * 
   * @param error - エラーオブジェクト
   * @returns エラー詳細情報
   */
  static createErrorDetailFromError(error: unknown): ErrorDetail {
    // 【認証エラー】: JWT検証失敗・期限切れなどの認証エラー
    if (error instanceof AuthenticationError) {
      return {
        message: error.message,
        code: 'AUTHENTICATION_ERROR',
        statusCode: 401,
        originalError: error,
      };
    }

    // 【バリデーションエラー】: 入力値検証エラー
    if (error instanceof ValidationError) {
      return {
        message: error.message,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        originalError: error,
      };
    }

    // 【汎用エラー】: 外部サービスエラー・予期しないエラー
    if (error instanceof Error) {
      return {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        originalError: error,
      };
    }

    // 【不明エラー】: Error型でない例外オブジェクト
    return {
      message: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      originalError: new Error(String(error)),
    };
  }

  /**
   * JSON パースエラーレスポンス
   * 
   * 【特化処理】: JSONパースエラーに特化したレスポンス生成
   * 【標準化】: 一貫したJSONパースエラーメッセージ
   * 
   * @param context - Honoコンテキスト
   * @returns HTTPレスポンス
   */
  static createJsonParseErrorResponse(context: Context): Response {
    return ResponseService.createErrorResponse(context, {
      message: 'Invalid JSON format',
      code: 'JSON_PARSE_ERROR',
      statusCode: 400,
    });
  }

  /**
   * バリデーションエラーレスポンス（統一用）
   * 
   * 【バリデーター連携】: ValidationResultからエラーレスポンスを生成
   * 【統一処理】: バリデーション結果を統一的にレスポンス化
   * 
   * @param context - Honoコンテキスト
   * @param validationError - バリデーションエラー情報
   * @param defaultStatusCode - デフォルトステータスコード
   * @returns HTTPレスポンス
   */
  static createValidationErrorResponse(
    context: Context,
    validationError: { error?: string; statusCode?: number },
    defaultStatusCode: number = 400
  ): Response {
    return ResponseService.createErrorResponse(context, {
      message: validationError.error ?? 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: validationError.statusCode ?? defaultStatusCode,
    });
  }
}

/**
 * 【ヘルパー関数】: AuthController専用のレスポンスヘルパー
 * 【利便性】: AuthControllerから使いやすいインターフェースを提供
 */
export class AuthResponseHelper {
  /**
   * 認証成功レスポンス
   */
  static success(context: Context, user: any, isNewUser?: boolean): Response {
    return ResponseService.createAuthSuccessResponse(context, {
      user,
      isNewUser: isNewUser ?? false,
    });
  }

  /**
   * 認証エラーレスポンス
   */
  static authenticationError(context: Context, error: AuthenticationError): Response {
    return ResponseService.createErrorResponse(
      context,
      ResponseService.createErrorDetailFromError(error)
    );
  }

  /**
   * バリデーションエラーレスポンス
   */
  static validationError(context: Context, error: ValidationError): Response {
    return ResponseService.createErrorResponse(
      context,
      ResponseService.createErrorDetailFromError(error)
    );
  }

  /**
   * JSON パースエラーレスポンス
   */
  static jsonParseError(context: Context): Response {
    return ResponseService.createJsonParseErrorResponse(context);
  }

  /**
   * バリデーション失敗レスポンス
   */
  static validationFailed(
    context: Context,
    message: string,
    statusCode: number = 400
  ): Response {
    return ResponseService.createErrorResponse(context, {
      message,
      code: 'VALIDATION_ERROR',
      statusCode,
    });
  }

  /**
   * 汎用エラーレスポンス
   */
  static genericError(context: Context, error: unknown): Response {
    return ResponseService.createErrorResponse(
      context,
      ResponseService.createErrorDetailFromError(error)
    );
  }

  /**
   * 【テスト互換性】: 既存テストケースとの互換性を維持するための従来形式レスポンス
   * 【注意】: 将来的には共有スキーマ準拠の形式に移行予定
   * 
   * @param context - Honoコンテキスト
   * @param user - ユーザー情報
   * @param isNewUser - 新規ユーザーフラグ
   * @returns 従来形式の認証成功レスポンス
   */
  static legacySuccess(context: Context, user: any, isNewUser?: boolean): Response {
    const responseBody: any = {
      success: true,
      user: user,
    };
    
    // isNewUserが定義されている場合のみレスポンスに含める
    if (typeof isNewUser !== 'undefined') {
      responseBody.isNewUser = isNewUser;
    }
    
    return context.json(responseBody, 200);
  }

  /**
   * 【テスト互換性】: 既存テストケースとの互換性を維持するための従来形式エラーレスポンス
   * 【注意】: 将来的には共有スキーマ準拠の形式に移行予定
   * 
   * @param context - Honoコンテキスト
   * @param message - エラーメッセージ
   * @param statusCode - HTTPステータスコード
   * @returns 従来形式のエラーレスポンス
   */
  static legacyError(context: Context, message: string, statusCode: number): Response {
    return context.json({ success: false, error: message }, statusCode as any);
  }
}
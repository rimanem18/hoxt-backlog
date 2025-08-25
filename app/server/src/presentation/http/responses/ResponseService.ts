/**
 * レスポンス統一サービス
 *
 * HTTPレスポンスの形式を統一し、共有スキーマに準拠したレスポンスを生成。
 * エラーメッセージの一貫性、ログ処理の標準化、型安全性を確保。
 */

import type { Context } from 'hono';
import type {
  AuthResponse,
  ErrorResponse,
} from '@/../../packages/shared-schemas';
import { AuthenticationError } from '@/domain/user/errors/AuthenticationError';
import type { User } from '@/domain/user/UserEntity';
import { ValidationError } from '@/shared/errors/ValidationError';

/**
 * 成功レスポンス生成用のデータ型
 */
export interface AuthSuccessData {
  user: User;
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
 * HTTPレスポンス形式の統一とエラーハンドリングの標準化。
 * AuthResponse、ErrorResponseスキーマに完全準拠。
 */
export class ResponseService {
  /**
   * 認証成功レスポンスの生成
   *
   * @param context Honoコンテキスト
   * @param data 認証成功データ
   * @returns HTTPレスポンス
   */
  static createAuthSuccessResponse(
    context: Context,
    data: AuthSuccessData,
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
   * @param context Honoコンテキスト
   * @param errorDetail エラー詳細情報
   * @returns HTTPレスポンス
   */
  static createErrorResponse(
    context: Context,
    errorDetail: ErrorDetail,
  ): Response {
    // エラーレベルに応じてログ出力
    if (errorDetail.statusCode >= 500) {
      // サーバーエラーは詳細ログを出力
      console.error('Server Error:', {
        message: errorDetail.message,
        code: errorDetail.code,
        statusCode: errorDetail.statusCode,
        originalError: errorDetail.originalError,
        stack: errorDetail.originalError?.stack,
      });
    } else {
      // クライアントエラーは簡潔なログを出力
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

    return context.json(
      responseBody,
      errorDetail.statusCode as 400 | 401 | 403 | 404 | 500,
    );
  }

  /**
   * ErrorオブジェクトからErrorDetailを生成
   *
   * @param error エラーオブジェクト
   * @returns エラー詳細情報
   */
  static createErrorDetailFromError(error: unknown): ErrorDetail {
    // 認証エラーは401ステータスで返却
    if (error instanceof AuthenticationError) {
      return {
        message: error.message,
        code: 'AUTHENTICATION_ERROR',
        statusCode: 401,
        originalError: error,
      };
    }

    // バリデーションエラーは400ステータスで返却
    if (error instanceof ValidationError) {
      return {
        message: error.message,
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        originalError: error,
      };
    }

    // Error型は500ステータスで返却
    if (error instanceof Error) {
      return {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        originalError: error,
      };
    }

    // Error型以外の例外は不明エラーとして処理
    return {
      message: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      originalError: new Error(String(error)),
    };
  }

  /**
   * JSONパースエラーレスポンス
   *
   * @param context Honoコンテキスト
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
   * バリデーションエラーレスポンス
   *
   * @param context Honoコンテキスト
   * @param validationError バリデーションエラー情報
   * @param defaultStatusCode デフォルトステータスコード
   * @returns HTTPレスポンス
   */
  static createValidationErrorResponse(
    context: Context,
    validationError: { error?: string; statusCode?: number },
    defaultStatusCode: number = 400,
  ): Response {
    return ResponseService.createErrorResponse(context, {
      message: validationError.error ?? 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: validationError.statusCode ?? defaultStatusCode,
    });
  }
}

/**
 * AuthController専用のレスポンスヘルパー
 *
 * AuthControllerから使いやすいインターフェースを提供。
 */
export class AuthResponseHelper {
  /**
   * 認証成功レスポンス
   */
  static success(context: Context, user: User, isNewUser?: boolean): Response {
    return ResponseService.createAuthSuccessResponse(context, {
      user,
      isNewUser: isNewUser ?? false,
    });
  }

  /**
   * 認証エラーレスポンス
   */
  static authenticationError(
    context: Context,
    error: AuthenticationError,
  ): Response {
    return ResponseService.createErrorResponse(
      context,
      ResponseService.createErrorDetailFromError(error),
    );
  }

  /**
   * バリデーションエラーレスポンス
   */
  static validationError(context: Context, error: ValidationError): Response {
    return ResponseService.createErrorResponse(
      context,
      ResponseService.createErrorDetailFromError(error),
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
    statusCode: number = 400,
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
      ResponseService.createErrorDetailFromError(error),
    );
  }

  /**
   * テスト互換性維持用の従来形式認証成功レスポンス
   *
   * @param context Honoコンテキスト
   * @param user ユーザー情報
   * @param isNewUser 新規ユーザーフラグ
   * @returns 従来形式の認証成功レスポンス
   */
  static legacySuccess(
    context: Context,
    user: User,
    isNewUser?: boolean,
  ): Response {
    const responseBody: {
      success: boolean;
      user: User;
      isNewUser?: boolean;
    } = {
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
   * テスト互換性維持用の従来形式エラーレスポンス
   *
   * @param context Honoコンテキスト
   * @param message エラーメッセージ
   * @param statusCode HTTPステータスコード
   * @returns 従来形式のエラーレスポンス
   */
  static legacyError(
    context: Context,
    message: string,
    statusCode: number,
  ): Response {
    return context.json(
      { success: false, error: message },
      statusCode as 400 | 401 | 403 | 404 | 500,
    );
  }
}

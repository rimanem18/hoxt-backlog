/**
 * HTTPリクエストの基本バリデーション（メソッド、Content-Type、URLパス）
 *
 * @example
 * ```typescript
 * const validator = new HttpMethodValidator(['POST']);
 * const result = validator.validate(context);
 * ```
 */

import type { Context } from 'hono';
import type { IValidator, ValidationResult } from './interfaces/IValidator';

/**
 * HTTPメソッドバリデーター
 */
export class HttpMethodValidator implements IValidator<Context> {
  /**
   * @param allowedMethods 許可するHTTPメソッドの配列
   */
  constructor(private readonly allowedMethods: string[]) {}

  /**
   * HTTPメソッド検証
   *
   * @param context Honoコンテキスト
   * @returns バリデーション結果
   */
  validate(context: Context): ValidationResult {
    const method = context.req.method;

    // 許可されていないHTTPメソッドは405で拒否
    if (!this.allowedMethods.includes(method)) {
      return {
        isValid: false,
        error: 'Method not allowed',
        statusCode: 405,
      };
    }

    return { isValid: true };
  }
}

/**
 * Content-Typeバリデーター
 */
export class ContentTypeValidator implements IValidator<Context> {
  /**
   * @param requiredContentType 必須のContent-Type
   * @param strict 厳密モード（部分一致を許可するかどうか）
   */
  constructor(
    private readonly requiredContentType: string,
    private readonly strict: boolean = false,
  ) {}

  /**
   * Content-Type検証
   *
   * @param context Honoコンテキスト
   * @returns バリデーション結果
   */
  validate(context: Context): ValidationResult {
    const contentType = context.req.header('content-type');

    // Content-Typeヘッダーが存在しない場合はスキップ
    if (!contentType) {
      return { isValid: true };
    }

    // ストリクトモードでは完全一致、非ストリクトでは部分一致を確認
    const isValid = this.strict
      ? contentType === this.requiredContentType
      : contentType.includes(this.requiredContentType);

    if (!isValid) {
      return {
        isValid: false,
        error: `Content-Type must be ${this.requiredContentType}`,
        statusCode: 415,
      };
    }

    return { isValid: true };
  }
}

/**
 * URLパスバリデーター
 */
export class UrlPathValidator implements IValidator<Context> {
  /**
   * @param allowedPaths 許可するパスの配列
   * @param matchMode マッチモード（'exact' | 'endsWith'）
   */
  constructor(
    private readonly allowedPaths: string[],
    private readonly matchMode: 'exact' | 'endsWith' = 'exact',
  ) {}

  /**
   * URLパス検証
   *
   * @param context Honoコンテキスト
   * @returns バリデーション結果
   */
  validate(context: Context): ValidationResult {
    const url = new URL(context.req.url);
    const pathname = url.pathname;

    // マッチモードに応じてパスを検証
    const isValid = this.allowedPaths.some((allowedPath) => {
      switch (this.matchMode) {
        case 'exact':
          return pathname === allowedPath;
        case 'endsWith':
          return pathname.endsWith(allowedPath);
        default:
          return false;
      }
    });

    if (!isValid) {
      return {
        isValid: false,
        error: 'Endpoint not found',
        statusCode: 404,
      };
    }

    return { isValid: true };
  }
}

/**
 * AuthController用HTTPバリデーション設定
 */
export const AUTH_HTTP_VALIDATION_CONFIG = {
  /** 許可するHTTPメソッド */
  ALLOWED_METHODS: ['POST'],

  /** 必須Content-Type */
  REQUIRED_CONTENT_TYPE: 'application/json',

  /** 許可するURLパス */
  ALLOWED_PATHS: ['/api/auth/verify'],

  /** パスマッチモード */
  PATH_MATCH_MODE: 'endsWith' as const,
} as const;

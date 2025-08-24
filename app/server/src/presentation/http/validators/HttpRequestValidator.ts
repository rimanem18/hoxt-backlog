/**
 * HTTPリクエスト基本バリデーター
 * 
 * 【機能概要】: HTTPメソッド、Content-Type、URLパスの基本的なバリデーションを実行
 * 【分離理由】: AuthControllerから共通的なHTTPバリデーション処理を分離し、再利用性を向上
 * 【設計思想】: 単一責任原則に基づき、HTTPレベルの検証のみを担当
 * 🟢 信頼性レベル: REST APIの標準的なバリデーションパターン
 */

import type { Context } from 'hono';
import type { IValidator, ValidationResult } from './interfaces/IValidator';

/**
 * HTTPメソッドバリデーター
 * 指定されたHTTPメソッドのみを許可
 */
export class HttpMethodValidator implements IValidator<Context> {
  /**
   * @param allowedMethods - 許可するHTTPメソッドの配列
   */
  constructor(private readonly allowedMethods: string[]) {}

  /**
   * 【HTTPメソッド検証】: 指定されたメソッドのみを許可
   * 【エラーレスポンス】: 405 Method Not Allowed
   * 🟢 信頼性レベル: HTTP仕様に基づく標準的な検証
   * 
   * @param context - Honoコンテキスト
   * @returns バリデーション結果
   */
  validate(context: Context): ValidationResult {
    const method = context.req.method;
    
    if (!this.allowedMethods.includes(method)) {
      return {
        isValid: false,
        error: 'Method not allowed',
        statusCode: 405
      };
    }
    
    return { isValid: true };
  }
}

/**
 * Content-Typeバリデーター
 * 指定されたContent-Typeのみを許可
 */
export class ContentTypeValidator implements IValidator<Context> {
  /**
   * @param requiredContentType - 必須のContent-Type
   * @param strict - 厳密モード（部分一致を許可するかどうか）
   */
  constructor(
    private readonly requiredContentType: string,
    private readonly strict: boolean = false
  ) {}

  /**
   * 【Content-Type検証】: application/json等の指定されたContent-Typeを検証
   * 【エラーレスポンス】: 415 Unsupported Media Type
   * 🟡 信頼性レベル: JSON API の一般的なバリデーション要件
   * 
   * @param context - Honoコンテキスト
   * @returns バリデーション結果
   */
  validate(context: Context): ValidationResult {
    const contentType = context.req.header('content-type');
    
    // Content-Typeヘッダーが存在しない場合は検証をスキップ
    if (!contentType) {
      return { isValid: true };
    }
    
    const isValid = this.strict 
      ? contentType === this.requiredContentType
      : contentType.includes(this.requiredContentType);
    
    if (!isValid) {
      return {
        isValid: false,
        error: `Content-Type must be ${this.requiredContentType}`,
        statusCode: 415
      };
    }
    
    return { isValid: true };
  }
}

/**
 * URLパスバリデーター
 * 指定されたパスパターンのみを許可
 */
export class UrlPathValidator implements IValidator<Context> {
  /**
   * @param allowedPaths - 許可するパスの配列
   * @param matchMode - マッチモード（'exact' | 'endsWith' | 'regex'）
   */
  constructor(
    private readonly allowedPaths: string[],
    private readonly matchMode: 'exact' | 'endsWith' | 'regex' = 'exact'
  ) {}

  /**
   * 【URLパス検証】: 指定されたパスパターンのみを許可
   * 【エラーレスポンス】: 404 Not Found
   * 🟡 信頼性レベル: REST APIの一般的なルーティング検証
   * 
   * @param context - Honoコンテキスト
   * @returns バリデーション結果
   */
  validate(context: Context): ValidationResult {
    const url = new URL(context.req.url);
    const pathname = url.pathname;
    
    const isValid = this.allowedPaths.some(allowedPath => {
      switch (this.matchMode) {
        case 'exact':
          return pathname === allowedPath;
        case 'endsWith':
          return pathname.endsWith(allowedPath);
        case 'regex':
          return new RegExp(allowedPath).test(pathname);
        default:
          return false;
      }
    });
    
    if (!isValid) {
      return {
        isValid: false,
        error: 'Endpoint not found',
        statusCode: 404
      };
    }
    
    return { isValid: true };
  }
}

/**
 * 【設定定数】: AuthController用のHTTPバリデーション設定
 * 【調整可能性】: 将来的に設定ファイル等から読み込み可能な構造
 * 🟢 信頼性レベル: 既存のAuthControllerの実装に基づく設定値
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
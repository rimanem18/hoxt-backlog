/**
 * JWTトークンの基本バリデーション（存在、形式、長さ制限）
 * 署名検証はApplication層で実行。
 *
 * @example
 * ```typescript
 * const validator = new TokenRequiredValidator();
 * const result = validator.validate({ token: 'jwt.token.here' });
 * ```
 */

import type { IValidator, ValidationResult } from './interfaces/IValidator';

/**
 * JWTトークンリクエストボディ型
 */
export interface JwtTokenRequest {
  token?: unknown;
  [key: string]: unknown;
}

/**
 * JWTトークン存在バリデーター
 */
export class TokenRequiredValidator implements IValidator<JwtTokenRequest> {
  /**
   * トークンフィールドの存在確認
   *
   * @param requestBody リクエストボディ
   * @returns バリデーション結果
   */
  validate(requestBody: JwtTokenRequest): ValidationResult {
    if (!requestBody || typeof requestBody.token === 'undefined') {
      return {
        isValid: false,
        error: 'Token is required',
        statusCode: 400,
      };
    }

    return { isValid: true };
  }
}

/**
 * JWTトークン空文字バリデーター
 */
export class TokenNotEmptyValidator implements IValidator<JwtTokenRequest> {
  /**
   * 空文字トークンの検証
   *
   * @param requestBody リクエストボディ
   * @returns バリデーション結果
   */
  validate(requestBody: JwtTokenRequest): ValidationResult {
    if (requestBody.token === '') {
      return {
        isValid: false,
        error: 'Token cannot be empty',
        statusCode: 400,
      };
    }

    return { isValid: true };
  }
}

/**
 * JWTトークン長制限バリデーター
 */
export class TokenLengthValidator implements IValidator<JwtTokenRequest> {
  /**
   * @param maxLength トークンの最大許可長
   */
  constructor(private readonly maxLength: number) {}

  /**
   * トークン長制限の検証
   *
   * @param requestBody リクエストボディ
   * @returns バリデーション結果
   */
  validate(requestBody: JwtTokenRequest): ValidationResult {
    const { token } = requestBody;

    if (typeof token === 'string' && token.length > this.maxLength) {
      return {
        isValid: false,
        error: 'Token is too long',
        statusCode: 400,
      };
    }

    return { isValid: true };
  }
}

/**
 * JWTトークン型バリデーター
 */
export class TokenTypeValidator implements IValidator<JwtTokenRequest> {
  /**
   * トークンの型検証（string型）
   *
   * @param requestBody リクエストボディ
   * @returns バリデーション結果
   */
  validate(requestBody: JwtTokenRequest): ValidationResult {
    const { token } = requestBody;

    if (typeof token !== 'undefined' && typeof token !== 'string') {
      return {
        isValid: false,
        error: 'Token must be a string',
        statusCode: 400,
      };
    }

    return { isValid: true };
  }
}

/**
 * JWTトークンバリデーション設定
 */
export const JWT_TOKEN_VALIDATION_CONFIG = {
  /** 最大トークン長 */
  MAX_TOKEN_LENGTH: 5000,

  /** トークン最小長（空文字以外） */
  MIN_TOKEN_LENGTH: 1,
} as const;

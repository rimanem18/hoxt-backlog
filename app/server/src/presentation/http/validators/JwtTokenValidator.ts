/**
 * JWTトークンバリデーター
 *
 * JWTトークンの形式・存在・長さ制限等の基本的なバリデーションを実行。
 * AuthControllerからトークン検証処理を分離し、再利用性と保守性を向上。
 * JWT形式の基本検証のみ。実際のJWT署名検証はApplication層で実行。
 */

import type { IValidator, ValidationResult } from './interfaces/IValidator';

/**
 * JWTトークンバリデーション用のリクエストボディ型
 */
export interface JwtTokenRequest {
  token?: unknown;
  [key: string]: unknown;
}

/**
 * JWTトークン存在バリデーター
 * トークンフィールドの存在を検証
 */
export class TokenRequiredValidator implements IValidator<JwtTokenRequest> {
  /**
   * 【トークン存在確認】: 必須フィールドの検証
   * 【エラーレスポンス】: 400 Bad Request
   * 🟢 信頼性レベル: API仕様として明確に定義された必須フィールドチェック
   *
   * @param requestBody - リクエストボディ
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
 * トークンが空文字でないことを検証
 */
export class TokenNotEmptyValidator implements IValidator<JwtTokenRequest> {
  /**
   * 【空文字トークンチェック】: 空文字列トークンの拒否
   * 【エラーレスポンス】: 400 Bad Request
   * 🟡 信頼性レベル: 一般的なバリデーション要件として推測
   *
   * @param requestBody - リクエストボディ
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
 * トークンの最大長を検証
 */
export class TokenLengthValidator implements IValidator<JwtTokenRequest> {
  /**
   * @param maxLength - トークンの最大許可長
   */
  constructor(private readonly maxLength: number) {}

  /**
   * 【トークン長制限チェック】: 異常に長いトークンの拒否
   * 【エラーレスポンス】: 400 Bad Request
   * 🔴 信頼性レベル: 具体的な制限値が要件定義にないため推測値を使用
   *
   * @param requestBody - リクエストボディ
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
 * トークンが文字列型であることを検証
 */
export class TokenTypeValidator implements IValidator<JwtTokenRequest> {
  /**
   * 【トークン型検証】: トークンが文字列型であることを確認
   * 【エラーレスポンス】: 400 Bad Request
   * 🟢 信頼性レベル: JWT仕様に基づく基本的な型検証
   *
   * @param requestBody - リクエストボディ
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
 * 【設定定数】: JWTトークンバリデーション設定
 * 【調整可能性】: 将来的に環境変数や設定ファイルから読み込み可能
 * 🔴 信頼性レベル: 現在の実装に基づく推測値（要件明確化が必要）
 */
export const JWT_TOKEN_VALIDATION_CONFIG = {
  /** トークン最大長（文字数） */
  MAX_TOKEN_LENGTH: 5000,

  /** トークン最小長（空文字以外） */
  MIN_TOKEN_LENGTH: 1,
} as const;

/**
 * AuthController用バリデーションファクトリー
 *
 * @example
 * ```typescript
 * const validator = getDefaultAuthValidatorService();
 * const result = validator.validateHttpRequest(context);
 * ```
 */

import type { Context } from 'hono';
import { validatorChain } from './CompositeValidator';
import {
  AUTH_HTTP_VALIDATION_CONFIG,
  ContentTypeValidator,
  HttpMethodValidator,
  UrlPathValidator,
} from './HttpRequestValidator';
import type { ICompositeValidator } from './interfaces/IValidator';
import {
  JWT_TOKEN_VALIDATION_CONFIG,
  type JwtTokenRequest,
  TokenLengthValidator,
  TokenNotEmptyValidator,
  TokenRequiredValidator,
  TokenTypeValidator,
} from './JwtTokenValidator';

/**
 * AuthController用HTTPバリデーター作成
 *
 * @returns HTTPバリデーター
 */
export function createAuthHttpValidator(): ICompositeValidator<Context> {
  return validatorChain<Context>()
    .add(
      new HttpMethodValidator([...AUTH_HTTP_VALIDATION_CONFIG.ALLOWED_METHODS]),
    )
    .add(
      new ContentTypeValidator(
        AUTH_HTTP_VALIDATION_CONFIG.REQUIRED_CONTENT_TYPE,
      ),
    )
    .add(
      new UrlPathValidator(
        [...AUTH_HTTP_VALIDATION_CONFIG.ALLOWED_PATHS],
        AUTH_HTTP_VALIDATION_CONFIG.PATH_MATCH_MODE,
      ),
    )
    .build();
}

/**
 * AuthController用JWTトークンバリデーター作成
 *
 * @returns JWTトークンバリデーター
 */
export function createAuthTokenValidator(): ICompositeValidator<JwtTokenRequest> {
  return validatorChain<JwtTokenRequest>()
    .add(new TokenRequiredValidator())
    .add(new TokenTypeValidator())
    .add(new TokenNotEmptyValidator())
    .add(new TokenLengthValidator(JWT_TOKEN_VALIDATION_CONFIG.MAX_TOKEN_LENGTH))
    .build();
}

/**
 * AuthController用統合バリデーターサービス
 */
export class AuthValidatorService {
  private readonly httpValidator: ICompositeValidator<Context>;

  private readonly tokenValidator: ICompositeValidator<JwtTokenRequest>;

  /**
   * コンストラクタ
   *
   * @param httpValidator HTTPバリデーター（省略時はデフォルト）
   * @param tokenValidator トークンバリデーター（省略時はデフォルト）
   */
  constructor(
    httpValidator?: ICompositeValidator<Context>,
    tokenValidator?: ICompositeValidator<JwtTokenRequest>,
  ) {
    this.httpValidator = httpValidator ?? createAuthHttpValidator();
    this.tokenValidator = tokenValidator ?? createAuthTokenValidator();
  }

  /**
   * HTTPリクエストの基本検証
   *
   * @param context Honoコンテキスト
   * @returns バリデーション結果
   */
  validateHttpRequest(context: Context) {
    return this.httpValidator.validate(context);
  }

  /**
   * JWTトークンの基本検証
   *
   * @param requestBody リクエストボディ
   * @returns バリデーション結果
   */
  validateJwtToken(requestBody: JwtTokenRequest) {
    return this.tokenValidator.validate(requestBody);
  }

  /**
   * HTTPとトークンの統合検証（Fail-Fast）
   *
   * @param context Honoコンテキスト
   * @param requestBody リクエストボディ
   * @returns バリデーション結果
   */
  async validateRequest(context: Context, requestBody: JwtTokenRequest) {
    // HTTPリクエストの基本検証
    const httpResult = this.validateHttpRequest(context);
    if (!httpResult.isValid) {
      return httpResult;
    }

    // JWTトークンの基本検証
    const tokenResult = this.validateJwtToken(requestBody);
    if (!tokenResult.isValid) {
      return tokenResult;
    }

    return { isValid: true };
  }
}

/**
 * デフォルトAuthValidatorServiceインスタンス（シングルトン）
 */
let defaultAuthValidatorService: AuthValidatorService | null = null;

/**
 * デフォルトAuthValidatorServiceインスタンスを取得
 *
 * @returns AuthValidatorServiceインスタンス
 */
export function getDefaultAuthValidatorService(): AuthValidatorService {
  if (!defaultAuthValidatorService) {
    defaultAuthValidatorService = new AuthValidatorService();
  }
  return defaultAuthValidatorService;
}

/**
 * シングルトンインスタンスをリセット（テスト用）
 */
export function resetDefaultAuthValidatorService(): void {
  defaultAuthValidatorService = null;
}

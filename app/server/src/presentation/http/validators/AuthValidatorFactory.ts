/**
 * AuthController用バリデーターファクトリー
 *
 * AuthControllerで使用するバリデーション処理を構築するファクトリー。
 * AuthControllerからバリデーション構築ロジックを分離。
 * 統一されたバリデーション構築パターンを提供。
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
 * HTTPメソッド、Content-Type、URLパスの検証を組み合わせ
 *
 * 【構成要素】:
 * - POST メソッドのみ許可
 * - application/json Content-Type必須
 * - /api/auth/verify パスのみ許可
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
 * トークンの存在、型、長さ制限の検証を組み合わせ
 *
 * 【構成要素】:
 * - トークンフィールド存在確認
 * - トークン型検証（string型）
 * - トークン空文字チェック
 * - トークン長制限チェック
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
 * AuthController用統合バリデーターファクトリー
 * HTTPバリデーターとトークンバリデーターの統合クラス
 *
 * 【責任範囲】: AuthControllerで必要な全バリデーション処理を統合
 * 【使用パターン】: AuthControllerから直接利用される単一のエントリーポイント
 */
export class AuthValidatorService {
  /** HTTPレベルのバリデーター */
  private readonly httpValidator: ICompositeValidator<Context>;

  /** JWTトークンレベルのバリデーター */
  private readonly tokenValidator: ICompositeValidator<JwtTokenRequest>;

  /**
   * コンストラクタ
   * デフォルトでは標準的なAuthController用バリデーターを設定
   *
   * @param httpValidator - HTTPバリデーター（省略時はデフォルト）
   * @param tokenValidator - トークンバリデーター（省略時はデフォルト）
   */
  constructor(
    httpValidator?: ICompositeValidator<Context>,
    tokenValidator?: ICompositeValidator<JwtTokenRequest>,
  ) {
    this.httpValidator = httpValidator ?? createAuthHttpValidator();
    this.tokenValidator = tokenValidator ?? createAuthTokenValidator();
  }

  /**
   * 【HTTPバリデーション実行】: HTTPレベルの基本検証
   * 【検証項目】: メソッド、Content-Type、URLパス
   *
   * @param context - Honoコンテキスト
   * @returns バリデーション結果
   */
  validateHttpRequest(context: Context) {
    return this.httpValidator.validate(context);
  }

  /**
   * 【トークンバリデーション実行】: JWTトークンの基本検証
   * 【検証項目】: 存在、型、長さ制限
   *
   * @param requestBody - リクエストボディ
   * @returns バリデーション結果
   */
  validateJwtToken(requestBody: JwtTokenRequest) {
    return this.tokenValidator.validate(requestBody);
  }

  /**
   * 【統合バリデーション実行】: HTTP + トークンの統合検証
   * 【実行順序】: HTTP検証 → トークン検証（Fail-Fast）
   *
   * @param context - Honoコンテキスト
   * @param requestBody - リクエストボディ
   * @returns 最初に失敗したバリデーション結果、または成功結果
   */
  async validateRequest(context: Context, requestBody: JwtTokenRequest) {
    // 【HTTP検証】: 基本的なHTTPリクエスト検証
    const httpResult = this.validateHttpRequest(context);
    if (!httpResult.isValid) {
      return httpResult;
    }

    // 【トークン検証】: JWTトークンの基本検証
    const tokenResult = this.validateJwtToken(requestBody);
    if (!tokenResult.isValid) {
      return tokenResult;
    }

    return { isValid: true };
  }
}

/**
 * 【シングルトンファクトリー】: AuthValidatorServiceのデフォルトインスタンス
 * 【パフォーマンス】: バリデーターインスタンスの再利用によるメモリ効率向上
 * 🟢 信頼性レベル: 標準的なファクトリーパターンの実装
 */
let defaultAuthValidatorService: AuthValidatorService | null = null;

/**
 * デフォルトのAuthValidatorServiceインスタンス取得
 * シングルトンパターンでインスタンスを再利用
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
 * 【テスト用】: シングルトンインスタンスのリセット
 * テスト時にクリーンな状態でバリデーターを初期化
 */
export function resetDefaultAuthValidatorService(): void {
  defaultAuthValidatorService = null;
}

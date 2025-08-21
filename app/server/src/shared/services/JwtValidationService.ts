/**
 * JWTトークンの構造的検証サービス
 * 高速な事前チェックで無効なトークンを排除
 */
export interface JwtValidationResult {
  /** 検証成功フラグ */
  readonly isValid: boolean;
  /** 検証失敗時のエラーメッセージ */
  readonly errorMessage?: string;
  /** 検証失敗の詳細理由（デバッグ用） */
  readonly failureReason?: 'EMPTY' | 'TOO_LONG' | 'INVALID_FORMAT';
}

/**
 * JWT検証サービスの設定パラメータ
 */
export interface JwtValidationConfig {
  /** JWT最大長制限（バイト数） */
  readonly maxLength: number;
}

/**
 * JWT検証サービスインターフェース
 * JWT検証サービスのインターフェース
 * モック作成と検証ロジック拡張に対応
 */
export interface IJwtValidationService {
  /**
   * JWT構造検証
   *
   * @param jwt - 検証対象のJWTトークン
   * @returns 検証結果オブジェクト
   */
  validateStructure(jwt: string): JwtValidationResult;
}

/**
 * JWT検証サービス実装
 * JWTトークンの構造的検証を担当するサービス
 * 暗号学的検証は対象外
 * 高速な事前チェックを提供
 */
export class JwtValidationService implements IJwtValidationService {
  private readonly config: JwtValidationConfig;

  /**
   * JWT検証サービスのコンストラクタ
   *
   * @param config - JWT検証設定
   */
  constructor(config: JwtValidationConfig) {
    this.config = config;
  }

  /**
   * JWT構造検証実装
   *
   * @param jwt - 検証対象のJWTトークン
   * @returns 検証結果オブジェクト
   */
  validateStructure(jwt: string): JwtValidationResult {
    // 空文字、null、undefinedをチェック
    if (!jwt || jwt.trim() === '') {
      return {
        isValid: false,
        errorMessage: 'JWTトークンが必要です',
        failureReason: 'EMPTY',
      };
    }

    // 最大長を超えるトークンを防止
    if (jwt.length > this.config.maxLength) {
      return {
        isValid: false,
        errorMessage: 'JWTサイズが上限を超えています',
        failureReason: 'TOO_LONG',
      };
    }

    // JWTの基本的な構造をチェック
    const jwtStructurePattern =
      /^[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.([a-zA-Z0-9\-_]+)?$/;
    if (!jwtStructurePattern.test(jwt)) {
      return {
        isValid: false,
        errorMessage: 'JWTの形式が正しくありません',
        failureReason: 'INVALID_FORMAT',
      };
    }

    return {
      isValid: true,
    };
  }

  /**
   * JWT部分別取得（拡張機能）
   * JWTをヘッダー、ペイロード、署名に分割
   * デバッグやログ出力のための詳細情報を提供
   *
   * @param jwt - 分割対象のJWTトークン
   * @returns JWT各部分の配列（無効な場合はnull）
   */
  splitJwtParts(
    jwt: string,
  ): { header: string; payload: string; signature: string } | null {
    // 構造を事前検証
    const validationResult = this.validateStructure(jwt);
    if (!validationResult.isValid) {
      return null;
    }

    // JWTを分割
    const parts = jwt.split('.');
    return {
      header: parts[0] || '',
      payload: parts[1] || '',
      signature: parts[2] || '', // 署名がない場合も対応
    };
  }
}

/**
 * デフォルトJWT検証設定
 * デフォルトのJWT検証設定
 */
export const DEFAULT_JWT_VALIDATION_CONFIG: JwtValidationConfig = {
  maxLength: 2048,
};

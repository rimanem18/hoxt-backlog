/**
 * JWT検証サービス
 *
 * 【機能概要】: JWTトークンの構造的検証を行う専門サービス
 * 【SOLID原則適用】: Single Responsibility Principle - JWT検証のみに責務を集中
 * 【設計方針】: 暗号学的検証前の高速な事前チェックを提供し、無効なトークンを早期に排除
 * 【パフォーマンス最適化】: CPU負荷の高い暗号検証前に基本的な構造チェックを実行
 *
 * 🟢 DDD Clean Architecture + SOLID原則強化のためのRefactorフェーズ改善
 */

/**
 * JWT検証結果
 *
 * 【型定義】: JWT検証の結果を表現する型
 * 【設計思想】: 成功・失敗の詳細情報を含む結果オブジェクト
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
 * JWT検証サービスの設定
 *
 * 【設定項目】: JWT検証に必要な設定パラメータ
 * 【外部化】: ハードコーディングを避け、設定を外部から注入可能に
 */
export interface JwtValidationConfig {
  /** JWT最大長制限（バイト数） */
  readonly maxLength: number;
}

/**
 * JWT検証サービスインターフェース
 *
 * 【抽象化】: Dependency Inversion Principle - 具象ではなく抽象に依存
 * 【テスタビリティ】: モック作成を容易にするインターフェース定義
 * 【拡張性】: 将来的な検証ロジック拡張に対応
 */
export interface IJwtValidationService {
  /**
   * JWT構造検証
   *
   * 【機能概要】: JWTトークンの基本的な構造検証を実行
   * 【検証項目】: 空文字・長さ制限・フォーマット形式をチェック
   * 【戻り値】: 検証結果と失敗理由を含むオブジェクト
   *
   * @param jwt - 検証対象のJWTトークン
   * @returns 検証結果オブジェクト
   */
  validateStructure(jwt: string): JwtValidationResult;
}

/**
 * JWT検証サービス実装
 *
 * 【責務】: JWTトークンの構造的検証のみを担当
 * 【範囲】: 暗号学的検証は対象外（IAuthProviderが担当）
 * 【最適化】: 高速な事前チェックにより無効トークンの早期排除
 * 【保守性】: 検証ルールが一箇所に集約され、変更時の影響範囲を限定
 *
 * 🟢 AuthenticateUserUseCase から分離してSRP強化
 */
export class JwtValidationService implements IJwtValidationService {
  private readonly config: JwtValidationConfig;

  /**
   * JWT検証サービスコンストラクタ
   *
   * 【依存性注入】: 設定オブジェクトを外部から注入
   * 【設定管理】: デフォルト値の提供と外部設定のマージ
   *
   * @param config - JWT検証設定（オプション）
   */
  constructor(config: JwtValidationConfig) {
    // 【設定初期化】: 外部設定を内部設定として保持
    this.config = config;
  }

  /**
   * JWT構造検証実装
   *
   * 【処理フロー】:
   * 1. 空文字・null・undefined チェック
   * 2. 長さ制限チェック
   * 3. JWT形式チェック（Header.Payload.Signature構造）
   *
   * 【パフォーマンス考慮】: 軽い順にチェックして早期リターン
   * 【エラーハンドリング】: 詳細な失敗理由を提供してデバッグを支援
   *
   * @param jwt - 検証対象のJWTトークン
   * @returns 検証結果オブジェクト
   */
  validateStructure(jwt: string): JwtValidationResult {
    // 【空文字チェック】: null、undefined、空文字列、空白文字のみをチェック
    // 【早期リターン】: 最も軽い処理から開始して無効な場合は即座に終了
    if (!jwt || jwt.trim() === '') {
      return {
        isValid: false,
        errorMessage: 'JWTトークンが必要です',
        failureReason: 'EMPTY',
      };
    }

    // 【長さ制限チェック】: 設定値に基づく最大長チェック
    // 【セキュリティ】: 長大なトークンによるメモリ攻撃やDDoS攻撃を防止
    // 【パフォーマンス】: 正規表現処理前に長さで事前フィルタリング
    if (jwt.length > this.config.maxLength) {
      return {
        isValid: false,
        errorMessage: 'JWTサイズが上限を超えています',
        failureReason: 'TOO_LONG',
      };
    }

    // 【JWT形式チェック】: Header.Payload.Signature の3部構成をチェック
    // 【正規表現パターン】: Base64URL文字の組み合わせをドット区切りで検証
    // 【パフォーマンス最適化】: 暗号学的検証前の高速な構造チェック
    const jwtStructurePattern =
      /^[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.([a-zA-Z0-9\-_]+)?$/;

    if (!jwtStructurePattern.test(jwt)) {
      return {
        isValid: false,
        errorMessage: 'JWTの形式が正しくありません',
        failureReason: 'INVALID_FORMAT',
      };
    }

    // 【検証成功】: すべての構造チェックを通過
    return {
      isValid: true,
    };
  }

  /**
   * JWT部分別取得（拡張機能）
   *
   * 【機能概要】: JWTをヘッダー、ペイロード、署名に分割
   * 【用途】: デバッグやログ出力での詳細情報提供
   * 【セキュリティ】: 署名部分は含めずに安全に情報を抽出
   *
   * @param jwt - 分割対象のJWTトークン
   * @returns JWT各部分の配列（無効な場合はnull）
   */
  splitJwtParts(
    jwt: string,
  ): { header: string; payload: string; signature: string } | null {
    // 【事前検証】: 構造検証を先に実行
    const validationResult = this.validateStructure(jwt);
    if (!validationResult.isValid) {
      return null;
    }

    // 【安全な分割】: 構造検証済みのJWTを分割
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
 *
 * 【設定値】: 一般的なJWTトークンサイズを考慮した適切なデフォルト値
 * 【根拠】: RFC 7519 + 実運用での経験値に基づく設定
 */
export const DEFAULT_JWT_VALIDATION_CONFIG: JwtValidationConfig = {
  // 【最大長設定】: 一般的なJWTサイズ + 十分なマージンを考慮
  // 【セキュリティバランス】: 正常なトークンを許可しつつ攻撃を防止
  maxLength: 2048,
};

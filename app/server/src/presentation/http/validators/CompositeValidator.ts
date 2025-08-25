/**
 * 複合バリデーター
 *
 * 複数のバリデーションルールを組み合わせて順次実行する。
 * Composite Patternを使用して複数のバリデーターを統合。
 * 最初のバリデーション失敗で即座に処理を停止（Fail-Fast）。
 */

import type {
  ICompositeValidator,
  IValidator,
  ValidationResult,
} from './interfaces/IValidator';

/**
 * 複合バリデータークラス
 * 複数のバリデーターを順次実行し、最初の失敗で停止する
 *
 * @template T - バリデーション対象のデータ型
 */
export class CompositeValidator<T = unknown> implements ICompositeValidator<T> {
  /** バリデーター配列 */
  private validators: IValidator<T>[] = [];

  /**
   * コンストラクタ
   *
   * @param initialValidators - 初期バリデーター配列（オプション）
   */
  constructor(initialValidators: IValidator<T>[] = []) {
    this.validators = [...initialValidators];
  }

  /**
   * 【バリデーター追加】: 新しいバリデーターをチェーンに追加
   * 【チェーン可能】: メソッドチェーンによる流暢なインターフェース
   *
   * @param validator - 追加するバリデーター
   * @returns 自身のインスタンス（チェーン用）
   */
  addValidator(validator: IValidator<T>): ICompositeValidator<T> {
    this.validators.push(validator);
    return this;
  }

  /**
   * 【複合バリデーション実行】: 全てのバリデーターを順次実行
   * 【Fail-Fast】: 最初の失敗で即座に処理を停止
   * 【パフォーマンス】: 不要な検証処理を避けた効率的な実装
   *
   * @param data - バリデーション対象のデータ
   * @param context - オプションのコンテキスト
   * @returns バリデーション結果
   */
  validate(data: T, context?: unknown): ValidationResult {
    // 【順次実行】: 登録されたバリデーターを順番に実行
    for (const validator of this.validators) {
      const result = validator.validate(data, context as Parameters<typeof validator.validate>[1]);

      // 【早期終了】: 最初のバリデーション失敗で即座に結果を返す
      if (!result.isValid) {
        return result;
      }
    }

    // 【全て成功】: 全てのバリデーションが成功した場合
    return { isValid: true };
  }

  /**
   * 【登録数取得】: 登録されているバリデーター数を取得
   * 【デバッグ用】: テストや開発時の確認用メソッド
   *
   * @returns バリデーター数
   */
  getValidatorCount(): number {
    return this.validators.length;
  }

  /**
   * 【バリデーター一覧取得】: 登録されているバリデーター一覧を取得
   * 【デバッグ用】: テストや開発時の確認用メソッド
   *
   * @returns バリデーター配列のコピー
   */
  getValidators(): IValidator<T>[] {
    return [...this.validators];
  }

  /**
   * 【バリデーター削除】: 全てのバリデーターを削除
   * 【リセット用】: テスト時やバリデーター再設定時に使用
   */
  clearValidators(): void {
    this.validators = [];
  }
}

/**
 * 【ファクトリー関数】: 複合バリデーターの作成用ユーティリティ
 * 【利便性向上】: より簡潔な記法でバリデーターを作成
 *
 * @param validators - 初期バリデーター配列
 * @returns 新しい複合バリデーターインスタンス
 */
export function createCompositeValidator<T = unknown>(
  validators: IValidator<T>[] = [],
): ICompositeValidator<T> {
  return new CompositeValidator<T>(validators);
}

/**
 * 【チェーンビルダー】: メソッドチェーンによる流暢なバリデーター構築
 * 【使用例】:
 * ```typescript
 * const validator = validatorChain<MyType>()
 *   .add(new RequiredValidator())
 *   .add(new LengthValidator(10))
 *   .build();
 * ```
 *
 * @template T - バリデーション対象のデータ型
 */
export class ValidatorChainBuilder<T = unknown> {
  private validators: IValidator<T>[] = [];

  /**
   * バリデーターを追加
   *
   * @param validator - 追加するバリデーター
   * @returns 自身のインスタンス（チェーン用）
   */
  add(validator: IValidator<T>): ValidatorChainBuilder<T> {
    this.validators.push(validator);
    return this;
  }

  /**
   * 複合バリデーターを構築
   *
   * @returns 構築された複合バリデーター
   */
  build(): ICompositeValidator<T> {
    return new CompositeValidator<T>(this.validators);
  }
}

/**
 * 【チェーンビルダーファクトリー】: バリデーターチェーンの開始
 *
 * @template T - バリデーション対象のデータ型
 * @returns バリデーターチェーンビルダー
 */
export function validatorChain<T = unknown>(): ValidatorChainBuilder<T> {
  return new ValidatorChainBuilder<T>();
}

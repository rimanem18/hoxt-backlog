/**
 * 複数バリデーターを組み合わせて順次実行（Fail-Fast）
 *
 * @example
 * ```typescript
 * const validator = new CompositeValidator([
 *   new RequiredValidator(),
 *   new LengthValidator(100)
 * ]);
 * ```
 */

import type {
  ICompositeValidator,
  IValidator,
  ValidationResult,
} from './interfaces/IValidator';

/**
 * 複合バリデータークラス
 *
 * @template T バリデーション対象データ型
 */
export class CompositeValidator<T = unknown> implements ICompositeValidator<T> {
  private validators: IValidator<T>[] = [];

  /**
   * コンストラクタ
   *
   * @param initialValidators 初期バリデーター配列（オプション）
   */
  constructor(initialValidators: IValidator<T>[] = []) {
    this.validators = [...initialValidators];
  }

  /**
   * バリデーターを追加
   *
   * @param validator 追加するバリデーター
   * @returns 自身のインスタンス（メソッドチェーン用）
   */
  addValidator(validator: IValidator<T>): ICompositeValidator<T> {
    this.validators.push(validator);
    return this;
  }

  /**
   * 全バリデーターを順次実行（最初の失敗で停止）
   *
   * @param data バリデーション対象データ
   * @param context オプションコンテキスト
   * @returns バリデーション結果
   */
  validate(data: T, context?: unknown): ValidationResult {
    // 登録されたバリデーターを順次実行
    for (const validator of this.validators) {
      const result = validator.validate(data, context as Parameters<typeof validator.validate>[1]);

      // 最初のバリデーション失敗で即座に結果を返す
      if (!result.isValid) {
        return result;
      }
    }

    // 全てのバリデーションが成功した場合
    return { isValid: true };
  }

  /**
   * 登録バリデーター数を取得
   *
   * @returns バリデーター数
   */
  getValidatorCount(): number {
    return this.validators.length;
  }

  /**
   * 登録バリデーター一覧を取得
   *
   * @returns バリデーター配列のコピー
   */
  getValidators(): IValidator<T>[] {
    return [...this.validators];
  }

  /**
   * 全バリデーターを削除
   */
  clearValidators(): void {
    this.validators = [];
  }
}

/**
 * 複合バリデーター作成ファクトリー関数
 *
 * @param validators 初期バリデーター配列
 * @returns 新しい複合バリデーターインスタンス
 */
export function createCompositeValidator<T = unknown>(
  validators: IValidator<T>[] = [],
): ICompositeValidator<T> {
  return new CompositeValidator<T>(validators);
}

/**
 * メソッドチェーンでバリデーターを構築
 *
 * @template T バリデーション対象データ型
 * @example
 * ```typescript
 * const validator = validatorChain<MyType>()
 *   .add(new RequiredValidator())
 *   .add(new LengthValidator(10))
 *   .build();
 * ```
 */
export class ValidatorChainBuilder<T = unknown> {
  private validators: IValidator<T>[] = [];

  /**
   * バリデーターを追加
   *
   * @param validator 追加するバリデーター
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
 * バリデーターチェーンビルダーを開始
 *
 * @template T バリデーション対象データ型
 * @returns バリデーターチェーンビルダー
 */
export function validatorChain<T = unknown>(): ValidatorChainBuilder<T> {
  return new ValidatorChainBuilder<T>();
}

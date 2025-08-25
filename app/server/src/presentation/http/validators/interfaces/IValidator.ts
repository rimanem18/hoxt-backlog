/**
 * バリデーター共通インターフェース
 */

import type { Context } from 'hono';

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * バリデーターインターフェース
 *
 * @template T バリデーション対象データ型
 */
export interface IValidator<T = unknown> {
  /**
   * バリデーション実行
   *
   * @param data バリデーション対象データ
   * @param context Honoコンテキスト（オプション）
   * @returns バリデーション結果
   */
  validate(data: T, context?: Context): ValidationResult;
}

/**
 * 複合バリデーターインターフェース
 */
export interface ICompositeValidator<T = unknown> extends IValidator<T> {
  /**
   * バリデーターを追加
   *
   * @param validator 追加するバリデーター
   * @returns 自身のインスタンス（チェーン可能）
   */
  addValidator(validator: IValidator<T>): ICompositeValidator<T>;
}

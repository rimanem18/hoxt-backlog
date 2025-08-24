/**
 * バリデーター共通インターフェース
 *
 * 【機能概要】: HTTP リクエストのバリデーションを統一的に処理するためのインターフェース
 * 【設計方針】: 各種バリデーションロジックを分離し、再利用可能性と保守性を向上
 * 【型安全性】: TypeScript の型システムを活用した実行時バリデーション
 * 🟢 信頼性レベル: DDD・クリーンアーキテクチャの標準的なパターン
 */

import type { Context } from 'hono';

/**
 * バリデーション結果
 */
export interface ValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラーメッセージ（バリデーション失敗時） */
  error?: string;
  /** HTTPステータスコード（エラー時） */
  statusCode?: number;
}

/**
 * バリデーター共通インターフェース
 *
 * @template T - バリデーション対象のデータ型
 */
export interface IValidator<T = unknown> {
  /**
   * バリデーション実行
   *
   * @param data - バリデーション対象のデータ
   * @param context - Honoコンテキスト（必要に応じて使用）
   * @returns バリデーション結果
   */
  validate(data: T, context?: Context): ValidationResult;
}

/**
 * 複合バリデーター用インターフェース
 * 複数のバリデーションルールを組み合わせて実行
 */
export interface ICompositeValidator<T = unknown> extends IValidator<T> {
  /**
   * バリデーターを追加
   *
   * @param validator - 追加するバリデーター
   * @returns 自身のインスタンス（チェーン可能）
   */
  addValidator(validator: IValidator<T>): ICompositeValidator<T>;
}

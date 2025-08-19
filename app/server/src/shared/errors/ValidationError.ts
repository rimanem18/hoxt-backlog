/**
 * バリデーションエラー
 * 
 * 入力値検証エラー
 */
export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR";

  constructor(message: string = "入力値が無効です") {
    super(message);
    this.name = "ValidationError";
  }
}
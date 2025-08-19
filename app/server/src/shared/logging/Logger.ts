/**
 * ロガーインターフェース
 * 
 * アプリケーション全体で使用するログ出力の抽象化
 */
export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
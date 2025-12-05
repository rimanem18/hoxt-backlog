/**
 * クライアント側で必須の環境変数キー
 */
const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SITE_URL',
] as const;

/**
 * ロガー関数の型定義
 */
export type Logger = (message: string) => void;

/**
 * 環境変数検証のオプション
 */
export type ValidationOptions = {
  env?: Record<string, string | undefined>;
  nodeEnv?: string;
  logger?: Logger;
};

/**
 * クライアント側の必須環境変数を検証する
 *
 * Provider初期化時に呼び出され、必要な環境変数がすべて設定されているかを確認する。
 * テスト環境では検証をスキップする。
 *
 * @param options - 検証オプション（デフォルトでprocess.envを使用）
 *
 * @remarks
 * Next.jsの静的生成時やSSR時の実行タイミングを考慮し、
 * エラー時は例外をスローせずloggerで警告を出力する。
 */
export function validateClientEnv(options: ValidationOptions = {}): void {
  const {
    env = process.env,
    nodeEnv = process.env.NODE_ENV,
    logger = console.error,
  } = options;

  // テスト環境では検証をスキップ
  if (nodeEnv === 'test') {
    return;
  }

  const missing = REQUIRED_ENV_KEYS.filter(
    (key) => !env[key] || env[key]?.trim() === '',
  );

  if (missing.length > 0) {
    logger(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

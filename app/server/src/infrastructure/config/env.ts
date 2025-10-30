import { z } from 'zod';

/**
 * データベース設定のスキーマ
 */
const databaseConfigSchema = z.object({
  url: z.string().min(1, 'DATABASE_URL環境変数が設定されていません'),
  schema: z.string().min(1, 'BASE_SCHEMA環境変数が設定されていません'),
  connectTimeoutSeconds: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine(
      (val) => val > 0,
      'DB_CONNECT_TIMEOUT_SECONDSは正の数である必要があります',
    ),
  idleTimeoutSeconds: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine(
      (val) => val > 0,
      'DB_IDLE_TIMEOUT_SECONDSは正の数である必要があります',
    ),
  maxConnections: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val > 0, 'DB_MAX_CONNECTIONSは正の数である必要があります'),
});

/**
 * データベース設定の型定義
 */
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

/**
 * データベース設定を取得する
 *
 * 環境変数からデータベース接続に必要な設定を取得し、
 * Zodによる型安全な検証を行って返却する。
 *
 * @returns データベース設定オブジェクト
 * @throws 必須環境変数が不足している場合のエラー
 */
export function getDatabaseConfig(): DatabaseConfig {
  const rawConfig = {
    url: process.env.DATABASE_URL,
    schema: process.env.BASE_SCHEMA,
    connectTimeoutSeconds: process.env.DB_CONNECT_TIMEOUT_SECONDS,
    idleTimeoutSeconds: process.env.DB_IDLE_TIMEOUT_SECONDS,
    maxConnections: process.env.DB_MAX_CONNECTIONS,
  };

  try {
    return databaseConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((issue) => issue.message)
        .join(', ');
      throw new Error(`環境変数設定エラー: ${errorMessages}`);
    }
    throw new Error(
      `環境変数設定エラー: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 設定の検証を行う
 *
 * アプリケーション起動時に呼び出され、
 * 必要な環境変数がすべて設定されているかを確認する。
 *
 * @throws 設定エラーがある場合の詳細エラー
 */
export function validateConfig(): void {
  getDatabaseConfig();
}

/**
 * 認証関連の環境変数を検証する
 *
 * アプリケーション起動時（Supabase初期化前）に呼び出され、
 * 必要な環境変数がすべて設定されているかを確認する。
 *
 * @throws 必須環境変数が不足している場合の詳細エラー
 */
export function validateEnv(): void {
  const required = ['SUPABASE_URL', 'SUPABASE_JWT_SECRET', 'DATABASE_URL'];

  const missing = required.filter(
    (key) => !process.env[key] || process.env[key]?.trim() === '',
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

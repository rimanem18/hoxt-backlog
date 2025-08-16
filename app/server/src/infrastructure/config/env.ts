import { z } from 'zod';

/**
 * データベース設定のスキーマ
 */
const databaseConfigSchema = z.object({
  host: z.string().min(1, 'DB_HOST環境変数が設定されていません'),
  port: z.number().int().positive('DB_PORTは正の整数である必要があります'),
  database: z.string().min(1, 'DB_NAME環境変数が設定されていません'),
  username: z.string().min(1, 'DB_USER環境変数が設定されていません'),
  password: z.string().min(1, 'DB_PASSWORD環境変数が設定されていません'),
  tablePrefix: z.string().min(1, 'DB_TABLE_PREFIX環境変数が設定されていません'),
  url: z.string().min(1, 'DATABASE_URL環境変数が設定されていません'),
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
    host: process.env.DB_HOST,
    port: process.env.DB_PORT
      ? Number.parseInt(process.env.DB_PORT, 10)
      : undefined,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    tablePrefix: process.env.DB_TABLE_PREFIX,
    url: process.env.DATABASE_URL,
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

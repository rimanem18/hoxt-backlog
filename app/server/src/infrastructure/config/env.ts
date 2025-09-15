import { z } from 'zod';

/**
 * データベース設定のスキーマ
 */
const databaseConfigSchema = z.object({
  url: z.string().min(1, 'DATABASE_URL環境変数が設定されていません'),
  tablePrefix: z.string().min(1, 'DB_TABLE_PREFIX環境変数が設定されていません'),
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
    tablePrefix: process.env.DB_TABLE_PREFIX,
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

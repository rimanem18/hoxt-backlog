import { z } from 'zod';
import { formatZodError } from '@/shared/utils/zodErrorFormatter';

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
    .transform((val) => (val ? parseInt(val, 10) : 2))
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
      const formattedErrors = formatZodError(error.issues);
      const errorMessages = Object.entries(formattedErrors)
        .map(([field, message]) => `${field}: ${message}`)
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
  const required = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'DATABASE_URL'];

  const missing = required.filter(
    (key) => !process.env[key] || process.env[key]?.trim() === '',
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

/**
 * viewerアクセスURLのベースURLを取得する
 *
 * 招待メールに記載する「{ベースURL}/viewer/{生トークン}」形式のURL生成に使用する。
 *
 * @throws VIEWER_ACCESS_BASE_URL環境変数が未設定の場合
 */
export function getViewerAccessBaseUrl(): string {
  const baseUrl = process.env.VIEWER_ACCESS_BASE_URL;
  if (baseUrl && baseUrl.trim() !== '') {
    return baseUrl;
  }

  // bun testはNODE_ENVを自動的に'test'にするため、テスト実行時のみ既定値で補う
  if (process.env.NODE_ENV === 'test') {
    return 'http://localhost:3000';
  }

  throw new Error('VIEWER_ACCESS_BASE_URL環境変数が設定されていません');
}

/**
 * テスト専用エンドポイントの有効化を許可する環境の許可リスト
 *
 * Why: 除外方式（'production'以外は許可）は、ENVIRONMENTが未設定・タイプミス・
 * 未知の値になった場合に誤って許可側へ倒れるfail-openのリスクがあるため、
 * 許可リスト方式で明示的に許可する環境のみを列挙する。
 * previewはE2Eを実行しない運用のため、ここに含めていてもterraform/bootstrap/main.tf側の
 * NODE_ENV=productionが下段のチェックでブロックする（多層防御）。
 */
const TEST_ENDPOINTS_ALLOWED_ENVIRONMENTS = new Set(['development', 'preview']);

/**
 * テスト専用エンドポイントの有効化判定
 *
 * 生アクセストークンを含む送信内容をE2Eから取得するための経路は、
 * 本番環境では絶対に有効化されないようfail-closedで判定する。
 * ENVIRONMENT（許可リスト）とNODE_ENV（'production'除外）の2つの
 * 独立したTerraform設定値の両方が許可側でなければ有効化されない。
 *
 * @returns 上記2条件と、ENABLE_TEST_ENDPOINTSが'true'であることをすべて満たす場合true
 */
export function isTestEndpointsEnabled(): boolean {
  return (
    TEST_ENDPOINTS_ALLOWED_ENVIRONMENTS.has(process.env.ENVIRONMENT ?? '') &&
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_TEST_ENDPOINTS === 'true'
  );
}

/**
 * Bunテスト実行前のグローバル環境設定
 *
 * What:
 * - テスト実行に必須の環境変数を保証
 * - 未設定の場合にデフォルト値を設定
 *
 * Why:
 * - CI環境とローカル環境で環境変数の扱いが異なるため、統一的な初期化が必要
 * - テストファイルのインポート順序に関わらず、環境変数が設定された状態を保証
 */

// BASE_SCHEMAが未設定の場合、テスト用のデフォルト値を設定
// CIやローカルで明示的に設定されている場合はそちらを優先
process.env.BASE_SCHEMA ??= 'test_schema';

// NODE_ENVが未設定の場合、テスト環境を明示
process.env.NODE_ENV ??= 'test';

// DATABASE_URLが未設定の場合、テスト用のデフォルト接続文字列を設定
// ローカルDocker環境を想定
process.env.DATABASE_URL ??=
  'postgresql://postgres:test_password@db:5432/postgres';

// CORS関連環境変数のデフォルト値設定
process.env.ACCESS_ALLOW_ORIGIN ??= 'http://localhost:3000';
process.env.ACCESS_ALLOW_METHODS ??= 'GET,POST,PUT,DELETE,OPTIONS';
process.env.ACCESS_ALLOW_HEADERS ??= 'Authorization,Content-Type,Viewer-Access-Token';

// pg PoolとDrizzle poolの合計がPostgreSQLのmax_connections(100)を超えないよう制限
// 両プールそれぞれmax:40 → 合計80 < 100
// NOTE: compose.yamlで100が設定されているため??=では上書きできず=で強制設定
process.env.DB_MAX_CONNECTIONS = '40';

// Supabase関連環境変数のデフォルト値設定
process.env.SUPABASE_URL ??= 'http://localhost:54321';
process.env.SUPABASE_PUBLISHABLE_KEY ??= 'sb_publishable_test_key';

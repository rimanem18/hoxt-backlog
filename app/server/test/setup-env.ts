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

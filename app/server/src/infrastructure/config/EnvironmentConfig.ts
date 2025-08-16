/**
 * 環境設定管理クラス
 * 
 * 環境変数の検証・変換を行い、型安全な設定値を提供する。
 * アプリケーション起動時に設定の検証を行い、不正な設定での起動を防ぐ。
 */
export interface DatabaseConfig {
  /** データベースホスト */
  host: string;
  /** データベースポート */
  port: number;
  /** データベース名 */
  database: string;
  /** データベースユーザー名 */
  username: string;
  /** データベースパスワード */
  password: string;
  /** テーブル名接頭辞 */
  tablePrefix: string;
  /** データベース接続URL */
  url: string;
}

export class EnvironmentConfig {
  /**
   * データベース設定を取得する
   * 
   * 環境変数からデータベース接続に必要な設定を取得し、
   * 型安全な形式で返却する。
   * 
   * @returns データベース設定オブジェクト
   * @throws 必須環境変数が不足している場合のエラー
   */
  static getDatabaseConfig(): DatabaseConfig {
    const host = process.env.DB_HOST;
    if (!host) {
      throw new Error('DB_HOST環境変数が設定されていません');
    }

    const portStr = process.env.DB_PORT;
    if (!portStr) {
      throw new Error('DB_PORT環境変数が設定されていません');
    }

    const port = Number.parseInt(portStr, 10);
    if (Number.isNaN(port)) {
      throw new Error('DB_PORTは有効な数値である必要があります');
    }

    const database = process.env.DB_NAME;
    if (!database) {
      throw new Error('DB_NAME環境変数が設定されていません');
    }

    const username = process.env.DB_USER;
    if (!username) {
      throw new Error('DB_USER環境変数が設定されていません');
    }

    const password = process.env.DB_PASSWORD;
    if (!password) {
      throw new Error('DB_PASSWORD環境変数が設定されていません');
    }

    const tablePrefix = process.env.DB_TABLE_PREFIX;
    if (!tablePrefix) {
      throw new Error('DB_TABLE_PREFIX環境変数が設定されていません');
    }

    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL環境変数が設定されていません');
    }

    return {
      host,
      port,
      database,
      username,
      password,
      tablePrefix,
      url,
    };
  }

  /**
   * 設定の検証を行う
   * 
   * アプリケーション起動時に呼び出され、
   * 必要な環境変数がすべて設定されているかを確認する。
   * 
   * @throws 設定エラーがある場合の詳細エラー
   */
  static validateConfig(): void {
    try {
      // getDatabaseConfigを呼び出すことで検証を実行
      this.getDatabaseConfig();
    } catch (error) {
      throw new Error(`環境変数設定エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
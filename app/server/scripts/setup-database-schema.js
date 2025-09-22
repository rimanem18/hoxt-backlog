#!/usr/bin/env bun

/**
 * スキーマ作成とDrizzleスキーマ適用スクリプト
 * 
 * psqlコマンドに依存せず、Node.jsのpgライブラリを使用
 */

import { Client } from 'pg';
import { execSync } from 'child_process';

async function setupDatabaseSchema() {
  console.log('=== データベーススキーマセットアップ開始 ===');

  // 環境変数確認
  const DATABASE_URL = process.env.DATABASE_URL;
  const BASE_SCHEMA = process.env.BASE_SCHEMA;

  if (!DATABASE_URL) {
    console.error('エラー: DATABASE_URL環境変数が設定されていません');
    process.exit(1);
  }

  if (!BASE_SCHEMA) {
    console.error('エラー: BASE_SCHEMA環境変数が設定されていません');
    process.exit(1);
  }

  console.log(`DATABASE_URL: ${DATABASE_URL}`);
  console.log(`BASE_SCHEMA: ${BASE_SCHEMA}`);

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    // PostgreSQL接続確認
    console.log('=== PostgreSQL接続確認 ===');
    await client.connect();
    
    const version = await client.query('SELECT version()');
    console.log('PostgreSQL接続確認: OK');
    
    // スキーマ作成
    console.log('=== PostgreSQLスキーマ作成 ===');
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${BASE_SCHEMA}"`);
    await client.query(`GRANT USAGE ON SCHEMA "${BASE_SCHEMA}" TO PUBLIC`);
    await client.query(`GRANT CREATE ON SCHEMA "${BASE_SCHEMA}" TO PUBLIC`);
    console.log(`スキーマ '${BASE_SCHEMA}' 作成完了`);

    // 既存のenumを削除（スキーマ移行のため）
    console.log('=== 既存enum削除（スキーマ移行） ===');
    try {
      // publicスキーマのenumを削除
      await client.query('DROP TYPE IF EXISTS auth_provider_type CASCADE');
      console.log('publicスキーマのenumを削除しました');
    } catch (error) {
      console.log('publicスキーマのenumは存在しませんでした');
    }
    
    try {
      // 対象スキーマのenumを削除
      await client.query(`DROP TYPE IF EXISTS "${BASE_SCHEMA}".auth_provider_type CASCADE`);
      console.log(`${BASE_SCHEMA}スキーマのenumを削除しました`);
    } catch (error) {
      console.log(`${BASE_SCHEMA}スキーマのenumは存在しませんでした`);
    }

    await client.end();

    // Drizzle スキーマ適用
    console.log('=== Drizzleスキーマ適用 ===');
    execSync('bunx drizzle-kit push --config=drizzle.config.ts --force', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // スキーマ確認（再接続）
    console.log('=== スキーマ確認 ===');
    const verifyClient = new Client({
      connectionString: DATABASE_URL,
    });
    
    await verifyClient.connect();
    
    try {
      const tables = await verifyClient.query(`
        SELECT schemaname, tablename FROM pg_tables 
        WHERE schemaname = $1
      `, [BASE_SCHEMA]);
      
      if (tables.rows.length > 0) {
        console.log(`スキーマ '${BASE_SCHEMA}' のテーブル:`);
        tables.rows.forEach(row => {
          console.log(`  ${row.schemaname}.${row.tablename}`);
        });
      } else {
        console.log(`スキーマ '${BASE_SCHEMA}' にテーブルがまだ作成されていません`);
      }
    } catch (error) {
      console.log('テーブル確認でエラーが発生しました:', error.message);
    }

    const schemas = await verifyClient.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name = $1
    `, [BASE_SCHEMA]);

    if (schemas.rows.length > 0) {
      console.log(`スキーマ '${BASE_SCHEMA}' が正常に作成されました`);
    } else {
      console.log(`警告: スキーマ '${BASE_SCHEMA}' が見つかりません`);
    }

    await verifyClient.end();

    console.log('=== データベーススキーマセットアップ完了 ===');

  } catch (error) {
    console.error('エラー:', error.message);
    process.exit(1);
  }
}

setupDatabaseSchema();
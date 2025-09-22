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

    // 現在のスキーマでのみ動作（移行処理は行わない）
    console.log(`=== ${BASE_SCHEMA} スキーマでの操作のみ実行 ===`);

    await client.end();

    // Drizzle スキーマ適用
    console.log('=== Drizzleスキーマ適用 ===');
    execSync('bunx drizzle-kit push --config=drizzle.config.ts --force', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // RLSポリシー適用
    console.log('=== RLSポリシー適用 ===');
    const rlsClient = new Client({
      connectionString: DATABASE_URL,
    });
    
    await rlsClient.connect();
    
    try {
      // usersテーブルのRLSを有効化
      console.log('usersテーブルのRLSを有効化中...');
      await rlsClient.query(`ALTER TABLE "${BASE_SCHEMA}".users ENABLE ROW LEVEL SECURITY`);
      
      // 既存のポリシーを削除（再実行対応）
      await rlsClient.query(`DROP POLICY IF EXISTS "authenticated_users_policy" ON "${BASE_SCHEMA}".users`);
      await rlsClient.query(`DROP POLICY IF EXISTS "users_own_records_policy" ON "${BASE_SCHEMA}".users`);
      
      // 認証済みユーザーのみアクセス可能なポリシー
      await rlsClient.query(`
        CREATE POLICY "authenticated_users_policy" ON "${BASE_SCHEMA}".users
          FOR ALL USING (auth.uid() IS NOT NULL)
      `);
      
      // 自分のレコードのみアクセス可能なポリシー（将来的な拡張用）
      await rlsClient.query(`
        CREATE POLICY "users_own_records_policy" ON "${BASE_SCHEMA}".users
          FOR ALL USING (auth.uid()::text = id::text)
      `);
      
      console.log('RLSポリシー適用完了');
    } catch (error) {
      console.log('RLSポリシー適用でエラーが発生しました:', error.message);
      console.log('注意: Supabase認証が必要な環境では、auth.uid()関数が利用できない場合があります');
    }
    
    await rlsClient.end();

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
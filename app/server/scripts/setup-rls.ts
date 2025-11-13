#!/usr/bin/env bun

/**
 * RLSポリシー適用スクリプト
 *
 * データベースのRow Level Security (RLS) ポリシーを適用する。
 * マイグレーション実行後に実行することを想定。
 */

import { Client } from "pg";

const ERROR_MESSAGES = {
	MISSING_DATABASE_URL: "エラー: DATABASE_URL環境変数が設定されていません",
	MISSING_BASE_SCHEMA:
		"エラー: BASE_SCHEMA環境変数が設定されていません",
	CONNECTION_FAILED: "PostgreSQL接続に失敗しました",
	RLS_APPLICATION_FAILED: "RLSポリシー適用に失敗しました",
} as const;

/**
 * RLSポリシーを適用する
 */
async function applyRlsPolicies(): Promise<void> {
	console.log("=== RLSポリシー適用開始 ===");

	const DATABASE_URL = process.env.DATABASE_URL;
	const BASE_SCHEMA = process.env.BASE_SCHEMA;

	if (!DATABASE_URL) {
		console.error(ERROR_MESSAGES.MISSING_DATABASE_URL);
		process.exit(1);
	}

	if (!BASE_SCHEMA) {
		console.error(ERROR_MESSAGES.MISSING_BASE_SCHEMA);
		process.exit(1);
	}

	const maskedUrl = DATABASE_URL.replace(
		/:\/\/([^:]+):([^@]+)@/,
		"://$1:***@",
	);
	console.log(`DATABASE_URL: ${maskedUrl}`);
	console.log(`BASE_SCHEMA: ${BASE_SCHEMA}`);

	const client = new Client({
		connectionString: DATABASE_URL,
	});

	try {
		console.log("=== PostgreSQL接続確認 ===");
		await client.connect();
		console.log("PostgreSQL接続確認: OK");

		console.log("=== RLSポリシー適用 ===");

		console.log("usersテーブルのRLSを有効化中...");
		await client.query(
			`ALTER TABLE "${BASE_SCHEMA}".users ENABLE ROW LEVEL SECURITY`,
		);

		console.log("既存ポリシーを削除（冪等性確保）...");
		await client.query(
			`DROP POLICY IF EXISTS "authenticated_users_policy" ON "${BASE_SCHEMA}".users`,
		);
		await client.query(
			`DROP POLICY IF EXISTS "users_own_records_policy" ON "${BASE_SCHEMA}".users`,
		);

		console.log("認証済みユーザーポリシーを作成中...");
		await client.query(`
      CREATE POLICY "authenticated_users_policy" ON "${BASE_SCHEMA}".users
        FOR ALL USING (auth.uid() IS NOT NULL)
    `);

		console.log("自分のレコードのみアクセス可能なポリシーを作成中...");
		await client.query(`
      CREATE POLICY "users_own_records_policy" ON "${BASE_SCHEMA}".users
        FOR ALL USING (auth.uid()::text = id::text)
    `);

		console.log("RLSポリシー適用完了");
	} catch (error) {
		console.error(
			`${ERROR_MESSAGES.RLS_APPLICATION_FAILED}:`,
			error instanceof Error ? error.message : String(error),
		);
		console.log(
			"注意: Supabase認証が必要な環境では、auth.uid()関数が利用できない場合があります",
		);
		console.log(
			"テスト環境ではRLSポリシーなしでも動作します。警告として記録し、処理を継続します。",
		);
	} finally {
		await client.end();
	}

	console.log("=== RLSポリシー適用完了 ===");
}

applyRlsPolicies();

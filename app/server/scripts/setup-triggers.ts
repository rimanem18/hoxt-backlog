#!/usr/bin/env bun

/**
 * データベーストリガー適用スクリプト
 *
 * updated_at自動更新トリガーをテーブルに適用する。
 * マイグレーション実行後に実行することを想定。
 */

import { Client } from "pg";

const ERROR_MESSAGES = {
	MISSING_DATABASE_URL: "エラー: DATABASE_URL環境変数が設定されていません",
	MISSING_BASE_SCHEMA:
		"エラー: BASE_SCHEMA環境変数が設定されていません",
	TRIGGER_APPLICATION_FAILED: "トリガー適用に失敗しました",
} as const;

/**
 * updated_at自動更新トリガーを適用する
 */
async function applyTriggers(): Promise<void> {
	console.log("=== データベーストリガー適用開始 ===");

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

	if (!/^[a-zA-Z0-9_]+$/.test(BASE_SCHEMA)) {
		console.error(
			"エラー: BASE_SCHEMAに不正な文字が含まれています。英数字とアンダースコアのみ使用可能です。",
		);
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

		console.log("=== トリガー適用 ===");

		console.log("updated_at更新関数を作成中...");
		await client.query(`
      CREATE OR REPLACE FUNCTION "${BASE_SCHEMA}".update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

		const tables = ["users", "tasks"];
		for (const tableName of tables) {
			console.log(`${tableName}のupdated_atトリガーを作成中...`);

			await client.query(
				`DROP TRIGGER IF EXISTS set_updated_at ON "${BASE_SCHEMA}".${tableName}`,
			);

			await client.query(`
        CREATE TRIGGER set_updated_at
          BEFORE UPDATE ON "${BASE_SCHEMA}".${tableName}
          FOR EACH ROW
          EXECUTE FUNCTION "${BASE_SCHEMA}".update_updated_at_column()
      `);
		}

		console.log("トリガー適用完了");
	} catch (error) {
		console.error(
			`${ERROR_MESSAGES.TRIGGER_APPLICATION_FAILED}:`,
			error instanceof Error ? error.message : String(error),
		);
		process.exit(1);
	} finally {
		await client.end();
	}

	console.log("=== データベーストリガー適用完了 ===");
}

applyTriggers();

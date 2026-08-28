#!/usr/bin/env bun

/**
 * マイグレーション実行スクリプト（drizzle-kit CLI迂回版）
 *
 * drizzle-kit migrateのCLIは非TTY環境で例外の詳細を表示せず
 * exit code 1のみを返すことがあるため、drizzle-ormのmigrate()を
 * 直接呼び出し、失敗時のPostgresエラー詳細を出力する。
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const ERROR_MESSAGES = {
	MISSING_DATABASE_URL: "エラー: DATABASE_URL環境変数が設定されていません",
	MISSING_BASE_SCHEMA: "エラー: BASE_SCHEMA環境変数が設定されていません",
} as const;

async function runMigration(): Promise<void> {
	console.log("=== マイグレーション実行開始（デバッグ版） ===");

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

	const maskedUrl = DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
	console.log(`DATABASE_URL: ${maskedUrl}`);
	console.log(`BASE_SCHEMA: ${BASE_SCHEMA}`);

	const pool = new Pool({
		connectionString: DATABASE_URL,
		ssl: process.env.NODE_ENV === "production" ? true : false,
	});
	const db = drizzle(pool);

	try {
		await migrate(db, {
			migrationsFolder: `./src/shared/database/migrations/${BASE_SCHEMA}`,
			migrationsTable: "__drizzle_migrations__",
			migrationsSchema: BASE_SCHEMA,
		});
		console.log("マイグレーション適用完了");
	} catch (error) {
		console.error("マイグレーション失敗:");
		// DrizzleQueryErrorは本来のpgエラーを`.cause`に保持するため、
		// causeチェーンを辿って実際のPostgresエラー詳細まで出力する
		let current: unknown = error;
		let depth = 0;
		while (current instanceof Error && depth < 5) {
			console.error(`--- error depth=${depth} ---`);
			console.error(`name: ${current.name}`);
			console.error(`message: ${current.message}`);
			const pgError = current as Error & {
				code?: string;
				detail?: string;
				hint?: string;
				position?: string;
			};
			if (pgError.code) console.error(`code: ${pgError.code}`);
			if (pgError.detail) console.error(`detail: ${pgError.detail}`);
			if (pgError.hint) console.error(`hint: ${pgError.hint}`);
			if (pgError.position) console.error(`position: ${pgError.position}`);
			console.error(current.stack);
			current = current.cause;
			depth += 1;
		}
		process.exit(1);
	} finally {
		await pool.end();
	}

	console.log("=== マイグレーション実行完了（デバッグ版） ===");
}

runMigration();

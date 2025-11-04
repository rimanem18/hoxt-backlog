/**
 * OpenAPI仕様生成スクリプト
 *
 * @description
 * @hono/zod-openapiを使用してOpenAPI 3.1仕様を生成し、
 * docs/api/openapi.yamlに出力する。
 *
 * 実行方法:
 *   docker compose exec server bun run generate:openapi
 *
 * 生成フロー:
 *   1. OpenAPIルート定義（スキーマのみ）をインポート
 *   2. 最小構成のOpenAPIHonoアプリを作成
 *   3. app.getOpenAPIDocument()でOpenAPI仕様を取得
 *   4. YAML形式でdocs/api/openapi.yamlに出力（プロジェクトルート基準）
 *
 * Why: ルート定義（スキーマ）のみをインポートし、
 * ハンドラ実装（DIコンテナ → DB接続）を避けることで、
 * データベース接続なしでOpenAPI仕様を生成可能にする。
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { OpenAPIHono } from "@hono/zod-openapi";
import {
	getUserRoute,
	getUserProfileRoute,
	listUsersRoute,
	updateUserRoute,
} from "../src/presentation/http/routes/userRoutes.schema";
import { authCallbackRoute } from "../src/presentation/http/routes/authRoutes.schema";

/**
 * OpenAPI仕様を生成してファイルに出力
 */
async function generateOpenAPISpec(): Promise<void> {
	console.log("OpenAPI仕様生成を開始します...");

	// スクリプトファイルの位置から出力先パスを解決
	// Why: process.cwd()に依存せず、実行コンテキストに関わらず正しいパスを解決
	const scriptDir = dirname(fileURLToPath(import.meta.url));
	const outputPath = join(scriptDir, "../../../docs/api/openapi.yaml");
	await mkdir(dirname(outputPath), { recursive: true });

	// 最小構成のOpenAPIHonoアプリを作成
	// Why: ルート定義のみを登録し、ハンドラは登録しない
	const app = new OpenAPIHono();

	// noopハンドラを定義（OpenAPI仕様生成専用）
	// Why: 実際のハンドラ実装（DIコンテナ呼び出し）を避けてDB接続不要に
	// Note: ダミーレスポンスのため、型安全性よりも簡潔性を優先
	const noopHandler = (c: any) => c.json({ success: true, data: {} });

	// ルート定義を登録（DB接続不要）
	// Why: createRoute定義にはスキーマ情報のみが含まれ、
	// 実装（DIコンテナ呼び出し）は含まれないため、DB接続不要
	app.openapi(authCallbackRoute, noopHandler as any);
	app.openapi(getUserRoute, noopHandler as any);
	app.openapi(listUsersRoute, noopHandler as any);
	app.openapi(updateUserRoute, noopHandler as any);
	app.openapi(getUserProfileRoute, noopHandler as any);

	// OpenAPI仕様を取得
	const openAPISpec = app.getOpenAPIDocument({
		openapi: "3.1.0",
		info: {
			title: `${process.env.PROJECT_NAME || "API"} Spec`,
			version: "1.0.0",
			description:
				"型安全性強化・API契約強化プロジェクトによるAPI仕様\n\n" +
				"Single Source of Truth: Drizzle ORM → Drizzle Zod → Zod → OpenAPI → TypeScript",
		},
		servers: [
			{
				url: "/api",
				description: "API Server",
			},
		],
	});

	// YAML形式で出力
	const yamlContent = yaml.dump(openAPISpec, {
		indent: 2,
		lineWidth: 120,
		noRefs: true,
	});
	await writeFile(outputPath, yamlContent, "utf-8");

	console.log(`✓ OpenAPI仕様を生成しました: ${outputPath}`);
	console.log(`  - エンドポイント数: ${Object.keys(openAPISpec.paths || {}).length}`);
}

// スクリプト実行
generateOpenAPISpec().catch((error) => {
	console.error("OpenAPI仕様生成に失敗しました:", error);
	process.exit(1);
});

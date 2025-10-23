/**
 * OpenAPI仕様生成スクリプト
 *
 * @description
 * @hono/zod-openapiを使用してHonoアプリからOpenAPI 3.1仕様を生成し、
 * docs/api/openapi.yamlに出力する。
 *
 * 実行方法:
 *   docker compose exec server bun run generate:openapi
 *
 * 生成フロー:
 *   1. Honoアプリ（OpenAPIルート定義）を読み込み
 *   2. @hono/zod-openapiでOpenAPI仕様を生成
 *   3. YAML形式で/home/bun/docs/api/openapi.yamlに出力
 *
 * 注意:
 *   - このスクリプトは実装フェーズ（TASK-902以降）で完全に機能する
 *   - 現時点ではスキーマのみ生成（ルート定義は未実装）
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import yaml from "js-yaml";

/**
 * OpenAPI仕様を生成してファイルに出力
 */
async function generateOpenAPISpec(): Promise<void> {
	console.log("OpenAPI仕様生成を開始します...");

	// 出力先ディレクトリを作成
	const outputPath = "/home/bun/docs/api/openapi.yaml";
	await mkdir(dirname(outputPath), { recursive: true });

	// 基本的なOpenAPI仕様（雛形）
	// 実装フェーズでHonoアプリから自動生成されるようになる
	const openAPISpec = {
		openapi: "3.1.0",
		info: {
			title: process.env.PROJECT_NAME ? `${process.env.PROJECT_NAME} API` : "API Specification",
			version: "1.0.0",
			description:
				"型安全性強化・API契約強化プロジェクトによるAPI仕様\n\n" +
				"Single Source of Truth: Drizzle ORM → Drizzle Zod → Zod → OpenAPI → TypeScript",
		},
		servers: [
			{
				url: "http://localhost:3001/api",
				description: "開発環境",
			},
		],
		paths: {
			// 実装フェーズでルート定義が追加される
			// 例: /auth/callback, /users/{id}, /users 等
		},
		components: {
			schemas: {
				// 実装フェーズでZodスキーマから自動生成される
			},
			securitySchemes: {
				BearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
					description:
						"Supabase Authで発行されたJWTトークン（RS256/ES256非対称鍵で署名）\n" +
						"バックエンドはJWKS検証により署名を検証:\n" +
						"- JWTヘッダーから kid を取得\n" +
						"- Supabase JWKS エンドポイントから公開鍵セットを取得\n" +
						"- kid に対応する公開鍵で署名検証",
				},
			},
			responses: {
				// 実装フェーズで共通レスポンス定義が追加される
			},
		},
	};

	// YAML形式で出力
	const yamlContent = yaml.dump(openAPISpec, {
		indent: 2,
		lineWidth: 120,
		noRefs: true,
	});
	await writeFile(outputPath, yamlContent, "utf-8");

	console.log(`✓ OpenAPI仕様を生成しました: ${outputPath}`);
}

// スクリプト実行
generateOpenAPISpec().catch((error) => {
	console.error("OpenAPI仕様生成に失敗しました:", error);
	process.exit(1);
});

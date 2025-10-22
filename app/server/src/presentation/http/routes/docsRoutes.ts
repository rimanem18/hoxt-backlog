import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Hono } from 'hono';
import yaml from 'js-yaml';

/**
 * Swagger UI ドキュメントルート
 *
 * 開発環境のみでOpenAPI仕様書をSwagger UIで表示する。
 * 本番環境では404を返却してセキュリティリスクを低減する。
 */
const docs = new Hono();

/**
 * Swagger UI を提供する HTML を生成
 *
 * @param openapiUrl - OpenAPI仕様書のURL
 * @returns Swagger UI の HTML
 */
function generateSwaggerHTML(openapiUrl: string): string {
  // Why: swagger-ui-distは静的ファイルのみ提供のため動的HTML生成が必要
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>API Documentation - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "${openapiUrl}",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
}

/**
 * GET /api/docs
 *
 * 開発環境のみでSwagger UIを提供する。
 * 本番環境では404を返却する。
 */
docs.get('/docs', async (c) => {
  // Why: 本番環境ではセキュリティリスク低減のため非公開
  if (process.env.NODE_ENV === 'production') {
    return c.notFound();
  }

  const html = generateSwaggerHTML('/api/openapi.json');
  return c.html(html);
});

/**
 * GET /api/openapi.json
 *
 * OpenAPI仕様書をJSON形式で提供する。
 * 開発環境のみ有効。
 */
docs.get('/openapi.json', async (c) => {
  // Why: 本番環境ではセキュリティリスク低減のため非公開
  if (process.env.NODE_ENV === 'production') {
    return c.notFound();
  }

  try {
    const yamlPath = join('/home/bun/docs/api/openapi.yaml');
    const yamlContent = await readFile(yamlPath, 'utf-8');

    const jsonContent = convertYAMLToJSON(yamlContent);

    return c.json(jsonContent);
  } catch (error) {
    // Why: ENOENTは404、その他のエラーは500で返却して原因を区別
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error('OpenAPI仕様書が見つかりません:', error);
      return c.json(
        { error: 'OpenAPI仕様書が見つかりません' },
        { status: 404 },
      );
    }

    console.error('OpenAPI仕様書の解析に失敗しました:', error);
    return c.json(
      { error: 'OpenAPI仕様書の解析に失敗しました' },
      { status: 500 },
    );
  }
});

/**
 * YAML→JSON変換
 *
 * OpenAPI仕様書をYAML形式からJSON形式に変換する。
 *
 * @param yamlContent - YAML形式の文字列
 * @returns JSON形式のオブジェクト
 * @throws {yaml.YAMLException} YAML構文エラーの場合
 */
function convertYAMLToJSON(yamlContent: string): unknown {
  // Why: FAILSAFE_SCHEMAで!!jsタグ等の危険な型を排除しJSON-safeな値のみ許可
  return yaml.load(yamlContent, { schema: yaml.FAILSAFE_SCHEMA });
}

export default docs;

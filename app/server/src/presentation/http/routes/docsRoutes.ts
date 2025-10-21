import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Hono } from 'hono';

/**
 * Swagger UI ドキュメントルート
 *
 * What: 開発環境のみでOpenAPI仕様書をSwagger UIで表示
 *
 * Why: API仕様の確認を容易にし、開発効率を向上させる
 * Why: 本番環境では404を返却することでセキュリティリスクを低減
 */
const docs = new Hono();

/**
 * Swagger UI を提供する HTML を生成
 *
 * @param openapiUrl - OpenAPI仕様書のURL
 * @returns Swagger UI の HTML
 */
function generateSwaggerHTML(openapiUrl: string): string {
  // swagger-ui-dist の静的ファイルパスを取得
  // Why: swagger-ui-dist パッケージは静的ファイルのみを提供するため、
  // HTMLを動的に生成してSwagger UIを初期化する必要がある
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
      // Why: Swagger UI の初期化設定
      // Why: url パラメータでOpenAPI仕様書のパスを指定
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
 * 開発環境のみでSwagger UIを提供
 * 本番環境では404を返却
 */
docs.get('/docs', async (c) => {
  // Why: 本番環境では404を返却してセキュリティリスクを低減
  if (process.env.NODE_ENV === 'production') {
    return c.notFound();
  }

  // Why: OpenAPI仕様書のURLを動的に生成
  const html = generateSwaggerHTML('/api/openapi.json');
  return c.html(html);
});

/**
 * GET /api/openapi.json
 *
 * OpenAPI仕様書をJSON形式で提供
 * 開発環境のみ
 */
docs.get('/openapi.json', async (c) => {
  // Why: 本番環境では404を返却してセキュリティリスクを低減
  if (process.env.NODE_ENV === 'production') {
    return c.notFound();
  }

  try {
    // Why: YAML形式のOpenAPI仕様書を読み込んでJSON形式に変換
    // Why: Swagger UIはJSON形式のOpenAPI仕様書を必要とする
    const yamlPath = join('/home/bun/docs/api/openapi.yaml');
    const yamlContent = await readFile(yamlPath, 'utf-8');

    // Why: 簡易的なYAML→JSON変換（本格的な実装では yaml パッケージを使用）
    // Why: 現時点ではキー: 値形式の簡単なYAMLのみをサポート
    const jsonContent = convertYAMLToJSON(yamlContent);

    return c.json(jsonContent);
  } catch (error) {
    console.error('OpenAPI仕様書の読み込みに失敗しました:', error);
    return c.json({ error: 'OpenAPI仕様書が見つかりません' }, { status: 404 });
  }
});

/**
 * 簡易的なYAML→JSON変換
 *
 * Why: yamlパッケージの依存を避け、軽量な実装を提供
 * Why: 本格的な実装では yaml パッケージを使用することを推奨
 *
 * @param yamlContent - YAML形式の文字列
 * @returns JSON形式のオブジェクト
 */
function convertYAMLToJSON(yamlContent: string): unknown {
  // TODO: 本格的な実装では yaml パッケージを使用
  // 現時点では、openapi.yaml が簡易的な形式であることを前提とした
  // 最小限の変換のみ実装

  // Why: 行ごとに処理して階層構造を再構築
  const lines = yamlContent.split('\n');
  const result: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [
    { obj: result, indent: -1 },
  ];

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) {
      // Why: 空行とコメント行をスキップ
      continue;
    }

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    if (trimmed.endsWith(':')) {
      // Why: オブジェクトのキー
      const key = trimmed.slice(0, -1);

      // Why: インデントに基づいてスタックを調整
      while (stack.length > 1) {
        const top = stack[stack.length - 1];
        if (top && top.indent >= indent) {
          stack.pop();
        } else {
          break;
        }
      }

      const currentStack = stack[stack.length - 1];
      if (currentStack) {
        const newObj: Record<string, unknown> = {};
        currentStack.obj[key] = newObj;
        stack.push({ obj: newObj, indent });
      }
    } else if (trimmed.includes(': ')) {
      // Why: キー: 値のペア
      const [key, ...valueParts] = trimmed.split(': ');
      const value = valueParts.join(': ').replace(/^"|"$/g, '');

      // Why: インデントに基づいてスタックを調整
      while (stack.length > 1) {
        const top = stack[stack.length - 1];
        if (top && top.indent >= indent) {
          stack.pop();
        } else {
          break;
        }
      }

      const currentStack = stack[stack.length - 1];
      if (currentStack && key) {
        // Why: 数値・真偽値・nullの変換
        if (value === 'null') {
          currentStack.obj[key] = null;
        } else if (value === 'true') {
          currentStack.obj[key] = true;
        } else if (value === 'false') {
          currentStack.obj[key] = false;
        } else if (!Number.isNaN(Number(value))) {
          currentStack.obj[key] = Number(value);
        } else {
          currentStack.obj[key] = value;
        }
      }
    }
  }

  return result;
}

export default docs;

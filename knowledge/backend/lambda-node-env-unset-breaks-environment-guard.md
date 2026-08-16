---
description: AWS Lambdaで動くserverサービスに対し、「本番では絶対に有効化しない」ようなfail-closedな環境判定（テスト専用エンドポイント・デバッグ機能のガード等）を実装するときや、`process.env.NODE_ENV`/`process.env.ENVIRONMENT`のどちらを判定に使うべきか迷ったときに参照する。Terraformで実際にLambdaへ注入されている環境変数を確認する前に、汎用モジュール（`terraform/modules/lambda/`）だけを見て判断すると誤った結論に至る。
---

## 見出し

このプロジェクトの実Lambda関数（production/preview）は`terraform/bootstrap/main.tf`に直接`aws_lambda_function`リソースとして定義されており、`NODE_ENV`・`ENVIRONMENT`の両方を明示的に注入している。一方`terraform/modules/lambda/main.tf`という再利用可能モジュールは現時点でどこからも呼ばれていない未使用コードであり、そちらだけを確認すると「NODE_ENVはLambdaで設定されない」という誤った結論に至る。

## 背景

HOXBL-101（viewer招待機能）で、E2Eから生アクセストークンを取得するテスト専用HTTPエンドポイントの有効化判定（`isTestEndpointsEnabled()`）を実装する際、最初に`process.env.NODE_ENV !== 'production'`という除外方式（blocklist）を採用した。

## 生じた問題

コードレビューで、この判定がfail-closedの方針に反するblocklist方式であるという指摘を受けたため、Terraformでどの環境変数が確実に注入されるかを調査した。

### 誤った調査と訂正の経緯

1. 最初に`terraform/modules/lambda/main.tf`を確認したところ、`environment.variables`には`var.base_environment_variables`と`ENVIRONMENT = var.environment`のみが設定され、`NODE_ENV`はどこにも設定されていなかった。ここから「Lambdaは`NODE_ENV`を自動設定しないため、`ENVIRONMENT`だけを信頼すべき」と判断し、`ENVIRONMENT`の許可リスト方式に変更した
2. その後ユーザーから「`NODE_ENV`も明示的に指定しよう」という提案があり、`grep -rn "module \"lambda\"" terraform/`で調べたところ、**`terraform/modules/lambda/`はどこからも参照されていない未使用モジュールだった**ことが判明した。実際のLambda関数は`terraform/bootstrap/main.tf`に`resource "aws_lambda_function" "production"` / `"preview"`として直接定義されており、そちらの`environment.variables`には最初から`NODE_ENV`（production: `"production"`、preview: `"development"`）と`ENVIRONMENT`（production: `"production"`、preview: `"preview"`）の**両方**が明示的に設定されていた
3. つまり「NODE_ENVはLambdaで設定されない」という最初の調査結果は誤りだった。汎用モジュールと実際に使われているリソース定義が別れているケースでは、実物（この場合は`bootstrap/main.tf`）を確認しないと誤判断する

### ビルド時の静的置換に関する追加確認

`app/server/src/shared/monitoring/CloudWatchMonitoringService.ts`には「NODE_ENVはesbuildビルド時に静的置換されるため使用不可」という既存コメントがあった。これも実際に`docker compose exec server bun run build:lambda`を実行し、生成された`dist/index.js`を`grep`して確認したところ、`process.env.NODE_ENV`は静的置換されておらず、ランタイムで生きた参照のままだった。

`git log -p --follow -- app/server/package.json`で`build:lambda`スクリプトの変遷を確認すると、かつては`bun build ... --format esm`（Bunのネイティブバンドラー。`process.env.NODE_ENV`を自動的に静的置換する既知の挙動を持つ）を使っていたが、現在は`bun esbuild --bundle ...`（esbuild互換CLI。デフォルトでは`process.env.NODE_ENV`を静的置換しない）に変更されていた。上記コメントはネイティブバンドラー時代の名残で、現在のビルドコマンドには当てはまらない（stale docs）。

## 対処法

- 実際にリソースを定義している`.tf`ファイル（モジュール呼び出し元やbootstrap）を確認し、汎用モジュールだけで判断しない
- 「ビルド時に静的置換される」というコメント付きの制約に遭遇したら、現在のビルドコマンド（`package.json`のスクリプト）で実際にビルドし、生成物を`grep`して現在も成り立つ制約か検証する。ビルドツールが変わっていると過去の制約が失効している場合がある
- `NODE_ENV`と`ENVIRONMENT`が両方確実に注入される環境では、両方をAND条件で使う多層防御が可能（このプロジェクトでは`isTestEndpointsEnabled()`が両方をチェックする）。previewでE2Eを実行しない運用にする場合、preview Lambdaの`NODE_ENV`をproductionと同じ値に揃えることで、`ENABLE_TEST_ENDPOINTS`が誤ってpreviewで`true`に設定されてもテスト専用エンドポイントが有効化されない

```ts
const TEST_ENDPOINTS_ALLOWED_ENVIRONMENTS = new Set(['development', 'preview']);

export function isTestEndpointsEnabled(): boolean {
  return (
    TEST_ENDPOINTS_ALLOWED_ENVIRONMENTS.has(process.env.ENVIRONMENT ?? '') &&
    process.env.NODE_ENV !== 'production' &&
    process.env.ENABLE_TEST_ENDPOINTS === 'true'
  );
}
```

## 学び

- 「未使用の汎用モジュールを見て判断する」のではなく、`grep -rn "module \"xxx\"" terraform/`等でその汎用モジュールが実際に呼ばれているかを先に確認する。呼ばれていなければ、実物のリソース定義（このプロジェクトでは`bootstrap/main.tf`）を直接見る
- 「〇〇は静的置換されるため使えない」等のコメントは、それを書いた時点のビルド構成に依存する。ビルドツール（`bun build` vs `bun esbuild`等）が変わっていないかを`git log -p`でスクリプトの変遷を確認し、可能なら実際にビルドして生成物を検証する
- fail-closedな判定を書く際は「未設定・タイプミス・未知の値」がどちらに転ぶかを確認する。除外方式（`!== 'production'`）は変数が未設定の場合に意図せず「常に許可」側へ転ぶため、許可リスト方式（allowlist）の方が安全
- 複数の独立した環境変数（`NODE_ENV`と`ENVIRONMENT`）がそれぞれ別の理由でTerraformに設定されている場合、片方が誤設定されても他方が防波堤になるようAND条件で組み合わせる多層防御が有効

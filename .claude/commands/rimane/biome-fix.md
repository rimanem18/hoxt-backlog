---
description: import パスの修正や biome での lint & format を実施し、問題があったら修正します。
---

## 事前情報

エラーが生じた場合、試行錯誤回数よりも質を重視するため、gemini MCP, Codex MCP, o3 MCP などを利用してください。  
ただし、MCP は背景を理解しきれません。仕様やプロジェクトルールに反する提案は無視してください。  
既存のコードベースの内容は、 Codex MCP, 検索や最新情報が必要な場合はまずは gemini の使用を優先し、応答がない場合は o3 を使用します。o3 は推論や検索が長いため、気長に待機してください。何度もメッセージを送るのは禁止です。

## 実行内容

1. `docker compose exec {コンテナ名} bun run fix` を実施
2. 使用されていない import を削除
3. `docker compose exec {コンテナ名} bun test` を実施
    - コンテナ名に client が指定された場合に限り、`docker compose e2e exec npx playwright test` で E2E テストも実施
4. `docker compose exec {コンテナ名} bunx tsc --noEmit` を実施
5. 問題があれば修正
6. `docker compose run --rm semgrep semgrep <args...>` を実施
7. 層が異なる相対パスを絶対パスに修正
8. 層が同じでも 3つ以上遡っている相対パスを絶対パスに修正

- **推奨**: biome の指摘と関係のないテストや型エラーも修正します。
- **禁止**: `--unsafe` オプションの実行。
  - 未使用変数はアンダースコアプレフィックスをつけずに削除。削除せずにアンダースコアをつけて残す必要がある場合、コメントで理由を明記します。

問題が解決するまで繰り返します。
三度繰り返しても解決しない場合、ユーザーに指示を求めます。

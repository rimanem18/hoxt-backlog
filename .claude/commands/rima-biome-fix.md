---
name: rima-biome-fix
description: biome での lint & format を実施し、問題があったら修正します。
---

## 実行内容

1. `docker compose exec {コンテナ名} bun run fix` を実施
2. 使用されていない import や変数や関数を削除
3. `docker compose exec {コンテナ名} bun test` を実施
3. `docker compose exec {コンテナ名} bunx tsc --noEmit` を実施
4. 問題があれば修正
5. `docker compose exec {コンテナ名} bun run fix` を実施

問題が解決するまで繰り返します。
三度繰り返しても解決しない場合、ユーザーに指示を求めます。

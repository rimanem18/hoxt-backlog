---
description: generate-schemas.ts（Drizzleスキーマから自動生成する `bun run generate:schemas`）に、アンダースコア区切りで複数単語からなる新規テーブル（例: `project_viewers`, `viewer_access_tokens`）を追加するときに参照する。生成されたZodスキーマファイルが `bunx tsc --noEmit` でimportエラーになる場合に該当する。
---

## 見出し

`generate-schemas.ts` の命名変換ロジックが、単語1つのテーブル名（`users`/`tasks`/`projects`）しか想定しておらず、アンダースコア区切りの複数単語テーブル名を追加すると生成コードが壊れる

## 背景

`app/server/scripts/generate-schemas.ts` は `tableConfigs` 配列にテーブルを1エントリ追加するだけでZodスキーマファイルを自動生成する設計になっている（`.claude/rules/schema-db.md`のスキーマ駆動開発フロー）。生成ロジック内部では、テーブル名（例: `'users'`）から

- 型名・エクスポート名用の `capitalizedName`（`'User'`）
- import識別子・`createSelectSchema()`等に渡す変数名（テーブル名そのまま `${tableName}` を利用）

を作っていたが、既存の3テーブル（`users`, `tasks`, `projects`）はいずれも単一単語かつテーブル名とDrizzleのexport変数名（キャメルケース）が偶然一致していたため、この設計の限界が表面化していなかった。

## 生じた問題

HOXBL-101で `project_viewers` / `viewer_access_tokens` という複数単語スネークケースのテーブルを `tableConfigs` に追加したところ、生成された `src/schemas/project-viewers.ts` が以下のようになった。

```ts
import { project_viewers } from '@/shared/database/schema';
// ...
export const selectProject_viewerSchema = createSelectSchema(project_viewers);
```

`bunx tsc --noEmit` を実行すると

```
src/schemas/project-viewers.ts(14,10): error TS2724: '"@/shared/database/schema"' has no exported member named 'project_viewers'. Did you mean 'projectViewers'?
```

というエラーになった。原因は2つ：

1. `capitalize()` は先頭1文字を大文字化するだけで、`_` 区切りの各単語を個別にキャピタライズしないため、型名が `Project_viewer`（`_`混入・2単語目が小文字のまま）になっていた
2. `schema.ts`側はDrizzleの規約に従い `projectViewers`（キャメルケース）としてexportしているのに対し、生成スクリプトは`tableName`（スネークケースの生文字列 `'project_viewers'`）をそのままimport識別子として埋め込んでいたため、存在しないエクスポート名を参照していた

## 対処法

`generate-schemas.ts` に、スネークケースをパスカルケース/キャメルケースへ正しく変換するヘルパーを追加した。

```ts
function toPascalCase(str: string): string {
  return str.split('_').map(capitalize).join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
```

- 型名・エクスポート名生成には `toPascalCase(singularName)` を使用（`capitalize()`の単純呼び出しから置き換え）
- import識別子・`createSelectSchema()`/`createInsertSchema()`への実引数には、`tableName`（コメント等の説明文用にはそのまま残す）とは別に `tableVarName = toCamelCase(tableName)` を新設し、そちらを使用

修正後、既存の`users`/`tasks`/`projects`（単一単語のため`toPascalCase`/`toCamelCase`の前後で結果が変わらない）の生成結果に差分がないことを確認したうえで、新規2テーブルが正しく `projectViewers` / `ProjectViewer` として生成されることを確認した。

## 学び

- 既存の自動生成スクリプトが少数の具体例（単一単語のテーブル名）だけで動作確認されている場合、新しいテーブル追加のたびに「今までの入力パターンでは区別がつかなかった前提」が破綻していないか疑うとよい。特に文字列変換・命名規則の生成ロジックは、複数単語・スネークケース・複数形などのバリエーションで壊れやすい
- 生成スクリプトを直したあとは、新規追加分だけでなく既存テーブル分の出力にも差分が出ていないか（意図しない破壊的変更になっていないか）を必ず確認する

---
description: 複数のfeatureディレクトリ間で一方向依存（例 features/todo → features/project のみ許可、逆方向は禁止）が設計上定められているプロジェクトで、両featureから使いたい共通ユーティリティ（エラーハンドリング等）をどこに置くか迷ったときに参照する。「新しいhookを作ったら、既存の別featureのユーティリティをimportすることになった」という場面で該当する。
---

## 見出し

一方向依存のfeature設計で、片方のfeature配下に置かれた共通ユーティリティを逆方向からimportしてしまっていた

## 背景

このプロジェクトのフロントエンドは、要件定義・技術設計（design.md）で「`features/todo`は`features/project`に依存してよいが、逆（`features/project`が`features/todo`に依存する）は禁止」という一方向依存を明示的に定めている。project機能をtask機能より後から追加した都合上、`handleApiError`という汎用的なAPIエラー整形関数が`app/client/src/features/todo/hooks/apiErrorHandler.ts`に置かれていた。

## 生じた問題

project一覧取得フック（`useProjects.ts`）を実装する際、既存のエラーハンドリングパターンを踏襲しようとして`@/features/todo/hooks/apiErrorHandler`をimportした。これは動作上は問題なく型チェック・テストも通るため、その場では気づかれなかった。

その後、project詳細取得フック（`useProject.ts`）でも同じ関数を使う実装をしたところ、Codeレビュー（cross-file観点）で「`features/project`が`features/todo`へ依存しており、design.mdが定める一方向依存に違反している」と指摘された。`useProjects.ts`側の既存の同種の依存も合わせて発覚した。

依存の向きが逆であること自体はlintやtscでは検出されない（importパス自体はどのfeatureからでも書けてしまう）ため、機械的なチェックでは見つけにくい。

## 対処法

`handleApiError`は`features/todo`固有のロジックを一切含まない汎用関数だったため、featureディレクトリの外（`app/client/src/lib/`）へ移設した。

```
app/client/src/features/todo/hooks/apiErrorHandler.ts
  → app/client/src/lib/apiErrorHandler.ts
```

移設前に`grep -rln "apiErrorHandler" app/client/src`で利用箇所を確認し、`features/todo`側に実際の利用者がいないこと（`useTasks.ts`/`useTaskMutations.ts`は同じロジックを別途インライン実装していた）を確認してから、importパスを更新するだけで両feature側とも壊れずに解消できた。

## 学び

- 複数featureで一方向依存が定められているプロジェクトでは、「既存の実装パターンを踏襲する」際に、そのユーティリティが**依存が許可されている方向に置かれているか**を確認する。踏襲元のコードが既に依存違反をしている場合、新しいコードで同じ違反を複製してしまう
- 汎用的なユーティリティ（外部I/Oのエラー整形など、特定のドメイン知識を含まないもの）は、最初から特定のfeatureディレクトリ配下ではなく、featureをまたいで参照できる中立の場所（このプロジェクトでは`src/lib/`）に置くと、後からの依存方向の破綻を防ぎやすい
- この種の「依存方向」の問題は自動テスト・型チェックでは検出されないため、cross-file観点でのコードレビュー（Codex等の多角的レビュー）が有効

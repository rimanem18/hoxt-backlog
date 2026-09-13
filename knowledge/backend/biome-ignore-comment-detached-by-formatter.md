---
description: Hono/@hono/zod-openapiのハンドラ登録（app.openapi(route, (c) => controller.xxx(c) as any)）のように、biome-ignoreコメントを伴う1行のコード片を新規に書くときに参照する。biome run fix（またはCI側のbiome check）実行後に「suppressions/unused」警告やnoExplicitAny警告が消えない場合、あるいはbiome-ignoreコメントを付けたのに効いていないように見える場合に該当する。
---

## 見出し

biome-ignoreコメントは、biomeのフォーマッタが行を複数行に折り返した後の「実際に警告が発生する行」の直前に付いていないと効かない

## 背景

`viewerAccessRoutes.ts`の既存パターンを踏襲し、新規`notificationRoutes.ts`で以下のように書いた。

```ts
// biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
app.openapi(
  updateNotificationSettingRoute,
  (c) => controller.updateNotificationSetting(c) as any,
);
```

元にした`viewerAccessRoutes.ts`では`app.openapi(getViewerTasksRoute, (c) => controller.getTasks(c) as any);`が1行に収まっていたため、ignoreコメントは問題なく効いていた。しかし`notificationRoutes.ts`側はルート名・メソッド名が長く、biomeのフォーマッタ（lineWidth=80）が自動的に複数行に折り返した。

## 生じた問題

`docker compose exec server bun run fix`実行後、以下2件の警告が残った。

- `lint/suspicious/noExplicitAny`: `as any`が実際に検出される（無視されていない）
- `suppressions/unused`: 付与したbiome-ignoreコメントが「一致する警告がないため未使用」と判定される

原因は、biome-ignoreコメントが直前の行（`app.openapi(`）に対して付いており、実際に`as any`が現れる行（3行下）とは一致していなかったこと。biomeのignoreコメントは「コメントの直後の行」に対してのみ効く仕様のため、フォーマッタによる折り返しでコメントと対象行が引き離されると機能しなくなる。

## 対処法

`as any`が実際に現れる行の直前にignoreコメントを移動する。

```diff
-  // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
-  app.openapi(
-    updateNotificationSettingRoute,
-    (c) => controller.updateNotificationSetting(c) as any,
-  );
+  app.openapi(updateNotificationSettingRoute, (c) =>
+    // biome-ignore lint/suspicious/noExplicitAny: OpenAPIHonoの型推論の制限
+    controller.updateNotificationSetting(c) as any,
+  );
```

修正後、`docker compose exec server bunx biome check <file>`で警告0件を確認した。

## 学び

- 既存コードの短い1行パターンを別ファイルにコピーして関数名・型名が長くなると、biomeのフォーマッタが自動折り返しを行い、biome-ignoreコメントの対象行がずれて無効化されることがある。新規ファイルで`biome-ignore`を使う際は、`bun run fix`後に必ずそのファイル単体で`biome check`を実行し、警告が0件であることを確認する（フォーマット前に書いたコメント位置を信用しない）
- biome-ignoreコメントは「次の1行」にしか効かないため、複数行にまたがる式の一部だけを無視したい場合は、無視したい式そのものが単独の行になるようコードを整形してからコメントを付ける

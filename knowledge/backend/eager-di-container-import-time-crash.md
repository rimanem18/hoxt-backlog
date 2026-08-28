---
description: Honoのドメインルートファイル（例: `xxxRoutes.ts`）で、モジュールのトップレベルでDIコンテナからUseCaseを解決してデフォルトエクスポートを作る既存パターンを新しいドメインに適用するときに参照する。新しいドメインが新しい環境変数・外部サービス（SES、外部API等）に依存する場合、その設定が未完了だとサーバー全体の起動が失敗する。
---

## 見出し

Honoルートファイルのモジュールトップレベルで`XxxDIContainer.getYyyUseCase()`を即時評価するパターンは、新しいドメインが新しい必須環境変数（既存のDATABASE_URL等とは異なる、そのドメイン固有の外部サービス設定）に依存する場合、そのドメインの機能を一度も呼ばなくても、モジュールをimportするだけでサーバー全体の起動が失敗する

## 背景

このプロジェクトの既存ドメイン（`project`, `task`等）は、ルートファイル（`projectRoutes.ts`等）のモジュールトップレベルで

```ts
const projectController = new ProjectController(
  ProjectDIContainer.getCreateProjectUseCase(),
  // ...
);
```

のように、DIコンテナから即座にUseCaseを解決してControllerを構築し、それをそのままデフォルトエクスポートする設計になっている。これは`entrypoints/index.ts`がすべてのドメインルートを`import`した時点で、DIコンテナの初期化（Repositoryのシングルトン生成等）が完了する設計であり、既存ドメインは`DATABASE_URL`のような「サーバー起動には必ず設定されている前提の環境変数」にしか依存していなかったため問題が起きていなかった。

HOXBL-101（viewer招待機能）で、新規`viewer`ドメインの`ViewerDIContainer.getInviteViewerUseCase()`をこの既存パターンに従って実装し、`viewerManagementRoutes.ts`のトップレベルで呼び出した。

## 生じた問題

`ViewerDIContainer.getInviteViewerUseCase()`は内部で招待メール送信ゲートウェイ（本番相当では`SesInvitationMailGateway.getInstance()`）を解決し、これは`AWS_REGION`/`SES_FROM_ADDRESS`という新規環境変数が未設定だと即座に例外をスローする実装だった。また、アクセスURL組み立て用の`getViewerAccessBaseUrl()`も`VIEWER_ACCESS_BASE_URL`が未設定だと例外をスローする。

これらの環境変数は`compose.yaml`/Terraformにまだ反映されていない状態だったため、`viewerManagementRoutes.ts`をimportした瞬間（`entrypoints/index.ts`が全ドメインルートをimportする際）に例外が発生し、**viewer機能を一度も呼び出していなくても、サーバー全体（`bun run dev`等）が起動できなくなる**ことがコードレビュー（Codex MCP、cross-file観点）で発覆した。統合テストは`createViewerManagementRoutes(dependencies)`というテスト用ファクトリ関数経由でモックUseCaseを注入していたため、この問題を検出できていなかった。

## 対処法

DIコンテナへの解決を、実際のリクエスト処理が発生するまで遅延させるプロキシを挟む。

```ts
const lazyInviteViewerUseCase: IInviteViewerUseCase = {
  execute: (input) =>
    ViewerDIContainer.getInviteViewerUseCase().execute(input),
};

const viewers = createViewerManagementRoutes({
  inviteViewerUseCase: lazyInviteViewerUseCase,
});
```

これにより、モジュールのimport自体はDIコンテナに触れず、実際に`/viewers`エンドポイントへリクエストが来た初回にのみ`ViewerDIContainer.getInviteViewerUseCase()`が評価される。新しい環境変数が未設定でも、そのドメインの機能を使わない限りサーバーは正常に起動する。

## 学び

- テスト用ファクトリ関数（`createXxxRoutes(dependencies)`）経由の統合テストは、モジュールのデフォルトエクスポート（本番用の実DI解決を含むトップレベルコード）を実行しないため、この種の「import時クラッシュ」を検出できない。実際に`bun -e "import(...)"`等でモジュール単体のimportを試すか、コードレビューで明示的に確認する必要がある

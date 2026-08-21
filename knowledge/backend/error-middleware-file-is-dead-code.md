---
description: 技術設計書（design.md）が「エラー種別をerrorMiddlewareのERROR_MAPPINGSに追加登録する」と指示しているタスクに着手する前に参照する。新規ドメインのエラーハンドリング実装方式を既存パターンと合わせたいときに該当する。
---

## 見出し

`app/server/src/shared/middleware/errorMiddleware.ts`は`task`ドメインのエラー2種類のみを登録した汎用エラーマッパーだが、実際には`entrypoints/index.ts`のどのルートにもマウントされておらず、`project`/`task`ドメインは各ルートファイル（`projectRoutes.ts`/`taskRoutes.ts`）内で`app.onError(...)`によるインラインのif分岐エラーハンドリングを個別に実装している。技術設計書がこの実態と異なる記述をしている場合がある。

## 背景

HOXBL-101 Phase3で、viewer招待APIのエラーハンドリング（`InvalidViewerDataError`→400、`InvitationMailDeliveryError`→502等）を実装する際、`tasks/HOXBL-101/technical/design.md`の7.2節には「`errorMiddleware`の`ERROR_MAPPINGS`に追加登録する」と明記されていた。

## 生じた問題

`shared/middleware/errorMiddleware.ts`を確認すると、`TaskNotFoundError`/`InvalidTaskDataError`の2種類だけが`ERROR_MAPPINGS`配列に登録されていた。しかし`entrypoints/index.ts`を確認すると、このミドルウェア自体がどの`app.use()`/`app.route()`にも渡されておらず、実際には使われていないことが判明した。代わりに、`project/presentation/projectRoutes.ts`と`task/presentation/taskRoutes.ts`は、それぞれ独自に`app.onError((err, c) => { if (err instanceof XxxError) {...} ... })`という同型のインラインエラーハンドラを個別に持っていた。

design.mdの記述通りに`errorMiddleware.ts`へ新エラーを追加登録しても、実際のルーティングには何の効果もなく、動かないコードを増やすだけになる。

`project/presentation/ProjectController.ts`・`task/presentation/TaskController.ts`・`viewer/presentation/ViewerManagementController.ts`のdocコメントには「エラーハンドリングはerrorMiddlewareに委譲する」と記載されているが、これも実態と異なる。実際のエラーハンドリングは各`XxxRoutes.ts`のインライン`app.onError`が担っている。

## 対処法

CLAUDE.mdの「タスク計画はあくまで計画。実装と突合したときに不自然な箇所がある場合は差異を記録した上、強引に計画に沿うのではなく合致を優先する」という方針に従い、design.mdの記述ではなく実際のコードベースの慣習（`project`/`taskRoutes.ts`と同型のインライン`onError`）を新規`viewerManagementRoutes.ts`にも採用した。差異はタスク計画ファイルの実施記録に明記した。

## 学び

- 技術設計書に「既存の◯◯を使う」と書かれている場合でも、その◯◯が実際にはメンテナンスされず死んでいるコードである可能性がある。実装着手前にgrepで実際の呼び出し・マウント箇所を確認し、設計書の記述と実装の慣習が食い違う場合は実装側を優先する
- コード中のdocコメントも実装の裏付けにはならない。「errorMiddlewareに委譲する」のような記述がコントローラーに残っていても、実際にそのミドルウェアがマウントされているとは限らないため、コメントを鵜呑みにせず実装（`entrypoints/index.ts`のマウント状況、各`XxxRoutes.ts`の`app.onError`）を確認する
- 複数ドメインで同じロジック（バリデーションフック、エラーハンドラ）が個別ファイルに重複している状態は、このプロジェクトでは意図的な設計ではなく単純な既存の重複（技術的負債）である可能性が高い。新規ドメイン追加時に「共通化すべきか」を都度検討する余地はあるが、既存2ドメインが既に重複している状態で3番目だけ共通化するとむしろ非対称になるため、リファクタリングは別タスクとして提案するのが安全

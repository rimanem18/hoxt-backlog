# Phase 4-before: Unit of Work基盤の導入（viewerドメイン向け準備）

## 1. このフェーズの目的

`InviteViewerUseCase`の「招待（`project_viewers`）保存＋トークン（`viewer_access_tokens`）発行」を、単一のDBトランザクションとして原子的に実行できるようにするための`Unit of Work`基盤を導入する。Phase 3では、この2つの保存を別々のRepository呼び出しとして順次実行し、片方が失敗した場合は手動の補償削除（`deleteById`）でロールバック相当を再現していた。この方式は動作するが、既存コードベース初のマルチRepository書き込みであり、design.md 5.1節が要求する「DBトランザクション内で保存しコミット」という設計方針とも異なっていた（phase3.md 7章の差異記録を参照）。

Phase 4・5は`InviteViewerUseCase`に新しい分岐（別project追加招待・no-op・期限切れ再発行・取り消し・復元）を追加していくため、その土台となるUseCaseの内部実装を先に整理しておく。

## 2. スコープと非スコープ

- **スコープ**: `InviteViewerUseCase`の「新規招待+新規トークン」保存パスを、手動補償削除からDBトランザクション（Unit of Work）へ置き換える、既存コードベース初のUnit of Work抽象の設計・実装
- **非スコープ**: Phase 4・5が実装するビジネスロジック分岐（別project追加招待・no-op・期限切れ再発行・取り消し・復元）。本フェーズはリファクタリングであり、AC-01・AC-04・AC-05・AC-06（Phase 3で確認済みの振る舞い）を変更しない
- **非スコープ**: `project`/`task`ドメインへのUnit of Work導入。まずviewerドメインで実績を作り、他ドメインへの展開は将来の別タスクとして検討する

## 3. 確認可能なこと

- 新規招待時、招待保存とトークン保存が単一のDBトランザンクション内で実行され、片方が失敗した場合は両方がDBレベルでロールバックされることを統合テストで確認できる
- メール送信失敗時の補償操作（コミット後に削除する経路）は、Phase 3から振る舞いを変えずに維持されていることを確認できる
- Phase 3で実装済みの`viewerManagementRoutes.integration.test.ts`・`InviteViewerUseCase.test.ts`が、実装の入れ替え後もすべてグリーンであることを確認できる（振る舞いを変えないリファクタリングであるため）

## 4. 関連要件・関連設計

- **関連要件**: REQ-101, REQ-102, REQ-303（design.md 5.1節・6章が要求する「DB状態は更新されたがメール送信は失敗した、を許容しない」方針の徹底）
- **関連設計**: design.md §5.1手順7〜9, §6（部分成功を許容しない方針）
- **参照**: `tasks/HOXBL-101/plan/phase3.md` 7章「差異の記録」（Unit of Work未導入のまま実装した経緯）

## 5. 依存関係

- **前提フェーズ**: Phase 3
- **後続フェーズ**: Phase 4（このフェーズの完了後に着手する）
- **ブロッカー**: なし

## 6. タスク一覧

- [ ] **TASK-4B-01: `IViewerInvitationUnitOfWork`ポート定義とPostgreSQL実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 3
  - **関連要件**: REQ-101, REQ-102, REQ-303
  - **関連設計**: design.md §5.1手順7〜9, §6
  - **実装詳細**:
    - `app/server/src/viewer/application/IViewerInvitationUnitOfWork.ts`に、`execute<T>(fn: (repos: { projectViewerRepository: IProjectViewerRepository; viewerAccessTokenRepository: IViewerAccessTokenRepository }) => Promise<T>): Promise<T>`を定義する
    - `app/server/src/viewer/infrastructure/PostgreSQLViewerInvitationUnitOfWork.ts`に、`db.transaction()`（既存`app/server/src/shared/database/DatabaseConnection.ts`の`executeTransaction`と同じ仕組み）でトランザクションを開始し、トランザクションスコープの`PostgreSQLProjectViewerRepository`/`PostgreSQLViewerAccessTokenRepository`インスタンスを生成してコールバックへ渡す実装を行う
    - `PostgreSQLProjectViewerRepository`/`PostgreSQLViewerAccessTokenRepository`のコンストラクタ引数型が、通常の`db`とトランザクション内の`tx`の両方を受け付けられることを確認し、必要なら型を調整する
  - **完了条件**: コールバック内の複数Repository呼び出しが単一のDBトランザクションとして扱われる。コールバック内で例外が発生した場合、それまでに行われた書き込みがすべてロールバックされること
  - **統合テスト要件**: `app/server/src/viewer/infrastructure/__tests__/PostgreSQLViewerInvitationUnitOfWork.test.ts`に配置。招待保存後にトークン保存が例外を投げるコールバックを渡し、招待側もDBに残らないことをDB直接確認で検証する。正常系（両方成功しコミットされる）も確認する

- [ ] **TASK-4B-02: `InviteViewerUseCase`をUnit of Work経由に書き換え（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4B-01
  - **関連要件**: REQ-101, REQ-102, REQ-303
  - **関連設計**: design.md §5.1手順7〜9
  - **実装詳細**:
    - `InviteViewerUseCase`のコンストラクタから`IProjectViewerRepository`/`IViewerAccessTokenRepository`の直接注入を外し、`IViewerInvitationUnitOfWork`を注入する
    - 招待エンティティ・トークンエンティティの生成後、両方の保存を`unitOfWork.execute(async (repos) => {...})`内で行う
    - メール送信は既存通りコミット後（トランザクション外）に実行する。送信失敗時の補償削除（`compensate`）はDBトランザクション外で保存済みのデータを削除する経路のため維持する
    - トークン保存失敗時の手動補償削除（Phase 3で追加した`deleteViewerSafely`）は、DBトランザクションのロールバックに委ねられるため削除する
  - **完了条件**: 既存の統合テスト・単体テストがすべてグリーンのまま、内部実装がUnit of Work経由になっていること
  - **単体テスト要件**: `InviteViewerUseCase.test.ts`をUnit of Workのモック注入に合わせて更新する。「トークン保存が失敗した場合、招待の`deleteById`は呼ばれない（DBロールバックにより不要）」という観点のテストに置き換える。メール送信失敗時の補償削除テストはそのまま維持する

- [ ] **TASK-4B-03: `ViewerDIContainer`の更新（DIRECT）**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-4B-01, TASK-4B-02
  - **関連要件**: なし（インフラ）
  - **実装詳細**: `ViewerDIContainer`に`getViewerInvitationUnitOfWork()`を追加し、`getInviteViewerUseCase()`の依存解決を更新する。個別Repositoryの公開メソッド（`getProjectViewerRepository()`/`getViewerAccessTokenRepository()`）は、他の用途（Phase 4以降の一覧・取り消し等）で引き続き必要なため残す
  - **完了条件**: `InviteViewerUseCase`が`ViewerDIContainer`経由で正しく構築できること

- [ ] **TASK-4B-04: 回帰確認（DIRECT）**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-4B-01〜03
  - **実装詳細**: `bunx tsc --noEmit`（server/client）、`bun test`、`bun run check`、`docker compose run --rm semgrep semgrep`、`docker compose build server`を実行し、Phase 3で実装済みの統合テスト（`viewerManagementRoutes.integration.test.ts`）が既存の振る舞い（201/400/404/502）を維持することを確認する
  - **完了条件**: すべてグリーンであること

## 7. このフェーズの完了条件

- `InviteViewerUseCase`の「招待保存＋トークン保存」が単一のDBトランザクションとして原子的に実行されること
- Phase 3で確認済みの振る舞い（AC-01・AC-04・AC-05・AC-06）が変化していないこと
- 既存テスト・新規テストがすべてグリーンであること
- Phase 4のタスク（別project追加招待・no-op・期限切れ再発行）が、このUnit of Work基盤の上にそのまま実装できる状態になっていること

## 8. 実施記録

（実施時に記入する）

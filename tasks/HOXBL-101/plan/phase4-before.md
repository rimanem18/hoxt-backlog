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

- [x] **TASK-4B-01: `IViewerInvitationUnitOfWork`ポート定義とPostgreSQL実装（Red→Green）**
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

- [x] **TASK-4B-02: `InviteViewerUseCase`をUnit of Work経由に書き換え（Red→Green）**
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

- [x] **TASK-4B-03: `ViewerDIContainer`の更新（DIRECT）**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-4B-01, TASK-4B-02
  - **関連要件**: なし（インフラ）
  - **実装詳細**: `ViewerDIContainer`に`getViewerInvitationUnitOfWork()`を追加し、`getInviteViewerUseCase()`の依存解決を更新する。個別Repositoryの公開メソッド（`getProjectViewerRepository()`/`getViewerAccessTokenRepository()`）は、他の用途（Phase 4以降の一覧・取り消し等）で引き続き必要なため残す
  - **完了条件**: `InviteViewerUseCase`が`ViewerDIContainer`経由で正しく構築できること

- [x] **TASK-4B-04: 回帰確認（DIRECT）**
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

- 開始時刻: 2026-08-17 17:34 JST
- 終了時刻: 2026-08-17 17:56 JST
- 合計時間: 約22分（typecheck/test/lint/build/semgrepの実行時間を含む）

### 差異の記録

- **TASK-4B-01のRed-Green実施順序**: メインエージェントが`PostgreSQLViewerInvitationUnitOfWork.test.ts`と`InviteViewerUseCase.test.ts`（既存テストの改修）をRedとして先に書き、`green-minimal-implementer`サブエージェントに実装を委譲した。1回目の依頼で`PostgreSQLViewerInvitationUnitOfWork`本体は完成したが、`InviteViewerUseCase`本体・`ViewerDIContainer`の更新（TASK-4B-02/03相当）が未完のまま応答が終了したため、同一サブエージェントに`SendMessage`で続行を依頼して完了させた
- **型調整（TASK-4B-01完了条件）**: 想定通り、`PostgreSQLProjectViewerRepository`/`PostgreSQLViewerAccessTokenRepository`のコンストラクタ引数型`Database`が、トランザクションコールバックの`tx`型を受け付けられなかったため、`DatabaseConnection.ts`に`DatabaseOrTransaction`型（`Database | DatabaseTransaction`のユニオン）を追加し、両Repositoryのコンストラクタ引数型をこれに変更した
- **Refactorフェーズでの設計修正**: Green実装の1回目では、`InviteViewerUseCase`のコンストラクタに`unitOfWork`を追加する一方で`IProjectViewerRepository`/`IViewerAccessTokenRepository`の直接注入も残す実装になっていた（メール送信失敗時の`compensate`がトランザクション外で直接Repositoryを呼ぶため）。しかしTASK-4B-02の実装詳細は「コンストラクタから`IProjectViewerRepository`/`IViewerAccessTokenRepository`の直接注入を外す」ことを明記しており、これはRed（テスト）を書いたメインエージェント側の見落としだった。Codex MCPによるコードレビュー（efficiency/altitude観点）で「unitOfWorkと同じRepositoryの直接注入が二重化しており抽象度が不明瞭」との指摘を受け、Refactorフェーズで計画通りに修正した。`compensate`は招待・トークンそれぞれについて`unitOfWork.execute()`を個別に（1件ずつ独立したトランザクションとして）呼ぶ形に変更し、直接Repository注入を完全に排除した
- **`executeTransaction`の型整理**: Codexレビュー（reuse/simplification観点）の指摘を受け、`DatabaseTransaction`型を`executeTransaction`のコールバック引数型として直接利用する形に変更し、`as T`キャストと型定義の二重管理を解消した。あわせて`knip`が指摘していた「未使用exported型`DatabaseTransaction`」も解消された
- **Codexレビューで見送った指摘**: 「補償削除2件を`Promise.allSettled`で並列化できる」という低優先度の提案は、メール送信失敗時のみ通る例外経路であり通常時の性能に影響しないため見送った。「design.md 5.1節が要求する既存招待・既存トークンの状態別分岐が未実装」という指摘は、Phase 4-before自体の非スコープ（Phase 4で対応予定）であるため対応不要と判断した

### 所要時間

- `bunx tsc --noEmit`（server/client）: エラーゼロ
- `bun test`（server）: 908 pass / 0 fail（2566 expect calls、約20〜25秒）
- `bun run fix`（Biome lint & format、server/client）: 修正なし
- `docker compose build server`: 正常にビルド完了
- `semgrep --config auto`（viewer関連パス対象）: 213ルール・83ファイルスキャンで0 findings
- `bun run knip`: 今回の変更ファイル起因の新規指摘なし（既存の技術的負債はPhase1から継続。`DatabaseTransaction`の未使用export指摘はリファクタリングにより解消）

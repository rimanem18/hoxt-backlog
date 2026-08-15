# Phase 6: viewer横断閲覧API（トークンアクセス）

## 1. このフェーズの目的

`GET /api/viewer/tasks`により、viewerがトークン付きリンクからログイン不要で全project横断のtask一覧を閲覧できる状態をHTTP応答まで一貫して成立させる。無効・失効・期限切れトークンの拒否と、招待0件時の空状態表示を両立させる。viewerトークンが既存の編集系APIを一切認証できないことも確認する。

## 2. 確認可能なこと

- 統合テストで、有効なトークンでアクセスすると、招待されている全projectのtaskがprojectごとにグルーピングされ、title・description・status・priorityとともに表示されることを確認できる（AC-09）
- 統合テストで、存在しない・失効・期限切れのトークンでアクセスが拒否され、再発行手段は提供されないことを確認できる（AC-10、30日ちょうど＝有効/30日超過＝無効の境界含む）。overview.md 2章の用語整理の通り、「失効済み」は(a)期限切れ、(b)再発行により旧ハッシュが検索不能になった状態、のいずれかとして検証する（`viewer_access_tokens`にトークン単位の失効フラグは存在しないため）
- 統合テストで、有効なトークンだが招待が全て取り消されている場合、アクセスは拒否されず空状態が表示されることを確認できる（AC-11）
- 統合テストで、`Viewer-Access-Token`ヘッダを付与しても既存のtask/project更新系APIが認証されないことを確認できる（REQ-002）

## 3. 関連要件・関連設計

- **関連要件**: REQ-002, REQ-003, REQ-104, REQ-201, REQ-301, REQ-306, NFR-102
- **関連設計**: design.md §4.2, §5.2, §5.3, §7.1, §9, §10.1, §10.2, §13

## 4. 依存関係

- **前提フェーズ**: Phase 2（招待APIとは独立して着手可能だが、招待0件でない状態での動作確認にはPhase 3の完了が必要）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-6-01: `IProjectRepository.findByIds`/`ITaskRepository.findByProjectIds`の追加実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 2
  - **関連要件**: REQ-104
  - **関連設計**: design.md §4.2, §10.1, §12 RISK-02
  - **実装詳細**:
    - `IProjectRepository`に`findByIds(projectIds: string[]): Promise<ProjectEntity[]>`（所有者検証なし）を追加する
    - `ITaskRepository`に`findByProjectIds(projectIds: string[]): Promise<TaskEntity[]>`（同上）を追加する
    - いずれも`PostgreSQLProjectRepository`/`PostgreSQLTaskRepository`にDrizzleの`inArray`等で一括取得するよう実装する
  - **完了条件**: 複数`projectId`を渡した一括取得で、projectごとのループによる個別クエリが発生しないこと
  - **統合テスト要件**: 複数project/task混在時の一括取得、N+1にならないこと（クエリ発行回数またはモック呼び出し回数で検証）
  - **注意点**: RISK-02（overview.md 5章）。所有者スコープなしの強い権限を持つメソッドであることをコード上のコメントで明示し、呼び出し元をTASK-6-04の`GetViewerAccessibleProjectsUseCase`のみに限定する

- [ ] **TASK-6-02: `IProjectViewerRepository.findActiveByEmail`の追加実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 2
  - **関連要件**: REQ-104, REQ-201
  - **関連設計**: design.md §4.1, §10.1
  - **実装詳細**: `IProjectViewerRepository`に`findActiveByEmail(email)`（`status = 'active'`の`projectId`一覧を`(email, status)`インデックス経由で取得）を追加し実装する
  - **完了条件**: 有効な招待のみの`projectId`一覧が返る。招待0件のメールアドレスでは空配列が返る
  - **統合テスト要件**: 複数project招待時の一括取得、全取り消し後の空配列（AC-11の前提）

- [ ] **TASK-6-03: `viewerTokenMiddleware`実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 2
  - **関連要件**: REQ-002, REQ-301, REQ-306, NFR-102
  - **関連設計**: design.md §5.2手順2-4, §9, §10.2
  - **実装詳細**:
    - `app/server/src/viewer/presentation/middleware/viewerTokenMiddleware.ts`に、`Viewer-Access-Token`ヘッダの値を`TokenHasher.hash()`でハッシュ化し`IViewerAccessTokenRepository.findByTokenHash()`で検索する処理を実装する
    - 見つからない、または`isExpired(now)`が真の場合は`InvalidViewerAccessTokenError`（401）。判定はPhase 2 TASK-2-03で実装した`now > expiresAt`のみ無効とする境界に従う
    - 見つかった場合、Honoの`Context`に`viewerEmail`をセットして次のハンドラへ
    - このミドルウェアは`/api/viewer/*`専用ルーターにのみ適用し、既存の`authMiddleware`配下のルート（task/project更新系API）には一切組み込まない
  - **完了条件**: ヘッダ未指定・存在しないトークン・期限切れトークンでいずれも401になる。有効なトークンで`viewerEmail`がセットされる
  - **単体テスト要件**: 正常系、異常系（ヘッダなし、存在しないトークン、期限切れトークン）。AC-10の境界値（発行から30日ちょうど＝有効、30日超過＝無効）をミドルウェアレベルでも検証する

- [ ] **TASK-6-04: `GetViewerAccessibleProjectsUseCase`実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-6-01, TASK-6-02
  - **関連要件**: REQ-003, REQ-104, REQ-201
  - **関連設計**: design.md §5.2手順5-7, §7.1
  - **実装詳細**:
    - `findActiveByEmail(viewerEmail)`で`projectId`一覧を取得し、0件でも空配列として扱いエラーにしない（REQ-201, AC-11）
    - `findByIds(projectIds)`/`findByProjectIds(projectIds)`で一括取得し、projectごとにグルーピングしたDTO（`ViewerAccessibleProjectDTO[]`）を返す。各taskはtitle/description/status/priorityを含む（REQ-003）
  - **完了条件**: 複数project混在時に正しくグルーピングされる。招待0件時は空配列が返る
  - **単体テスト要件**: 複数projectのグルーピング（AC-09）、0件時の空配列（AC-11）、taskの各項目が含まれること

- [ ] **TASK-6-05: `GET /api/viewer/tasks`ルート実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-6-03, TASK-6-04
  - **関連要件**: REQ-003, REQ-104, REQ-201, REQ-301, REQ-306
  - **関連設計**: design.md §7.1, §7.2, §13
  - **実装詳細**:
    - `app/server/src/viewer/presentation/viewerAccessRoutes.ts`/`viewerAccessRoutes.schema.ts`/`ViewerAccessController.ts`を実装する。`viewerTokenMiddleware`配下、`/api/viewer/*`として既存`authMiddleware`配下のルーターとは別ルーターに分離する
    - `errorMiddleware`の`ERROR_MAPPINGS`に`InvalidViewerAccessTokenError`（401）を追加登録する
    - レスポンスDTOの型に生トークン・トークンハッシュを保持するフィールドを持たせないことで、型レベルで漏洩を防ぐ
  - **完了条件**: AC-09, AC-10, AC-11に沿って200/401が返ること
  - **統合テスト要件**: `viewerAccessRoutes.integration.test.ts`に正常系・異常系・空状態のテストケースを配置する

- [ ] **TASK-6-06: viewerトークンによる既存編集系APIへのアクセス拒否確認（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-6-05
  - **関連要件**: REQ-002
  - **関連設計**: design.md §4.3（システム境界）
  - **実装詳細**: 既存の`PUT /api/tasks/{id}`（ステータス変更等）や`POST/PUT /api/projects`系エンドポイントに対し、`Viewer-Access-Token`ヘッダのみを付与し`Authorization`ヘッダを付与せずにリクエストした場合、`authMiddleware`により未認証として拒否されることを統合テストで確認する
  - **完了条件**: viewerトークンだけでは既存の編集系APIが一切認証を通過しないことがテストで担保されること
  - **単体テスト要件**: 該当なし（統合テストのみ）
  - **統合テスト要件**: 代表的な編集系エンドポイント（task更新、project更新）それぞれで401になることを確認する

- [ ] **TASK-6-07: OpenAPI仕様・TypeScript型定義の生成**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-6-05
  - **関連要件**: なし（インフラ）
  - **関連設計**: `.claude/rules/schema-db.md`
  - **実装詳細**:
    ```bash
    docker compose exec server bun run generate:openapi
    docker compose exec client bun run generate:types
    docker compose exec server bunx tsc --noEmit
    docker compose exec client bunx tsc --noEmit
    ```
  - **完了条件**: 型エラーがないこと

## 6. このフェーズの完了条件

- `GET /api/viewer/tasks`が、有効トークンでの横断閲覧・無効トークンの拒否・招待0件時の空状態表示をすべて満たすこと
- `findByIds`/`findByProjectIds`の呼び出し元が`GetViewerAccessibleProjectsUseCase`のみに限定されていること（RISK-02）
- viewerトークンが既存の編集系APIを一切認証できないことがテストで担保されていること（REQ-002）
- サーバー側・クライアント側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

# Phase 5: 招待済みviewer一覧・取り消し・復元

## 1. このフェーズの目的

`GET/DELETE /api/projects/{projectId}/viewers(/{viewerId})`により、招待状況の確認とproject単位の取り消しをHTTP応答まで一貫して成立させる。あわせて、取り消し（`revoke`）と復元（`restore`）は対になる操作であるため、取り消し済み招待への再招待による復元（REQ-503）を`InviteViewerUseCase`へ組み込む作業も本フェーズにまとめる（Phase 4は`revoke`メソッドに依存しないため、Phase 4→Phase 5という一方向の依存で完結する）。

## 2. 確認可能なこと

- 統合テストで、招待済みviewerがemail昇順・取り消し済み除外で一覧表示されることを確認できる。0件時は空の一覧が表示される（AC-07, AC-14）
- 統合テストで、特定projectへの招待取り消しが、そのprojectのみに反映され、同一メールアドレスの他projectへの閲覧は維持されることを確認できる（AC-08）
- 統合テストで、他ユーザーのprojectに対する招待/一覧確認/取り消しがすべて404で拒否されることを確認できる（AC-12）
- 統合テストで、取り消し済みのproject×email組み合わせへの再招待で、閲覧が復活し招待済みviewer一覧に通常表示されることを確認できる（AC-13, REQ-503）

## 3. 関連要件・関連設計

- **関連要件**: REQ-001, REQ-105, REQ-106, REQ-305, REQ-503
- **関連設計**: design.md §5.1手順7, §5.3, §6, §7.1, §9, §13

## 4. 依存関係

- **前提フェーズ**: Phase 4
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-5-01: `IProjectViewerRepository.revoke`/`restore`の実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 4
  - **関連要件**: REQ-106, REQ-503
  - **関連設計**: design.md §4.1（`IProjectViewerRepository`）, §6
  - **実装詳細**:
    - `IProjectViewerRepository`に`revoke(id)`（対象行の`status`を`revoked`にし`revokedAt`を設定）を追加し、`PostgreSQLProjectViewerRepository`で実装する
    - 同様に`restore(id)`（`status`を`active`に戻し`revokedAt`をクリア）を追加し実装する
    - 両メソッドは対の操作であり、`restore`実行後の`revoke`呼び出しで完全に元の状態へ戻せることをテストで確認する（TASK-5-04の補償操作で再利用する）
  - **完了条件**: `revoke`/`restore`実行後、DBの`status`/`revokedAt`が期待通り更新されること
  - **統合テスト要件**: `active`→`revoke`→`restore`→`revoke`と操作した際に、各段階で`status`/`revokedAt`が正しいこと

- [ ] **TASK-5-02: `IProjectViewerRepository.findActiveByProject`の追加実装と`ListProjectViewersUseCase`（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 4
  - **関連要件**: REQ-105
  - **関連設計**: design.md §4.1, §7.1
  - **実装詳細**:
    - `IProjectViewerRepository`に`findActiveByProject(projectId)`（`status = 'active'`のみ、email昇順）を追加し、`PostgreSQLProjectViewerRepository`で実装する
    - `ListProjectViewersUseCase`を実装する。`IProjectRepository.findById(userId, projectId)`で所有権検証（REQ-001, REQ-305→`ProjectNotFoundError`）した上で一覧を返す
  - **完了条件**: `active`のみがemail昇順で返る。他ユーザーのprojectを指定すると`ProjectNotFoundError`になる
  - **単体テスト要件**: 複数viewer混在時のactiveのみ抽出・email昇順ソート（AC-14）、0件時の空配列（AC-07）、他ユーザーprojectでのエラー

- [ ] **TASK-5-03: `RevokeViewerUseCase`実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-01, TASK-5-02
  - **関連要件**: REQ-106
  - **関連設計**: design.md §4.1, §6, §7.1
  - **実装詳細**: `IProjectRepository.findById(userId, projectId)`で所有権検証（見つからなければ`ProjectNotFoundError`）、対象の`ProjectViewerEntity`を`id`で取得し、存在しない、または既に`revoked`の場合は`ViewerNotFoundError`、存在すれば`revoke()`を実行し保存する
  - **完了条件**: 指定projectの招待のみが取り消され、同一メールアドレスの他projectへの招待は変化しないこと
  - **単体テスト要件**: 正常系（取り消し対象projectのみ`revoked`になり他projectは維持される）、異常系（存在しない/既に取り消し済みで`ViewerNotFoundError`、他ユーザーprojectで`ProjectNotFoundError`）

- [ ] **TASK-5-04: `InviteViewerUseCase`への分岐追加 - 取り消し済み招待の復元（補償込み）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-01
  - **関連要件**: REQ-503
  - **関連設計**: design.md §5.1手順7, §6, §13
  - **実装詳細**:
    - 招待が`revoked`の場合、`restore()`で`active`に復元する分岐を`InviteViewerUseCase`に追加する。トークンの発行要否判定（Phase 4の分岐: 有効なら何もしない、期限切れなら`replace`で再発行）と組み合わせて評価する。取り消し済み招待に対しても6章の不変条件（招待が存在すればトークンも存在する）は維持されるため、トークンが「なし」になる分岐は考慮不要
    - 復元と同時にトークンの再発行が発生し、その送信が失敗した場合は、招待を`revoke()`で元の`revoked`に戻し、トークンも`replace`で旧値に復元する補償操作を行う（design.md §13が要求する「復元+新規トークン」パターンの補償テスト）。補償操作自体が失敗した場合はエラーレベルでログ出力する（design.md 6章、overview.md RISK-01）
  - **完了条件**: 取り消し済み招待への再招待で閲覧が復活すること。送信失敗時は招待が`revoked`のまま、トークンも変化しない状態に復元されること
  - **単体テスト要件**: 既存の`InviteViewerUseCase`テストファイルに、AC-13（REQ-503）の正常系（トークン有効時・期限切れ時それぞれ）、送信失敗時の補償、補償操作自体が失敗した場合のエラーログ出力のテストケースを追加する

- [ ] **TASK-5-05: `GET/DELETE /api/projects/{projectId}/viewers(/{viewerId})`ルート実装とAC-13統合テスト（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-02, TASK-5-03, TASK-5-04
  - **関連要件**: REQ-001, REQ-105, REQ-106, REQ-305, REQ-503
  - **関連設計**: design.md §7.1, §7.2
  - **実装詳細**:
    - `viewerManagementRoutes.ts`に`GET /api/projects/{projectId}/viewers`（200, `ProjectViewerDTO[]`）と`DELETE /api/projects/{projectId}/viewers/{viewerId}`（204）を追加する
    - `errorMiddleware`の`ERROR_MAPPINGS`に`ViewerNotFoundError`（404）を追加登録する
    - 既存`viewerManagementRoutes.integration.test.ts`に、AC-13（取り消し済みへの再招待による復元）のAPIレベルテストケースを追加する
  - **完了条件**: AC-07, AC-08, AC-12, AC-13, AC-14に沿ってレスポンスが返ること
  - **統合テスト要件**: 一覧・取り消しの正常系・異常系（他ユーザーprojectでの404、取り消し対象なしでの404）、および復元シナリオを追加する

- [ ] **TASK-5-06: OpenAPI仕様・TypeScript型定義の生成**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-5-05
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

- `GET/DELETE /api/projects/{projectId}/viewers(/{viewerId})`が一覧確認・取り消し・アクセス拒否をすべて満たすこと
- `InviteViewerUseCase`が取り消し済み招待の復元（補償込み）を正しく処理すること
- サーバー側・クライアント側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

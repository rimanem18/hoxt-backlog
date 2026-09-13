# Phase 1: 通知ON/OFF設定 — バックエンド

## 1. このフェーズの目的

- viewerがproject単位で通知ON/OFFを設定でき、新規招待・招待復元時はON初期化される状態を、APIレベルで成立させる（UC-01のバックエンド部分）
- フロントエンドUI（トグル操作）はPhase 2で実装する。本フェーズの成果はAPI呼び出し（統合テスト・curl等）で確認する

## 2. 確認可能なこと

- `Viewer-Access-Token`ヘッダを付けて`PATCH /api/viewer/projects/{projectId}/notification-setting`を呼び出すと、指定projectの設定のみが変わり他projectには影響しないことを確認できる
- active招待が存在しないprojectに対して呼び出すと404が返ることを確認できる
- `GET /api/viewer/tasks`のレスポンスに各projectの`notificationEnabled`が含まれることを確認できる
- 新規招待直後・本要件リリース前からの既存招待のいずれも、通知設定初期値がONであることをDB上（マイグレーション後の既存行）およびAPIレスポンスで確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-002, REQ-003, REQ-004, REQ-106, NFR-101, AC-06, AC-10
- **関連設計**: design.md 3.1節（`project_viewers`列追加方針, 復元時の強制ON方針）, 4.1節（ProjectViewerEntity, IProjectViewerRepository, UpdateNotificationSettingUseCase, notificationRoutes.ts）, 5.2節手順4〜5, 7.1節PATCH・GET拡張, 7.2節（エラー方針）, 8節・8.1節（マイグレーション手順）

## 4. 依存関係

- **前提フェーズ**: なし
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-1-01: `project_viewers`への`notificationEnabled`列追加とスキーマ再生成**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-002, REQ-004
  - **関連設計**: design.md 3.1節, 8節, 8.1節手順1〜4
  - **実装詳細**: `app/server/src/shared/database/schema.ts`の`projectViewers`定義に`notificationEnabled: boolean('notification_enabled').notNull().default(true)`を追加。`.claude/rules/schema-db.md`の手順に従い`docker compose exec server bun run db:generate`でマイグレーションファイルを生成し、`ADD COLUMN ... DEFAULT true NOT NULL`がリテラルデフォルトとして生成されていることを確認（既存行にも即時反映されREQ-004を満たす）。続けて`generate:schemas`→`generate:openapi`→`generate:types`を実行
  - **完了条件**: マイグレーションファイルが生成されコミット可能な状態であり、`docker compose exec server bunx tsc --noEmit`・`docker compose exec client bunx tsc --noEmit`がエラーなく通る
  - **注意点**: `db:generate`再実行時に差分が出ないこと（スキーマ未変更時は`No schema changes`）を確認する

- [x] **TASK-1-02: ProjectViewerEntityへの通知ON/OFF状態追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-1-01
  - **関連要件**: REQ-002, REQ-003
  - **関連設計**: design.md 4.1節（ProjectViewerEntity）, 3.1節（復元時の強制ON方針）
  - **実装詳細**: `app/server/src/viewer/domain/ProjectViewerEntity.ts`に`notificationEnabled`プロパティを追加。`create()`は`notificationEnabled: true`で生成（REQ-003）。`enableNotification()`/`disableNotification()`を追加。`restore()`内で`notificationEnabled`を直前の値に関わらず`true`へ強制する（3.1節）。`ProjectViewerEntityProps`/`reconstruct()`にも反映し、ゲッター`isNotificationEnabled()`を追加
  - **完了条件**: `app/server/src/viewer/domain/__tests__/ProjectViewerEntity.test.ts`の全テストが通過する
  - **単体テスト要件**: 新規作成時`notificationEnabled`がtrueであること／`disableNotification()`でfalseになること／`revoke()`後`restore()`した場合に直前がfalseでも強制的にtrueへ戻ること

- [x] **TASK-1-03: IProjectViewerRepositoryへの通知設定永続化・取得メソッド追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-1-02
  - **関連要件**: REQ-002, REQ-003, REQ-004, REQ-106, NFR-101, AC-10
  - **関連設計**: design.md 4.1節（IProjectViewerRepository）, 5.2節手順5, 6節（整合性方針）
  - **実装詳細**: `app/server/src/viewer/domain/IProjectViewerRepository.ts`と`PostgreSQLProjectViewerRepository.ts`（`app/server/src/viewer/infrastructure/`）を以下の通り変更する。
    1. `save()`の`update`/`insert`双方のvalues・`toDomain()`に`notificationEnabled`を追加する（現状`save()`は`status`/`revokedAt`/`updatedAt`のみを扱っており`notificationEnabled`が永続化されない欠落があるため必須の修正）
    2. `restore(id)`メソッドのSET句に`notificationEnabled: true`を追加し、招待復元時にDBレベルでも強制ONを保証する（3.1節。Entity側の`restore()`だけでは`save()`を経由しない既存の`restore()`メソッド経路でDB反映されないため）
    3. `updateNotificationEnabled(id: string, enabled: boolean): Promise<ProjectViewerEntity | null>`を新規追加
    4. `findActiveByProjectAndEmail(projectId: string, email: string): Promise<ProjectViewerEntity | null>`を新規追加（active時のみ取得）
    5. `findActiveByEmail(email: string)`の戻り値を`string[]`から`ProjectViewerEntity[]`に変更する（現状はprojectIdのみを返しておりnotificationEnabledを取得できないため）。唯一の呼び出し元`GetViewerAccessibleProjectsUseCase`（TASK-1-06で更新）以外に影響がないことを`grep`で確認済み
  - **完了条件**: `app/server/src/viewer/infrastructure/__tests__/PostgreSQLProjectViewerRepository.test.ts`の該当テストが通過する
  - **単体テスト要件**: `updateNotificationEnabled`が対象行のみを更新し他行に影響しないこと／`findActiveByProjectAndEmail`がactive時のみ取得できrevoked時はnullを返すこと／`restore()`実行後に対象行の`notificationEnabled`がtrueになること
  - **統合テスト要件**: 実DBコンテナに対するリポジトリ統合テスト（既存テストファイルの構成を踏襲）。AC-10相当として、`notificationEnabled`を指定せずに`project_viewers`行をINSERTし、格納された値が`true`であることを検証するテストを追加する（列のDEFAULT trueが実際に機能することの自動テストによる裏付け）

- [x] **TASK-1-04: UpdateNotificationSettingUseCase新規実装**
  - **タイプ**: TDD
  - **依存タスク**: TASK-1-03
  - **関連要件**: REQ-002, REQ-106, NFR-101
  - **関連設計**: design.md 4.1節（UpdateNotificationSettingUseCase）, 5.2節手順5, 5.3節（fail-closed）
  - **実装詳細**: `app/server/src/viewer/application/IUpdateNotificationSettingUseCase.ts`と`UpdateNotificationSettingUseCase.ts`を新規作成。`viewerEmail, projectId, enabled`を入力とし、`findActiveByProjectAndEmail`で対象を取得、存在しなければ`ViewerNotFoundError`（既存クラス再利用）をスロー、存在すれば`updateNotificationEnabled`を呼び出し更新後のエンティティを返す
  - **完了条件**: `app/server/src/viewer/application/__tests__/UpdateNotificationSettingUseCase.test.ts`の全テストが通過する
  - **単体テスト要件**: ON→OFF／OFF→ONそれぞれの正常系／active招待が存在しない場合に`ViewerNotFoundError`をスローすること（NFR-101のfail-closed）／対象project以外の設定に影響しないこと（AC-06相当をUseCaseレベルでモック検証）

- [x] **TASK-1-05: 通知設定変更API（PATCH）の追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-1-04
  - **関連要件**: REQ-002, REQ-106, NFR-101, AC-06
  - **関連設計**: design.md 4.1節（notificationRoutes.ts）, 7.1節PATCH, 7.2節（エラー方針）, 9節（認証・認可）
  - **実装詳細**: `app/server/src/viewer/presentation/notificationRoutes.schema.ts`に`PATCH /viewer/projects/{projectId}/notification-setting`のOpenAPIルート定義（入力`{ enabled: boolean }`、出力`200`／`401`／`404`）を新規作成。`app/server/src/viewer/presentation/NotificationController.ts`を新規作成しUseCase呼び出しとレスポンス整形を担当。`app/server/src/viewer/presentation/notificationRoutes.ts`を新規作成し、`viewerAccessRoutes.ts`と同様に`viewerTokenMiddleware`配下でルートを登録、`ViewerDIContainer`への遅延評価プロキシパターンを踏襲。**このファイル自身の`onError`ハンドラで`ViewerNotFoundError`→404、`InvalidViewerAccessTokenError`→401、その他→500を明示的にマッピングする**（`viewerAccessRoutes.ts`の`onError`は401/500しか扱っておらず、404の扱いが暗黙のままだと7.1節の契約を満たせないため）。`ViewerDIContainer`に`getUpdateNotificationSettingUseCase()`を追加。`entrypoints/index.ts`に`app.route('/api', notificationRoutes)`を追加。既存`viewerAccessRoutes.ts`と同様、ミドルウェアは個別パス（`/viewer/projects/*/notification-setting`）に限定し、他ドメインの未マッチパスを横取りしないようにする
  - **完了条件**: 統合テストが通過し、`docker compose exec server bunx tsc --noEmit`が通る
  - **統合テスト要件**: `app/server/src/viewer/presentation/__tests__/notificationRoutes.integration.test.ts`を新規作成し、200（更新成功）／401（トークン不正）／404（active招待なし）を検証

- [x] **TASK-1-06: GET /api/viewer/tasksレスポンスへのnotificationEnabled追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-1-03
  - **関連要件**: REQ-002, AC-06
  - **関連設計**: design.md 7.1節GET拡張
  - **実装詳細**: `GetViewerAccessibleProjectsUseCase`をTASK-1-03で変更した`findActiveByEmail()`（`ProjectViewerEntity[]`を返す）に合わせて更新し、`project.getId()`と対応する`ProjectViewerEntity.isNotificationEnabled()`を突き合わせてDTOへ`notificationEnabled: boolean`を追加する。`IGetViewerAccessibleProjectsUseCase.ts`の`ViewerAccessibleProjectDTO`型を更新。`viewerAccessRoutes.schema.ts`のレスポンススキーマ・`app/packages/shared-schemas/src/viewers.ts`の対応する型を更新し、`generate:openapi`→`generate:types`で反映を確認
  - **完了条件**: `app/server/src/viewer/application/__tests__/GetViewerAccessibleProjectsUseCase.test.ts`が更新後の型で通過し、クライアント側の型チェックが通る
  - **単体テスト要件**: レスポンスの各project項目に、対応する`ProjectViewerEntity`の`notificationEnabled`値が正しく反映されること

- [x] **TASK-1-07: Phase 1品質ゲート確認**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-1-01〜TASK-1-06
  - **関連要件**: なし（品質保証）
  - **関連設計**: なし
  - **実装詳細**: quality-gate-runnerサブエージェントへ、serverの`tsc --noEmit`・`bun test`・`biome`・`semgrep`・`knip`の実行を依頼する（テスト実行は含めるがコード変更はさせない）。あわせて`docker compose exec server bunx tsc --noEmit`でclient型定義への影響がないことを確認する
  - **完了条件**: 全チェックがパスする、または既存の失敗との差分がないことを確認する

## 実施記録

- 開始時刻（JST）: 2026-09-04 22:18
- 終了時刻（JST）: 2026-09-04 22:37
- 合計時間: 19分
- typecheck / test / lint / build: 全チェックが正常終了（quality-gate-runnerサブエージェントによる実施。tsc（server/client）・bun test（1008 pass, 0 fail）・biome fix・semgrep（0 findings）・knip・cpdを確認）

### 差異の記録

- TASK-1-05実装時、`app/server/scripts/generate-openapi.ts`への`notificationRoutes`の登録が計画に明記されていなかったが、既存の`viewerAccessRoutes`等と同様にこのスクリプトへ手動でルート定義をimport・登録しないと生成される`docs/api/openapi.yaml`に新規エンドポイントが反映されないことが判明したため、同ファイルへ追加した（他ドメインのルート登録と同一パターン）
- 品質ゲート確認（TASK-1-07）で、`notificationRoutes.ts`の`app.openapi(...)`呼び出しがbiomeフォーマッタにより複数行に分割された結果、`biome-ignore lint/suspicious/noExplicitAny`コメントが実際の対象行から離れて無効化される警告が検出されたため、コメントを`as any`が現れる行の直前に移動して修正した
- TASK-1-03の`findActiveByEmail`戻り値変更に伴い、影響のなかった`ListProjectViewersUseCase.test.ts`・`RevokeViewerUseCase.test.ts`・`InviteViewerUseCase.test.ts`のモックオブジェクトに、`IProjectViewerRepository`の新規メソッド（`updateNotificationEnabled`・`findActiveByProjectAndEmail`）を型整合のために追加した（計画には個別記載なし、型変更の自然な波及として対応）

## 6. このフェーズの完了条件

- `PATCH /api/viewer/projects/{projectId}/notification-setting`で任意のprojectの通知ON/OFFを切り替えられ、他projectへ影響しないことが統合テストで確認できる
- `GET /api/viewer/tasks`のレスポンスに`notificationEnabled`が含まれることが確認できる
- 新規招待・招待復元時、および本要件リリース前からの既存招待のいずれも通知設定がONであることが、DEFAULT true検証テスト・`restore()`テストの両方で確認できる
- Phase 1で追加したドメイン・リポジトリ・UseCase・APIコードがすべてテストされている

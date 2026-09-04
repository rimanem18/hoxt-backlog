# Phase 3: Web Push購読登録 — バックエンド

## 1. このフェーズの目的

- VAPID鍵基盤・購読保存テーブル・購読登録APIをAPI境界まで完成させる（UC-02のバックエンド部分）
- フロントエンド（Service Worker登録・許可UI）はPhase 4で実装する。本フェーズの成果はAPI呼び出し（統合テスト・curl等）で確認する

## 2. 確認可能なこと

- `Viewer-Access-Token`ヘッダを付けて`POST /api/viewer/push-subscriptions`に`{ endpoint, keys: { p256dh, auth } }`を送ると、`viewer_push_subscriptions`に購読情報が保存されることを確認できる
- 同一`email`・`endpoint`で再度呼び出すと、新規行を増やさず鍵情報が上書きされることを確認できる
- endpoint形式不正・keys欠落時に400が返ることを確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-001, TS-301
- **関連設計**: design.md 3.1節（購読テーブル設計方針）, 4.1節（PushSubscriptionEntity, IPushSubscriptionRepository, RegisterPushSubscriptionUseCase）, 5.2節手順1〜3, 7.1節POST, 7.2節, 8節・8.1節, 10.3節（VAPID鍵管理）

## 4. 依存関係

- **前提フェーズ**: Phase 1（`notificationRoutes.ts`・`NotificationController`・`ViewerDIContainer`を共有拡張するため。ファイル競合を避ける目的の順序であり、機能的な依存はない）
- **ブロッカー**: なし（VAPID鍵ペアのTerraformモジュール構成《RISK-04》はPreview/Production適用にのみ必要で、本フェーズのローカル実装はブロックしない）

## 5. タスク一覧

- [ ] **TASK-3-01: VAPID鍵ペア生成とローカル/E2E環境変数の準備**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-001
  - **関連設計**: design.md 10.3節, 2.3節DQ-04
  - **実装詳細**: `web-push`パッケージの`web-push generate-vapid-keys`で鍵ペアを生成し、`VAPID_PUBLIC_KEY`・`VAPID_PRIVATE_KEY`・`VAPID_SUBJECT`（mailto:等）としてローカル・E2E環境の`.env`例に追記。`app/server/src/shared/config/env.ts`に`getViewerAccessBaseUrl()`と同パターンで`getVapidKeys()`検証関数を追加し、未設定時に明確なエラーメッセージでfail-fastする。公開鍵をクライアントへ配布する方法（ビルド時環境変数、または後続タスクで追加するAPI経由）を決定する
  - **完了条件**: `docker compose exec server bunx tsc --noEmit`が通り、ローカル環境で該当環境変数が読み込めることを確認する
  - **注意点**: 秘密鍵は`.env`等の非コミット領域にのみ配置し、リポジトリへコミットしない

- [ ] **TASK-3-02: `viewer_push_subscriptions`テーブル新設とスキーマ再生成**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-001, TS-301
  - **関連設計**: design.md 8節（データモデル）, 8.1節手順1〜5
  - **実装詳細**: `app/server/src/shared/database/schema.ts`に`viewerPushSubscriptions`テーブル（`id`(uuid, PK), `email`(varchar(320), NOT NULL), `endpoint`(text, NOT NULL), `p256dhKey`(text, NOT NULL), `authKey`(text, NOT NULL), `createdAt`, `updatedAt`）を新設し、一意制約`(lower(email), endpoint)`とインデックス`(lower(email))`を`viewerAccessTokens`のemail正規化パターンに倣って追加。`app/server/scripts/generate-schemas.ts`の`tableConfigs`に`viewer_push_subscriptions`を追加。`db:generate`でマイグレーション生成。`app/server/scripts/setup-rls.ts`に、`anon`/`authenticated`ロールへの許可ポリシーを追加しない旨のコメント付きで対象テーブルを追記。`generate:schemas`→`generate:openapi`→`generate:types`を実行
  - **完了条件**: マイグレーションファイルが生成されコミット可能な状態であり、`server`・`client`双方の型チェックが通る

- [ ] **TASK-3-03: PushSubscriptionEntity・IPushSubscriptionRepository新規作成**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-02
  - **関連要件**: REQ-001, TS-301
  - **関連設計**: design.md 4.1節
  - **実装詳細**: `app/server/src/viewer/domain/PushSubscriptionEntity.ts`を新規作成（`id`, `email`, `endpoint`, `p256dhKey`, `authKey`, timestampsを保持。`ProjectViewerEntity`と同じくprivateコンストラクタ＋`create()`/`reconstruct()`ファクトリパターン）。`app/server/src/viewer/domain/IPushSubscriptionRepository.ts`に`findByEmail(email)`, `save(entity)`（endpoint重複時はupsert）, `deleteByEndpoint(email, endpoint)`を定義
  - **完了条件**: `app/server/src/viewer/domain/__tests__/PushSubscriptionEntity.test.ts`が通過する
  - **単体テスト要件**: 生成時の各プロパティ保持、不正な値（空email・空endpoint等）でのバリデーションエラー

- [ ] **TASK-3-04: PostgreSQLPushSubscriptionRepository新規実装**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-03
  - **関連要件**: REQ-001, TS-301
  - **関連設計**: design.md 4.1節, 6節（重複実行対策）
  - **実装詳細**: `app/server/src/viewer/infrastructure/PostgreSQLPushSubscriptionRepository.ts`を`PostgreSQLProjectViewerRepository.ts`と同じ接続パターンで新規作成。`save()`は`(lower(email), endpoint)`の一意制約を利用したupsertとする
  - **完了条件**: `app/server/src/viewer/infrastructure/__tests__/PostgreSQLPushSubscriptionRepository.test.ts`が通過する
  - **統合テスト要件**: 同一email・endpointでの`save()`が新規行を増やさず鍵情報を上書きすること（べき等性）、`findByEmail`が複数デバイス分を返せること

- [ ] **TASK-3-05: RegisterPushSubscriptionUseCase新規実装**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-04
  - **関連要件**: REQ-001
  - **関連設計**: design.md 4.1節, 5.2節手順3
  - **実装詳細**: `app/server/src/viewer/application/IRegisterPushSubscriptionUseCase.ts`・`RegisterPushSubscriptionUseCase.ts`を新規作成。`email, endpoint, p256dhKey, authKey`を入力とし、`IPushSubscriptionRepository.save()`（upsert）を呼び出す
  - **完了条件**: `app/server/src/viewer/application/__tests__/RegisterPushSubscriptionUseCase.test.ts`が通過する
  - **単体テスト要件**: 新規登録・既存endpoint再登録（鍵情報上書き）の両方を検証

- [ ] **TASK-3-06: Push購読登録API（POST）の追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-05
  - **関連要件**: REQ-001
  - **関連設計**: design.md 4.1節, 7.1節POST, 7.2節（バリデーションエラー方針）
  - **実装詳細**: Phase 1で新設した`notificationRoutes.schema.ts`に`POST /viewer/push-subscriptions`のOpenAPIルート定義（入力`{ endpoint, keys: { p256dh, auth } }`、出力`200/201`／`400`／`401`）を追加。同じく`NotificationController.ts`に登録処理を追加。endpoint形式不正・keys欠落は既存`InvalidViewerDataError`（400）を再利用し、`notificationRoutes.ts`の`onError`（Phase 1で実装済み）に`InvalidViewerDataError`→400の分岐を追加する。`ViewerDIContainer`に`getRegisterPushSubscriptionUseCase()`を追加
  - **完了条件**: 統合テストが通過する
  - **統合テスト要件**: `notificationRoutes.integration.test.ts`に200/201・400（不正入力）・401（トークン不正）を追加

- [ ] **TASK-3-07: Phase 3品質ゲート確認**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-3-01〜TASK-3-06
  - **関連要件**: なし（品質保証）
  - **関連設計**: なし
  - **実装詳細**: quality-gate-runnerサブエージェントへserverの`tsc --noEmit`・`bun test`・`biome`・`semgrep`・`knip`の実行を依頼する
  - **完了条件**: 全チェックがパスする、または既存の失敗との差分がないことを確認する

## 6. このフェーズの完了条件

- `POST /api/viewer/push-subscriptions`で購読情報が保存され、同一email・endpointからの再登録が重複行を生まずべき等に処理されることが統合テストで確認できる
- Phase 3で追加したドメイン・リポジトリ・UseCase・APIコードがすべてテストされている
- VAPID鍵のローカル/E2E運用が完了している

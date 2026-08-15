# Phase 3: viewer招待API - 新規発行（初回招待）と異常系

## 1. このフェーズの目的

`POST /api/projects/{projectId}/viewers`により、招待もトークンも存在しない新規メールアドレスへの初回招待（新規トークン発行＋招待メール送信）と、その異常系（自己招待・不正メール形式・送信失敗時の補償ロールバック）をHTTP応答まで一貫して成立させる。

## 2. 確認可能なこと

- 統合テスト（HTTPレベル）で、新規メールアドレスへの招待でviewer登録・トークン発行・メール送信が行われることを確認できる（AC-01）
- 自己招待・不正メール形式の指定でエラーが返り、招待が成立しないことを確認できる（AC-04, AC-06）
- メール送信失敗時に、viewer登録・トークン発行が補償操作で巻き戻り、招待操作自体がエラーとして返ることを確認できる（AC-05）
- 他ユーザーのprojectへの招待が404で拒否されることを確認できる（REQ-001, REQ-305）

## 3. 関連要件・関連設計

- **関連要件**: REQ-101, REQ-102, REQ-004, REQ-302, REQ-303, REQ-304, NFR-101
- **関連設計**: design.md §4.1, §5.1, §5.3, §6, §7.1, §7.2

## 4. 依存関係

- **前提フェーズ**: Phase 2
- **ブロッカー**: overview.md 2章の要確認事項（E2Eからの生トークン取得手段）は、本フェーズのTASK-3-02（Fakeゲートウェイ実装）の設計に直接影響する。TASK-3-02着手前に、テスト専用の送信内容キャプチャ方式（例: テスト環境限定で有効化される取得用エンドポイント、または他の安全な手段）をユーザーに確認すること

## 5. タスク一覧

- [ ] **TASK-3-01: `IProjectViewerRepository`/`IViewerAccessTokenRepository`（新規招待・補償用メソッド）とPostgres実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: Phase 2
  - **関連要件**: REQ-101, REQ-102, REQ-303
  - **関連設計**: design.md §4.1（`IProjectViewerRepository`, `IViewerAccessTokenRepository`）, §6（部分成功を許容しない方針）
  - **実装詳細**:
    - `app/server/src/viewer/domain/IProjectViewerRepository.ts`に`findByProjectAndEmail(projectId, email)`（`active`/`revoked`問わず取得）、`save(entity)`、`deleteById(id)`（メール送信失敗時の補償用）を定義する
    - `app/server/src/viewer/domain/IViewerAccessTokenRepository.ts`に`findByEmail(email)`、`save(entity)`、`deleteById(id)`（同上、補償用）を定義する
    - `PostgreSQLProjectViewerRepository`/`PostgreSQLViewerAccessTokenRepository`を`PostgreSQLProjectRepository`と同一パターンでDrizzle経由で実装する
  - **完了条件**: `save`実行後にDBへ永続化され、`findByProjectAndEmail`/`findByEmail`で正しく検索できる。`deleteById`実行後は当該行がDBから削除されること
  - **統合テスト要件**: `app/server/src/viewer/infrastructure/__tests__/`に配置。正常系（保存・検索・削除）、該当なし時に`null`（または空）を返すこと

- [ ] **TASK-3-02: `IInvitationMailGateway`ポート定義とテスト用Fake実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-101, REQ-303
  - **関連設計**: design.md §4.1（`IInvitationMailGateway`）, §3.1
  - **実装詳細**:
    - `app/server/src/viewer/application/IInvitationMailGateway.ts`に`send(email, projectName, accessUrl): Promise<void>`を定義する
    - テスト用Fake実装（呼び出し記録・成功/失敗を制御可能）を用意する。4章のブロッカーで確認した方式に従い、送信内容（宛先email・アクセスURL・生トークン）をE2E（Phase 9）からも参照可能にする。この経路は本番環境では絶対に有効化されないことを実装上のガード（環境変数等）で担保する
    - あわせて、Phase 9 TASK-9-07（期限切れトークンのE2E再現）で使う、テスト専用の「`expiresAt`を任意の過去日時に指定してトークンを発行する」経路も、同じテスト専用ガードの下でこの時点で用意する（Playwrightのクロック操作はサーバー側の時刻判定に影響しないため、サーバー側でこの経路が必要）
  - **完了条件**: Fakeが`send`の呼び出し引数を記録し、失敗を注入できる。テスト/E2E環境から直近の送信内容と、任意の`expiresAt`を指定したトークン発行の両方が利用できる
  - **単体テスト要件**: Fake自体の基本動作確認（呼び出し記録、失敗注入、送信内容の取得、`expiresAt`指定発行）

- [ ] **TASK-3-03: `InviteViewerUseCase`実装（新規招待+新規トークン+メール送信、失敗時補償ロールバック）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-01, TASK-3-02
  - **関連要件**: REQ-101, REQ-102, REQ-004, REQ-302, REQ-303, REQ-304, NFR-101
  - **関連設計**: design.md §5.1手順1-9（招待が存在せず、かつトークンが存在しない分岐のみ）, §6
  - **実装詳細**:
    - `EmailAddress.create(email)`（共有VO）による形式検証（REQ-304、不正なら`InvalidViewerDataError`）
    - `IUserRepository.findById(userId)`で作成者自身のemailを取得し、招待先emailと比較（REQ-302、一致なら`InvalidViewerDataError`）
    - `IProjectRepository.findById(userId, projectId)`で所有権検証（REQ-001, REQ-305、見つからなければ既存`ProjectNotFoundError`）
    - DBトランザクション内で`ProjectViewerEntity`（active）と`ViewerAccessTokenEntity`（新規トークン）を保存しコミット
    - コミット後、生トークンを含むURLを組み立て`IInvitationMailGateway.send()`を実行
    - 送信成功→DTOを返す。送信失敗→補償操作（`IProjectViewerRepository.deleteById`/`IViewerAccessTokenRepository.deleteById`で保存した招待・トークンを削除）→`InvitationMailDeliveryError`。補償操作自体（DB接続断等）が失敗した場合はエラーレベルでログ出力する（design.md 6章、overview.md RISK-01）
  - **完了条件**: 新規招待で招待・トークンがDBに保存されメールが送信される。自己招待・不正メール形式・所有権違反・送信失敗がそれぞれ適切なエラーになる。送信失敗時はDBに招待・トークンが残らないこと
  - **単体テスト要件**: 正常系（新規招待+新規トークン+メール送信成功）、異常系（自己招待、不正メール形式、他ユーザーprojectへの招待、メール送信失敗時に`deleteById`が呼ばれDB状態が巻き戻ること、補償操作自体が失敗した場合のエラーログ出力）

- [ ] **TASK-3-04: `SesInvitationMailGateway`実装（allowlistリトライ）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-02
  - **関連要件**: REQ-303
  - **関連設計**: design.md §3.1（allowlistリトライ方針）, §12 DQ-01
  - **実装詳細**: AWS SES SDK経由の送信実装。リトライはtimeout/DNS/接続エラー/5xx/429のみのallowlist方式で最大1回、合計2〜3秒程度のタイムアウトに限定する（CLAUDE.md記載のリトライ方針）
  - **完了条件**: allowlist対象エラーで1回のみリトライし、対象外エラーでは即時失敗すること
  - **単体テスト要件**: SESクライアントをモックし、allowlist対象/対象外それぞれのリトライ挙動を検証する
  - **注意点**: RISK-04（overview.md）。SES送信ドメイン検証・IAM権限のIaC構築（DQ-01）は本タスクの対象外であり、実運用での送信確認は別途行う

- [ ] **TASK-3-05: `ViewerDIContainer`実装**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-3-01, TASK-3-03, TASK-3-04
  - **関連要件**: なし（インフラ）
  - **関連設計**: design.md §4.1（`ViewerDIContainer`）
  - **実装詳細**: 既存`ProjectDIContainer`/`AuthDIContainer`と同型のシングルトンDIを実装する。環境に応じて`SesInvitationMailGateway`とテスト用Fakeを切り替える
  - **完了条件**: `InviteViewerUseCase`が依存するRepository/Gatewayをシングルトンで解決できること

- [ ] **TASK-3-06: `POST /api/projects/{projectId}/viewers`ルート実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-03, TASK-3-05
  - **関連要件**: REQ-101, REQ-102, REQ-004, REQ-302, REQ-303, REQ-304
  - **関連設計**: design.md §7.1, §7.2
  - **実装詳細**:
    - `app/server/src/viewer/presentation/viewerManagementRoutes.ts`/`viewerManagementRoutes.schema.ts`/`ViewerManagementController.ts`を実装する。既存`authMiddleware`配下、`/api/projects/{projectId}/viewers`
    - `errorMiddleware`の`ERROR_MAPPINGS`に`InvalidViewerDataError`（400）、`InvitationMailDeliveryError`（502）を追加登録する
  - **完了条件**: AC-01, AC-04, AC-05, AC-06に沿って201/400/404/502が返ること
  - **統合テスト要件**: `app/server/src/viewer/presentation/__tests__/viewerManagementRoutes.integration.test.ts`に正常系・異常系を配置する

- [ ] **TASK-3-07: OpenAPI仕様・TypeScript型定義の生成**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-3-06
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

- `POST /api/projects/{projectId}/viewers`が新規招待・自己招待拒否・不正メール形式拒否・送信失敗時のロールバックをすべて満たすこと
- サーバー側・クライアント側の型チェックがエラーゼロであること
- 新規テスト・既存テストがすべてグリーンであること

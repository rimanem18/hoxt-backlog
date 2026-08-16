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

- [x] **TASK-3-01: `IProjectViewerRepository`/`IViewerAccessTokenRepository`（新規招待・補償用メソッド）とPostgres実装（Red→Green）**
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

- [x] **TASK-3-02: `IInvitationMailGateway`ポート定義とテスト用Fake実装（Red→Green）**
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

- [x] **TASK-3-03: `InviteViewerUseCase`実装（新規招待+新規トークン+メール送信、失敗時補償ロールバック）（Red→Green）**
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

- [x] **TASK-3-04: `SesInvitationMailGateway`実装（allowlistリトライ）（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-02
  - **関連要件**: REQ-303
  - **関連設計**: design.md §3.1（allowlistリトライ方針）, §12 DQ-01
  - **実装詳細**: AWS SES SDK経由の送信実装。リトライはtimeout/DNS/接続エラー/5xx/429のみのallowlist方式で最大1回、合計2〜3秒程度のタイムアウトに限定する（CLAUDE.md記載のリトライ方針）
  - **完了条件**: allowlist対象エラーで1回のみリトライし、対象外エラーでは即時失敗すること
  - **単体テスト要件**: SESクライアントをモックし、allowlist対象/対象外それぞれのリトライ挙動を検証する
  - **注意点**: RISK-04（overview.md）。SES送信ドメイン検証・IAM権限のIaC構築（DQ-01）は本タスクの対象外であり、実運用での送信確認は別途行う

- [x] **TASK-3-05: `ViewerDIContainer`実装**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-3-01, TASK-3-03, TASK-3-04
  - **関連要件**: なし（インフラ）
  - **関連設計**: design.md §4.1（`ViewerDIContainer`）
  - **実装詳細**: 既存`ProjectDIContainer`/`AuthDIContainer`と同型のシングルトンDIを実装する。環境に応じて`SesInvitationMailGateway`とテスト用Fakeを切り替える
  - **完了条件**: `InviteViewerUseCase`が依存するRepository/Gatewayをシングルトンで解決できること

- [x] **TASK-3-06: `POST /api/projects/{projectId}/viewers`ルート実装（Red→Green）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-03, TASK-3-05
  - **関連要件**: REQ-101, REQ-102, REQ-004, REQ-302, REQ-303, REQ-304
  - **関連設計**: design.md §7.1, §7.2
  - **実装詳細**:
    - `app/server/src/viewer/presentation/viewerManagementRoutes.ts`/`viewerManagementRoutes.schema.ts`/`ViewerManagementController.ts`を実装する。既存`authMiddleware`配下、`/api/projects/{projectId}/viewers`
    - `errorMiddleware`の`ERROR_MAPPINGS`に`InvalidViewerDataError`（400）、`InvitationMailDeliveryError`（502）を追加登録する
  - **完了条件**: AC-01, AC-04, AC-05, AC-06に沿って201/400/404/502が返ること
  - **統合テスト要件**: `app/server/src/viewer/presentation/__tests__/viewerManagementRoutes.integration.test.ts`に正常系・異常系を配置する

- [x] **TASK-3-07: OpenAPI仕様・TypeScript型定義の生成**
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

## 7. 実施記録

- 開始時刻: 2026-08-16 17:22 JST
- 終了時刻: 2026-08-16 18:07 JST
- 合計時間: 約45分（typecheck/test/lint/build/semgrepの実行時間を含む）

### 差異の記録

- **TASK-3-02**: 着手前にユーザーへ確認した結果、E2Eからの生トークン取得手段は「テスト専用HTTPエンドポイント（`GET /__test__/invitations?recipient=<email>`）＋サーバープロセス内`TestInvitationStore`（recipientキー、最新1件を保持）」方式を採用した。「直近1件」グローバル方式は並列E2E実行時に競合するため避け、recipient単位で記録する設計とした。ガードは`NODE_ENV !== 'production' && ENABLE_TEST_ENDPOINTS === 'true'`（`isTestEndpointsEnabled()`）とし、本番では`entrypoints/index.ts`でルート自体を登録しない。あわせて、Phase 9 TASK-9-07向けに任意の`expiresAt`を指定してトークンを発行する`TestOnlyViewerAccessTokenIssuer`と`POST /__test__/viewer-tokens`も同一ガードの下で用意した
- **TASK-3-03/06のトランザクション方針**: design.md 5.1節は「DBトランザクション内で招待・トークンを保存しコミット」としているが、既存コードベース（`PostgreSQLProjectRepository`等）にDrizzleの`db.transaction()`を跨いだ複数Repository呼び出しを行うUnit of Workパターンの前例がなく、UseCase層からトランザクションを制御する仕組みが存在しなかった。新規に導入するとPhase3の範囲を超える構造変更になるため、本フェーズでは「招待保存→トークン保存」を順次実行し、トークン保存が失敗した場合は保存済みの招待を補償削除する方式（コードレビューで追加）を採用した。真のSQLトランザクション化は将来Unit of Workパターンを導入する際に見直す
- **TASK-3-06のエラーハンドリング方式**: design.md 7.2節は「既存`errorMiddleware`の`ERROR_MAPPINGS`に追加登録する」としているが、実際のコードベースでは`shared/middleware/errorMiddleware.ts`はどのドメインのルートからも使われておらず、`project`/`task`ドメインは各ルートファイル内の`app.onError(...)`によるインラインエラーハンドリングを採用している（design.mdの記述漏れ）。実装との整合を優先し、`viewerManagementRoutes.ts`も既存`project`/`taskRoutes.ts`と同じインラインパターンを採用した
- **コードレビュー（Codex MCP、8観点）で検出し対応した問題**:
  - 【対応必須】`viewerManagementRoutes.ts`のデフォルトエクスポートが、モジュールimport時点で`ViewerDIContainer.getInviteViewerUseCase()`を即時評価し、`SesInvitationMailGateway.getInstance()`がAWS_REGION/SES_FROM_ADDRESS未設定で例外をスローする構成だった。ENABLE_TEST_ENDPOINTSが設定されていない環境では、viewer機能を全く使わなくても`entrypoints/index.ts`のimportだけでサーバー全体の起動が失敗する状態だったため、DI解決を実際のリクエスト処理時まで遅延させるプロキシ（`lazyInviteViewerUseCase`）に変更した
  - 【対応必須】メール送信失敗時のみ補償削除を行っており、トークン保存自体が失敗した場合に保存済みの招待行が孤立して残る問題があったため、トークン保存を独立した`try/catch`で囲み、失敗時は招待のみを補償削除して元のエラーを再スローするよう修正した
  - 【対応推奨】`SesInvitationMailGateway`がAWS SDK標準のリトライを無効化しておらず、コード上の「allowlist最大1回リトライ」という説明と実際の試行回数が食い違う可能性があったため、`SESClient`に`maxAttempts: 1`を明示した
  - 【対応任意】`InvitationMailDeliveryError`に元エラーのメッセージを含めるよう修正し、障害時の診断性を改善した
  - 【対応見送り→レビュー後に対応】`isTestEndpointsEnabled()`の判定が`NODE_ENV !== 'production'`という除外方式（許可リストでない）である点について、レビュー後にユーザーと再確認した結果対応した（後述）
  - 【対応見送り】`findByProjectAndEmail`/`findByEmail`をUseCaseから呼ばず既存招待・既存トークンの分岐を判定していない点は、overview.md・phase3.md自体がTASK-3-03の範囲を「招待が存在せず、かつトークンが存在しない分岐のみ」と明記しており、既存招待・既存トークンの分岐はPhase 4で`InviteViewerUseCase`に組み込む設計のため対応不要と判断した
- **レビュー後の追加対応（ユーザー確認を経て実施）**:
  - `docker/server/Dockerfile`やCIビルド（`build:lambda`）に`ENABLE_TEST_ENDPOINTS=false`を焼き込む案をユーザーに提案されたが、調査の結果、`build:lambda`はpreview/production共通の単一アーティファクトを生成し（`.github/actions/lambda-package/action.yml`）、環境差分はTerraformが注入するLambda実行時環境変数（`ENVIRONMENT`）のみで区別される構成だと判明した。ビルド時に`--define`等で焼き込むとpreview環境でもテストエンドポイントが無効化されテストが動かなくなるため、この案は不採用とした
  - 代わりに、Lambda環境で確実に設定される`ENVIRONMENT`変数（`aws_lambda_function.environment.variables`で必ず注入される）を用いた許可リスト方式（`TEST_ENDPOINTS_ALLOWED_ENVIRONMENTS = {'development', 'preview'}`）に`isTestEndpointsEnabled()`を変更した。従来の`NODE_ENV !== 'production'`は、AWS LambdaがNODE_ENVを自動設定しないため本番でも常にundefinedとなり実質ノーガードだった問題も同時に解消される
  - この変更に伴い`TestOnlyViewerAccessTokenIssuer.test.ts`のガードテストを`NODE_ENV`操作から`ENVIRONMENT`操作に更新し、許可リスト外の値（未設定）で拒否されることを検証するテストケースを追加した
- **運用上の注意（ユーザー対応が必要）**: `VIEWER_ACCESS_BASE_URL`・`ENABLE_TEST_ENDPOINTS`を`.env.example`と`compose.yaml`に追加したが、サンドボックスの制約上、実際の`.env`ファイルの読み書きはできなかった。ローカル開発でviewer招待APIを実際に呼び出す（`bun run dev`等）には、`.env`に`ENABLE_TEST_ENDPOINTS=true`（および必要なら`VIEWER_ACCESS_BASE_URL`）を追加し、`docker compose up -d --build server`等でコンテナを再作成する必要がある。`bun test`実行時は`NODE_ENV=test`が自動設定されるため、この対応なしでも全テストはグリーンになる

### 所要時間

- `bunx tsc --noEmit`（server/client）: エラーゼロ
- `bun test`（server）: 905 pass / 0 fail（2558 expect calls、約21.0秒）
- `bun run check`（Biome lint & format、server/client）: 修正なし
- `docker compose build server`: 正常にビルド完了
- `semgrep --config auto`（viewer関連パス対象）: 210ルール・45ファイルスキャンで0 findings
- `bun run knip`: viewer関連の新規未使用ファイルなし（`src/schemas/project-viewers.ts`等の指摘はPhase1から続く既存の技術的負債であり本フェーズ固有ではない）

# Phase 5: task追加イベントのPush配信とクリック遷移

## 1. このフェーズの目的

- task追加時に、通知ONかつ有効な招待を受けているviewerの各購読へWeb Push通知が個別に届き、クリックで該当taskを含むviewer閲覧画面へ遷移する状態を成立させる（UC-03）。`task`→`viewer`間の配信パイプライン（ポート・レジストリ・配信UseCase・Gateway）をこのフェーズで新設する

## 2. 確認可能なこと

- 通知ON・購読済みのviewerが招待されているprojectにtaskを追加すると、ブラウザにWeb Push通知が届き、project名・task名・「追加された」旨が表示される
- 通知をクリックすると`/viewer/{token}`（該当taskのヒント付き）へ遷移する
- 招待取り消し後・通知OFF・購読なし（許可未実施）のいずれの場合も通知が届かないことを確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-101, REQ-104（task_added部分）, REQ-105, REQ-301, REQ-302, REQ-303, REQ-304, AC-01（task_added）, AC-04, AC-05, AC-07
- **関連設計**: design.md 3.1節（allowlistベースの送信失敗処理）, 4.1〜4.3節（ITaskChangeNotifier, TaskChangeNotifierRegistry, DispatchTaskEventNotificationsUseCase, WebPushGateway, TaskChangeNotifierAdapter）, 5.1節, 5.3節, 7.1節ITaskChangeNotifier, 7.3節（task_added文言）

## 4. 依存関係

- **前提フェーズ**: Phase 1（`notificationEnabled`列とフィルタ条件が必要）, Phase 4（購読データとService Worker基盤が必要）
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-5-01: ITaskChangeNotifierポートとTaskChangeNotifierRegistry新設**
  - **タイプ**: TDD
  - **依存タスク**: なし
  - **関連要件**: REQ-101, REQ-102, REQ-103（型は3イベント種別を最初から定義するが、本フェーズではtask_addedのみ使用）
  - **関連設計**: design.md 4.2節（ITaskChangeNotifier, TaskChangeEvent, TaskChangeNotifierRegistry）
  - **実装詳細**: `app/server/src/task/application/ports/ITaskChangeNotifier.ts`に`notify(event: TaskChangeEvent): Promise<void>`と`TaskChangeEvent`型（`{ type: 'task_added' | 'status_changed' | 'priority_changed'; taskId: string; taskTitle: string; projectId: string; newStatus?: TaskStatusValue; newPriority?: TaskPriorityValue }`）を新規定義。`app/server/src/task/infrastructure/TaskChangeNotifierRegistry.ts`を新規作成し、デフォルトはNoop実装、`setNotifier()`/`getNotifier()`を提供する（`viewerAccessRoutes.ts`の遅延評価プロキシと同じ思想）
  - **完了条件**: `TaskChangeNotifierRegistry`が未配線（Noop）の状態でも`task`ドメイン単体のテスト・型チェックが独立して通ることを確認する（RISK-02の裏付け）
  - **単体テスト要件**: Noop実装が例外を投げず`Promise<void>`を返すこと、`setNotifier()`後は差し替えた実装が呼ばれること
  - **注意点**: テスト間の汚染防止のため、テスト用に`resetForTesting()`相当のリセット手段を用意する

- [x] **TASK-5-02: IPushNotificationGateway・WebPushGateway新規実装**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-01（VAPID鍵の環境変数が必要）
  - **関連要件**: REQ-001, REQ-302
  - **関連設計**: design.md 3.1節（410/404のみクリーンアップ）, 4.1節
  - **実装詳細**: `app/server/package.json`に`web-push`を追加。`app/server/src/viewer/application/IPushNotificationGateway.ts`に`send(subscription, payload): Promise<PushSendResult>`を定義（`SesInvitationMailGateway`と同型のport/adapter分離）。`app/server/src/viewer/infrastructure/WebPushGateway.ts`を新規作成し、`web-push`パッケージをラップ。VAPID鍵は`shared/config/env.ts`の`getVapidKeys()`から取得。送信結果の410/404を`PushSendResult`で判別可能にする
  - **完了条件**: `app/server/src/viewer/infrastructure/__tests__/WebPushGateway.test.ts`が通過する
  - **単体テスト要件**: `web-push`はモック化し、成功時・410/404失敗時・その他失敗時でそれぞれ異なる`PushSendResult`を返すことを検証

- [x] **TASK-5-03: DispatchTaskEventNotificationsUseCase新規実装**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-02
  - **関連要件**: REQ-101, REQ-104（task_added部分）, REQ-301, REQ-302, REQ-303, REQ-304
  - **関連設計**: design.md 5.1節, 5.3節, 7.3節task_added行
  - **実装詳細**: `app/server/src/viewer/application/DispatchTaskEventNotificationsUseCase.ts`を新規作成。`IProjectRepository.findByIds([projectId])`でproject名取得→`IProjectViewerRepository.findActiveByProject(projectId)`取得後`notificationEnabled === true`のみへ絞る（REQ-303, REQ-304）→各viewerの`email`について`IPushSubscriptionRepository.findByEmail(email)`→購読ごとに`IPushNotificationGateway.send()`を`Promise.allSettled`で並列実行→410/404のみ該当購読を削除。`type: 'task_added'`のpayloadは7.3節の文言（タイトル`{projectName}`、本文`「{taskTitle}」が追加されました`）で組み立てる
  - **完了条件**: `app/server/src/viewer/application/__tests__/DispatchTaskEventNotificationsUseCase.test.ts`が通過する
  - **単体テスト要件**: AC-04相当（revokedなviewerが除外される）／AC-05相当（購読0件のviewerには何も送信されない）／REQ-304相当（`notificationEnabled=false`のviewerが除外される）／REQ-302相当（410/404の場合のみ購読削除、それ以外は削除も再送信もしない）／複数購読への送信が`Promise.allSettled`で個別に扱われ1件の失敗が他に影響しないこと

- [x] **TASK-5-04: TaskChangeNotifierAdapterと合成ルート配線**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-01, TASK-5-03
  - **関連要件**: REQ-101〜REQ-103
  - **関連設計**: design.md 4.2〜4.3節
  - **実装詳細**: `app/server/src/viewer/infrastructure/TaskChangeNotifierAdapter.ts`を新規作成し、`ITaskChangeNotifier`を実装、内部で`DispatchTaskEventNotificationsUseCase.execute()`を呼び出す。`ViewerDIContainer`に`getTaskChangeNotifierAdapter()`を追加。`app/server/src/entrypoints/index.ts`に`TaskChangeNotifierRegistry.setNotifier(ViewerDIContainer.getTaskChangeNotifierAdapter())`を1行追加（`task`ドメインは引き続き`viewer`をimportしない）
  - **完了条件**: サーバー起動時にエラーなく配線されることを確認する
  - **単体テスト要件**: `TaskChangeNotifierAdapter.notify()`が`DispatchTaskEventNotificationsUseCase.execute()`へイベントをそのまま渡すことをモックで検証

- [x] **TASK-5-05: CreateTaskUseCaseへの通知発行追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-04
  - **関連要件**: REQ-101
  - **関連設計**: design.md 4.2節, 5.1節手順1〜2
  - **実装詳細**: `app/server/src/task/application/CreateTaskUseCase.ts`の保存成功後に`TaskChangeEvent(type: 'task_added', taskId, taskTitle, projectId)`を組み立て、`TaskChangeNotifierRegistry.getNotifier().notify(event)`を`await`して呼び出す（サーバーはAWS Lambda上で稼働しレスポンス返却後に実行環境が凍結されるため、配信処理の完了を待ってからレスポンスを返す）。呼び出しは`try/catch`で囲み、失敗してもログ出力のみに留め、UseCase自体の戻り値・例外に一切影響させない（RISK-02）
  - **完了条件**: `app/server/src/task/application/__tests__/CreateTaskUseCase.test.ts`が通過する
  - **単体テスト要件**: task作成成功時に`notify()`が正しいイベントで`await`されて呼ばれること／`notify()`が失敗（reject）してもUseCaseの戻り値・例外に影響しないこと（RISK-02の直接的な検証）
  - **注意点**: レスポンスタイムは配信対象数に応じて増加しうる（design.md 10.1節・RISK-05）。多数viewer・多数デバイスを想定したテストケースでも、UseCaseの応答自体は`Promise.allSettled`により有限時間で完了することを確認する

- [x] **TASK-5-06: 購読登録フローへのトークン永続化追加とService Workerのpush/クリック処理**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-01, TASK-5-05
  - **関連要件**: REQ-105
  - **関連設計**: design.md 2.2節（生トークンをサーバーに送らない方針）, 5.1節手順8, 5.4節, overview.md RISK-05
  - **実装詳細**:
    1. Phase 4の`useRegisterPushSubscription.ts`を拡張し、購読登録（`PushManager.subscribe()`）成功時に、その購読の`endpoint`をキーとして現在の閲覧トークン（`/viewer/{token}`のURLパラメータ）をIndexedDBへ保存する（`endpoint`→トークンの対応表。ブラウザから離れずServiceWorkerからも参照できる唯一の永続領域として選定）
    2. Service Worker（`sw.js`）に`self.addEventListener('push', ...)`を追加し、Push payload（title/body）から`Notification`を表示する
    3. `self.addEventListener('notificationclick', ...)`を追加し、`self.registration.pushManager.getSubscription()`で自身の購読の`endpoint`を取得→IndexedDBから対応するトークンを引く→push payload中の`taskId`と組み合わせて`/viewer/{token}?taskId={taskId}`のURLを組み立てて遷移する
  - **完了条件**: ブラウザでの手動確認（push通知受信→クリック→遷移）が成立する。ロジックのうち純関数化できる部分（IndexedDBからのURL組み立て等）は単体テストで検証する
  - **単体テスト要件**: `endpoint`とIndexedDB上のトークンからのURL組み立てロジックを純関数として切り出しユニットテストする（IndexedDBアクセスはモック化）
  - **UI/UX要件**: 通知タイトル・本文が7.3節の文言通り表示されること
  - **注意点**: 生アクセストークンをPush payloadやサーバーに含めない方針（design.md 2.2節）を厳守する。1台のブラウザ・1つのService Worker登録に対し複数のviewerトークンが保存されうる場合（同一デバイスで複数の招待リンクを開いた場合）、直近に登録した購読のトークンが使われる前提とし、複数アイデンティティの同時利用は本要件のスコープでは厳密に扱わない（overview.md RISK-05）

- [x] **TASK-5-07: Phase 5品質ゲート確認と手動疎通確認**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-5-01〜TASK-5-06
  - **関連要件**: なし（品質保証）
  - **関連設計**: なし
  - **実装詳細**: quality-gate-runnerサブエージェントへserver・client双方の`tsc --noEmit`・`bun test`・`biome`・`semgrep`・`knip`の実行を依頼する。加えてローカル環境でtask追加→ブラウザ通知受信→クリック遷移までの手動疎通確認を行う
  - **完了条件**: 全チェックがパスし、手動疎通確認でAC-01（task_added部分）・AC-04・AC-05・AC-07の期待結果が再現できる

## 実施記録

- 開始時刻（JST）: 2026-09-13 12:54
- 終了時刻（JST）: 2026-09-13 13:28
- 合計時間: 34分
- typecheck / test / lint / build:
  - `docker compose exec server bunx tsc --noEmit`（エラーなし）
  - `docker compose exec server bun test`（1047 pass, 0 fail）
  - `docker compose exec client bunx tsc --noEmit`（エラーなし）
  - `docker compose exec client bun test`（585 pass, 0 fail）
  - `docker compose exec server bunx biome check .` / `docker compose exec client bunx biome check .`（issueなし）
  - `docker compose run --rm semgrep semgrep --config=auto`（13件、すべてTerraformインフラの既存警告でapp配下は0件）
  - `docker compose exec server bun run knip` / `docker compose exec client bun run knip`（Phase4時点と同数の既存未使用ファイル・exports・依存関係のみで新規増加なし）
  - `docker compose exec server bun run cpd` / `docker compose exec client bun run cpd`（新規重複コードなし）

### 差異の記録

- design.md 4.2〜4.3節は「`entrypoints/index.ts`に`TaskChangeNotifierRegistry.setNotifier(ViewerDIContainer.getTaskChangeNotifierAdapter())`を1行追加する」としていたが、`.claude/rules/backend.md`の「新しいドメインがDB接続以外の新しい必須環境変数に依存する場合は遅延評価プロキシを挟む」という必須ルールと、過去セッションのナレッジ（`knowledge/backend/eager-di-container-import-time-crash.md`）に従い、素直な1行呼び出しではなく`lazyTaskChangeNotifier`という遅延評価プロキシ経由で配線した。`WebPushGateway`は`VAPID_PUBLIC_KEY`等の新規必須環境変数に依存するため、`entrypoints/index.ts`のモジュールトップレベルで`ViewerDIContainer.getTaskChangeNotifierAdapter()`を即時評価すると、VAPID鍵未設定なだけでtask機能を含むサーバー全体の起動が失敗しうるため
- Codex MCPによる8観点レビュー（line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions）を実施し、以下を反映した:
  - **[efficiency, 対応済み]** `app/client/public/sw.js`の`getTokenByEndpoint`が、IndexedDBの読み取り失敗時に`db.close()`を呼ばずコネクションをリークする指摘。`saveEndpointToken`と同じ`try/finally`パターンに統一した
  - **[reuse, 対応済み]** `IProjectRepository.findByIds`のJSDocが「呼び出し元は`GetViewerAccessibleProjectsUseCase`に限定」という古い制約を記載したままだった指摘。`DispatchTaskEventNotificationsUseCase`も正当な呼び出し元として追加されたため、コメントを実態に合わせて更新した
  - **[altitude, 見送り]** `CreateTaskUseCase`（application層）が`TaskChangeNotifierRegistry`（infrastructure層）を直接importしている点がClean Architectureの依存方向に反するという指摘。task-plan・design.md双方が明示的に「`TaskChangeNotifierRegistry.getNotifier().notify(event)`を直接呼び出す」設計を指定しており、これは既存の`viewerAccessRoutes.ts`等と同じ「モジュールレベルの差し替え可能な保持箱」パターンを意図的に採用したもの（コンストラクタDIにすると`TaskDIContainer`・既存テストへの波及が大きくなる）。設計判断として見送った
  - **[efficiency, 見送り]** `DispatchTaskEventNotificationsUseCase`がviewerごとに`findByEmail`を逐次awaitしている点（並列化の余地）。design.md 3.1・10.1節がviewer数に比例した呼び出し増加を許容範囲内と明記しており、RISK-05として実装フェーズでの検証事項に留めている性質のため、Phase5時点では見送った
  - **[conventions, 見送り]** 新規テストの`describe`名・コメントに`REQ-302`/`RISK-02`等の識別子を残している指摘。既存コードベース（`EmailAlreadyRegisteredGoogleError.ts`のJSDoc、`project`/`task`ドメインの多数のテストケース名）で`REQ-XXX`/`AC-XXX`をテスト名・コメントに残す慣習が既に定着しており、既存慣習との整合を優先し見送った
  - **[conventions, 誤検知]** `__tests__`から親ディレクトリへの相対import（`../TaskChangeNotifierRegistry`等）が絶対import規約違反という指摘があったが、`SesInvitationMailGateway.test.ts`等の既存`__tests__`ファイルすべてが同じ相対import慣習であり、`__tests__`はその直上ディレクトリと同一サブディレクトリ相当として扱われている既存実態と整合している。誤検知と判断し対応しなかった
- Phase 5完了条件のうち「ブラウザでの手動疎通確認（push通知受信→クリック→遷移）」は、Phase4と同様に本環境（サンドボックス）では実ブラウザでの通知許可・Push受信・Service Worker実行の確認ができない。ユニットテスト（`buildNotificationClickUrl`の純関数テスト、`WebPushGateway`/`DispatchTaskEventNotificationsUseCase`のモックテスト）とAPI結合済みの型チェックで代替した。実ブラウザでの疎通確認はユーザー側での確認を推奨する

## 6. このフェーズの完了条件

- 通知ON・購読済みのviewerに対し、task追加時にWeb Push通知が届きクリックで遷移することを手動確認できる
- 招待取り消し・通知OFF・購読なしのいずれの場合も通知が送信されないことがテストで確認できる
- Push送信失敗時、410/404のみ購読が削除されそれ以外は再送信・削除のいずれも行われないことがテストで確認できる
- `CreateTaskUseCase`の`notify()`呼び出し失敗がUseCase自体の成功応答に影響しないことがテストで確認できる
- `notify()`が`await`され、Lambda環境でも配信処理がレスポンス返却前に完走することがテスト・手動確認の両方で確認できる

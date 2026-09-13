# project閲覧者通知機能 実装プラン概要

## 1. 概要

- **Requirement ID**: HOXBL-102
- **参照要件**: tasks/HOXBL-102/spec/requirements.md
- **参照技術設計**: tasks/HOXBL-102/technical/design.md
- **目的**: task追加・ステータス変更・優先度変更の発生時に、既存`viewer`ドメインを経路としてWeb Push通知をviewerへ配信し、viewerがproject単位で通知ON/OFFを切り替えられる状態を実装する
- **対象**: project単位の通知ON/OFF設定（保存・変更・初期化）、Web Push購読の登録、task変更3イベントの検知と配信、通知クリック時の遷移先
- **対象外**: メール通知・ダイジェスト配信・通知履歴/既読管理・部下（project作成者）への通知・送信失敗時の代替経路・購読解除専用API・iOS Safari等Web Push非対応環境対応・Slack連携・リアクション機能・task削除イベントへの通知

## 2. 前提と確認事項

### 2.1 配信方式とLambda実行環境の整合性

- サーバーはAWS Lambda（Function URL、`app/server/src/entrypoints/lambda.ts`の`hono/aws-lambda`）上で稼働する。AWS Lambdaはレスポンスを返却した直後に実行環境を凍結するため、`await`していないPromiseは完走する保証がない
- そのため、task変更UseCaseは`TaskChangeNotifierRegistry.getNotifier().notify(event)`を`await`して呼び出し、配信処理の完了を待ってからAPIレスポンスを返す（technical-design.md 2.3節DQ-01, 3.1節, 5.1節手順2）
- **トレードオフ**: viewer数・デバイス数が多いprojectでは、task変更APIのレスポンスタイムが配信対象数に応じて増加する。`Promise.allSettled`による並列送信で影響を最小化するが、Lambdaのタイムアウト設定（`terraform/modules/lambda`の`timeout`）が配信対象数のワーストケースを許容できるか、Phase 5実装時に確認すること（design.md RISK-05）

### 2.2 その他の前提

- requirements.md・design.mdともに未決事項はない（DQ-01〜DQ-04はユーザー確認済み、REQ-104の仕様変更2026-09-02反映済み）
- `task`ドメインは`viewer`ドメインを一切importしない。両者は`task`側が定義する`ITaskChangeNotifier`ポートで接続し、配線は`entrypoints/index.ts`（合成ルート）でのみ行う（design.md 4.2〜4.3節）
- Outboxパターン（イベントテーブル＋非同期ワーカー）は採用しない（design.md 3.1〜3.2節）。task変更UseCase内でawaitして配信するが、別プロセス・別インフラは新設しない
- **RISK-04**: VAPID鍵ペアのTerraformモジュール構成（新設か既存`terraform/modules/ses`への同居か）は未確定。Phase 4のTerraformタスクで決定する。この決定はPreview/Production適用に必要なだけで、ローカル環境でのPhase 1〜6の実装・デモは環境変数（Phase 3で設定）のみで完結するためブロッカーにはならない
- **注意（RISK-02）**: task変更3UseCaseへの`notify()`呼び出し追加は、失敗時に例外を外へ漏らさない`try/catch`が必須。漏れるとREQ-302（送信失敗が既存task機能に影響しない）を壊すため、Phase 5・Phase 6のテストで重点的に検証する
- **注意（RISK-03）**: Push送信は`await`する同期実行のため、ユニットテストは`DispatchTaskEventNotificationsUseCase`の呼び出し結果を通常の同期呼び出しとして直接検証すればよい（design.md 12章）

## 3. ユースケース一覧

- **UC-01**: viewerがprojectごとに通知ON/OFFを切り替える
  - **結果**: 指定projectの通知設定のみが変更され、他projectには影響しない。新規招待・招待復元時はONに初期化される
  - **関連要件**: REQ-002, REQ-003, REQ-004, REQ-106, NFR-101
  - **関連設計**: design.md 4.1節（ProjectViewerEntity, IProjectViewerRepository, UpdateNotificationSettingUseCase）, 5.2節, 7.1節PATCH, 8節

- **UC-02**: viewerがブラウザでWeb Push通知を許可し購読を登録する
  - **結果**: viewerのブラウザ・email単位の購読情報（endpoint・鍵）がサーバーに保存される
  - **関連要件**: REQ-001
  - **関連設計**: design.md 4.1節（PushSubscriptionEntity, IPushSubscriptionRepository, RegisterPushSubscriptionUseCase）, 5.2節, 7.1節POST, 8節

- **UC-03**: task追加時にviewerへWeb Push通知が届き、クリックで該当画面へ遷移する
  - **結果**: 通知ONかつ有効な招待を受けているviewerの各購読へ個別にPush通知が送信され、クリックでviewer閲覧画面へ遷移する
  - **関連要件**: REQ-101, REQ-104（task_added部分）, REQ-105, REQ-301, REQ-302, REQ-303, REQ-304
  - **関連設計**: design.md 4.1〜4.3節（ITaskChangeNotifier, TaskChangeNotifierRegistry, DispatchTaskEventNotificationsUseCase, WebPushGateway）, 5.1節, 5.3節, 7.3節

- **UC-04**: taskのステータス・優先度変更時にviewerへWeb Push通知が届く（project付け替えは対象外）
  - **結果**: 変更後の値を含む通知が個別に送信される。projectId単独変更は「追加」として通知されない。値が変化していない更新では通知されない
  - **関連要件**: REQ-102, REQ-103, REQ-104（status/priority部分）, REQ-305, REQ-501
  - **関連設計**: design.md 4.2節（UseCase変更箇所）, 5.1節手順2, 7.3節文言表

## 4. フェーズ一覧

各UCは、実装量が4時間の目安を大きく超えるため、バックエンド（API境界まで到達し統合テストで検証可能）とフロントエンド（そのAPIに実際に接続するUI）の2フェーズに分割している。いずれも「見た目だけ」「handlerだけ」で終わらせず、フロントエンド側フェーズは必ず前段フェーズの実APIに接続する。

- **Phase 1: 通知ON/OFF設定 — バックエンド**
  - **目的**: UC-01のうち、project×viewerの通知設定を保存・変更・初期化するAPIをAPI境界まで完成させる
  - **確認可能なこと**: `Viewer-Access-Token`を用いたAPI呼び出し（統合テスト・curl）で、通知設定のON/OFF切り替え・他projectへの非影響・active招待なし時の404を確認できる
  - **関連要件**: REQ-002, REQ-003, REQ-004, REQ-106, NFR-101, AC-06, AC-10
  - **関連設計**: design.md 3.1節, 4.1節, 5.2節, 7.1節PATCH, 8節・8.1節
  - **依存**: なし

- **Phase 2: 通知ON/OFF設定 — フロントエンドUI**
  - **目的**: Phase 1のAPIに接続する通知トグルUIをviewer閲覧画面に追加する
  - **確認可能なこと**: viewer閲覧画面のトグルでproject単位に通知ON/OFFを切り替えられ、他projectに影響しないことをブラウザ上で確認できる
  - **関連要件**: REQ-002, REQ-106, AC-06
  - **関連設計**: design.md 4.3節
  - **依存**: Phase 1

- **Phase 3: Web Push購読登録 — バックエンド**
  - **目的**: UC-02のうち、VAPID鍵基盤・購読保存テーブル・購読登録APIをAPI境界まで完成させる
  - **確認可能なこと**: 統合テスト・curlで、購読情報の新規登録・endpoint重複時の上書き・不正入力時の400を確認できる
  - **関連要件**: REQ-001, TS-301
  - **関連設計**: design.md 3.1節, 4.1節, 5.2節手順1〜3, 7.1節POST, 8節・8.1節, 10.3節
  - **依存**: Phase 1（`notificationRoutes.ts`・`ViewerDIContainer`を共有拡張するため）

- **Phase 4: Web Push購読登録 — フロントエンドUI**
  - **目的**: Phase 3のAPIに接続する、Service Worker登録・通知許可リクエスト・購読UIをviewer閲覧画面に追加する
  - **確認可能なこと**: viewer閲覧画面でブラウザの通知許可を求め、許可すると`viewer_push_subscriptions`に購読情報が保存されることを確認できる
  - **関連要件**: REQ-001
  - **関連設計**: design.md 4.3節, 5.2節手順1
  - **依存**: Phase 3

- **Phase 5: task追加イベントのPush配信とクリック遷移**
  - **目的**: UC-03を成立させる。`ITaskChangeNotifier`ポートと配信パイプラインを新設し、task追加イベントで実際にPush通知が届き、クリックで遷移する状態を作る
  - **確認可能なこと**: 通知ON・購読済みのviewerがtaskを追加するとブラウザにPush通知が届き、クリックで`/viewer/{token}`へ遷移すること。招待取り消し・通知OFF・購読なしのいずれでも通知が届かないことを確認できる
  - **関連要件**: REQ-101, REQ-104（task_added部分）, REQ-105, REQ-301, REQ-302, REQ-303, REQ-304, AC-01（task_added）, AC-04, AC-05, AC-07
  - **関連設計**: design.md 3.1節, 4.1〜4.3節, 5.1節, 5.3節, 7.1節ITaskChangeNotifier, 7.3節
  - **依存**: Phase 1, Phase 4

- **Phase 6: ステータス・優先度変更イベントの配信とproject付け替え除外**
  - **目的**: UC-04を成立させる。Phase 5で確立した配信パイプラインを`status_changed`/`priority_changed`イベントに拡張し、project間付け替えおよび無変化の更新を誤通知しないことを保証する
  - **確認可能なこと**: taskのステータス・優先度を変更すると変更後の値を含む個別通知が届くこと（前進・後退どちらの遷移でも、同一taskへの連続変更でも個別に届くこと）、project間付け替え・値が変化しない更新では通知が発生しないことを確認できる
  - **関連要件**: REQ-102, REQ-103, REQ-104（status/priority部分）, REQ-305, REQ-501, AC-01（status/priority）, AC-02, AC-08, AC-09
  - **関連設計**: design.md 4.2節, 5.1節手順2, 7.3節
  - **依存**: Phase 5

## 5. リスクと注意点

- **RISK-01**: Web Push/VAPID/Service Workerが未実装であるため、新規インフラ要素（npm依存`web-push`、VAPID鍵管理、Service Workerファイル配信）の導入が必要になる
- **RISK-02**: task変更3UseCaseへの`notify()`追加によりtaskドメインに「配信失敗を外へ漏らさない」責務が生じる。`try/catch`漏れの検証を重点的に行う（Phase 5・Phase 6）
- **RISK-03**: Push送信は`await`する同期実行のため、ユニットテストは通常の同期呼び出しとして`DispatchTaskEventNotificationsUseCase`の呼び出し結果を直接検証できる
- **RISK-04**: VAPID鍵ペアのTerraformモジュール構成（新設か既存`terraform/modules/ses`への同居か）は未設計。Phase 4の該当タスクで決定する（ローカル実装・デモはブロックしない）
- **RISK-05**: 通知クリック時の遷移先URL組み立てに使うviewerアクセストークンの解決方式（どのブラウザ購読がどのトークンに対応するか）は、Phase 5でIndexedDBベースの`endpoint`→トークン対応表として具体化する。1台のブラウザが複数のviewerトークンを保持しうる場合の挙動は「直近に登録した購読のトークンを使う」ことを前提とし、複数アイデンティティの同時利用は本要件のスコープでは厳密に扱わない

## 6. スコープ外

- メール通知（Web Push未許可時の代替を含む）
- ダイジェスト配信（まとめ配信）
- 通知履歴一覧画面・通知の既読管理
- 部下（project作成者/変更者）への通知
- Web Push未許可時・送信失敗時の代替手段（再試行・メール切り替え等）
- 購読解除専用API
- iOS SafariなどWeb Push非対応環境への対応（PWA化含む）
- taskの削除イベントに対する通知
- Slack連携
- リアクション機能（④）

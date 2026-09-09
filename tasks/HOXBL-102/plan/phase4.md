# Phase 4: Web Push購読登録 — フロントエンドUI

## 1. このフェーズの目的

- Phase 3で完成した購読登録APIに接続する、Service Worker登録・通知許可リクエスト・購読UIをviewer閲覧画面に追加し、UC-02をエンドツーエンドで成立させる
- VAPID鍵のPreview/Production向けTerraform管理も本フェーズで完了させる（ローカル実装はブロックしない）

## 2. 確認可能なこと

- viewer閲覧画面（`/viewer/{token}`）でブラウザの通知許可を求めるUIを操作し、許可すると`viewer_push_subscriptions`テーブルに購読情報が保存されることをDBおよびAPI呼び出しで確認できる
- 許可を拒否した場合は購読が保存されず、その旨がUIで分かることを確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-001
- **関連設計**: design.md 4.3節, 5.2節手順1

## 4. 依存関係

- **前提フェーズ**: Phase 3（購読登録APIが完成していること）
- **ブロッカー**: なし（TASK-4-03のTerraform対応はPreview/Production適用前に完了していればよく、他タスクをブロックしない）

## 5. タスク一覧

- [x] **TASK-4-01: Service Worker新設と購読登録フロー**
  - **タイプ**: TDD
  - **依存タスク**: Phase 3完了
  - **関連要件**: REQ-001
  - **関連設計**: design.md 4.3節, 5.2節手順1
  - **実装詳細**: `app/client/public/`にService Workerファイル（`sw.js`。この時点では登録のみ、pushイベント処理はPhase 5で追加）を新規作成。`app/client/src/features/viewer/hooks/useRegisterPushSubscription.ts`を新規作成し、Service Worker登録→`Notification.requestPermission()`→`PushManager.subscribe({ applicationServerKey: VAPID公開鍵 })`→POST APIへ送信、という一連の処理を実装。VAPID公開鍵はTASK-3-01で決定した方法でクライアントへ配布する。`ViewerServicesContext.tsx`に追加する
  - **完了条件**: `docker compose exec client bunx tsc --noEmit`・`bun test`が通る
  - **単体テスト要件**: Service Worker登録・`PushManager.subscribe()`はモック化し、成功時にPOST APIが呼ばれること、許可拒否時にPOSTが呼ばれないことを検証
  - **注意点**: Service WorkerやPushManager等ブラウザAPIはDI不能な外部性のため、`frontend.md`の「DI可能な範囲」に従いフック内でラップしテスト容易性を確保する。トークンの永続化（IndexedDB等）はPhase 5で通知クリック遷移のために追加するため、本タスクでは実装しない（Phase 5で自身が使うコードとして追加する）

- [x] **TASK-4-02: 通知許可状態表示UIの追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-01
  - **関連要件**: REQ-001
  - **関連設計**: design.md 4.3節
  - **実装詳細**: `ViewerShell.tsx`または`ViewerTaskBoard.tsx`に、通知許可を求めるボタンと、許可済み・未許可・拒否済みの状態表示を追加する
  - **完了条件**: `docker compose exec client bunx tsc --noEmit`・`bun test`が通る
  - **単体テスト要件**: 各許可状態（許可済み／未許可／拒否済み）で表示が切り替わること
  - **UI/UX要件**: 許可済み・未許可・拒否の状態がひと目で分かる表示にする／許可を求めるタイミング・文言はユーザーの意図を尊重し強制しない／モバイルでの操作性を確保する

- [x] **TASK-4-03: VAPID鍵ペアのTerraformシークレット管理リソース追加**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-3-01
  - **関連要件**: REQ-001（Preview/Production運用に必要）
  - **関連設計**: design.md 10.3節, 12章RISK-04
  - **実装詳細**: `terraform/modules/ses`の`from_address`管理パターンを踏襲し、VAPID公開鍵・秘密鍵をシークレットとして管理するTerraformリソースを追加する。新規モジュールとして切り出すか既存モジュールに同居させるかをこのタスクで決定し、Preview/Production環境（`terraform/modules/lambda`のLambda環境変数）へ反映されるよう配線する
  - **完了条件**: `make iac-plan-save`等で差分が意図通りであることを確認する
  - **注意点**: ローカル開発・Phase内のデモはTASK-3-01の環境変数で完結するため、このタスクはPreview/Production適用前に完了していればよく、Phase内の他タスクをブロックしない

- [x] **TASK-4-04: Phase 4品質ゲート確認と手動疎通確認**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-4-01, TASK-4-02
  - **関連要件**: なし（品質保証）
  - **関連設計**: なし
  - **実装詳細**: quality-gate-runnerサブエージェントへclientの`tsc --noEmit`・`bun test`・`biome`・`semgrep`・`knip`の実行を依頼する。あわせてブラウザでの手動確認（通知許可→購読保存、拒否→購読なし）を行う
  - **完了条件**: 全チェックがパスし、手動疎通確認で期待結果が再現できる

## 6. このフェーズの完了条件

- viewerが通知許可UIを操作すると、ブラウザの通知許可状態に応じて購読情報が`viewer_push_subscriptions`へ保存される、または保存されないことが確認できる
- Phase 4で追加したUIコードがすべてテストされている
- VAPID鍵のPreview/Production向けTerraform対応の方針が決定している

## 実施記録

- 開始時刻（JST）: 2026-09-09 22:18
- 終了時刻（JST）: 2026-09-09 23:04
- 合計時間: 45分
- typecheck / test / lint / build: `docker compose exec client bunx tsc --noEmit`（エラーなし）、`docker compose exec client bun test`（582 pass, 0 fail）、`docker compose exec client bun run fix`（biome、差分なし）、`docker compose exec client bun run knip`（新規追加ファイルは未使用扱いされず。既存の未使用ファイル4件・未使用exports31件・依存関係1件は変化なし）、`docker compose exec client bun run cpd`（既存11 clonesのまま新規重複なし）、`docker compose run --rm semgrep semgrep --config=auto`（13 findings、すべて既存のTerraformインフラ警告で変化なし）、`docker compose exec iac terraform validate`（bootstrap: Success）

### 差異の記録

- Codex MCPによる8観点レビュー（line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions）を実施し、`/resolve-feedback`のフローで以下を反映した:
  - **[correctness, 重要, 妥当性5/5・リスク中]** 初回実装では`permissionState`（ブラウザの通知許可状態）と「購読登録が実際に完了しているか」を区別しておらず、以下のケースで購読未登録のまま放置される問題があった（6/8観点のレビューで共通して指摘）: (1) 前回訪問時に通知を許可済みのブラウザで再度画面を開いた場合、`requestPermission()`が呼ばれないため登録フロー自体が実行されない (2) 許可後にService Worker登録・`subscribe()`・API登録のいずれかが失敗すると`permissionState`は既に`granted`に更新済みのため、UIから再試行する手段がなかった。対応として、`useRegisterPushSubscription`に`registerSubscription()`（SW登録→購読取得→API登録を担う関数）を切り出し、マウント時に`permissionState === 'granted'`であれば自動的に実行するeffectを追加した。UI側（`PushNotificationPermission.tsx`）は`granted`かつ`error`ありの場合に「再試行する」ボタンを表示し、`requestPermission()`を再度呼び出せるようにした（許可済みの場合`Notification.requestPermission()`はプロンプトを出さず即座に`granted`を返すため、安全に再試行導線として使える）。対応するテスト（自動登録、再試行）を追加した
  - **[correctness, 軽微, 妥当性5/5・リスク中]** ブラウザAPI呼び出し（`serviceWorker.register`/`pushManager.subscribe`）由来の例外が`handleApiError`を経由せず生のエラーメッセージ（`Failed to fetch`等）のまま表示される可能性があった。既存の`useUpdateNotificationSetting`等と同じパターンに合わせ、catch句で`handleApiError`を経由するよう修正した
  - **[hydration, 見送り]** 「SSR時の初期状態（`unsupported`）とクライアント初回描画（実際の許可状態）が異なりhydration mismatchになる」という指摘が3観点であったが、`PushNotificationPermission`は`ViewerTaskBoardContent`内の`useViewerAccessibleProjects`（React Query、SSR時は必ず`isLoading: true`）のローディング分岐の内側にあり、SSR・クライアント初回描画のいずれも同じ「読み込み中」分岐になるため実際にはhydration mismatchが発生しないことをコード確認済みで見送った
  - **[infra, 見送り、リスク高のためユーザー報告]** 「`terraform/app`（通常CIが適用するレイヤ）・`deploy-infra.yml`にVAPID変数の受け渡しがなく、`terraform/bootstrap`への追加だけでは通常のCIフローでLambdaへ反映されない」「`NEXT_PUBLIC_VAPID_PUBLIC_KEY`（GitHub Actions variable）とTerraform側の`vapid_public_key`を同一値に保つ自動的な仕組みがない」という指摘があった。事実として正しいが、既存の`supabase_publishable_key`等も同じ制約（bootstrapは手動適用が前提、CIとの自動連携なし）を持っており、Phase4のスコープでbootstrap全体のCI連携を再設計するのは過大なため見送り、ユーザーに報告のうえ対応不要の判断とした
  - **[conventions, 見送り]** テストの`fetch: mockFetch as unknown as typeof fetch`が`as unknown as`禁止ルールに反するという指摘があったが、既存の`useUpdateNotificationSetting.test.tsx`・`useViewerAccessibleProjects.test.tsx`も同一パターンを使用している既存の precedent であり、今回のテスト1ファイルだけを直すと逆に既存2ファイルとの不整合が生まれるため見送った（型付きモックfetchヘルパーの導入は既存3ファイルへの横断的リファクタとして別途検討）
- VAPID公開鍵のクライアント配布方式（TASK-3-01で決定を後続タスクに委ねていた点）は、`NEXT_PUBLIC_VAPID_PUBLIC_KEY`というビルド時環境変数として配布する方式に決定した（`NEXT_PUBLIC_SUPABASE_URL`等の既存パターンを踏襲）。ローカルは`compose.yaml`で`VAPID_PUBLIC_KEY`と同じ値を共有し、CIは`.github/workflows/deploy-frontend.yml`で`vars.NEXT_PUBLIC_VAPID_PUBLIC_KEY`（GitHub Actions variable、手動設定が必要）を参照する
- TASK-4-03のTerraformモジュール構成は、設計書が示唆する「`terraform/modules/ses`相当の新設」ではなく、既存の`SUPABASE_PUBLISHABLE_KEY`等と同じ`terraform/bootstrap/{main.tf,variables.tf}`への直接追加とした。実際のLambda本体は`terraform/modules/lambda`を経由せず`terraform/bootstrap/main.tf`が直接所有しているため、既存構成の実態に合わせた（Codex MCPのaltitude観点レビューでも同判断を支持）
- 手動疎通確認について: 本環境はサンドボックス制約により実ブラウザでの通知許可操作・Service Worker registration・実機Push受信の確認はできていない。ユニットテスト（ブラウザAPIをモック化した`useRegisterPushSubscription`/`PushNotificationPermission`のテスト）とAPI結合済みの型チェックで代替した。実ブラウザでの疎通確認はユーザー側での確認を推奨する

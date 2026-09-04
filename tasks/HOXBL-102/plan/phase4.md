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

- [ ] **TASK-4-01: Service Worker新設と購読登録フロー**
  - **タイプ**: TDD
  - **依存タスク**: Phase 3完了
  - **関連要件**: REQ-001
  - **関連設計**: design.md 4.3節, 5.2節手順1
  - **実装詳細**: `app/client/public/`にService Workerファイル（`sw.js`。この時点では登録のみ、pushイベント処理はPhase 5で追加）を新規作成。`app/client/src/features/viewer/hooks/useRegisterPushSubscription.ts`を新規作成し、Service Worker登録→`Notification.requestPermission()`→`PushManager.subscribe({ applicationServerKey: VAPID公開鍵 })`→POST APIへ送信、という一連の処理を実装。VAPID公開鍵はTASK-3-01で決定した方法でクライアントへ配布する。`ViewerServicesContext.tsx`に追加する
  - **完了条件**: `docker compose exec client bunx tsc --noEmit`・`bun test`が通る
  - **単体テスト要件**: Service Worker登録・`PushManager.subscribe()`はモック化し、成功時にPOST APIが呼ばれること、許可拒否時にPOSTが呼ばれないことを検証
  - **注意点**: Service WorkerやPushManager等ブラウザAPIはDI不能な外部性のため、`frontend.md`の「DI可能な範囲」に従いフック内でラップしテスト容易性を確保する。トークンの永続化（IndexedDB等）はPhase 5で通知クリック遷移のために追加するため、本タスクでは実装しない（Phase 5で自身が使うコードとして追加する）

- [ ] **TASK-4-02: 通知許可状態表示UIの追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-01
  - **関連要件**: REQ-001
  - **関連設計**: design.md 4.3節
  - **実装詳細**: `ViewerShell.tsx`または`ViewerTaskBoard.tsx`に、通知許可を求めるボタンと、許可済み・未許可・拒否済みの状態表示を追加する
  - **完了条件**: `docker compose exec client bunx tsc --noEmit`・`bun test`が通る
  - **単体テスト要件**: 各許可状態（許可済み／未許可／拒否済み）で表示が切り替わること
  - **UI/UX要件**: 許可済み・未許可・拒否の状態がひと目で分かる表示にする／許可を求めるタイミング・文言はユーザーの意図を尊重し強制しない／モバイルでの操作性を確保する

- [ ] **TASK-4-03: VAPID鍵ペアのTerraformシークレット管理リソース追加**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-3-01
  - **関連要件**: REQ-001（Preview/Production運用に必要）
  - **関連設計**: design.md 10.3節, 12章RISK-04
  - **実装詳細**: `terraform/modules/ses`の`from_address`管理パターンを踏襲し、VAPID公開鍵・秘密鍵をシークレットとして管理するTerraformリソースを追加する。新規モジュールとして切り出すか既存モジュールに同居させるかをこのタスクで決定し、Preview/Production環境（`terraform/modules/lambda`のLambda環境変数）へ反映されるよう配線する
  - **完了条件**: `make iac-plan-save`等で差分が意図通りであることを確認する
  - **注意点**: ローカル開発・Phase内のデモはTASK-3-01の環境変数で完結するため、このタスクはPreview/Production適用前に完了していればよく、Phase内の他タスクをブロックしない

- [ ] **TASK-4-04: Phase 4品質ゲート確認と手動疎通確認**
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

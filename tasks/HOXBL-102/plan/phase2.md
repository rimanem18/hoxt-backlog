# Phase 2: 通知ON/OFF設定 — フロントエンドUI

## 1. このフェーズの目的

- Phase 1で完成した通知設定API（PATCH／GET拡張）に接続する、project単位の通知トグルUIをviewer閲覧画面に追加し、UC-01をエンドツーエンドで成立させる

## 2. 確認可能なこと

- viewer閲覧画面（`/viewer/{token}`）に表示された通知トグルをON/OFFすると、指定projectの設定のみが変わり他projectには影響しないことをブラウザ上で確認できる
- ページ再読み込み後も、直前に設定した通知ON/OFF状態がトグルに反映されていることを確認できる

## 3. 関連要件・関連設計

- **関連要件**: REQ-002, REQ-106, AC-06
- **関連設計**: design.md 4.3節（既存`features/viewer`への追加方針）

## 4. 依存関係

- **前提フェーズ**: Phase 1（PATCH・GET APIが完成していること）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-2-01: 通知設定変更フックの追加**
  - **タイプ**: TDD
  - **依存タスク**: Phase 1完了
  - **関連要件**: REQ-002, REQ-106
  - **関連設計**: design.md 4.3節
  - **実装詳細**: `app/client/src/features/viewer/hooks/useUpdateNotificationSetting.ts`を新規作成し、Phase 1のPATCH APIを呼び出すミューテーションフック（TanStack React Query）を実装。成功時は`useViewerAccessibleProjects`のクエリキャッシュ（`['viewer-accessible-projects']`）を無効化・更新する。`ViewerServicesContext.tsx`にこのフックを追加しContext経由DIパターンを踏襲
  - **完了条件**: `app/client/src/features/viewer/__tests__/useUpdateNotificationSetting.test.ts`が通過する
  - **単体テスト要件**: 成功時にキャッシュが更新されること、失敗時にエラーが伝播すること

- [ ] **TASK-2-02: 通知設定トグルUIの追加**
  - **タイプ**: TDD
  - **依存タスク**: TASK-2-01
  - **関連要件**: REQ-002, REQ-106, AC-06
  - **関連設計**: design.md 4.3節
  - **実装詳細**: `ViewerTaskBoard.tsx`（または新規コンポーネント`NotificationToggle.tsx`）にproject単位の通知トグルスイッチを追加し、`useViewerAccessibleProjects`が返す`notificationEnabled`を初期状態として表示。トグル操作で`useUpdateNotificationSetting`を呼び出す
  - **完了条件**: `docker compose exec client bunx tsc --noEmit`・`bun test`が通る
  - **単体テスト要件**: トグル操作でAPIが呼ばれること、更新中・成功・失敗状態が識別できること、あるprojectのトグル操作が他projectの表示に影響しないこと
  - **UI/UX要件**: タップ領域を十分に確保する（design-system.mdのモバイル操作性基準）／処理中・成功・失敗のフィードバックを明確にする／エラー時は原因が分かる表示にする
  - **注意点**: `mock.module()`は使用せずContext-based DIでテストする（frontend.md）

- [ ] **TASK-2-03: Phase 2品質ゲート確認と手動疎通確認**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-2-01, TASK-2-02
  - **関連要件**: なし（品質保証）
  - **関連設計**: なし
  - **実装詳細**: quality-gate-runnerサブエージェントへclientの`tsc --noEmit`・`bun test`・`biome`・`semgrep`・`knip`の実行を依頼する。あわせてブラウザでの手動確認（2つ以上のprojectに招待されたviewerで一方のみOFFにし、他方がONのままであることを確認）を行う
  - **完了条件**: 全チェックがパスし、AC-06の期待結果がブラウザ上で再現できる

## 6. このフェーズの完了条件

- viewerが`/viewer/{token}`画面で任意のprojectの通知ON/OFFを切り替えられ、他projectへ影響しないことがUI操作で確認できる（AC-06）
- Phase 2で追加したUIコードがすべてテストされている

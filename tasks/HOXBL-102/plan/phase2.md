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

- [x] **TASK-2-01: 通知設定変更フックの追加**
  - **タイプ**: TDD
  - **依存タスク**: Phase 1完了
  - **関連要件**: REQ-002, REQ-106
  - **関連設計**: design.md 4.3節
  - **実装詳細**: `app/client/src/features/viewer/hooks/useUpdateNotificationSetting.ts`を新規作成し、Phase 1のPATCH APIを呼び出すミューテーションフック（TanStack React Query）を実装。成功時は`useViewerAccessibleProjects`のクエリキャッシュ（`['viewer-accessible-projects']`）を無効化・更新する。`ViewerServicesContext.tsx`にこのフックを追加しContext経由DIパターンを踏襲
  - **完了条件**: `app/client/src/features/viewer/__tests__/useUpdateNotificationSetting.test.ts`が通過する
  - **単体テスト要件**: 成功時にキャッシュが更新されること、失敗時にエラーが伝播すること

- [x] **TASK-2-02: 通知設定トグルUIの追加**
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

## 実施記録

- 開始時刻（JST）: 2026-09-04 22:48
- 終了時刻（JST）: 2026-09-04 23:05
- 合計時間: 17分
- typecheck / test / lint / build: 全チェックが正常終了（quality-gate-runnerサブエージェントによる実施。tsc（client）・bun test（client全体56 pass, 0 fail）・biome fix（差分なし）・knip・cpd・semgrep（対象ディレクトリ）を確認。メインエージェントによる再確認でも`tsc --noEmit`エラーなし・`src/features/viewer`配下56 pass, 0 failを確認）

### 差異の記録

- TASK-2-03のうち、quality-gate-runnerサブエージェントによる自動チェック（tsc/test/biome/knip/cpd/semgrep）は完了したが、「ブラウザでの手動確認（2つ以上のprojectに招待されたviewerで一方のみOFFにし、他方がONのままであることを確認）」は本セッションでは実施していない（対話的ブラウザ操作の手段がなかったため）。ユーザー側での実機確認を推奨する
- Codex MCPによる8観点レビュー（line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions）を実施し、以下を反映した:
  - `ViewerProjectCard`が`useUpdateNotificationSetting`をpropsで受け取る設計を、`useViewerServices()`から直接取得する形に簡素化（simplification指摘）
  - エラーメッセージ表示を独自の`<p>`タグから既存の`FormAlert`コンポーネントへ差し替え（reuse指摘）
  - `const { project } = props`を`props.project`形式に修正（conventions指摘、`frontend.md`のprops使用規約）
  - `ViewerTaskBoard.tsx`の未使用import（`useUpdateNotificationSetting`の型import）を削除（line-by-line指摘）
  - テストコード中の`as unknown as typeof useUpdateNotificationSetting`キャストが不要（型注釈なしでも`tsc`が通る）と判明したため削除
  - `useUpdateNotificationSetting`の`onSuccess`で`queryClient.invalidateQueries`によりproject一覧全体を再取得している点（efficiency指摘）は、既存の`useInviteViewer`/`useRevokeViewer`と同一パターンであり一貫性を優先し今回は見送った

## 6. このフェーズの完了条件

- viewerが`/viewer/{token}`画面で任意のprojectの通知ON/OFFを切り替えられ、他projectへ影響しないことがUI操作で確認できる（AC-06）
- Phase 2で追加したUIコードがすべてテストされている

# Phase 10: Frontend - パスワード再設定フロー（ResetPassword）

## 開始時刻

2026-07-05 17:06 JST

## 1. このフェーズの目的

`/auth/reset-password` ページを追加し、PKCE フローでのパスワード更新 end-to-end を完成させる。  
このフェーズ完了後、リセットメールのリンクから新パスワードを設定して再サインインできる状態になる。

## 2. 確認可能なこと

- `/auth/reset-password` でリセットメールリンクを開いて `PASSWORD_RECOVERY` イベント受信後にパスワード入力フォームが表示されること（REQ-105）
- 新パスワード設定後に「パスワードを更新しました」メッセージが表示されること
- 無効なリセットリンクには「リンクが無効か期限切れです」が表示されること（REQ-305）
- UI テストがグリーンになること

## 3. 関連要件・関連設計

- **関連要件**: REQ-105, REQ-305
- **関連設計**: §3.3（PKCE フロー後半）, §6.1

## 4. 依存関係

- **前提フェーズ**: Phase 6（`emailPasswordAuthProvider` および `emailPasswordErrorHandler` が必要）
- **ブロッカー**: DCQ-03（Supabase Auth ダッシュボードのリダイレクト URL 許可リストに `/auth/reset-password` を追加。リリース前必須）

## 5. タスク一覧

- [x] **TASK-10-01: `usePasswordReset` フック新規作成（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: なし（Phase 6 完了後）
  - **関連要件**: REQ-105, REQ-305
  - **関連設計**: §3.3（PKCE フロー）
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/usePasswordReset.test.ts`

    テストケース:
    - `onAuthStateChange` で `PASSWORD_RECOVERY` イベントを受信 → `{ isReady: true }` になること（§3.3 の PKCE フロー）
    - `PASSWORD_RECOVERY` 以外のイベントでは `isReady` が変わらないこと（境界値）
    - `updatePassword(newPassword)` 呼び出し成功 → `{ status: 'success' }` になること（REQ-105）
    - `updatePassword` が `otp_expired` エラー → `{ status: 'error', errorMessage: "リンクが無効か期限切れです..." }` になること（REQ-305）
    - アンマウント時に `onAuthStateChange` のサブスクリプションが解除されること（メモリリーク防止）
    - `supabase.auth.onAuthStateChange` と `supabase.auth.updateUser` は DI でモックを使用する

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/features/auth/hooks/usePasswordReset.ts`
    - `supabase.auth.onAuthStateChange` を購読して `PASSWORD_RECOVERY` イベントを受信したら `isReady = true` にする
    - アンマウント時（`useEffect` cleanup）にサブスクリプションを解除する
    - `updatePassword(newPassword)` メソッドを提供し、`supabase.auth.updateUser({ password: newPassword })` を呼ぶ
    - エラー変換には `emailPasswordErrorHandler` を使用する
    - 状態: `{ isReady, isLoading, status: 'idle' | 'loading' | 'success' | 'error', errorMessage, updatePassword }`
    - URL フラグメントの直接パース（`access_token` 手動取得）は行わない（§3.3）
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**
  - **完了条件**: テストがすべてグリーンになること
  - **注意点**: PKCE フローのため URL フラグメントではなく `onAuthStateChange` による `PASSWORD_RECOVERY` イベントを必ず使用すること（§3.3）

- [x] **TASK-10-02: `ResetPasswordForm` コンポーネント新規作成（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-10-01
  - **関連要件**: REQ-105, REQ-305
  - **関連設計**: §3.3, §6.1
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/ui-ux/ResetPasswordForm.test.tsx`

    テストケース:
    - `isReady === false` のとき「リンクを確認中...」ローディング状態が表示されること
    - `isReady === true` のとき新パスワード入力フォームが表示されること
    - 新パスワード送信後に「パスワードを更新しました」メッセージが表示されること
    - 無効リンク時（`otp_expired`）に「リンクが無効か期限切れです。再度パスワードリセットを要求してください」が表示されること（REQ-305）
    - 「再度パスワードリセットを要求する」リンクが `/auth/forgot-password` を指していること

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/features/auth/components/ResetPasswordForm.tsx`
    - `usePasswordReset` フックを使用する（Context-based DI）
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**
  - **完了条件**: テストがすべてグリーンになること
  - **UI/UX 要件**:
    - ローディング状態: `isReady` が false のときローディング表示（`PASSWORD_RECOVERY` イベント待機中）
    - 成功状態: 完了メッセージとホームページへのリンクを表示する

- [x] **TASK-10-03: `/auth/reset-password` ページ新規作成**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-10-02
  - **関連要件**: REQ-105
  - **関連設計**: §6.1
  - **実装詳細**:
    - ファイルパス: `app/client/src/app/auth/reset-password/page.tsx`
    - `ResetPasswordForm` コンポーネントをレンダリングする
    - `'use client'` ディレクティブを付与する
  - **完了条件**: `/auth/reset-password` ルートにアクセスして `ResetPasswordForm` が表示されること

- [x] **TASK-10-04: 型チェック・テスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-10-03
  - **関連要件**: なし
  - **関連設計**: なし
  - **実装詳細**:
    ```bash
    docker compose exec client bunx tsc --noEmit
    docker compose exec client bun run fix
    docker compose exec client bun test
    ```
  - **完了条件**: 型エラー・テスト失敗がないこと

## 6. このフェーズの完了条件

- `/auth/reset-password` ページが存在し、`ResetPasswordForm` が表示されること
- `usePasswordReset` が `PASSWORD_RECOVERY` イベントを受信して `isReady` が変わること
- パスワード更新成功・無効リンクエラーの両方のテストがグリーンになること
- 全テストがグリーンになること

## 7. 実装記録

### 終了時刻・所要時間

- 開始時刻: 2026-07-05 17:06 JST
- 終了時刻: 2026-07-05 17:23 JST
- 合計所要時間: 約 17 分

### 計測値

| チェック | 結果 |
|---------|------|
| typecheck | PASS |
| test（351件） | PASS |
| lint/fix | PASS |
| build（client） | PASS（`/auth/reset-password` が静的ページとして生成） |
| semgrep | 0 findings |

### 設計との差異・Codexレビュー対応

1. **DI方式の選択**: タスク計画では「`supabase.auth.onAuthStateChange` と `supabase.auth.updateUser` を DI でモックを使用する」と記載があったが、Phase 9 の差異記録と同様、既存の `authService`（`AuthServicesContext` 経由）による DI パターンとの整合性を優先した。`AuthServiceInterface` に `onAuthStateChange` / `updatePassword` を追加し、`EmailPasswordAuthProvider` に実装を委譲する構成にした。

2. **Codex レビュー指摘への対応（resolve-feedback、いずれも妥当性 5/5 と判断し自動修正）**:
   - **PASSWORD_RECOVERY イベントの取りこぼしレース**: Supabase クライアントはモジュール読込時（`AuthServicesContext` 経由で `defaultAuthService` 生成時）に生成され、内部の URL からのリカバリートークン検出処理は購読の有無に関わらず自動的に開始される。従来案（React コンポーネントの `useEffect` 内で購読開始）では、購読前に `PASSWORD_RECOVERY` イベントが発火すると取りこぼす可能性があった。対応として `EmailPasswordAuthProvider` のコンストラクタで即座に内部購読を開始し、直近のイベントをバッファして遅れて登録されたリスナーに対しても登録時に即座にリプレイする方式に変更した（`emailPasswordAuthProvider.ts`）。
   - **無効・期限切れリンク到達時にエラー表示へ遷移できない（REQ-305）**: 無効リンクでは `PASSWORD_RECOVERY` イベントが発火しないため、`isReady` が `false` のまま「リンクを確認中...」から進めず、REQ-305 のエラー表示に到達する手段が実質的に存在しなかった。対応として `usePasswordReset` に、到達時点で URL の `error_code` クエリ/フラグメントパラメータを検出し、`isReady` を待たずに即座にエラー状態へ遷移させる処理を追加した。メッセージの重複を避けるため `INVALID_RESET_LINK_MESSAGE` 定数を `emailPasswordErrorHandler.ts` に切り出し、`otp_expired` コードのハンドリングと共有した。
   - 上記2件に対応する追加テストを `emailPasswordAuthProvider.test.ts`（`updatePassword`・`onAuthStateChange` の各 describe ブロック）、`usePasswordReset.test.tsx`（「無効リンクでの到達時」describe ブロック）、`ResetPasswordForm.test.tsx`（到達時エラー表示のテストケース）に追加した。

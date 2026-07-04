# Phase 5: Frontend - 事前リファクタリング

## 1. このフェーズの目的

デッドコードの削除と email 用エラーハンドラーの新設により、後続のフロントエンド実装で必要な土台を整える。  
このフェーズ完了後、`AuthErrorHandler` クラスへの参照が消え、`emailPasswordErrorHandler.ts` が REQ-301/303/305 のエラーマッピングをテストで固定した状態になる。

## 2. 確認可能なこと

- `AuthErrorHandler` クラスが削除されており参照がなくなっていること
- `useOAuthCallback.handleCallback` が引数なしで呼べること
- `emailPasswordErrorHandler.ts` が新設され、エラーマッピングテストがグリーンになること
- `docker compose exec client bun test` がグリーンになること

## 3. 関連要件・関連設計

- **関連要件**: REQ-301, REQ-303, REQ-305, NFR-101
- **関連設計**: §6.3（エラーメッセージマッピング）, §13 R2, R3

## 開始時刻

2026-07-04 09:37 JST

## 4. 依存関係

- **前提フェーズ**: なし（Phase 1 と並行して実施可能）
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-5-01: `useOAuthCallback.ts` 未使用パラメータ削除（R2）**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: なし（リファクタリング）
  - **関連設計**: §13 R2
  - **実装詳細**:
    `app/client/src/features/auth/hooks/useOAuthCallback.ts` の `handleCallback` の引数 `_providerType: 'google' | 'mock'` を削除する:
    ```diff
    - async (_providerType: 'google' | 'mock') => {
    + async () => {
    ```
    呼び出し元 `app/client/src/app/auth/callback/page.tsx` も合わせて修正する:
    ```diff
    - handleCallback('google');
    + handleCallback();
    ```
  - **完了条件**: `handleCallback` が引数なしで呼べること。型チェックがエラーゼロになること

- [x] **TASK-5-02: `AuthErrorHandler` クラス削除（R3 前半）**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-5-01
  - **関連要件**: なし（デッドコード削除）
  - **関連設計**: §13 R3
  - **実装詳細**:
    - `AuthErrorHandler` への本番コード参照がないことを事前確認: `grep -rn "AuthErrorHandler" app/client/src --include="*.ts" --include="*.tsx"` で参照ファイルを確認する
    - `app/client/src/features/auth/services/authErrorHandler.ts` から `AuthErrorHandler` クラス全体を削除する
    - `app/client/src/features/auth/__tests__/errorHandling.test.ts` の `AuthErrorHandler` を使用しているテストケースを削除する。他のテストケースは残す
    - ファイル自体が空になる場合はファイルごと削除する
  - **完了条件**: `AuthErrorHandler` クラスへの参照がなくなること。残存テストがグリーンになること

- [x] **TASK-5-03: `emailPasswordErrorHandler.ts` 新規作成（R3 後半・TDD）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-5-02
  - **関連要件**: REQ-301, REQ-303, REQ-305, NFR-101
  - **関連設計**: §6.3
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/emailPasswordErrorHandler.test.ts`

    テストケース（§6.3 のマッピングに従う）:
    - `code: "invalid_grant"` → 「メールアドレスまたはパスワードが間違っています」（REQ-301）
    - `message` に "Invalid login credentials" を含む → 同上（REQ-301, NFR-101 コード/メッセージ両方でマッチ）
    - `code: "invalid_grant"` も `message` も両方一致する場合 → 同一メッセージ（重複なし確認）
    - `code: "email_not_confirmed"` → 「メールアドレスの確認が必要です。受信したメール内のリンクから確認を完了してください」（REQ-303）
    - `code: "over_email_send_rate_limit"` → 「リクエストが多すぎます。しばらくしてから再度お試しください」
    - `code: "otp_expired"` → 「リンクが無効か期限切れです。再度パスワードリセットを要求してください」（REQ-305）
    - 未知のエラーコード → デフォルトの汎用エラーメッセージ
    - `AuthApiError` 以外の `Error` → デフォルトの汎用エラーメッセージ
    - `null` / `undefined` → デフォルトの汎用エラーメッセージ

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/features/auth/services/emailPasswordErrorHandler.ts`
    - Supabase `AuthApiError.code` と `AuthApiError.message` の両方で判定するマッピング関数を実装する
    - 関数シグネチャ例: `function handleEmailPasswordError(error: unknown): string`
    - **テストコードは変更しない**
    - 2 度以上テストが通らない場合はユーザーに報告すること

    **Refactor フェーズ（メインエージェント）**:
    - テストケースの重複確認・整理
  - **完了条件**: テストがすべてグリーンになること
  - **注意点**: NFR-101（列挙攻撃対策）のため、サインイン失敗は原因（ユーザー不存在/パスワード不一致）を区別せず同一メッセージにすること

- [x] **TASK-5-04: 型チェック・テスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-5-03
  - **関連要件**: なし
  - **関連設計**: なし
  - **実装詳細**:
    ```bash
    docker compose exec client bunx tsc --noEmit
    docker compose exec client bun run fix
    docker compose exec client bun test
    ```
  - **完了条件**: 型エラー・テスト失敗がないこと

## 終了時刻・所要時間

- 終了: 2026-07-04 09:47 JST
- 合計: 約 10 分

## typecheck / test / lint / build 計測

| コマンド | 所要時間 |
|---|---|
| client tsc --noEmit | ~3s（エラーゼロ）|
| client bun test (268 テスト) | ~5s |
| client bun run fix (biome) | ~2s |

## 差異の記録

- Green フェーズでサブエージェントがファイル作成に失敗（Write ではなく Edit を試みて空ファイルが生成）したため、メインエージェントが直接 Write で実装した
- `@supabase/auth-js` 直接 import を `@supabase/supabase-js` に修正（Codex レビュー指摘対応）
- JSDoc example の `handleCallback('google')` → `handleCallback()` 修正（Codex レビュー指摘対応）

## 6. このフェーズの完了条件

- `useOAuthCallback.handleCallback` が引数なしで呼べること
- `AuthErrorHandler` クラスが削除されており、参照が存在しないこと
- `emailPasswordErrorHandler.ts` が新設され、エラーマッピングテストがグリーンになること
- `docker compose exec client bunx tsc --noEmit` がエラーゼロになること
- 既存テストがすべてグリーンのまま維持されること

# Phase 9: Frontend - パスワードリセット要求フロー（ForgotPassword）

## 1. このフェーズの目的

`/auth/forgot-password` ページを追加し、パスワードリセットメール送信フローを完成させる。

## 2. 確認可能なこと

- `/auth/forgot-password` でメールアドレスを入力して送信すると「パスワードリセットメールを送信しました」が表示されること（REQ-104）
- レート制限エラー時に適切なメッセージが表示されること
- UI テストがグリーンになること

## 3. 関連要件・関連設計

- **関連要件**: REQ-104
- **関連設計**: §3.3（パスワードリセットフロー前半）, §6.1

## 4. 依存関係

- **前提フェーズ**: Phase 6（`emailPasswordAuthProvider.resetPasswordForEmail` が必要）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-9-01: `useForgotPassword` フック新規作成（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: なし（Phase 6 完了後）
  - **関連要件**: REQ-104
  - **関連設計**: §3.3
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/useForgotPassword.test.ts`

    テストケース:
    - `requestReset` 成功 → `{ status: 'sent' }` になること（REQ-104）
    - レート制限エラー（`over_email_send_rate_limit`）→ `{ status: 'error', errorMessage: "リクエストが多すぎます..." }` になること
    - 送信中は `isLoading` が true になること
    - `emailPasswordAuthProvider.resetPasswordForEmail` は DI でモックを使用する
    - `redirectTo` として `${window.location.origin}/auth/reset-password` が渡されること

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/features/auth/hooks/useForgotPassword.ts`
    - `requestReset(email)` メソッドを提供し、`emailPasswordAuthProvider.resetPasswordForEmail` を呼ぶ
    - `redirectTo` は `${window.location.origin}/auth/reset-password` を使用する
    - 状態: `{ isLoading, status: 'idle' | 'loading' | 'sent' | 'error', errorMessage }`
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**
  - **完了条件**: テストがすべてグリーンになること

- [ ] **TASK-9-02: `ForgotPasswordForm` コンポーネント新規作成（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-9-01
  - **関連要件**: REQ-104
  - **関連設計**: §6.1
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/ui-ux/ForgotPasswordForm.test.tsx`

    テストケース:
    - メールアドレス入力フィールドと送信ボタンが表示されること
    - 送信後に「パスワードリセットメールを送信しました」が表示されること
    - メール形式不正 → バリデーションエラーが表示されること
    - 「ログインに戻る」リンクがホームページ（`/`）を指していること
    - 送信中はボタンが無効化されること

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/features/auth/components/ForgotPasswordForm.tsx`
    - `useForgotPassword` フックを使用する（Context-based DI）
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**
  - **完了条件**: テストがすべてグリーンになること
  - **UI/UX 要件**:
    - 成功状態: 送信済みメッセージを表示してフォームを非表示にする

- [ ] **TASK-9-03: `/auth/forgot-password` ページ新規作成**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-9-02
  - **関連要件**: REQ-104
  - **関連設計**: §6.1
  - **実装詳細**:
    - ファイルパス: `app/client/src/app/auth/forgot-password/page.tsx`
    - `ForgotPasswordForm` コンポーネントをレンダリングする
    - `'use client'` ディレクティブを付与する
  - **完了条件**: `/auth/forgot-password` ルートにアクセスして `ForgotPasswordForm` が表示されること

- [ ] **TASK-9-04: 型チェック・テスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-9-03
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

- `/auth/forgot-password` ページが存在し、`ForgotPasswordForm` が表示されること
- `useForgotPassword` が成功・レート制限エラーを適切に処理できること
- 全テストがグリーンになること

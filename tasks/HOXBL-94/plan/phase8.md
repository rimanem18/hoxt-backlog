# Phase 8: Frontend - サインアップフロー（SignUpPage + メール確認ページ）

## 1. このフェーズの目的

`/signup` ページと `/auth/confirm` ページを追加し、サインアップ〜確認メールリンク〜確認完了の end-to-end を完成させる。  
このフェーズ完了後、ブラウザで新規メールアドレスを入力してサインアップすると「確認メールを送信しました」が表示され、確認リンクを開くと確認完了画面が表示される状態になる。

## 2. 確認可能なこと

- `/signup` ページが表示されること
- 有効なメール・パスワードを入力して「確認メールを送信しました」が表示されること（REQ-101, AC-01）
- Google 登録済みメールで登録を試みると REQ-302 案内メッセージが表示されること（AC-05）
- `/auth/confirm?code=xxx` で確認完了後にホームページへ誘導されること（REQ-102）
- UI テストがグリーンになること

## 3. 関連要件・関連設計

- **関連要件**: REQ-101, REQ-102, REQ-302, REQ-304
- **関連設計**: §3.1（サインアップフロー）, §3.4（メール確認フロー）, §5.1, §6.1

## 4. 依存関係

- **前提フェーズ**: Phase 4（`POST /api/auth/email/signup` が動作している必要がある）, Phase 5（`emailPasswordErrorHandler.ts` が必要）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-8-01: `useEmailSignup` フック新規作成（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: なし（Phase 4, 5 完了後）
  - **関連要件**: REQ-101, REQ-302, REQ-304
  - **関連設計**: §3.1, §5.1, §6.2
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/useEmailSignup.test.ts`

    テストケース:
    - 正常系: `POST /api/auth/email/signup` が 201 → `{ status: 'pending_confirmation' }` になること
    - 409 EMAIL_ALREADY_REGISTERED_GOOGLE → `{ status: 'error', errorMessage: <REQ-302 案内文> }` になること（AC-05）
    - 409 EMAIL_ALREADY_REGISTERED → `{ status: 'error', errorMessage: "このメールアドレスは既に登録されています" }` になること
    - 400 VALIDATION_ERROR → `{ status: 'error', errorMessage }` になること
    - 送信中は `isLoading` が true になること
    - `apiClient` は DI でモックを使用する
    - **注意**: サインアップ状態は Redux の `authSlice` に含めず、このフックのローカル状態で管理する（§6.2）

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/features/auth/hooks/useEmailSignup.ts`
    - `signup(email, password)` メソッドを提供し、`POST /api/auth/email/signup` を呼ぶ
    - 状態: `{ isLoading, status: 'idle' | 'loading' | 'pending_confirmation' | 'error', errorMessage }`
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**
  - **完了条件**: テストがすべてグリーンになること

- [ ] **TASK-8-02: `SignUpForm` コンポーネント新規作成（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-8-01
  - **関連要件**: REQ-101, REQ-302, REQ-304
  - **関連設計**: §6.1
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/ui-ux/SignUpForm.test.tsx`

    テストケース:
    - メール・パスワード入力フィールドとサインアップボタンが表示されること
    - 送信後に「確認メールを送信しました。受信トレイを確認してください。」が表示されること
    - 409 Google 衝突 → REQ-302 案内文（「このメールアドレスは Google アカウントで登録済みです...」）が表示されること
    - メール形式不正 → バリデーションエラーが表示されること（REQ-304）
    - 「ログインはこちら」リンクがホームページ（`/`）を指していること
    - 送信中はフォームが無効化されること

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/features/auth/components/SignUpForm.tsx`
    - `useEmailSignup` フックを使用する（Context-based DI）
    - `status === 'pending_confirmation'` 時に成功メッセージを表示してフォームを非表示にする
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**
  - **完了条件**: テストがすべてグリーンになること
  - **UI/UX 要件**:
    - ローディング状態: 送信中はボタンを無効化する
    - エラー表示: フォーム下部にエラーメッセージを表示する
    - 成功状態: 確認メール送信済みメッセージを表示しフォームを非表示にする

- [ ] **TASK-8-03: `/signup` ページ新規作成**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-8-02
  - **関連要件**: REQ-101
  - **関連設計**: §6.1
  - **実装詳細**:
    - ファイルパス: `app/client/src/app/signup/page.tsx`
    - `SignUpForm` コンポーネントをレンダリングする
    - `'use client'` ディレクティブを付与する
  - **完了条件**: `/signup` ルートにアクセスして `SignUpForm` が表示されること

- [ ] **TASK-8-04: `/auth/confirm` ページ新規作成（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: なし（Phase 5 完了後）
  - **関連要件**: REQ-102
  - **関連設計**: §3.4
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/EmailConfirmPage.test.tsx`

    テストケース:
    - URL クエリパラメータ `?code=xxx` が存在する場合、`supabase.auth.exchangeCodeForSession(code)` が呼ばれること
    - 確認成功時に「メールアドレスの確認が完了しました」テキストが表示されること（REQ-102）
    - 確認失敗時（無効なコード）に「確認リンクが無効か期限切れです」が表示されること
    - `code` パラメータがない場合にエラーメッセージが表示されること（境界値）
    - 確認成功後、一定時間後にホームページ（`/`）へリダイレクトされること

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/app/auth/confirm/page.tsx`
    - URL の `code` クエリパラメータを受け取り、`supabase.auth.exchangeCodeForSession(code)` を呼ぶ
    - 成功したら「確認完了」表示 → ホームページへリダイレクト
    - 失敗したら「確認リンクが無効か期限切れです」表示
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**
  - **完了条件**: テストがグリーンになること

- [ ] **TASK-8-05: 型チェック・テスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-8-03, TASK-8-04
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

- `/signup` ページが存在し、`SignUpForm` が表示されること
- `useEmailSignup` が 201 / 409 × 2 / 400 の各レスポンスを適切に処理できること
- `/auth/confirm` ページが作成され、`exchangeCodeForSession` が呼ばれること
- REQ-302 案内メッセージが UI に表示されること
- 全テストがグリーンになること

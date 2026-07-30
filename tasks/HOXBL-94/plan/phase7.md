# Phase 7: Frontend - ログイン画面拡張（useEmailSignin + LoginForm）

## 1. このフェーズの目的

ホームページの認証 UI にメールパスワードフォームを追加し、サインイン→JIT プロビジョニング→ダッシュボードの end-to-end を完成させる。  
このフェーズ完了後、ブラウザでメールアドレスとパスワードを入力してサインインし、ダッシュボードへ遷移できる状態になる。

## 2. 確認可能なこと

- ホームページに Google ボタンとメールパスワードフォームが同一画面に表示されること（REQ-001）
- 確認済みアカウントでサインインしてダッシュボードへ遷移できること（REQ-103）
- 誤ったパスワードで「メールアドレスまたはパスワードが間違っています」が表示されること（REQ-301）
- 未確認アカウントでサインインして「メールアドレスの確認が必要です」が表示されること（REQ-303）
- UI テストがグリーンになること

## 3. 関連要件・関連設計

- **関連要件**: REQ-001, REQ-103, REQ-201, REQ-301, REQ-303, REQ-003
- **関連設計**: §3.2（サインインフロー）, §6.1（ログイン画面）

## 開始時刻

2026-07-04 10:15 JST

## 4. 依存関係

- **前提フェーズ**: Phase 2（JIT の findByEmail 合流）, Phase 6（`emailPasswordAuthProvider`）
- **ブロッカー**: なし

## 5. タスク一覧

- [x] **TASK-7-01: `useEmailSignin` フック新規作成（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: なし（Phase 6 完了後）
  - **関連要件**: REQ-103, REQ-201, REQ-301, REQ-303
  - **関連設計**: §3.2, §6.2
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/useEmailSignin.test.ts`

    テストケース:
    - サインイン成功 → Supabase セッション取得後、`POST /api/auth/verify` を呼んで `authSlice.authSuccess` が dispatch されること
    - サインイン失敗（誤パスワード）→ `authSlice.authFailure` が dispatch され、`errorMessage` に「メールアドレスまたはパスワードが間違っています」が設定されること（REQ-301）
    - 存在しないメールアドレス → パスワード不一致と同一メッセージが表示されること（NFR-101）
    - 未確認アカウント → `authSlice.authFailure` が dispatch され、「メールアドレスの確認が必要です...」が設定されること（REQ-303）
    - 境界値: 大文字メール `User@EXAMPLE.com` でサインイン試行してもエラーメッセージが区別されないこと（NFR-101）
    - 送信中は `isLoading` が true になること
    - `emailPasswordAuthProvider` と `apiClient`（POST /api/auth/verify）は DI でモックを使用する

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/features/auth/hooks/useEmailSignin.ts`
    - `signIn(email, password)` → `emailPasswordAuthProvider.signInWithPassword` を呼び、成功したら `POST /api/auth/verify` を呼んで `authSlice.authSuccess` を dispatch する
    - 失敗したら `emailPasswordErrorHandler` でエラーメッセージに変換して `authSlice.authFailure` を dispatch する
    - 状態: `{ isLoading, errorMessage, signIn }`
    - Redux の `authSlice` は既存のものを流用する（新しい slice は追加しない）
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**
  - **完了条件**: テストがすべてグリーンになること

- [x] **TASK-7-02: ホームページにメールパスワードフォームを追加（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-7-01
  - **関連要件**: REQ-001, REQ-103, REQ-301, REQ-303
  - **関連設計**: §6.1
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/ui-ux/LoginForm.test.tsx`

    テストケース:
    - Google ボタンとメールパスワードフォームが同一画面に表示されること（REQ-001）
    - メール・パスワード未入力で送信 → バリデーションエラーが表示されること（REQ-304）
    - 送信中はフォームが無効化（loading 状態）になること
    - エラーメッセージが表示領域に表示されること
    - 「アカウントをお持ちでない方はこちら」リンクが `/signup` を指していること
    - 「パスワードを忘れた方はこちら」リンクが `/auth/forgot-password` を指していること

    **Green フェーズ（サブエージェント）**:
    - `app/client/src/features/auth/components/LoginForm.tsx` を新規作成する（または `page.tsx` をリファクタリングする）
    - メールアドレス入力フィールド（`type="email"`）、パスワード入力フィールド（`type="password"`）、サインインボタンを追加する
    - `useEmailSignin` フックを使用する（Context-based DI）
    - 既存の `LoginButton`（Google OAuth）と同一画面に配置する
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**
  - **完了条件**: テストがグリーンになること
  - **UI/UX 要件**:
    - ローディング状態: 送信中はボタンを無効化する
    - エラー表示: フォーム下部にエラーメッセージを表示する
  - **注意点**: 既存の `LoginButton`（Google）の動作は変更しないこと（RISK-01）

- [x] **TASK-7-03: 型チェック・テスト実行**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-7-02
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

- 終了: 2026-07-04 10:33 JST
- 合計: 約 18 分

## typecheck / test / lint / build 計測

| コマンド | 所要時間 |
|---|---|
| client tsc --noEmit | ~0s（エラーゼロ）|
| client bun test (292 テスト) | ~5s |
| client bun run fix (biome) | ~2s |

## 差異の記録

- テストファイルが JSX を使用するため `useEmailSignin.test.ts` → `.tsx` にリネーム（計画では `.ts` 指定だったが、`renderHook` ラッパーに JSX が必要なため変更）
- Codex レビュー指摘により `verifySession` の URL を `/api/auth/verify` → `/auth/verify` に修正（`getApiBaseUrl()` が既に `/api` を含むため二重になっていた）
- Codex レビュー指摘により `useEmailSignin.signIn` に try/catch/finally を追加し、例外時も `isLoading` が `false` に戻るよう修正
- Codex レビュー指摘により `provider.tsx` に `AuthServicesProvider` を追加
- `page.tsx` を `LoginForm` + `LoginFormServicesProvider` を使用するよう置き換え（旧 `LoginButton` + `OAuthErrorDisplay` の直接配置から移行）

## 6. このフェーズの完了条件

- ホームページに Google ボタンとメールパスワードフォームが両方表示されること（REQ-001）
- `useEmailSignin` が実装され、サインイン成功時に `authSlice.authSuccess` が dispatch されること
- サインイン失敗時の各エラーメッセージが正しく表示されること
- 全テストがグリーンになること
- 既存 OAuth フロー（`LoginButton`）の動作が変わっていないこと

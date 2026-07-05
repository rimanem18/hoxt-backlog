# Phase 9: Frontend - パスワードリセット要求フロー（ForgotPassword）

## 開始時刻

2026-07-05 10:31 JST

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

- [x] **TASK-9-00: `emailPasswordAuthProvider.resetPasswordForEmail` に redirectTo 検証を追加**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: なし（Phase 6 Codex レビュー指摘対応）
  - **実装詳細**:
    - Phase 6 の Codex レビューで `resetPasswordForEmail` の `redirectTo` が未検証との指摘があった
    - `googleAuthProvider.ts` の `validateRedirectUrl` は allowlist（`NEXT_PUBLIC_TRUSTED_DOMAINS`）による検証を行っている
    - `useForgotPassword` では `${window.location.origin}/auth/reset-password` を固定で渡すため、現状はオープンリダイレクトリスクはない
    - ただし将来的に呼び出し元が増えた場合に備え、`emailPasswordAuthProvider.ts` に URL 検証を追加するか、`googleAuthProvider.ts` の `validateRedirectUrl` を共通ユーティリティに切り出して両プロバイダーで共有するかを検討・実施する
    - **推奨**: `validateRedirectUrl` を `authProviderInterface.ts` の `BaseAuthProvider` に protected メソッドとして移動し、両プロバイダーが継承できるようにする。または `emailPasswordAuthProvider` に同等の検証を追加する
  - **完了条件**: `resetPasswordForEmail` の `redirectTo` に URL 検証が追加されていること、または allowlist 検証が不要な理由をコードコメントで明記していること

- [x] **TASK-9-01: `useForgotPassword` フック新規作成（TDD）**
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

- [x] **TASK-9-02: `ForgotPasswordForm` コンポーネント新規作成（TDD）**
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

- [x] **TASK-9-03: `/auth/forgot-password` ページ新規作成**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-9-02
  - **関連要件**: REQ-104
  - **関連設計**: §6.1
  - **実装詳細**:
    - ファイルパス: `app/client/src/app/auth/forgot-password/page.tsx`
    - `ForgotPasswordForm` コンポーネントをレンダリングする
    - `'use client'` ディレクティブを付与する
  - **完了条件**: `/auth/forgot-password` ルートにアクセスして `ForgotPasswordForm` が表示されること

- [x] **TASK-9-04: 型チェック・テスト実行**
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

## 7. 実装記録

### 終了時刻・所要時間

- 開始時刻: 2026-07-05 10:31 JST
- 終了時刻: 2026-07-05 10:45 JST
- 合計所要時間: 約 14 分

### 計測値

| チェック | 結果 |
|---------|------|
| typecheck | PASS |
| test（330件） | PASS |
| lint/fix | PASS |
| semgrep | 0 findings |

### 設計との差異・スキップ事項

1. **TASK-9-00 の実装方式**: タスク計画の「推奨」案（`validateRedirectUrl` を `BaseAuthProvider` に protected メソッドとして移動）は採用しなかった。`EmailPasswordAuthProvider` は `BaseAuthProvider` を継承しない薄いラッパー設計（Phase 6 で意図的に採用）であり、継承させるには `signIn`/`signOut`/`getUser` 等の未使用抽象メソッド実装が必要になり、既存設計との整合性を崩すため。代わりに `app/client/src/shared/utils/redirectUrlValidator.ts` へ検証ロジック（`normalizeDomain`, `getTrustedDomains`, `validateRedirectUrl`）を関数として抽出し、`GoogleAuthProvider` と `EmailPasswordAuthProvider` の両方から共有する形にした。`GoogleAuthProvider.normalizeDomain` は既存テストの import パス（`../services/providers/googleAuthProvider`）を壊さないよう re-export で後方互換を維持。
2. **既存テストの環境依存排除**: `emailPasswordAuthProvider.test.ts` の `resetPasswordForEmail` テストは当初、テスト環境のグローバル既定値（`test-setup.ts` の `NEXT_PUBLIC_TRUSTED_DOMAINS ??= 'localhost:3000,localhost:3001'`）に暗黙依存する形で redirectTo を `localhost:3000` に変更していたが、これは実行コンテナの `.env` の `CLIENT_PORT`/`SERVER_PORT` が変わると壊れる環境依存テストになってしまうと気づき、`beforeEach`/`afterEach` で `NEXT_PUBLIC_TRUSTED_DOMAINS` をこのテストファイル内に限定して `'example.com'` に固定・復元するよう修正した（CLAUDE.md「環境依存を排除」ガイドライン準拠）。信頼ドメイン外 URL 拒否の新規テストケースも追加。
3. **DI 対象の選択**: タスク計画では「`emailPasswordAuthProvider.resetPasswordForEmail` を DI でモック」と記載があったが、既存の `useEmailSignin`/`useEmailSignup` が `AuthServicesContext`（`authService` 経由）で DI している既存パターンとの整合性を優先し、`authService.requestPasswordReset(email, redirectTo)` を新設して `useForgotPassword` から DI する形にした（Phase 8 の差異記録と同様の判断）。
4. **Codex レビュー指摘への対応（resolve-feedback）**:
   - 妥当性 5/5: `redirectUrlValidator.ts` の境界値テスト不足 → `app/client/src/shared/utils/__tests__/redirectUrlValidator.test.ts` を新規作成し対応済み（11ケース追加）。
   - 妥当性 3/5: `/auth/reset-password` ページ未実装によるリンク先404 → Phase 10 のスコープのため対応不要と判断（ユーザー承認済み）。
   - 妥当性 2/5: OAuth 開始経路（`authService.signInWithOAuth`）が共通化した `validateRedirectUrl` を通らない → 本フェーズ以前からの既存設計であり対応不要と判断（ユーザー承認済み）。
   - 妥当性 3/5: URL検証エラーが `emailPasswordErrorHandler` により汎用メッセージに丸められる → 対応コストに見合わないため対応不要と判断（ユーザー承認済み）。

# Phase 4: Backend - Email Signup Route 実装（Routes + 統合テスト）

## 1. このフェーズの目的

`POST /api/auth/email/signup` エンドポイントを動作させ、curl や HTTP クライアントで全レスポンスパターンを確認できる状態にする。

## 2. 確認可能なこと

- `POST /api/auth/email/signup` に有効なメール・パスワードを送ると `201 { pendingEmailConfirmation: true }` が返ること
- 既存 Google ユーザーと同一メールでリクエストすると `409 EMAIL_ALREADY_REGISTERED_GOOGLE`（REQ-302 案内文付き）が返ること
- 既存 email ユーザーと同一メールでリクエストすると `409 EMAIL_ALREADY_REGISTERED` が返ること
- 形式不正なメールアドレスでリクエストすると `400 VALIDATION_ERROR` が返ること
- 統合テストがグリーンになること

## 3. 関連要件・関連設計

- **関連要件**: REQ-101, REQ-302, REQ-304
- **関連設計**: §5.1（API 設計）, §2.2（責務分割）

## 4. 依存関係

- **前提フェーズ**: Phase 3（`EmailSignupUseCase` が実装済みである必要がある）
- **ブロッカー**: なし

## 開始時刻

2026-07-02 23:04 JST

## 5. タスク一覧

- [x] **TASK-4-01: `emailSignupRoutes.schema.ts` 新規作成**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-304
  - **関連設計**: §5.1
  - **実装詳細**:
    - ファイルパス: `app/server/src/user/presentation/emailSignupRoutes.schema.ts`
    - `POST /api/auth/email/signup` のリクエスト・レスポンス Zod スキーマを定義する（OpenAPI 対応形式）
    - リクエスト: `{ email: emailSchema, password: z.string() + regex }` （shared-schemas の `emailSchema` を利用）
    - パスワードバリデーション: 大文字・小文字・記号含む 8 文字以上（Supabase Auth ポリシーと合わせる）
    - レスポンス: `201 { pendingEmailConfirmation: true }`, `400`, `409`, `500`
  - **完了条件**: スキーマファイルが作成され、型チェックがエラーゼロになること

- [x] **TASK-4-02: `emailSignupRoutes.ts` 新規作成 + エントリーポイント登録**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-4-01
  - **関連要件**: REQ-101, REQ-302, REQ-304
  - **関連設計**: §5.1, §2.2
  - **実装詳細**:
    - ファイルパス: `app/server/src/user/presentation/emailSignupRoutes.ts`
    - `POST /auth/email/signup` ルートを定義し、`EmailSignupUseCase` を呼ぶ
    - エラーマッピング:
      - `EmailAlreadyRegisteredGoogleError` → 409 `{ code: "EMAIL_ALREADY_REGISTERED_GOOGLE", message: <REQ-302 案内文> }`
      - `EmailAlreadyRegisteredError` → 409 `{ code: "EMAIL_ALREADY_REGISTERED" }`
      - Zod バリデーションエラー → 400 `{ code: "VALIDATION_ERROR", details }`
      - `SignupFailedError` → 500 `{ code: "SIGNUP_FAILED" }`
    - `app/server/src/entrypoints/index.ts` に `app.route('/api', emailSignup)` を追加する
    - `AuthDIContainer` に `getEmailSignupUseCase()` を追加し、`SupabaseAdminClient` を DI する
    - REQ-302 案内文: 「このメールアドレスは Google アカウントで登録済みです。Google ログインのままご利用いただけます。パスワードでのログインを追加したい場合は、Google でログインのうえ設定画面から設定できます」
  - **完了条件**: サーバーが起動し、エンドポイントが応答すること

- [x] **TASK-4-03: 統合テスト**
  - **タイプ**: TDD
  - **依存タスク**: TASK-4-02
  - **関連要件**: REQ-101, REQ-302, REQ-304
  - **関連設計**: §5.1
  - **実装詳細**:
    テストファイル: `app/server/src/user/presentation/__tests__/emailSignupRoutes.integration.test.ts`

    テストケース:
    - 201: 有効なメール・パスワード、既存ユーザーなし
    - 409 EMAIL_ALREADY_REGISTERED_GOOGLE: Google プロバイダーの既存ユーザーと同一メール（case-insensitive）
    - 409 EMAIL_ALREADY_REGISTERED: email プロバイダーの既存ユーザーと同一メール
    - 400 VALIDATION_ERROR: メール形式不正
    - 400 VALIDATION_ERROR: パスワードポリシー違反（8文字未満 / 大文字なし / 記号なし 等）
    - 境界値: `User@EXAMPLE.com` と `user@example.com` が同一ユーザー扱いになること（AC-05）
    - `SupabaseAdminClient` はモックで注入する（実際の Supabase には接続しない）
  - **完了条件**: 統合テストがすべてグリーンになること

- [x] **TASK-4-04: 型チェック・Lint・セキュリティチェック**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-4-03
  - **関連要件**: RISK-03
  - **関連設計**: なし
  - **実装詳細**:
    ```bash
    docker compose exec server bunx tsc --noEmit
    docker compose exec server bun run fix
    docker compose exec server bun test
    docker compose run --rm semgrep semgrep app/server/src/user/infrastructure/SupabaseAdminClient.ts
    ```
    semgrep でシークレット系文字列がハードコードされていないことを確認する。
  - **完了条件**: 型エラー・テスト失敗・semgrep 警告がないこと

- [x] **TASK-4-05: `ISupabaseAdminClient` リネーム**
  - **タイプ**: DIRECT（任意）
  - **依存タスク**: TASK-4-02（`AuthDIContainer` への組み込み完了後）
  - **関連要件**: なし
  - **関連設計**: §2.2
  - **実装詳細**:
    - `app/server/src/user/application/ISupabaseAdminClient.ts` を `IEmailSignupGateway.ts` へリネーム
    - `SupabaseAdminClient.ts` の `implements` 宣言も更新
    - `EmailSignupUseCase.ts` の import も更新
    - DDD 観点では Application 層の port 名はユースケース語彙に寄せる（vendor 名を含まない）のが望ましい
  - **実施判断**: Phase 4 完了後に呼び出し元が確定した段階で、必要を感じた場合のみ実施。変更ファイルは 3 件のみ

## 終了時刻・所要時間

- 終了: 2026-07-02 23:21 JST
- 合計: 約 17 分

## typecheck / test / lint / build 計測

| コマンド | 所要時間 |
|---|---|
| server tsc --noEmit | ~5s |
| server bun test (688テスト) | ~20s |
| server bun run fix (biome) | ~3s |
| semgrep (4ファイル) | ~30s |

## 差異の記録

- `IEmailSignupUseCase.ts` インターフェースを追加（計画外。`as unknown as` キャスト禁止ルール対応、かつ DDD 観点でプレゼンテーション層が具象クラスに依存しないようにするため追加）
- `createEmailSignupRouter(getUseCase)` ファクトリ関数パターンを採用（計画では DIContainer 直呼びだったが、テスト可能な DI を実現するために変更）
- `SignupFailedError` catch 時に `causeMessage` のログ出力を追加（レビュー指摘で追加）
- `AuthDIContainer.ts` コメントをボーイスカウト整理（絵文字・【XX】スタイルを除去）

## 6. このフェーズの完了条件

- `POST /api/auth/email/signup` が動作し、全レスポンスパターン（201 / 409 × 2 / 400 / 500）が適切に返ること
- 統合テスト（case-insensitive メール衝突チェック含む）がグリーンになること
- `docker compose exec server bunx tsc --noEmit` がエラーゼロになること
- semgrep でシークレットのハードコードが検出されないこと

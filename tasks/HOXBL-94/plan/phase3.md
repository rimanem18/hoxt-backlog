# Phase 3: Backend - EmailSignupUseCase 実装（SupabaseAdminClient + UseCase TDD）

## 開始時刻

2026-07-02 22:30 JST

## 1. このフェーズの目的

`SupabaseAdminClient.ts` と `EmailSignupUseCase.ts` を実装し、メールアドレス衝突チェック・Supabase サインアップ発火のコアロジックを動作させる。  
このフェーズ完了後、`EmailSignupUseCase` のユニットテストが全パターングリーンになる。

## 2. 確認可能なこと

- `EmailSignupUseCase` のユニットテストが全テストケースグリーンになること
- 正常系（衝突なし）・Google 衝突・email 衝突・バリデーション・Supabase エラーの各分岐が検証されていること
- `docker compose exec server bun test` がエラーゼロになること

## 3. 関連要件・関連設計

- **関連要件**: REQ-101（サインアップ + 確認メール）, REQ-302（Google 衝突案内）, REQ-304（バリデーション）
- **関連設計**: §3.1, §5.1, §2.2（責務分割）

## 4. 依存関係

- **前提フェーズ**: Phase 1（`email` プロバイダーが有効になっている必要がある）
- **ブロッカー**: **DCQ-01（実装着手前必須）**: service_role クライアント経由の `auth.signUp` で確認メールが発火するか実機検証。発火しない場合は代替 API（`admin.generateLink` + `admin.sendEmailOtp` 等）を採用するため、`SupabaseAdminClient` の実装方針が変わる。

## 5. タスク一覧

- [x] **TASK-3-01: `SupabaseAdminClient.ts` 新規作成**
  - **タイプ**: DIRECT
  - **依存タスク**: なし
  - **関連要件**: REQ-101
  - **関連設計**: §2.2, §3.1, RISK-03
  - **実装詳細**:
    - ファイルパス: `app/server/src/user/infrastructure/SupabaseAdminClient.ts`
    - service_role キーを使う Supabase Admin SDK ラッパーを作成する
    - service_role キーは環境変数（例: `SUPABASE_SERVICE_ROLE_KEY`）からのみ取得する
    - クライアントインスタンスはシングルトンで管理する
    - 提供するメソッド: `signUp(email: string, password: string): Promise<{ userId: string | null; error: Error | null }>`
    - DCQ-01 の確認結果に応じて `supabase.auth.signUp` または代替 API を実装する
    - **セキュリティ**: service_role キーをログに出力しないこと。このクライアントを使うのは `EmailSignupUseCase` のみとする
  - **完了条件**: `SupabaseAdminClient` が作成され、型チェックがエラーゼロになること
  - **注意点**: DCQ-01 の実機検証結果によって実装内容が変わる。`auth.signUp` が確認メールを発火しない場合は Supabase Admin の代替 API を調査して実装する

- [x] **TASK-3-02: `EmailSignupUseCase.ts` 実装（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: TASK-3-01
  - **関連要件**: REQ-101, REQ-002, REQ-302, REQ-304
  - **関連設計**: §3.1, §5.1
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストディレクトリ: `app/server/src/user/application/__tests__/email-signup/`

    テストケース:
    - 正常系: 既存ユーザーなし → `SupabaseAdminClient.signUp` が呼ばれ、`{ pendingEmailConfirmation: true }` を返すこと
    - 異常系: 既存 Google ユーザー（同一メール） → `EmailAlreadyRegisteredGoogleError` を throw すること（REQ-302）
    - 異常系: 既存 email ユーザー（同一メール） → `EmailAlreadyRegisteredError` を throw すること（REQ-002）
    - 異常系: Supabase signUp が失敗した場合 → `SignupFailedError` を throw すること
    - 境界値: `User@EXAMPLE.com` が正規化（`trim().toLowerCase()`）されて `findByEmail` に渡されること（AC-05 の同一性保証）
    - 境界値: 前後空白ありのメールアドレス → 正規化後に重複チェックが行われること

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/server/src/user/application/EmailSignupUseCase.ts`
    - 処理フロー:
      1. email を `trim().toLowerCase()` で正規化
      2. `UserRepository.findByEmail(normalizedEmail)` で衝突チェック
      3. 既存ユーザーの `provider` が `'google'` → `EmailAlreadyRegisteredGoogleError`
      4. 既存ユーザーの `provider` が `'email'` → `EmailAlreadyRegisteredError`
      5. 既存ユーザーなし → `SupabaseAdminClient.signUp(email, password)` を呼ぶ
      6. Supabase エラー → `SignupFailedError`
      7. 成功 → `{ pendingEmailConfirmation: true }` を返す
    - `SupabaseAdminClient` と `IUserRepository` はコンストラクタ DI で注入する
    - **制約**: テストコードは変更しない
    - 2 度以上テストが通らない場合はユーザーに報告すること

    **Refactor フェーズ（メインエージェント）**:
    - エラークラスが適切なディレクトリ（`user/domain/errors/` または `user/application/errors/`）に配置されていること
    - テスト重複がないこと
    - `docker compose exec server bun run fix` でフォーマット整形する
  - **完了条件**: テストがすべてグリーンになること
  - **単体テスト要件**: 上記テストケースがカバーされていること
  - **注意点**: `SupabaseAdminClient` はコンストラクタから DI で注入し、テストではモックを使う

- [x] **TASK-3-03: 型チェック**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-3-02
  - **関連要件**: なし
  - **関連設計**: なし
  - **実装詳細**:
    ```bash
    docker compose exec server bunx tsc --noEmit
    docker compose exec server bun run fix
    docker compose exec server bun test
    ```
  - **完了条件**: 型エラー・テスト失敗がないこと

## 6. このフェーズの完了条件

- `SupabaseAdminClient.ts` が新規作成されていること
- `EmailSignupUseCase.ts` が新規作成され、正常系・異常系・境界値のテストがグリーンになること
- `docker compose exec server bunx tsc --noEmit` がエラーゼロになること

## 終了時刻・所要時間

- 終了: 2026-07-02 22:43 JST
- 合計: 約 13 分

## typecheck / test / lint / build 計測

| コマンド | 所要時間 |
|---|---|
| server tsc --noEmit | ~5s |
| server bun test (678テスト) | ~20s |
| server bun run fix | ~3s |

## 差異の記録

- `ISupabaseAdminClient` インターフェースを追加（計画に明記なかったが DI テスト容易化のため追加）
- `SignupFailedError` の `causeMessage` プロパティ追加（外部エラーメッセージ漏洩防止のためレビュー指摘を受けて変更）
- `SupabaseAdminClient.signUp` に `try/catch` を追加（fetch 例外を契約通り `{ userId: null, error }` に正規化。レビュー指摘）
- 重複時の `adminClient.signUp` 未呼び出し確認テストを追加（レビュー指摘）
- 正規化済み email が `signUp` に渡ることの確認テストを追加（レビュー指摘）
- `@supabase/supabase-js` SDK 不使用: server package.json に未インストールのため、Supabase Auth REST API を fetch で直接呼び出す方式を採用

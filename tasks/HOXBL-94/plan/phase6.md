# Phase 6: Frontend - メールパスワード認証プロバイダー実装

## 1. このフェーズの目的

Supabase Auth SDK の `signInWithPassword` / `resetPasswordForEmail` を呼び出す `emailPasswordAuthProvider.ts` を実装し、`authService.ts` にメールパスワードサインイン経路を追加する。  
このフェーズ完了後、サービス層のユニットテストで email+password サインインの全パターンが検証できる状態になる。

## 2. 確認可能なこと

- `emailPasswordAuthProvider` のユニットテストがグリーンになること
- `authService.signInWithEmailPassword` が呼び出し可能な状態になること
- 既存の OAuth フローテストが引き続きグリーンであること

## 3. 関連要件・関連設計

- **関連要件**: REQ-103, REQ-201, REQ-301, REQ-303
- **関連設計**: §6.2（状態管理）, §6.3（エラーマッピング）, §6.4（既存 OAuth フローへの影響）

## 4. 依存関係

- **前提フェーズ**: Phase 5（`emailPasswordErrorHandler.ts` が必要）
- **ブロッカー**: なし

## 5. タスク一覧

- [ ] **TASK-6-01: `emailPasswordAuthProvider.ts` 新規作成（TDD）**
  - **タイプ**: TDD
  - **依存タスク**: なし（Phase 5 完了後）
  - **関連要件**: REQ-103, REQ-201, REQ-301, REQ-303
  - **関連設計**: §2.2, §6.2
  - **実装詳細**:
    **Red フェーズ（メインエージェント）**:
    テストファイル: `app/client/src/features/auth/__tests__/emailPasswordAuthProvider.test.ts`

    テストケース:
    - `signInWithPassword` 成功 → `{ success: true, session }` を返すこと
    - `signInWithPassword` が `invalid_grant` エラー → `{ success: false, errorMessage: "メールアドレスまたはパスワードが間違っています" }` を返すこと（REQ-301）
    - `signInWithPassword` が `email_not_confirmed` エラー → `{ success: false, errorMessage: "メールアドレスの確認が必要です..." }` を返すこと（REQ-303）
    - `signInWithPassword` が "Invalid login credentials" メッセージのエラー → REQ-301 と同一メッセージになること（NFR-101 確認）
    - `resetPasswordForEmail` 成功 → エラーなしで解決すること（REQ-104）
    - `resetPasswordForEmail` がレート制限エラー → エラーメッセージを返すこと
    - Supabase クライアントはコンストラクタ DI でモックを使用する

    **Green フェーズ（サブエージェント）**:
    - ファイルパス: `app/client/src/features/auth/services/providers/emailPasswordAuthProvider.ts`
    - 既存の `googleAuthProvider.ts` / `mockAuthProvider.ts` のパターンに倣う
    - Supabase クライアントはコンストラクタから注入する
    - `signInWithPassword(email, password)`: Supabase `auth.signInWithPassword` を呼ぶ
    - `resetPasswordForEmail(email, redirectTo)`: Supabase `auth.resetPasswordForEmail` を呼ぶ
    - エラー変換には Phase 5 で作成した `emailPasswordErrorHandler` を使用する
    - **テストコードは変更しない**

    **Refactor フェーズ（メインエージェント）**:
    - テストの重複確認・整理
    - `emailPasswordErrorHandler` との責務境界を確認する
  - **完了条件**: テストがすべてグリーンになること

- [ ] **TASK-6-02: `authService.ts` 拡張**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-6-01
  - **関連要件**: REQ-103
  - **関連設計**: §6.4
  - **実装詳細**:
    - `app/client/src/features/auth/services/authService.ts` に `signInWithEmailPassword(email, password)` メソッドを追加する
    - 内部で `EmailPasswordAuthProvider.signInWithPassword` を呼ぶ
    - `AuthServiceInterface` に `signInWithEmailPassword` を追加する（テスト用 DI）
    - 既存の `signInWithOAuth` メソッドのシグネチャ・挙動は一切変更しない（RISK-01）
    - `services/__tests__/mockAuthService.ts` に `signInWithEmailPassword` のモック実装を追加する
  - **完了条件**: `authService.signInWithEmailPassword` が呼び出し可能な状態になること。型チェックがエラーゼロになること

- [ ] **TASK-6-03: 既存テスト影響確認**
  - **タイプ**: DIRECT
  - **依存タスク**: TASK-6-02
  - **関連要件**: REQ-003
  - **関連設計**: §6.4
  - **実装詳細**:
    ```bash
    docker compose exec client bunx tsc --noEmit
    docker compose exec client bun run fix
    docker compose exec client bun test
    ```
    - 既存の `authProviderInterface.test.ts`、`contracts/authProviderInterface.contract.test.ts` がグリーンであること
    - `sessionListener.test.ts`、`sessionRestore.test.ts` がグリーンであること
  - **完了条件**: 全テストがグリーンになること

## 6. このフェーズの完了条件

- `emailPasswordAuthProvider.ts` が新設され、ユニットテストがグリーンになること
- `authService.signInWithEmailPassword` が追加されていること
- 既存 OAuth フロー関連のテストがすべてグリーンのまま維持されること
- `docker compose exec client bunx tsc --noEmit` がエラーゼロになること

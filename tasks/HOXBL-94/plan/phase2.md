# Phase 2: Backend - AuthenticationDomainService findByEmail 合流ロジック（TDD）

## 1. このフェーズの目的

`AuthenticationDomainService.authenticateUser` に `findByEmail` 合流ロジックを追加し、`provider='email'` の JWT で JIT プロビジョニングが走ったときに同一メールの既存 Google ユーザーと同一ユーザーとして合流できるようにする（REQ-002）。

## 2. 確認可能なこと

- `AuthenticationDomainService` の新規テストケースがグリーンになること
- 既存の全テストケースがグリーンのまま維持されること
- `findByEmail` 合流ロジックが組み込まれていることを示すテストが存在すること

## 3. 関連要件・関連設計

- **関連要件**: REQ-002（1 メール = 1 ユーザー）
- **関連設計**: §7.2（ユーザー解決と JIT 合流ロジック）, §13 R4

## 4. 依存関係

- **前提フェーズ**: Phase 1（`email` を有効プロバイダーとして登録する必要がある）
- **ブロッカー**: DCQ-02（Supabase の自動 identity linking が OFF であることを確認）

## 5. タスク一覧

- [ ] **TASK-2-01: テストケース追加（Red フェーズ）**
  - **タイプ**: TDD（Red）
  - **依存タスク**: なし（Phase 1 完了後）
  - **関連要件**: REQ-002
  - **関連設計**: §7.2, §13 R4
  - **実装詳細**:
    `app/server/src/user/domain/__tests__/AuthenticationDomainService.test.ts` の `authenticateUser` describe ブロックに以下のテストケースを追加する:
    - 「`findByExternalId` で見つからないが `findByEmail` で同一メールの既存ユーザーが見つかる場合、既存ユーザーを返し `isNewUser=false` になること」
    - 「`findByEmail` でも見つからない場合は JIT 作成されること」（既存テストでカバー済みのため重複しないよう確認）
    - `provider` は `'email'` を使用する（Phase 1 で追加した `AuthProviders.EMAIL`）
    - テストファイルの命名規則（日本語テストケース名）に従うこと
  - **完了条件**: 新規テストケースが `FAIL` になること（Red 状態）
  - **単体テスト要件**:
    - Given: `findByExternalId` がnull を返す、`findByEmail` が既存 Google ユーザーを返す
    - When: `authenticateUser({ id, provider: 'email', email, ... })` を呼ぶ
    - Then: 既存 Google ユーザーが返され、`isNewUser === false` になること
    - `userRepository.create` が呼ばれないこと

- [ ] **TASK-2-02: findByEmail 合流ロジック実装（Green フェーズ・サブエージェント）**
  - **タイプ**: TDD（Green）
  - **依存タスク**: TASK-2-01
  - **関連要件**: REQ-002
  - **関連設計**: §7.2
  - **実装詳細**:
    **サブエージェントに依頼する内容**:
    - 対象ファイル: `app/server/src/user/domain/services/AuthenticationDomainService.ts`
    - 目的: TASK-2-01 で追加した失敗テストを通すための最小実装
    - 追加するロジック（`authenticateUser` メソッドの JIT 部分）:
      ```
      1. findByExternalId(externalId, provider) → 見つかった → 既存ユーザーを返す（既存挙動）
      2. 見つからない → findByEmail(normalizedEmail)
         2a. 同一メールの既存ユーザーあり → 既存ユーザーを返す（isNewUser=false）← 新規追加
         2b. なし → create（isNewUser=true）（既存挙動）
      3. lastLoginAt 更新（既存挙動）
      ```
    - **制約**: テストコードは一切変更しない
    - **制約**: 既存の全テストが引き続きグリーンであること
    - 2 度以上テストが通らない、またはテストケースに誤りがあると感じた場合は、その旨をユーザーに報告して指示を仰ぐこと
  - **完了条件**: 全テストがグリーンになること

- [ ] **TASK-2-03: リファクタリング（Refactor フェーズ）**
  - **タイプ**: TDD（Refactor）
  - **依存タスク**: TASK-2-02
  - **関連要件**: なし
  - **関連設計**: なし
  - **実装詳細**:
    - `authenticateUser` メソッドの実装コードを確認し、重複・複雑さを取り除く
    - テストコードの重複を確認し、「`findByEmail` でも見つからない場合は JIT 作成」を確認するテストが既存テストと重複していないかチェック。重複があれば削除する
    - テストケース名と検証内容が一致しているか確認する
    - `docker compose exec server bun run fix` でフォーマット整形する
  - **完了条件**: リファクタリング後も全テストがグリーン。コードの重複がないこと

## 6. このフェーズの完了条件

- `AuthenticationDomainService.authenticateUser` が `findByEmail` 合流ロジックを含んでいること
- 追加テストケースを含む全テストがグリーンになること
- `docker compose exec server bunx tsc --noEmit` がエラーゼロになること

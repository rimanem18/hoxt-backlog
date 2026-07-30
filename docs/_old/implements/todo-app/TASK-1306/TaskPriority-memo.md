1. まずは以下を把握してください。

feature_name: todo-app

- `@docs/spec/{feature_name}-requirements.md`
- `@docs/design/{feature_name}/*`
- `@docs/implements/{feature_name}/{this_dir_id}/*-requirements.md`
- `@docs/implements/{feature_name}/{this_dir_id}/*-testcases.md`

2. テスト要件を参考にテストケースを実装してください。テストケースの実装状況をチェックボックスリストにして記録してください。
3. 記載漏れがあれば、テストケースのチェックボックスを追加してください。
4. refactor まで実装とレビューが済んだら、チェックボックスを埋めてユーザーに報告してください。
5. 信頼度や信号や【】などは記載せず、 シンプルかつオンボーディングしたばかりのエンジニアにもわかりやすく明記したコメントのみを記載してください。

---- ここから下にチェックボックスリストを作成 ----

## 実装進捗チェックリスト

### Phase 1: Red（テストケース実装）
- [x] テストファイル作成（`app/server/src/domain/task/__tests__/TaskPriority.test.ts`）
- [x] 正常系テスト実装（3ケース: high/medium/low）
- [x] 異常系テスト実装（4ケース: invalid/空文字/null/undefined）
- [x] getValue メソッドテスト実装（1ケース）
- [x] equals メソッドテスト実装（1ケース）
- [x] テスト実行で失敗を確認（Red）

### Phase 2: Green（値オブジェクト実装）
- [x] valueobjectsディレクトリ作成
- [x] TaskPriority.ts 実装
  - [x] TaskPriorityValue 型定義
  - [x] VALUES 定数配列（high, medium, low）
  - [x] private constructor 実装
  - [x] create() 静的ファクトリメソッド実装
  - [x] getValue() メソッド実装
  - [x] equals() メソッド実装
  - [x] isValid() 型ガード関数実装
- [x] テスト実行で成功を確認（Green）- 9/9ケース通過

### Phase 3: Refactor（リファクタリング）
- [x] コード品質確認（シンプルで明確なため追加リファクタ不要）

### Phase 4: 品質チェック
- [x] 型チェック合格（`bunx tsc --noEmit`）
- [x] Biomeチェック合格（`bun run fix`）
  - [x] 自動修正適用（this → TaskPriority）
- [x] Semgrepチェック合格（0 findings）
- [x] テスト再実行で成功確認（9/9ケース通過）

### Phase 5: Codexレビュー
- [x] 実装コードのCodexレビュー依頼
- [x] レビュー結果: 本番投入可能な品質レベル
- [x] 改善提案の適用（Single Source of Truth パターン）
  - [x] TASK_PRIORITY_VALUES 定数をクラス外に定義
  - [x] TaskPriorityValue 型を定数から自動生成
  - [x] 型と実装の自動同期を実現
- [x] 最終テスト実行（9/9ケース通過 + 型チェック合格）

### Phase 6: ユーザー確認
- [x] テストコメントをGiven-When-Thenパターンに修正
- [x] 最終テスト実行（9/9ケース通過）
- [x] 実装完了

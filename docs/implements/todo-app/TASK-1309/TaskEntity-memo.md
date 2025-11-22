1. まずは以下を把握してください。

feature_name: todo-app

- `@docs/spec/{feature_name}-requirements.md`
- `@docs/design/{feature_name}/*`
- `@docs/implements/{feature_name}/{this_dir_id}/*-requirements.md`

2. テスト要件を参考にテストケースを実装してください。テストケースの実装状況をチェックボックスリストにして記録してください。
3. 記載漏れがあれば、テストケースのチェックボックスを追加してください。
4. refactor まで実装とレビューが済んだら、チェックボックスを埋めてユーザーに報告してください。
5. 信頼度や信号や【】などは記載せず、 シンプルかつオンボーディングしたばかりのエンジニアにもわかりやすく明記したコメントのみを記載してください。

==== メモを記載する場合は以下に記録 ====

# TASK-1309: TaskEntity 実装メモ

## 実装状況

### テストケース一覧

#### create（新規作成）
- [x] 最小限のデータ（userId, title）で新規タスクが作成される
- [x] すべてのデータ（userId, title, description, priority）で新規タスクが作成される
- [x] デフォルト値が設定される（priority: medium, status: not_started, description: null）
- [x] IDとタイムスタンプが自動生成される
- [x] 空タイトルでエラーがスローされる
- [x] 101文字以上のタイトルでエラーがスローされる
- [x] 不正な優先度でエラーがスローされる

#### reconstruct（DB復元）
- [x] 復元したタスクのすべてのデータが保持される

#### getters（ゲッター）
- [x] 各ゲッターが正しい値を返す
- [x] descriptionがnullの場合、nullが返される

#### business logic（ビジネスロジック）
- [x] updateTitle()でタイトルが更新され、updatedAtも更新される
- [x] updateDescription()で説明が更新され、updatedAtも更新される
- [x] updateDescription()でnullを設定できる
- [x] changePriority()で優先度が変更され、updatedAtも更新される
- [x] changeStatus()でステータスが変更され、updatedAtも更新される
- [x] equals()で同一IDの場合trueを返す
- [x] equals()で異なるIDの場合falseを返す

### 品質チェック結果

| チェック項目 | 結果 |
|-------------|------|
| テスト | 17/17 通過 |
| 型チェック（tsc --noEmit） | OK |
| lint/format（biome） | OK |
| セキュリティ（semgrep） | 0 findings |

### Codexレビュー結果

レビュー実施済み。以下の指摘を確認：

1. **userId validation**: Domain層でのバリデーションは過剰（JWT認証で取得されるため）
2. **description XSS**: Presentation層の責務（Domain層は対象外）
3. **reconstruct trust**: 設計意図通り（リポジトリ層で変換後に呼び出す前提）
4. **Timestamp handling**: 現時点ではシンプルな実装で十分

機能・品質・セキュリティ上の問題なし。

## 実装ファイル

- テスト: `app/server/src/domain/task/__tests__/TaskEntity.test.ts`
- 実装: `app/server/src/domain/task/TaskEntity.ts`

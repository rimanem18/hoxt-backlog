1. まずは以下を把握してください。

feature_name: todo-app

- `@docs/spec/{feature_name}-requirements.md`
- `@docs/design/{feature_name}/*`
- `@docs/implements/{feature_name}/{this_dir_id}/*-requirements.md`

2. テスト要件を参考にテストケースを実装してください。テストケースの実装状況をチェックボックスリストにして記録してください。
3. 記載漏れがあれば、テストケースのチェックボックスを追加してください。
4. refactor まで実装とレビューが済んだら、チェックボックスを埋めてユーザーに報告してください。
5. 信頼度や信号や【】などは記載せず、 シンプルかつオンボーディングしたばかりのエンジニアにもわかりやすく明記したコメントのみを記載してください。
6. すべての実装が完了したら、 `@docs/tasks/{feature_name}-phase*.md` を探して適切なフェーズの、完了した範囲のチェックボックスを埋めてください。

==== メモを記載する場合は以下に記録 ====

## テストケース実装状況

### 正常系
- [x] タイトルのみ指定でタスクが作成される（デフォルト値が適用される）
- [x] 全フィールド指定でタスクが作成される
- [x] ITaskRepository.save()が呼び出される

### 異常系
- [x] 空文字タイトルでエラーが発生する
- [x] 100文字超のタイトルでエラーが発生する
- [x] 不正な優先度でエラーが発生する
- [x] リポジトリエラーが正しく伝播する

## 品質チェック結果

- [x] テスト実行: 7件すべてパス
- [x] 型チェック (tsc --noEmit): エラーなし
- [x] Lint (biome): エラーなし
- [x] セキュリティ (semgrep): 0件

## 実装メモ

- `exactOptionalPropertyTypes` 対応のため、undefinedのプロパティは条件付きスプレッドで渡す
- TaskEntity.create() でバリデーション、ITaskRepository.save() で永続化
- デフォルト値（priority: 'medium', status: 'not_started'）はTaskEntity側で適用

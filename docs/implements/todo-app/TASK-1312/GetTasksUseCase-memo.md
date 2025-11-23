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

- [x] フィルタなしで全タスク取得（リポジトリが正しく呼び出される）
- [x] 優先度フィルタが正しく渡される
- [x] ステータスフィルタ（複数選択）が正しく渡される
- [x] ソート順が正しく渡される
- [x] 該当タスクなし（空配列を返す）
- [x] リポジトリの戻り値がそのまま返される（結果透過性）
- [x] リポジトリエラーが正しく伝播する

## 実装ファイル

- `app/server/src/application/usecases/GetTasksUseCase.ts`
- `app/server/src/application/usecases/__tests__/GetTasksUseCase.test.ts`

## 検証結果

- テスト: 7/7 pass
- 型チェック: OK
- Biome lint: OK
- Semgrep: 0 findings
- Codexレビュー: 問題なし

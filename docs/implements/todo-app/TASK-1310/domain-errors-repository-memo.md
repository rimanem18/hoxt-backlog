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

## テストケース実装状況

### TaskDomainError

- [x] TaskDomainErrorを継承したエラーはinstanceofチェックが正しく動作する

### TaskNotFoundError

- [x] nameプロパティが"TaskNotFoundError"である
- [x] codeプロパティが"TASK_NOT_FOUND"である
- [x] コンストラクタで正しいメッセージが設定される
- [x] forTaskIdファクトリメソッドが正しく動作する

### InvalidTaskDataError

- [x] nameプロパティが"InvalidTaskDataError"である
- [x] codeプロパティが"INVALID_TASK_DATA"である
- [x] コンストラクタで任意のメッセージを設定できる
- [x] TaskDomainErrorのinstanceofチェックが正しい

### TaskAccessDeniedError

- [x] nameプロパティが"TaskAccessDeniedError"である
- [x] codeプロパティが"TASK_ACCESS_DENIED"である
- [x] コンストラクタで正しいメッセージが設定される
- [x] forTaskIdファクトリメソッドが正しく動作する
- [x] TaskDomainErrorのinstanceofチェックが正しい

### ITaskRepository

- [x] インターフェース定義（TypeScript型チェックで検証）

## 実装ファイル

| ファイル | 説明 |
|----------|------|
| `errors/TaskDomainError.ts` | 基底エラークラス |
| `errors/TaskNotFoundError.ts` | タスク不存在エラー（code: TASK_NOT_FOUND） |
| `errors/InvalidTaskDataError.ts` | 不正データエラー（code: INVALID_TASK_DATA） |
| `errors/TaskAccessDeniedError.ts` | アクセス拒否エラー（code: TASK_ACCESS_DENIED） |
| `errors/index.ts` | バレルエクスポート |
| `ITaskRepository.ts` | リポジトリインターフェース |

## 検証結果

- [x] テスト: 14件全てパス
- [x] 型チェック: エラーなし
- [x] Lint/Format: 完了
- [x] Semgrep: 0 findings

## 設計判断

- ITaskRepositoryは `domain/task/` に配置（DDDの原則：集約と共に配置）
- 将来的にIUserRepositoryも `domain/user/` へ移動を検討

# TDD要件定義書: TASK-1310 ドメインエラーとリポジトリインターフェース

## 📄 ドキュメント情報

- **作成日**: 2025-11-22
- **タスクID**: TASK-1310
- **要件名**: todo-app
- **機能名**: ドメインエラーとリポジトリインターフェース

## 1. 機能の概要

### 1.1 何をする機能か

🔵 **青信号** - 要件定義書 EDGE-003, EDGE-004, interfaces.ts より

- タスクドメインにおける例外状態を表現する3つのドメインエラークラスを実装
  - `TaskNotFoundError`: 指定されたタスクが存在しない場合
  - `InvalidTaskDataError`: タスクデータが不正な場合
  - `TaskAccessDeniedError`: タスクへのアクセス権限がない場合
- タスクリポジトリのインターフェース（`ITaskRepository`）を定義し、データアクセス層の抽象化を提供

### 1.2 どのような問題を解決するか

🔵 **青信号** - 要件定義書 EDGE-003, EDGE-004, architecture.md より

- **エラー処理の標準化**: ドメイン固有のエラーを明確に定義し、アプリケーション層でのエラーハンドリングを容易にする
- **HTTPステータスコードとの対応付け**: 各ドメインエラーをHTTPエラー（404, 400, 403）に適切にマッピング可能にする
- **依存性逆転の原則（DIP）の適用**: Domain層でリポジトリインターフェースを定義し、Infrastructure層が実装することで依存性の方向を制御

### 1.3 想定されるユーザー

🔵 **青信号** - architecture.md より

- **Application層のユースケース**: エラーをキャッチしてハンドリング
- **Infrastructure層のリポジトリ実装**: インターフェースを実装してデータアクセスを提供
- **Presentation層のコントローラ**: ドメインエラーをHTTPレスポンスに変換

### 1.4 システム内での位置づけ

🔵 **青信号** - architecture.md DDD + クリーンアーキテクチャより

```
Domain層（app/server/src/domain/task/）
├── TaskEntity.ts          # タスクエンティティ（実装済み）
├── valueobjects/          # 値オブジェクト（実装済み）
│   ├── TaskPriority.ts
│   ├── TaskStatus.ts
│   └── TaskTitle.ts
├── errors/                # ★今回実装: ドメインエラー
│   ├── TaskDomainError.ts       # 基底エラークラス
│   ├── TaskNotFoundError.ts
│   ├── InvalidTaskDataError.ts
│   └── TaskAccessDeniedError.ts
└── ITaskRepository.ts     # ★今回実装: リポジトリインターフェース
```

### 参照情報

- **参照したEARS要件**: EDGE-003, EDGE-004
- **参照した設計文書**: architecture.md（レイヤ構成）、interfaces.ts（型定義）

---

## 2. 入力・出力の仕様

### 2.1 TaskDomainError（基底クラス）

🔵 **青信号** - 既存UserDomainErrorパターンより

| 項目 | 仕様 |
|------|------|
| 継承元 | `Error` |
| 抽象プロパティ | `code: string`（エラーコード） |
| コンストラクタ引数 | `message: string` |
| 特性 | `name`プロパティを自動設定、スタックトレース対応 |

### 2.2 TaskNotFoundError

🔵 **青信号** - 要件定義書 EDGE-003、interfaces.ts より

| 項目 | 仕様 |
|------|------|
| コード | `TASK_NOT_FOUND` |
| HTTPステータス対応 | `404 Not Found` |
| コンストラクタ引数 | `taskId: string` |
| メッセージ形式 | `タスクが見つかりません: ${taskId}` |
| ファクトリメソッド | `static forTaskId(taskId: string)` |

### 2.3 InvalidTaskDataError

🔵 **青信号** - 要件定義書バリデーション要件、interfaces.ts より

| 項目 | 仕様 |
|------|------|
| コード | `INVALID_TASK_DATA` |
| HTTPステータス対応 | `400 Bad Request` |
| コンストラクタ引数 | `message: string` |
| ファクトリメソッド | なし（メッセージを直接指定） |

### 2.4 TaskAccessDeniedError

🔵 **青信号** - 要件定義書 EDGE-004、interfaces.ts より

| 項目 | 仕様 |
|------|------|
| コード | `TASK_ACCESS_DENIED` |
| HTTPステータス対応 | `403 Forbidden` |
| コンストラクタ引数 | `taskId: string` |
| メッセージ形式 | `このタスクにアクセスする権限がありません: ${taskId}` |
| ファクトリメソッド | `static forTaskId(taskId: string)` |

### 2.5 ITaskRepository インターフェース

🔵 **青信号** - interfaces.ts ITaskRepository より

```typescript
interface ITaskRepository {
  /**
   * タスクを保存する（新規作成）
   * @param task - 保存するTaskEntity
   * @returns 保存されたTaskEntity
   */
  save(task: TaskEntity): Promise<TaskEntity>;

  /**
   * ユーザーIDでタスク一覧を取得する
   * @param userId - ユーザーID
   * @param filters - フィルタ条件
   * @param sort - ソート順
   * @returns タスクエンティティの配列
   */
  findByUserId(
    userId: string,
    filters: TaskFilters,
    sort: TaskSortBy
  ): Promise<TaskEntity[]>;

  /**
   * タスクIDとユーザーIDでタスクを取得する
   * @param userId - ユーザーID
   * @param taskId - タスクID
   * @returns タスクエンティティまたはnull
   */
  findById(userId: string, taskId: string): Promise<TaskEntity | null>;

  /**
   * タスクを更新する
   * @param userId - ユーザーID
   * @param taskId - タスクID
   * @param input - 更新データ
   * @returns 更新されたタスクエンティティまたはnull
   */
  update(
    userId: string,
    taskId: string,
    input: UpdateTaskInput
  ): Promise<TaskEntity | null>;

  /**
   * タスクを削除する
   * @param userId - ユーザーID
   * @param taskId - タスクID
   * @returns 削除成功時true
   */
  delete(userId: string, taskId: string): Promise<boolean>;

  /**
   * タスクステータスを変更する
   * @param userId - ユーザーID
   * @param taskId - タスクID
   * @param status - 新しいステータス
   * @returns 更新されたタスクエンティティまたはnull
   */
  updateStatus(
    userId: string,
    taskId: string,
    status: string
  ): Promise<TaskEntity | null>;
}
```

### 2.6 関連型定義

🔵 **青信号** - interfaces.ts より

```typescript
interface TaskFilters {
  priority?: string;      // 優先度フィルタ
  status?: string[];      // ステータスフィルタ（複数選択可能）
}

type TaskSortBy =
  | 'created_at_desc'     // 作成日時（新しい順）
  | 'created_at_asc'      // 作成日時（古い順）
  | 'priority_desc';      // 優先度（高→低）

interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: string;
}
```

### 参照情報

- **参照したEARS要件**: EDGE-003, EDGE-004
- **参照した設計文書**: interfaces.ts（ITaskRepository, TaskFilters, TaskSortBy, UpdateTaskInput）

---

## 3. 制約条件

### 3.1 アーキテクチャ制約

🔵 **青信号** - architecture.md、CLAUDE.md より

| 制約 | 説明 |
|------|------|
| Pure TypeScript | Domain層は外部ライブラリに依存しない |
| DIP適用 | インターフェースはDomain層、実装はInfrastructure層 |
| 既存パターン踏襲 | UserDomainErrorと同様の設計パターンを適用 |

### 3.2 コード品質制約

🔵 **青信号** - CLAUDE.md より

| 制約 | 説明 |
|------|------|
| 型安全性 | `any`型の使用禁止 |
| インポートパス | 同一層は相対パス、他層は絶対パス（`@/...`） |
| ファイル配置 | エラーは`errors/`ディレクトリに配置 |
| 末尾改行 | ファイル末尾に改行を入れて空行を作る |

### 3.3 テスト制約

🔵 **青信号** - CLAUDE.md テストガイドラインより

| 制約 | 説明 |
|------|------|
| テストフレームワーク | Bun標準テスト |
| テストケース名 | 日本語で記載 |
| テスト実行 | `docker compose exec server bun test` |
| カバレッジ | 100%を目標 |

### 参照情報

- **参照したEARS要件**: REQ-401, REQ-409
- **参照した設計文書**: architecture.md、CLAUDE.md

---

## 4. 想定される使用例

### 4.1 基本的な使用パターン

🔵 **青信号** - architecture.md データフローより

#### タスクが見つからない場合（Application層）

```typescript
// GetTaskByIdUseCase
const task = await this.taskRepository.findById(userId, taskId);
if (!task) {
  throw TaskNotFoundError.forTaskId(taskId);
}
```

#### 不正なタスクデータの場合（Domain層）

```typescript
// TaskEntity.create内部（将来的な使用例）
if (!isValidTitle(title)) {
  throw new InvalidTaskDataError('タイトルを入力してください');
}
```

#### アクセス権限がない場合（Application層）

```typescript
// RLS以外でアクセス制御が必要な場合
if (task.getUserId() !== userId) {
  throw TaskAccessDeniedError.forTaskId(taskId);
}
```

### 4.2 Presentation層でのエラーハンドリング

🟡 **黄信号** - 既存エラーハンドリングパターンからの推測

```typescript
// TaskController
try {
  const task = await getTaskByIdUseCase.execute(userId, taskId);
  return c.json({ success: true, data: toTaskDTO(task) });
} catch (error) {
  if (error instanceof TaskNotFoundError) {
    return c.json({ success: false, error: { code: error.code, message: error.message } }, 404);
  }
  if (error instanceof TaskAccessDeniedError) {
    return c.json({ success: false, error: { code: error.code, message: error.message } }, 403);
  }
  if (error instanceof InvalidTaskDataError) {
    return c.json({ success: false, error: { code: error.code, message: error.message } }, 400);
  }
  throw error;
}
```

### 4.3 エッジケース

🔵 **青信号** - 要件定義書 EDGE-003, EDGE-004 より

| シナリオ | 期待される動作 |
|----------|----------------|
| 存在しないタスクIDで更新 | `TaskNotFoundError`がスロー、404レスポンス |
| 存在しないタスクIDで削除 | `TaskNotFoundError`がスロー、404レスポンス |
| 他ユーザーのタスクにアクセス | `TaskAccessDeniedError`がスロー、403レスポンス |
| 空文字タイトルでタスク作成 | `InvalidTaskDataError`がスロー、400レスポンス |

### 参照情報

- **参照したEARS要件**: EDGE-003, EDGE-004
- **参照した設計文書**: architecture.md（データフロー図）

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- なし（インフラストラクチャ/基盤コンポーネント）

### 参照した機能要件

- REQ-001〜REQ-007: ITaskRepositoryの各メソッドがサポート

### 参照した非機能要件

- NFR-102: ユーザーは自分自身のタスクのみアクセス可能（TaskAccessDeniedError）
- NFR-104: Zodバリデーション（InvalidTaskDataError）

### 参照したEdgeケース

- **EDGE-003**: 存在しないタスクを更新・削除しようとした場合、システムは404エラーを返す
- **EDGE-004**: 他ユーザーのタスクにアクセスしようとした場合、システムは403エラーを返す

### 参照した受け入れ基準

- なし（内部コンポーネントのため直接的な受け入れ基準なし）

### 参照した設計文書

- **アーキテクチャ**: architecture.md（レイヤ構成、DDD + クリーンアーキテクチャ）
- **型定義**: interfaces.ts（ITaskRepository, TaskFilters, TaskSortBy, エラークラス定義）
- **既存パターン**: UserDomainError, UserNotFoundError（エラークラスの設計パターン）

---

## 6. 実装ファイル一覧

| ファイルパス | 説明 |
|-------------|------|
| `app/server/src/domain/task/errors/TaskDomainError.ts` | 基底エラークラス |
| `app/server/src/domain/task/errors/TaskNotFoundError.ts` | タスク不存在エラー |
| `app/server/src/domain/task/errors/InvalidTaskDataError.ts` | 不正データエラー |
| `app/server/src/domain/task/errors/TaskAccessDeniedError.ts` | アクセス拒否エラー |
| `app/server/src/domain/task/errors/index.ts` | バレルエクスポート |
| `app/server/src/domain/task/ITaskRepository.ts` | リポジトリインターフェース |

| テストファイルパス | 説明 |
|-------------------|------|
| `app/server/src/domain/task/__tests__/errors.test.ts` | ドメインエラーのテスト |
| `app/server/src/domain/task/__tests__/ITaskRepository.test.ts` | インターフェース型チェックテスト |

---

## 7. 品質判定

### 判定結果: ✅ 高品質

| 判定項目 | 結果 |
|----------|------|
| 要件の曖昧さ | なし - EARS要件・設計文書から明確に定義 |
| 入出力定義 | 完全 - 各エラークラスとインターフェースの仕様が明確 |
| 制約条件 | 明確 - 既存パターン（UserDomainError）に準拠 |
| 実装可能性 | 確実 - 既存実装パターンを踏襲 |

---

## 8. 次のステップ

次のお勧めステップ: `/tdd-testcases` でテストケースの洗い出しを行います。

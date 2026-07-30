# UpdateTaskUseCase TDD要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-11-23
- **タスクID**: TASK-1314
- **要件名**: todo-app
- **機能名**: UpdateTaskUseCase
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1313 (GetTaskByIdUseCase)

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 何をする機能か
🔵 **青信号**: EARS要件定義書 REQ-002 より

ログイン済みユーザーが自分のタスクのタイトル・説明・優先度を更新する機能。
Application層のユースケースとして実装し、リポジトリを介してタスクデータを永続化する。

### 1.2 どのような問題を解決するか
🔵 **青信号**: ユーザーストーリーより

- ユーザーがタスクの内容を後から修正できる
- 優先度の変更により、タスクの重要度を調整できる
- 説明文の更新により、詳細情報を追記・修正できる

### 1.3 想定されるユーザー
🔵 **青信号**: 要件定義書より

- ログイン済みユーザー（Supabase Auth認証済み）
- 自分自身が作成したタスクのみ更新可能

### 1.4 システム内での位置づけ
🔵 **青信号**: architecture.md より

```
Presentation層 (TaskController)
    ↓ PUT /api/tasks/:id
Application層 (UpdateTaskUseCase) ← ★ここ
    ↓ update()
Domain層 (ITaskRepository interface)
    ↓
Infrastructure層 (PostgreSQLTaskRepository)
```

**責務**:
- 入力データの受け取り
- リポジトリへの更新委譲
- タスク未存在時のエラーハンドリング

### 参照したEARS要件
- REQ-002: システムはタスクのタイトル・説明・優先度を更新できなければならない

### 参照した設計文書
- architecture.md: レイヤ構成（Application層）
- interfaces.ts: UpdateTaskInput, UpdateTaskUseCaseInput
- api-endpoints.md: PUT /api/tasks/:id 仕様

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 入力パラメータ
🔵 **青信号**: interfaces.ts より

```typescript
export interface UpdateTaskInput {
  userId: string;  // JWT認証で取得したユーザーID (UUID形式)
  taskId: string;  // 更新対象のタスクID (UUID形式)
  data: {
    title?: string;            // 任意、1-100文字
    description?: string | null; // 任意、Markdown形式、null可
    priority?: string;         // 任意、'high' | 'medium' | 'low'
  };
}
```

**入力制約**:
| フィールド | 型 | 必須 | 制約 |
|-----------|---|------|------|
| `userId` | string | Yes | UUID形式、認証済みユーザー |
| `taskId` | string | Yes | UUID形式 |
| `data.title` | string | No | 1-100文字、空文字不可 |
| `data.description` | string \| null | No | 任意長、null可（説明削除） |
| `data.priority` | string | No | 'high', 'medium', 'low' のいずれか |

### 2.2 出力値
🔵 **青信号**: interfaces.ts より

**正常系**:
```typescript
Promise<TaskEntity>  // 更新後のTaskEntity
```

**異常系**:
```typescript
throw TaskNotFoundError  // タスクが見つからない場合
```

### 2.3 入出力の関係性
🔵 **青信号**: 設計文書より

1. `userId` + `taskId` でタスクを特定
2. `data` の各フィールドで部分更新（指定されたフィールドのみ更新）
3. 更新成功時は `TaskEntity` を返却
4. タスク未存在時は `TaskNotFoundError` をスロー

### 2.4 データフロー
🔵 **青信号**: dataflow.md より

```
Controller
  ↓ UpdateTaskInput
UpdateTaskUseCase.execute()
  ↓ repository.update(userId, taskId, data)
ITaskRepository.update()
  ↓ TaskEntity | null
UpdateTaskUseCase
  ↓ null の場合 TaskNotFoundError
  ↓ TaskEntity の場合 return
Controller
```

### 参照したEARS要件
- REQ-002: タイトル・説明・優先度の更新

### 参照した設計文書
- interfaces.ts: UpdateTaskInput, UpdateTaskUseCaseInput
- ITaskRepository.ts: update() メソッド仕様

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 パフォーマンス要件
🔵 **青信号**: NFR-002 より

- タスク更新APIは500ms以内にレスポンスを返す

### 3.2 セキュリティ要件
🔵 **青信号**: NFR-102, NFR-103 より

- ユーザーは自分自身のタスクのみ更新可能（RLS）
- JWT認証必須

### 3.3 アーキテクチャ制約
🔵 **青信号**: CLAUDE.md、architecture.md より

- DDD + クリーンアーキテクチャパターンを適用
- 依存性注入でITaskRepositoryを注入
- ドメインエラー（TaskNotFoundError）を適切にスロー
- Application層はDomain層のインターフェースに依存

### 3.4 バリデーション制約
🟡 **黄信号**: 既存実装パターンからの推測

- ユースケースレベルでは入力バリデーションを行わない
- バリデーションはPresentation層（Zodスキーマ）で実施
- リポジトリはデータの永続化のみを担当

### 3.5 トランザクション制約
🟡 **黄信号**: 一般的なユースケースパターン

- リポジトリのupdate()メソッドはアトミックな操作
- ユースケースはトランザクション管理を行わない（リポジトリに委譲）

### 参照したEARS要件
- NFR-002: 500ms以内のレスポンス
- NFR-102, NFR-103: セキュリティ要件

### 参照した設計文書
- architecture.md: レイヤ構成、責務分離
- CLAUDE.md: DDD + クリーンアーキテクチャ方針

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン
🔵 **青信号**: REQ-002 より

#### パターン1: タイトルのみ更新
```typescript
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  taskId: '660e8400-e29b-41d4-a716-446655440001',
  data: { title: '更新されたタイトル' }
};
const result = await useCase.execute(input);
// result: TaskEntity (更新後のタイトルを持つ)
```

#### パターン2: 複数フィールド同時更新
```typescript
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  taskId: '660e8400-e29b-41d4-a716-446655440001',
  data: {
    title: '更新されたタイトル',
    description: '## 更新された説明\n- チェックリスト',
    priority: 'high'
  }
};
const result = await useCase.execute(input);
```

#### パターン3: 説明の削除（nullで更新）
```typescript
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  taskId: '660e8400-e29b-41d4-a716-446655440001',
  data: { description: null }
};
const result = await useCase.execute(input);
// result: TaskEntity (descriptionがnull)
```

### 4.2 エッジケース
🔵 **青信号**: EDGE-003 より

#### ケース1: タスクが見つからない
```typescript
const input = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  taskId: 'nonexistent-task-id',
  data: { title: '更新' }
};
// TaskNotFoundError がスローされる
```

### 4.3 エラーケース
🟡 **黄信号**: 既存実装パターンからの推測

#### ケース1: リポジトリエラー
```typescript
// リポジトリがエラーをスローした場合、そのまま伝播する
```

### 参照したEARS要件
- EDGE-003: 存在しないタスクを更新しようとした場合

### 参照した設計文書
- api-endpoints.md: PUT /api/tasks/:id のエラーレスポンス

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- 「ユーザーとして、タスクの内容を編集したい」

### 参照した機能要件
- REQ-002: システムはタスクのタイトル・説明・優先度を更新できなければならない

### 参照した非機能要件
- NFR-002: タスク作成APIは500ms以内にレスポンス（更新も同等と想定）
- NFR-102: ユーザーは自分自身のタスクのみアクセス可能
- NFR-103: タスク操作APIはすべてJWT認証を必須

### 参照したEdgeケース
- EDGE-003: 存在しないタスクを更新しようとした場合、システムは404エラーを返す

### 参照した受け入れ基準
- タスクの作成・更新・削除・ステータス変更ができる
- 他ユーザーのタスクにアクセスできない（RLS）

### 参照した設計文書

#### アーキテクチャ
- architecture.md: Application層のユースケース責務
- architecture.md: レイヤ間依存関係

#### データフロー
- dataflow.md: タスク更新フロー（参照）

#### 型定義
- interfaces.ts: UpdateTaskInput, UpdateTaskUseCaseInput
- ITaskRepository.ts: update() メソッドシグネチャ

#### API仕様
- api-endpoints.md: PUT /api/tasks/:id エンドポイント仕様

---

## 6. 実装詳細

### 6.1 ファイル配置
🔵 **青信号**: 設計文書より

```
app/server/src/application/usecases/
├── UpdateTaskUseCase.ts          # 実装ファイル
└── __tests__/
    └── UpdateTaskUseCase.test.ts # テストファイル
```

### 6.2 実装パターン
🔵 **青信号**: タスクファイル TASK-1314 より

```typescript
export interface UpdateTaskInput {
  userId: string;
  taskId: string;
  data: {
    title?: string;
    description?: string | null;
    priority?: string;
  };
}

export class UpdateTaskUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(input: UpdateTaskInput): Promise<TaskEntity> {
    const task = await this.taskRepository.update(
      input.userId,
      input.taskId,
      input.data,
    );

    if (!task) {
      throw TaskNotFoundError.forTaskId(input.taskId);
    }

    return task;
  }
}
```

### 6.3 依存関係
🔵 **青信号**: 既存実装より

```typescript
import { TaskNotFoundError } from '@/domain/task/errors/TaskNotFoundError';
import type { ITaskRepository } from '@/domain/task/ITaskRepository';
import type { TaskEntity } from '@/domain/task/TaskEntity';
```

---

## 7. テストケース概要

### 7.1 正常系
🔵 **青信号**: タスクファイル TASK-1314 より

1. タスクが更新される（リポジトリが正しく呼び出される）
2. リポジトリの戻り値がそのまま返される（結果透過性）
3. 部分更新が正しく動作する（titleのみ、descriptionのみ、priorityのみ）

### 7.2 異常系
🔵 **青信号**: タスクファイル TASK-1314 より

1. タスクが見つからない場合TaskNotFoundErrorがスローされる
2. リポジトリエラーが正しく伝播する

### 参照
- GetTaskByIdUseCase.test.ts: 類似テストパターン
- CreateTaskUseCase.test.ts: モックリポジトリの構造

---

## 8. 品質判定

### 判定結果: ✅ 高品質

| 項目 | 状態 |
|------|------|
| 要件の曖昧さ | なし |
| 入出力定義 | 完全 |
| 制約条件 | 明確 |
| 実装可能性 | 確実 |

### 信頼性サマリ

| 信号 | 項目数 | 内容 |
|------|--------|------|
| 🔵 青信号 | 多数 | EARS要件定義書・設計文書から確実 |
| 🟡 黄信号 | 3件 | バリデーション制約、トランザクション、エラー伝播 |
| 🔴 赤信号 | 0件 | なし |

---

## 9. 次のステップ

次のお勧めステップ: `/tdd-testcases` でテストケースの洗い出しを行います。

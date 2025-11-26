# DeleteTaskUseCase TDD要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-11-26
- **更新日**: 2025-11-26
- **タスクID**: TASK-1316
- **要件名**: todo-app
- **機能名**: DeleteTaskUseCase
- **フェーズ**: Phase 3 (Application層実装)

## 1. 機能の概要

### 🔵 EARS要件定義書・設計文書ベース

**機能概要**:
DeleteTaskUseCaseは、ログイン済みユーザーが自分のタスクを物理削除するユースケースです。

**ユーザーストーリー** (要件定義書より):
- As a ログインユーザー
- I want to タスクを削除できる
- So that 不要になったタスクを整理できる

**システム内での位置づけ** (architecture.md より):
- **層**: Application層 (ユースケース実行・調整)
- **依存**: Domain層のITaskRepositoryインターフェース
- **呼び出し元**: Presentation層のTaskController

**参照したEARS要件**:
- REQ-003: システムはタスクを物理削除できなければならない

**参照した設計文書**:
- architecture.md - Application層の責務定義
- api-endpoints.md - DELETE /api/tasks/:id エンドポイント仕様

---

## 2. 入力・出力の仕様

### 🔵 EARS機能要件・TypeScript型定義ベース

**入力パラメータ** (DeleteTaskInput):

| フィールド | 型 | 必須 | 説明 | 制約 |
|-----------|---|------|------|------|
| userId | string | Yes | ユーザーID (JWT から抽出) | UUID形式 |
| taskId | string | Yes | 削除対象タスクID | UUID形式 |

**出力値**:
- 型: `Promise<void>`
- 成功時: 何も返さない (タスクが物理削除される)
- 失敗時: 例外をスロー

**データフロー** (dataflow.md より):
1. ユーザーが削除ボタンをクリック
2. 確認ダイアログで「削除」を選択
3. API呼び出し: DELETE /api/tasks/:id
4. JWT検証でuser_idを抽出
5. DeleteTaskUseCaseが実行される
6. PostgreSQLTaskRepository.delete() を呼び出し
7. PostgreSQLで物理削除 (DELETE FROM tasks)
8. RLSで他ユーザーのタスクは削除不可
9. 削除成功時: 204 No Content
10. 削除失敗時: 404 Not Found

**参照したEARS要件**: REQ-003
**参照した設計文書**:
- dataflow.md - タスク削除フロー
- interfaces.ts (ITaskRepository.delete の型定義)

---

## 3. 制約条件

### 🔵 EARS非機能要件・アーキテクチャ設計ベース

**パフォーマンス要件** (NFR-002より推測):
- タスク削除APIは500ms以内にレスポンスを返さなければならない

**セキュリティ要件**:
- NFR-102: ユーザーは自分自身のタスクのみ削除可能 (RLS)
- NFR-103: タスク削除APIはJWT認証を必須とする

**アーキテクチャ制約** (architecture.md, REQ-407 より):
- DDD + クリーンアーキテクチャパターンを適用
- Application層のユースケースとしてDeleteTaskUseCaseを実装
- ITaskRepositoryインターフェースに依存 (依存性注入)
- 具象クラスに直接依存しない (DIP原則)

**データベース制約** (REQ-403, api-endpoints.md より):
- 物理削除 (DELETE文による完全削除)
- RLSポリシーでuser_id制限が自動適用される
- 削除前にタスクの存在確認が必要

**API制約** (api-endpoints.md より):
- DELETE /api/tasks/:id エンドポイント
- 成功時: 204 No Content (レスポンスボディなし)
- 失敗時: 404 Not Found または 403 Forbidden

**参照したEARS要件**:
- REQ-003, REQ-403, NFR-102, NFR-103

**参照した設計文書**:
- architecture.md - アーキテクチャ制約
- api-endpoints.md - API制約

---

## 4. 想定される使用例

### 🔵 EARSEdgeケース・データフローベース

**基本的な使用パターン** (REQ-003 より):

```typescript
// Given: ユーザーがログイン済み、既存のタスク「古いタスク」が存在
const input: DeleteTaskInput = {
  userId: "123e4567-e89b-12d3-a456-426614174000",
  taskId: "550e8400-e29b-41d4-a716-446655440000"
};

// When: DeleteTaskUseCaseを実行
const useCase = new DeleteTaskUseCase(taskRepository);
await useCase.execute(input);

// Then: タスクが物理削除される、例外がスローされない
```

**データフロー** (dataflow.md より):
1. ユーザー削除操作 → 確認ダイアログ → API呼び出し
2. JWT検証 → user_id抽出
3. DeleteTaskUseCase.execute()
4. taskRepository.delete(userId, taskId)
5. PostgreSQL DELETE文実行 (RLS適用)
6. 削除成功 → 204 No Content
7. フロントエンド: Redux/Query更新 → UI更新

**エッジケース** (EDGE-003, EDGE-004 より):

**ケース1: 存在しないタスクを削除**
```typescript
// Given: 存在しないタスクIDを指定
const input: DeleteTaskInput = {
  userId: "123e4567-e89b-12d3-a456-426614174000",
  taskId: "999e8400-e29b-41d4-a716-446655440999" // 存在しない
};

// When: DeleteTaskUseCaseを実行
await useCase.execute(input);

// Then: TaskNotFoundError がスローされる
// メッセージ: "タスクが見つかりません: {taskId}"
```

**ケース2: 他ユーザーのタスクを削除**
```typescript
// Given: ユーザーAでログイン、ユーザーBのタスクIDを指定
const input: DeleteTaskInput = {
  userId: "user-a-id",
  taskId: "user-b-task-id" // 他ユーザーのタスク
};

// When: DeleteTaskUseCaseを実行
await useCase.execute(input);

// Then: TaskNotFoundError がスローされる
// 理由: RLSで他ユーザーのタスクはfindByIdできない → null → TaskNotFoundError
```

**ケース3: 確認ダイアログでキャンセル** (EDGE-203 より)
- ユーザーが確認ダイアログで「キャンセル」を選択
- API呼び出しが発生しない (フロントエンド側で制御)
- タスクは削除されない

**エラーケース** (EDGE-005 より):
- ネットワークエラー時: 「通信エラーが発生しました。再試行してください」
- フロントエンドでハンドリング

**参照したEARS要件**: EDGE-003, EDGE-004, EDGE-203, EDGE-005
**参照した設計文書**: dataflow.md - タスク削除フロー

---

## 5. EARS要件・設計文書との対応関係

### 🔵 参照したユーザストーリー
- todo-app-user-stories.md の「タスク削除」ストーリー

### 🔵 参照した機能要件
- **REQ-003**: システムはタスクを物理削除できなければならない

### 🔵 参照した非機能要件
- **NFR-002**: タスク削除APIは500ms以内にレスポンスを返さなければならない (推測)
- **NFR-102**: ユーザーは自分自身のタスクのみアクセス可能 (RLS)
- **NFR-103**: タスク操作APIはすべてJWT認証を必須とする

### 🔵 参照したEdgeケース
- **EDGE-003**: 存在しないタスクを更新・削除しようとした場合、404エラーを返す
- **EDGE-004**: 他ユーザーのタスクにアクセスしようとした場合、403エラーを返す (RLSで自動処理)
- **EDGE-203**: 削除確認ダイアログでキャンセルした場合、タスクは削除されない

### 🔵 参照した受け入れ基準
- todo-app-acceptance-criteria.md の「REQ-003: タスク削除機能の受け入れ基準」

### 🔵 参照した設計文書

**アーキテクチャ** (architecture.md):
- Application層の責務定義
- DDD + クリーンアーキテクチャパターン
- 依存性逆転の原則 (DIP)

**データフロー** (dataflow.md):
- タスク削除フロー (シーケンス図)
- エラーハンドリングフロー

**型定義** (ITaskRepository):
```typescript
delete(userId: string, taskId: string): Promise<boolean>;
```

**データベース** (要件定義書 - schema.ts):
- tasksテーブルの物理削除 (DELETE文)
- RLSポリシー適用

**API仕様** (api-endpoints.md):
- DELETE /api/tasks/:id
- 成功時: 204 No Content
- 失敗時: 404 Not Found, 403 Forbidden

---

## 品質判定

### ✅ 高品質要件定義

**要件の曖昧さ**: なし
- EARS要件 REQ-003 で明確に定義されている
- API仕様、データフロー図で具体的な挙動が定義されている

**入出力定義**: 完全
- DeleteTaskInput の型定義が明確
- 戻り値の型 (Promise<void>) が明確
- エラー時の例外型 (TaskNotFoundError) が明確

**制約条件**: 明確
- セキュリティ要件 (RLS, JWT認証) が明確
- パフォーマンス要件 (500ms以内) が明確
- アーキテクチャ制約 (DDD, クリーンアーキテクチャ) が明確

**実装可能性**: 確実
- 既存の CreateTaskUseCase, UpdateTaskUseCase のパターンを踏襲
- ITaskRepository.delete() インターフェースが既に定義済み
- TaskNotFoundError が既に実装済み

---

## 次のステップ

次のお勧めステップ: `/tdd-testcases` でテストケースの洗い出しを行います。

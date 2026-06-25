# TDD要件定義書: カスタムフック（useTasks, useTaskMutations）

## メタ情報

- **作成日**: 2025-01-26
- **更新日**: 2025-01-26
- **タスクID**: TASK-1330
- **機能名**: カスタムフック（useTasks, useTaskMutations）
- **要件名**: todo-app
- **推定工数**: 8時間
- **レビュー**: Codex MCP品質レビュー実施済み

---

## 1. 機能の概要

### 対象機能

- **useTasks**: Redux状態に基づくタスク一覧取得フック
- **useTaskMutations**: タスクのCRUD操作（作成・更新・削除・ステータス変更）を提供するフック

### 信頼性レベル

🔵 **青信号**: 既存実装パターン（useUser, useUpdateUser）と完全に整合
🔵 **青信号**: タスク仕様（docs/tasks/todo-app-phase6.md TASK-1330）に明記
🔵 **青信号**: アーキテクチャ設計（docs/design/todo-app/architecture.md）に記載
🔵 **青信号**: 要件定義書（docs/spec/todo-app-requirements.md）に記載

### 機能説明

**何をする機能か**:
- TanStack React Queryを使用してタスクのサーバー状態を管理
- Redux状態（フィルタ・ソート）と連携してタスク一覧を取得
- タスクのCRUD操作を型安全に実行し、キャッシュを自動管理

**どのような問題を解決するか**:
- サーバー状態とクライアント状態の一貫性を保つ
- API呼び出しとキャッシュ管理のボイラープレートを削減
- 型安全なタスク操作を提供し、実行時エラーを防止
- フィルタ・ソート変更時の自動再取得

**想定されるユーザー**:
- TODOリスト機能を利用する開発者（コンポーネント実装者）

**システム内での位置づけ**:
```
[TaskList Component]
    ↓
[useTasks / useTaskMutations]
    ↓
[TanStack React Query + Redux Selector]
    ↓
[apiClient (openapi-fetch)]
    ↓
[Hono API Backend]
```

### 参照元

- **EARS要件**: REQ-001（作成）, REQ-002（更新）, REQ-003（削除）, REQ-004（ステータス変更）, REQ-006（一覧取得）, REQ-103（デフォルト優先度）, REQ-201（優先度フィルタ）, REQ-202（ステータスフィルタ）, REQ-203（ソート）
- **設計文書**:
  - `docs/design/todo-app/architecture.md` セクション「フロントエンド」
  - `docs/design/todo-app/dataflow.md` セクション「タスク一覧取得フロー」「タスク作成フロー」
- **タスク定義**: `docs/tasks/todo-app-phase6.md` TASK-1330（Line 257-379）
- **参考実装**:
  - `app/client/src/features/user/hooks/useUser.ts`
  - `app/client/src/features/user/hooks/useUpdateUser.ts`

---

## 2. 入力・出力の仕様

### 信頼性レベル

🔵 **青信号**: 型定義は `app/packages/shared-schemas/src/tasks.ts` から確定
🔵 **青信号**: Redux状態は `app/client/src/features/todo/store/taskSlice.ts` から確定
🔵 **青信号**: OpenAPI型は `app/client/src/types/api/generated.ts` から自動生成

### useTasks

#### 入力パラメータ

**引数**: なし（Redux状態から取得）

**内部依存**:
- `useAppSelector((state) => state.task.filters)`: フィルタ状態
  - `priority`: `TaskPriority | 'all'`
  - `status`: `TaskStatus[]`
- `useAppSelector((state) => state.task.sort)`: ソート状態
  - `sortBy`: `'created_at_desc' | 'created_at_asc' | 'priority_desc'`

#### 出力値

**型**: `UseQueryResult<Task[], Error>`

**成功レスポンス**:
```typescript
{
  data: Task[],
  isLoading: false,
  isSuccess: true,
  error: null,
  // その他React Queryのプロパティ
}
```

**Task型**（`shared-schemas/src/tasks.ts`）:
```typescript
{
  id: string; // UUID v4
  userId: string; // UUID v4
  title: string; // 1-100文字
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'in_review' | 'completed';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

**エラーレスポンス**:
```typescript
{
  data: undefined,
  isLoading: false,
  isError: true,
  error: Error, // error.message にエラー内容
}
```

#### API呼び出し仕様

**エンドポイント**: `GET /api/tasks`

**クエリパラメータ**:
- `priority`: `'high' | 'medium' | 'low'` (optional)
- `status`: カンマ区切り文字列 `'not_started,in_progress'` (optional)
  - **重要**: `TaskStatus[]` をカンマ区切り文字列に変換（例: `['in_progress', 'in_review']` → `'in_progress,in_review'`）
- `sort`: `'created_at_desc' | 'created_at_asc' | 'priority_desc'` (default: `created_at_desc`)

**クエリキー**: `['tasks', filters, sort]`
- フィルタ・ソート変更時に自動的にキャッシュキーが変わり再取得

### useTaskMutations

#### 返り値

**型** (OpenAPI型定義から推論):
```typescript
{
  createTask: UseMutationResult<Task, Error, CreateTaskBody>,
  updateTask: UseMutationResult<Task, Error, UpdateTaskVariables>,
  deleteTask: UseMutationResult<void, Error, string>,
  changeStatus: UseMutationResult<Task, Error, ChangeStatusVariables>
}
```

**型エイリアス** (`useUpdateUser.ts` パターンに従う):
```typescript
type CreateTaskBody = paths['/api/tasks']['post']['requestBody']['content']['application/json'];

type UpdateTaskBody = paths['/api/tasks/{id}']['put']['requestBody']['content']['application/json'];

type UpdateTaskVariables = {
  id: string;
  input: UpdateTaskBody;
};

type ChangeTaskStatusBody = paths['/api/tasks/{id}/status']['patch']['requestBody']['content']['application/json'];

type ChangeStatusVariables = {
  id: string;
  status: TaskStatus;
};
```

#### createTask

**入力** (`CreateTaskBody`):
```typescript
{
  title: string; // 1-100文字、必須
  description?: string | null;
  priority?: 'high' | 'medium' | 'low'; // default: 'medium' (サーバー側で設定)
}
```

**出力**: `Task`

**API**: `POST /api/tasks`

**成功時の副作用**:
- `queryClient.invalidateQueries({ queryKey: ['tasks'] })` でキャッシュ無効化

#### updateTask

**入力** (`UpdateTaskVariables`):
```typescript
{
  id: string; // UUID v4
  input: {
    title?: string; // 1-100文字
    description?: string | null;
    priority?: 'high' | 'medium' | 'low';
  }
}
```

**出力**: `Task`

**API**: `PUT /api/tasks/{id}`

**成功時の副作用**:
- `queryClient.invalidateQueries({ queryKey: ['tasks'] })` でキャッシュ無効化

#### deleteTask

**入力**: `id: string` (UUID v4)

**出力**: `void` (204 No Content)

**API**: `DELETE /api/tasks/{id}`

**成功時の副作用**:
- `queryClient.invalidateQueries({ queryKey: ['tasks'] })` でキャッシュ無効化

#### changeStatus

**入力** (`ChangeStatusVariables`):
```typescript
{
  id: string; // UUID v4
  status: 'not_started' | 'in_progress' | 'in_review' | 'completed'
}
```

**出力**: `Task`

**API**: `PATCH /api/tasks/{id}/status`

**成功時の副作用**:
- `queryClient.invalidateQueries({ queryKey: ['tasks'] })` でキャッシュ無効化

### エラーメッセージ正規化

**EDGE-005要件**（ネットワークエラー時の統一メッセージ）に対応するため、エラーハンドリング時に以下の正規化を行う：

```typescript
// ネットワークエラーの場合は統一メッセージに変換
if (error.message === 'Network error' || error.message.includes('Failed to fetch')) {
  throw new Error('通信エラーが発生しました。再試行してください');
}
```

### データフロー

```
[Redux State Change (filters/sort)]
  ↓
[useTasks queryKey更新]
  ↓
[TanStack Query 再取得]
  ↓
[apiClient.GET('/api/tasks', { params: { query } })]
  ↓
[Backend API (JWT認証 + RLS)]
  ↓
[Task[] レスポンス]
  ↓
[React Query キャッシュ更新]
  ↓
[UI 自動再レンダリング]
```

### 参照元

- **型定義**: `app/packages/shared-schemas/src/tasks.ts`
- **Redux状態**: `app/client/src/features/todo/store/taskSlice.ts`
- **API型定義**: `app/client/src/types/api/generated.ts` (OpenAPI自動生成)
- **データフロー図**: `docs/design/todo-app/dataflow.md` Line 12-69

---

## 3. 制約条件

### 信頼性レベル

🔵 **青信号**: 既存アーキテクチャ制約（CLAUDE.md, architecture.md）に記載
🔵 **青信号**: 参考実装（useUser, useUpdateUser）と整合
🟡 **黄信号**: NFR-001（パフォーマンス要件）は既存設計からの妥当な推測
🔴 **赤信号**: NFR-004（即座の反映）は既存資料にない推測

### アーキテクチャ制約

- **必須**: TanStack React Query v5.84.2 を使用
- **必須**: Redux Toolkit v2.8.2 でUI状態管理
- **必須**: openapi-fetch v0.15.0 で型安全なAPI呼び出し
- **必須**: `useApiClient()` からDI方式でAPIクライアントを取得
- **必須**: `useQueryClient()` でキャッシュ管理
- **必須**: `useAppSelector()` でRedux状態取得

### パフォーマンス要件

🟡 **黄信号**: NFR-001（タスク一覧取得は1秒以内）
🔴 **赤信号**: NFR-004（フィルタ・ソート変更は即座にUIに反映）

- **必須**: タスク一覧取得APIは1秒以内にレスポンス（NFR-001）
- **必須**: フィルタ・ソート変更は即座にUIに反映（NFR-004）
- **推奨**: キャッシュの有効活用（30秒間のstaleTime推奨）

### セキュリティ要件

🔵 **青信号**: NFR-103に記載

- **必須**: すべてのAPI呼び出しにJWT認証トークンを付与（Authorization: Bearer）
- **必須**: エラーレスポンスで認証エラー（401 Unauthorized）を適切にハンドリング
- **必須**: エラーレスポンスでアクセス権限エラー（403 Forbidden）を適切にハンドリング
- **必須**: XSS対策のため、エラーメッセージに信頼できないHTMLを含めない

### データ整合性

🔵 **青信号**: 既存パターン（useUser, useUpdateUser）から確定

- **必須**: Mutation成功時は必ず `invalidateQueries` でキャッシュ無効化
- **必須**: エラー時は `throw new Error()` でReact Queryのerror状態にする
- **必須**: レスポンスが `null` または `undefined` の場合もエラーとして扱う
- **必須**: ネットワークエラー時は統一メッセージ「通信エラーが発生しました。再試行してください」を設定（EDGE-005）

### テスタビリティ

🔵 **青信号**: 既存テストパターン（useUser.test.tsx）から確定

- **必須**: DI方式で `apiClient` をモック可能にする
- **必須**: 各テストで新しい `QueryClient` を生成しキャッシュを分離
- **必須**: `beforeEach` でモックを初期化、`afterEach` でクリーンアップ
- **必須**: `retry: false` でテスト時のリトライを無効化

### ファイル配置

🔵 **青信号**: プロジェクト構造（CLAUDE.md）に記載

- **実装**: `app/client/src/features/todo/hooks/useTasks.ts`
- **実装**: `app/client/src/features/todo/hooks/useTaskMutations.ts`
- **テスト**: `app/client/src/features/todo/__tests__/useTasks.test.tsx`
- **テスト**: `app/client/src/features/todo/__tests__/useTaskMutations.test.tsx`

### 参照元

- **アーキテクチャ制約**: `docs/design/todo-app/architecture.md` Line 92-108
- **非機能要件**: `docs/spec/todo-app-requirements.md` NFR-001（🟡）, NFR-004（🔴）, NFR-103（🔵）
- **テストガイドライン**: `CLAUDE.md` テストファイル配置ルール
- **参考実装**: `app/client/src/features/user/hooks/useUser.ts`

---

## 4. 想定される使用例

### 信頼性レベル

🔵 **青信号**: ユーザーストーリー、Edgeケース（docs/spec/todo-app-requirements.md）から確定
🔵 **青信号**: データフロー図（docs/design/todo-app/dataflow.md）から確定
🟡 **黄信号**: EDGE-101（0件の場合）は既存設計からの妥当な推測

### 基本的な使用パターン

#### パターン1: タスク一覧表示

```typescript
// Given: TaskListコンポーネント
function TaskList() {
  const { data: tasks, isLoading, error } = useTasks();

  // When: ローディング中
  if (isLoading) return <LoadingSpinner />;

  // When: エラー発生
  if (error) return <ErrorMessage message={error.message} />;

  // When: タスクが0件
  if (tasks.length === 0) return <EmptyState message="タスクがありません" />;

  // Then: タスク一覧を表示
  return (
    <ul>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}
```

🔵 **参照**: REQ-006（タスク一覧表示）
🟡 **参照**: EDGE-101（0件の場合）

#### パターン2: タスク作成（優先度指定あり）

```typescript
// Given: タスク作成フォーム
function TaskCreateForm() {
  const { createTask } = useTaskMutations();
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // When: タスクを作成
    createTask.mutate(
      { title, priority: 'high' },
      {
        onSuccess: () => {
          setTitle('');
          // Then: キャッシュが自動的に無効化され、一覧が再取得される
        },
        onError: (error) => {
          alert(error.message);
        }
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={e => setTitle(e.target.value)} />
      <button disabled={createTask.isPending}>作成</button>
    </form>
  );
}
```

🔵 **参照**: REQ-001（タスク作成）, EDGE-001（空文字列エラー）

#### パターン3: フィルタ・ソート連携

```typescript
// Given: フィルタ変更
function TaskFilter() {
  const dispatch = useAppDispatch();
  const { data: tasks } = useTasks(); // フィルタ変更で自動再取得

  const handlePriorityChange = (priority: TaskPriority | 'all') => {
    // When: 優先度フィルタを変更
    dispatch(setPriorityFilter(priority));
    // Then: useTasks の queryKey が変わり自動再取得
  };

  const handleStatusChange = (status: TaskStatus[]) => {
    // When: ステータスフィルタを変更（複数選択）
    dispatch(setStatusFilter(status));
    // Then: useTasks の queryKey が変わり自動再取得
    // 内部的に TaskStatus[] → 'in_progress,in_review' に変換
  };

  return (
    <>
      <select onChange={e => handlePriorityChange(e.target.value as TaskPriority)}>
        <option value="all">すべて</option>
        <option value="high">高</option>
        <option value="medium">中</option>
        <option value="low">低</option>
      </select>

      <MultiSelect
        options={['not_started', 'in_progress', 'in_review', 'completed']}
        onChange={handleStatusChange}
      />
    </>
  );
}
```

🔵 **参照**: REQ-201（優先度フィルタ）, REQ-202（ステータスフィルタ・複数選択）, REQ-203（ソート）

#### パターン4: ステータス変更

```typescript
// Given: タスクアイテムコンポーネント
function TaskItem({ task }: { task: Task }) {
  const { changeStatus } = useTaskMutations();

  const handleStatusChange = (status: TaskStatus) => {
    // When: ステータスを変更
    changeStatus.mutate({ id: task.id, status });
    // Then: キャッシュが無効化され、一覧が再取得される
  };

  return (
    <div>
      <h3>{task.title}</h3>
      <select value={task.status} onChange={e => handleStatusChange(e.target.value as TaskStatus)}>
        <option value="not_started">未着手</option>
        <option value="in_progress">進行中</option>
        <option value="in_review">レビュー中</option>
        <option value="completed">完了</option>
      </select>
    </div>
  );
}
```

🔵 **参照**: REQ-004（ステータス変更）

### エッジケース

#### エッジケース1: ネットワークエラー

```typescript
// Given: ネットワークエラー発生
// When: useTasks を呼び出し
const { error, isError } = useTasks();

// Then: エラー状態になり、統一メッセージが表示される
if (isError) {
  // error.message = "通信エラーが発生しました。再試行してください"
  return <ErrorMessage message={error.message} />;
}
```

🔵 **参照**: EDGE-005（ネットワークエラー・統一メッセージ）

#### エッジケース2: バリデーションエラー

```typescript
// Given: 不正なタイトル（空文字列）
const { createTask } = useTaskMutations();

// When: 空文字列でタスク作成
createTask.mutate({ title: '' }, {
  onError: (error) => {
    // Then: 「タイトルを入力してください」エラーが返る
    expect(error.message).toContain('タイトルを入力してください');
  }
});
```

🔵 **参照**: EDGE-001（タイトル空文字列エラー）, EDGE-002（タイトル100文字超過エラー）

#### エッジケース3: 認証エラー（401 Unauthorized）

```typescript
// Given: JWT トークン期限切れ
// When: API呼び出し
const { error, isError } = useTasks();

// Then: 401エラーが発生し、ログイン画面にリダイレクト
if (isError && error.message.includes('認証')) {
  // 認証エラーハンドリング
  redirectToLogin();
}
```

🔵 **参照**: NFR-103（JWT認証必須）

#### エッジケース4: アクセス権限エラー（403 Forbidden）

```typescript
// Given: 他ユーザーのタスクにアクセス
const { updateTask } = useTaskMutations();

// When: 他ユーザーのタスクを更新しようとする
updateTask.mutate({ id: 'other-user-task-id', input: { title: '更新' } }, {
  onError: (error) => {
    // Then: 403エラーが返る
    expect(error.message).toContain('アクセス権限がありません');
  }
});
```

🔵 **参照**: EDGE-004（他ユーザーのタスクアクセス時403エラー）

#### エッジケース5: 存在しないタスクの更新・削除

```typescript
// Given: 存在しないタスクID
const { deleteTask } = useTaskMutations();

// When: 存在しないタスクを削除
deleteTask.mutate('nonexistent-uuid', {
  onError: (error) => {
    // Then: 404エラーが返る
    expect(error.message).toContain('タスクが見つかりません');
  }
});
```

🔵 **参照**: EDGE-003（存在しないタスクの404エラー）

### データフロー例

#### フィルタ変更時のフロー

```
[User: ステータスフィルタ変更（進行中+レビュー中）]
  ↓
[dispatch(setStatusFilter(['in_progress', 'in_review']))]
  ↓
[Redux State: state.task.filters.status = ['in_progress', 'in_review']]
  ↓
[useTasks の queryKey 変更]
  ↓
[React Query 自動再取得]
  ↓
[status配列をカンマ区切りに変換: 'in_progress,in_review']
  ↓
[apiClient.GET('/api/tasks?status=in_progress,in_review')]
  ↓
[Backend API（JWT認証 + RLS）]
  ↓
[Task[] レスポンス（進行中+レビュー中のタスクのみ）]
  ↓
[キャッシュ更新]
  ↓
[UI 再レンダリング（フィルタされたタスク表示）]
```

🔵 **参照**: `docs/design/todo-app/dataflow.md` Line 52-66

### 参照元

- **ユーザーストーリー**: `docs/spec/todo-app-requirements.md` 機能要件セクション
- **Edgeケース**: `docs/spec/todo-app-requirements.md` EDGE-001～EDGE-005, EDGE-101（🟡）
- **データフロー**: `docs/design/todo-app/dataflow.md` Line 12-69

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- **US-001**: タスクを追加したい（REQ-001）
- **US-002**: タスクを編集したい（REQ-002）
- **US-003**: タスクを削除したい（REQ-003）
- **US-004**: タスクのステータスを変更したい（REQ-004）
- **US-005**: タスク一覧を表示したい（REQ-006）
- **US-006**: タスクをフィルタ・ソートしたい（REQ-201, REQ-202, REQ-203）

### 参照した機能要件

- **REQ-001** (🔵): システムはログイン済みユーザーがタスクを作成できなければならない
- **REQ-002** (🔵): システムはタスクのタイトル・説明・優先度を更新できなければならない
- **REQ-003** (🔵): システムはタスクを物理削除できなければならない
- **REQ-004** (🔵): システムはタスクのステータス(未着手・進行中・レビュー中・完了)を変更できなければならない
- **REQ-006** (🔵): システムはタスク一覧を表示しなければならない
- **REQ-102** (🔵): ユーザーが新規タスクを追加する場合、システムはタイトルの入力を必須としなければならない
- **REQ-103** (🔵): ユーザーがタスクを作成する場合、システムはデフォルトで優先度を「中」に設定しなければならない
- **REQ-201** (🔵): 優先度フィルタが適用されている場合、システムは選択された優先度のタスクのみを表示しなければならない
- **REQ-202** (🔵): ステータスフィルタが適用されている場合、システムは選択されたステータス(複数選択可能)のタスクのみを表示しなければならない
- **REQ-203** (🔵): ソート順が指定されている場合、システムは指定された順序でタスクを並べ替えなければならない

### 参照した非機能要件

- **NFR-001** (🟡): タスク一覧取得APIは1秒以内にレスポンスを返さなければならない
- **NFR-004** (🔴): タスクフィルタ・ソート操作は即座にUIに反映されなければならない
- **NFR-103** (🔵): タスク操作APIはすべてJWT認証を必須とする
- **NFR-104** (🔵): タスクの入力値はサーバーサイドでZodバリデーションを実施しなければならない

### 参照したEdgeケース

- **EDGE-001** (🔵): タイトルが空文字の場合、システムは「タイトルを入力してください」エラーを表示する
- **EDGE-002** (🔵): タイトルが100文字を超える場合、システムは「タイトルは100文字以内で入力してください」エラーを表示する
- **EDGE-003** (🔵): 存在しないタスクを更新・削除しようとした場合、システムは404エラーを返す
- **EDGE-004** (🔵): 他ユーザーのタスクにアクセスしようとした場合、システムは403エラーを返す
- **EDGE-005** (🔵): ネットワークエラー時、システムは「通信エラーが発生しました。再試行してください」と表示する
- **EDGE-101** (🟡): タスク数が0件の場合、システムは「タスクがありません」メッセージを表示する

### 参照した受け入れ基準

- **AC-001**: タスクの作成・更新・削除・ステータス変更ができる
- **AC-002**: タスク一覧がデフォルトで作成日時(新しい順)で表示される
- **AC-003**: 優先度フィルタでタスクを絞り込める
- **AC-004**: ステータスフィルタ(複数選択可能)でタスクを絞り込める
- **AC-005**: ソート機能で並び順を変更できる

### 参照した設計文書

#### アーキテクチャ

- **ファイル**: `docs/design/todo-app/architecture.md`
- **セクション**: Line 92-118（フロントエンド技術構成）
- **内容**: TanStack React Query 5.84.2, Redux Toolkit 2.8.2, openapi-fetch 0.15.0 の使用

#### データフロー

- **ファイル**: `docs/design/todo-app/dataflow.md`
- **セクション**:
  - Line 12-25（全体フロー）
  - Line 29-47（タスク作成フロー）
  - Line 52-66（タスク一覧取得フロー）
  - Line 209-240（状態管理フロー）
- **内容**: Redux + TanStack Query の状態管理、キャッシュ無効化フロー

#### 型定義

- **ファイル**: `app/packages/shared-schemas/src/tasks.ts`
- **セクション**: Line 36-47（taskSchema）, Line 99-155（リクエスト・レスポンススキーマ）
- **内容**: Task型、CreateTaskBody型、UpdateTaskBody型、ChangeTaskStatusBody型の定義

#### Redux状態管理

- **ファイル**: `app/client/src/features/todo/store/taskSlice.ts`
- **セクション**: Line 14-40（TaskFilterState, TaskSortState, TaskSliceState）
- **内容**: フィルタ・ソート状態の定義

#### API仕様

- **ファイル**: `docs/spec/todo-app-requirements.md`
- **セクション**: Line 276-283（APIエンドポイント）
- **内容**:
  - `GET /api/tasks`: タスク一覧取得
  - `POST /api/tasks`: タスク作成
  - `PUT /api/tasks/:id`: タスク更新
  - `DELETE /api/tasks/:id`: タスク削除
  - `PATCH /api/tasks/:id/status`: ステータス変更（タスク定義から追加）

#### 参考実装

- **ファイル**:
  - `app/client/src/features/user/hooks/useUser.ts`
  - `app/client/src/features/user/hooks/useUpdateUser.ts`
- **内容**: DI方式のAPIクライアント取得、エラーハンドリング、キャッシュ無効化パターン

---

## 6. テスト要件

### 信頼性レベル

🔵 **青信号**: 既存テストパターン（useUser.test.tsx, useUpdateUser.test.tsx）から確定

### 要件トレーサビリティマトリクス

| テストケース | 対応要件 | チェックリスト項目 |
|------------|---------|------------------|
| T001 | REQ-006 | useTasks正常系テスト |
| T002 | REQ-201 | 優先度フィルタテスト |
| T003 | REQ-203 | ソートテスト |
| T003b | REQ-202 | **複数ステータスフィルタテスト** |
| T004 | EDGE-005 | ネットワークエラーテスト |
| T005 | NFR-103 | 認証エラー（401）テスト |
| T005b | EDGE-004 | **アクセス権限エラー（403）テスト** |
| T101 | REQ-001 | createTask正常系テスト |
| T101b | REQ-103 | **デフォルト優先度テスト** |
| T102 | EDGE-001 | バリデーションエラーテスト |
| T103 | REQ-002 | updateTask正常系テスト |
| T104 | EDGE-003 | 存在しないタスク（404）テスト |
| T105 | REQ-003 | deleteTask正常系テスト |
| T106 | EDGE-003 | deleteTask存在しないタスク（404）テスト |
| T107 | REQ-004 | changeStatus正常系テスト |
| T108 | - | changeStatus不正なステータス値テスト |

### useTasks のテストケース

#### T001: 正常系 - タスク一覧取得成功

- **Given**: モックAPIが正常にタスク一覧を返す
- **When**: `useTasks()` を呼び出し
- **Then**:
  - `isSuccess === true`
  - `data` が `Task[]` 型で返る
  - `error === null`
- **対応要件**: REQ-006

#### T002: 正常系 - 優先度フィルタ適用

- **Given**: Redux状態で優先度フィルタ「高」が選択されている
- **When**: `useTasks()` を呼び出し
- **Then**:
  - APIクエリに `priority=high` が含まれる
  - 高優先度のタスクのみが返る
- **対応要件**: REQ-201

#### T003: 正常系 - ソート適用

- **Given**: Redux状態でソート順「作成日時昇順」が選択されている
- **When**: `useTasks()` を呼び出し
- **Then**:
  - APIクエリに `sort=created_at_asc` が含まれる
  - タスクが作成日時昇順で返る
- **対応要件**: REQ-203

#### T003b: 正常系 - 複数ステータスフィルタ適用（REQ-202）

- **Given**: Redux状態で `status: ['in_progress', 'in_review']` が選択されている
- **When**: `useTasks()` を呼び出し
- **Then**:
  - APIクエリに `status=in_progress,in_review` が含まれる（カンマ区切りに変換）
  - 進行中+レビュー中のタスクのみが返る
- **対応要件**: REQ-202

#### T004: エラー系 - ネットワークエラー（EDGE-005）

- **Given**: モックfetchがネットワークエラーをthrow
- **When**: `useTasks()` を呼び出し
- **Then**:
  - `isError === true`
  - `error.message === '通信エラーが発生しました。再試行してください'`（統一メッセージ）
- **対応要件**: EDGE-005

#### T005: エラー系 - 認証エラー（401）

- **Given**: モックAPIが401エラーを返す
- **When**: `useTasks()` を呼び出し
- **Then**:
  - `isError === true`
  - `error.message` に「認証」が含まれる
- **対応要件**: NFR-103

#### T005b: エラー系 - アクセス権限エラー（403・EDGE-004）

- **Given**: モックAPIが403エラーを返す
- **When**: `useTasks()` を呼び出し
- **Then**:
  - `isError === true`
  - `error.message` に「アクセス権限がありません」が含まれる
- **対応要件**: EDGE-004

### useTaskMutations のテストケース

#### T101: createTask - 正常系

- **Given**: モックAPIが正常にタスクを作成
- **When**: `createTask.mutate({ title: 'テストタスク', priority: 'high' })` を実行
- **Then**:
  - `isSuccess === true`
  - `data` が `Task` 型で返る
  - `queryClient.invalidateQueries({ queryKey: ['tasks'] })` が呼ばれる
- **対応要件**: REQ-001

#### T101b: createTask - デフォルト優先度テスト（REQ-103）

- **Given**: モックAPIが正常にタスクを作成（priorityフィールドを省略）
- **When**: `createTask.mutate({ title: 'テストタスク' })` を実行（priorityなし）
- **Then**:
  - `isSuccess === true`
  - `data.priority === 'medium'`（サーバー側でデフォルト設定される）
- **対応要件**: REQ-103

#### T102: createTask - バリデーションエラー（空文字列）

- **Given**: モックAPIが400エラー（空文字列）を返す
- **When**: `createTask.mutate({ title: '' })` を実行
- **Then**:
  - `isError === true`
  - `error.message` に「タイトルを入力してください」が含まれる
- **対応要件**: EDGE-001

#### T103: updateTask - 正常系

- **Given**: モックAPIが正常にタスクを更新
- **When**: `updateTask.mutate({ id: 'uuid', input: { title: '更新タスク' } })` を実行
- **Then**:
  - `isSuccess === true`
  - `data` が更新された `Task` 型で返る
  - キャッシュが無効化される
- **対応要件**: REQ-002

#### T104: updateTask - 存在しないタスク（404）

- **Given**: モックAPIが404エラーを返す
- **When**: `updateTask.mutate({ id: 'nonexistent-uuid', input: { title: '更新' } })` を実行
- **Then**:
  - `isError === true`
  - `error.message` に「タスクが見つかりません」が含まれる
- **対応要件**: EDGE-003

#### T105: deleteTask - 正常系

- **Given**: モックAPIが正常にタスクを削除
- **When**: `deleteTask.mutate('uuid')` を実行
- **Then**:
  - `isSuccess === true`
  - キャッシュが無効化される
- **対応要件**: REQ-003

#### T106: deleteTask - 存在しないタスク（404）

- **Given**: モックAPIが404エラーを返す
- **When**: `deleteTask.mutate('nonexistent-uuid')` を実行
- **Then**:
  - `isError === true`
  - `error.message` に「タスクが見つかりません」が含まれる
- **対応要件**: EDGE-003

#### T107: changeStatus - 正常系

- **Given**: モックAPIが正常にステータスを変更
- **When**: `changeStatus.mutate({ id: 'uuid', status: 'in_progress' })` を実行
- **Then**:
  - `isSuccess === true`
  - `data.status === 'in_progress'`
  - キャッシュが無効化される
- **対応要件**: REQ-004

#### T108: changeStatus - 不正なステータス値（400）

- **Given**: モックAPIが400エラー（不正なステータス）を返す
- **When**: `changeStatus.mutate({ id: 'uuid', status: 'invalid_status' as TaskStatus })` を実行
- **Then**:
  - `isError === true`
  - `error.message` に「バリデーション」が含まれる
- **対応要件**: （一般的なエラーハンドリング）

### テストの共通設定

**モック生成**:
```typescript
let mockFetch: Mock<[input: Request], Promise<Response>>;
let queryClient: QueryClient;

beforeEach(() => {
  mockFetch = mock();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
});

afterEach(() => {
  queryClient.clear();
  mock.restore();
  mock.clearAllMocks();
});
```

**Wrapper設定**:
```typescript
const mockClient = createApiClient('http://localhost:3001/api', undefined, {
  fetch: mockFetch as unknown as typeof fetch,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ApiClientProvider client={mockClient}>{children}</ApiClientProvider>
  </QueryClientProvider>
);
```

### 参照元

- **テスト参考**:
  - `app/client/src/features/user/__tests__/useUser.test.tsx`
  - `app/client/src/features/user/__tests__/useUpdateUser.test.tsx`
- **テストガイドライン**: `.claude/skills/common/references/frontend.md` Line 48-136

---

## 7. 実装チェックリスト

### useTasks 実装

- [ ] `useQuery` を使用してタスク一覧を取得
- [ ] `useAppSelector` でRedux状態（filters, sort）を取得
- [ ] `useApiClient` でDI方式のAPIクライアントを取得
- [ ] queryKey に `['tasks', filters, sort]` を指定
- [ ] API呼び出し時にフィルタ・ソートをクエリパラメータに変換
  - [ ] **`status: TaskStatus[]` をカンマ区切り文字列に変換**（REQ-202）
  - [ ] `priority: 'all'` の場合は `undefined` にする（フィルタなし）
  - [ ] `status: []` の場合は `undefined` にする（フィルタなし）
- [ ] エラーレスポンスを `throw new Error()` でハンドリング
- [ ] **ネットワークエラー時は統一メッセージに変換**（EDGE-005）
- [ ] `data` が `null` または `undefined` の場合もエラーとして扱う

### useTaskMutations 実装

#### createTask

- [ ] `useMutation` を使用してタスク作成
- [ ] `useApiClient` でAPIクライアントを取得
- [ ] `useQueryClient` でキャッシュ管理
- [ ] **OpenAPI型定義から `CreateTaskBody` 型エイリアスを定義**
- [ ] `mutationFn` で `apiClient.POST('/api/tasks', { body })` を呼び出し
- [ ] エラーレスポンスを `throw new Error()` でハンドリング
- [ ] **ネットワークエラー時は統一メッセージに変換**（EDGE-005）
- [ ] `onSuccess` で `queryClient.invalidateQueries({ queryKey: ['tasks'] })` を実行

#### updateTask

- [ ] `useMutation` を使用してタスク更新
- [ ] **OpenAPI型定義から `UpdateTaskBody` / `UpdateTaskVariables` 型エイリアスを定義**
- [ ] `mutationFn` で `apiClient.PUT('/api/tasks/{id}', { params, body })` を呼び出し
- [ ] エラーレスポンスを `throw new Error()` でハンドリング
- [ ] **ネットワークエラー時は統一メッセージに変換**（EDGE-005）
- [ ] `onSuccess` で `queryClient.invalidateQueries({ queryKey: ['tasks'] })` を実行

#### deleteTask

- [ ] `useMutation` を使用してタスク削除
- [ ] `mutationFn` で `apiClient.DELETE('/api/tasks/{id}', { params })` を呼び出し
- [ ] エラーレスポンスを `throw new Error()` でハンドリング
- [ ] **ネットワークエラー時は統一メッセージに変換**（EDGE-005）
- [ ] `onSuccess` で `queryClient.invalidateQueries({ queryKey: ['tasks'] })` を実行

#### changeStatus

- [ ] `useMutation` を使用してステータス変更
- [ ] **OpenAPI型定義から `ChangeTaskStatusBody` / `ChangeStatusVariables` 型エイリアスを定義**
- [ ] `mutationFn` で `apiClient.PATCH('/api/tasks/{id}/status', { params, body })` を呼び出し
- [ ] エラーレスポンスを `throw new Error()` でハンドリング
- [ ] **ネットワークエラー時は統一メッセージに変換**（EDGE-005）
- [ ] `onSuccess` で `queryClient.invalidateQueries({ queryKey: ['tasks'] })` を実行

### テスト実装

#### useTasks テスト

- [ ] T001: 正常系 - タスク一覧取得成功
- [ ] T002: 正常系 - 優先度フィルタ適用
- [ ] T003: 正常系 - ソート適用
- [ ] **T003b: 正常系 - 複数ステータスフィルタ適用（REQ-202）**
- [ ] T004: エラー系 - ネットワークエラー（EDGE-005・統一メッセージ）
- [ ] T005: エラー系 - 認証エラー（401）
- [ ] **T005b: エラー系 - アクセス権限エラー（403・EDGE-004）**

#### useTaskMutations テスト

- [ ] T101: createTask - 正常系
- [ ] **T101b: createTask - デフォルト優先度テスト（REQ-103）**
- [ ] T102: createTask - バリデーションエラー（空文字列）
- [ ] T103: updateTask - 正常系
- [ ] T104: updateTask - 存在しないタスク（404）
- [ ] T105: deleteTask - 正常系
- [ ] T106: deleteTask - 存在しないタスク（404）
- [ ] T107: changeStatus - 正常系
- [ ] T108: changeStatus - 不正なステータス値（400）

### コード品質

- [ ] 型安全性の確保（`any` 型の不使用）
- [ ] **OpenAPI型定義からの型エイリアス定義（`CreateTaskBody`, `UpdateTaskBody`, etc.）**
- [ ] Docコメントの記載（機能概要、使用例）
- [ ] エラーハンドリングの適切な実装
- [ ] **ネットワークエラー正規化ロジックの実装**
- [ ] **`TaskStatus[]` → カンマ区切り文字列変換ロジックの実装**
- [ ] テストカバレッジ100%の達成
- [ ] `docker compose exec client bun test` でテストが通る
- [ ] `docker compose exec client bunx tsc --noEmit` で型チェックが通る

---

## 8. 完了条件

### 実装完了条件

- [ ] `useTasks` が実装される
- [ ] `useTaskMutations` が実装される
- [ ] すべてのテストケース（T001～T108, T003b, T005b, T101b）が実装される
- [ ] テストカバレッジ100%
- [ ] 型チェックがすべて通る
- [ ] 既存実装（useUser, useUpdateUser）と一貫したパターン

### 品質基準

- [ ] DI方式のAPIクライアント取得
- [ ] OpenAPI型定義からの型エイリアス定義
- [ ] エラーハンドリングの適切な実装
- [ ] ネットワークエラー正規化ロジックの実装
- [ ] `TaskStatus[]` → カンマ区切り文字列変換ロジックの実装
- [ ] キャッシュ無効化の正確な実装
- [ ] Redux状態との適切な連携
- [ ] Docコメントの記載

### レビュー基準

- [x] Codex MCPによる品質レビューを実施（完了・改善点反映済み）
- [ ] 既存コードとの整合性を確認
- [ ] 要件定義書との整合性を確認（要件トレーサビリティマトリクス準拠）
- [ ] 設計文書との整合性を確認
- [ ] テスタビリティを確認

---

## 9. 備考

### Codex MCP レビュー結果反映事項

以下の改善点をレビュー結果に基づき反映しました：

1. **信頼性レベルの修正**: NFR-001（🟡）, NFR-004（🔴）, EDGE-101（🟡）を元の要件定義書と整合
2. **型定義の修正**: `CreateTaskInput` → `CreateTaskBody` 等、OpenAPI型定義からの型エイリアスに統一
3. **REQ-202対応**: 複数ステータスフィルタのテストケース（T003b）追加、カンマ区切り変換ロジック明記
4. **EDGE-004対応**: 403エラーのテストケース（T005b）追加
5. **REQ-103対応**: デフォルト優先度のテストケース（T101b）追加
6. **EDGE-005対応**: ネットワークエラーメッセージ正規化ロジック明記
7. **要件トレーサビリティマトリクス**: テストケースと要件の対応関係を明確化

### 既存実装との一貫性

本実装は以下の既存実装パターンと完全に整合するように設計されています：

- `app/client/src/features/user/hooks/useUser.ts`
- `app/client/src/features/user/hooks/useUpdateUser.ts`

これにより、プロジェクト全体でのコード品質と可読性が保たれます。

### Redux との連携

- **Redux**: UIフィルタ・ソート状態のみを管理
- **TanStack Query**: サーバー状態（タスクデータ）を管理

この責務分離により、状態管理が明確になり、保守性が向上します。

### キャッシュ戦略

- **無効化タイミング**: Mutation成功時に即座に `invalidateQueries`
- **自動再取得**: キャッシュ無効化後、アクティブなクエリは自動的に再取得される
- **queryKey**: `['tasks', filters, sort]` により、フィルタ・ソート変更時に別キャッシュとして管理

### 次のステップ

本TDD要件定義書の完成後、以下のステップに進みます：

1. ~~**Codex MCPによる品質レビュー**~~: 完了・改善点反映済み
2. **テストケース実装**: TDDアプローチでテストを先に実装
3. **本体実装**: テストが通るように本体を実装
4. **統合テスト**: 実際のUIコンポーネントとの統合確認

---

**作成完了**: 2025-01-26
**レビュー実施**: 2025-01-26 (Codex MCP)
**最終更新**: 2025-01-26

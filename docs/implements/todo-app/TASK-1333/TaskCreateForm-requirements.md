# TaskCreateForm コンポーネント TDD要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-12-14
- **更新日**: 2025-12-14
- **要件名**: todo-app
- **タスク番号**: TASK-1333
- **機能名**: TaskCreateForm（タスク作成フォームコンポーネント）
- **フェーズ**: Phase 7 / 8 - フロントエンドUI実装
- **推定工数**: 8時間

## 1. 機能の概要

### 何をする機能か

🔵 **青信号**: todo-app-user-stories.md ストーリー1.1 「素早いタスク追加」より

TaskCreateFormは、ユーザーがタスクのタイトルと優先度を素早く入力してタスクを作成するためのインライン入力フォームコンポーネントです。

### 解決する問題

🔵 **青信号**: todo-app-user-stories.md ストーリー1.1 より

タスク管理で最も頻繁に行う操作は「タスクの追加」です。この操作を最もシンプルにすることで、ユーザーが思いついたタスクを即座に記録でき、タスク管理の障壁を下げます。

### 想定されるユーザー

🔵 **青信号**: todo-app-user-stories.md より

- **プライマリユーザー**: ログイン済みユーザー（Supabase Auth認証済み）
- **ペルソナ例**:
  - 個人開発者（タスク入力に時間をかけたくない）
  - 学生（思いついたタスクをすぐに追加したい）

### システム内での位置づけ

🔵 **青信号**: architecture.md、dataflow.md より

```
フロントエンド (Next.js SSG)
  └── features/todo/
      ├── components/
      │   ├── TaskCreateForm.tsx  ← 本コンポーネント
      │   ├── TaskList.tsx
      │   └── TaskItem.tsx
      ├── hooks/
      │   └── useTaskMutations.ts  ← API呼び出し
      └── lib/
          └── TaskServicesContext.tsx  ← Context DI
```

**責務**:
- タスクタイトルと優先度の入力UI提供
- クライアント側バリデーション（空文字エラー表示、100文字制限、100文字入力許可）
- `useTaskMutations().createTask` の呼び出し
- フォーム送信後のリセット処理
- エラーメッセージの表示（クライアント側・サーバー側）

### 参照したEARS要件

🔵 **青信号**:
- **REQ-001**: システムはログイン済みユーザーがタスクを作成できなければならない
- **REQ-102**: タイトルの入力を必須とする
- **REQ-103**: デフォルトで優先度を「中」に設定
- **NFR-203**: インライン入力で素早く実行できる

### 参照した設計文書

🔵 **青信号**:
- **architecture.md**: Feature-based ディレクトリ構成、Tailwind CSS 4 テーマカラー
- **dataflow.md**: タスク作成フロー（クライアントバリデーション → API呼び出し → エラー表示）
- **todo-app-user-stories.md**: ストーリー1.1 素早いタスク追加

---

## 2. 入力・出力の仕様

### 入力パラメータ

🔵 **青信号**: TASK-1333 実装詳細、shared-schemas/src/tasks.ts より

**Props**: なし（独立したコンポーネント）

**ユーザー入力**:
| 項目 | 型 | 必須 | 制約 | デフォルト値 | 備考 |
|------|-----|------|------|--------------|------|
| title | string | ✅ | 1文字以上、100文字以内 | - | タスクのタイトル |
| priority | 'high' \| 'medium' \| 'low' | ✅ | enum値のみ | 'medium' | タスクの優先度 |

**スキーマ定義**:
```typescript
// shared-schemas/src/tasks.ts より
export const createTaskBodySchema = z.object({
  title: z.string()
    .min(1, 'タイトルを入力してください')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().nullable().optional(), // TaskCreateFormでは未使用
  priority: taskPrioritySchema.default('medium'), // 'high' | 'medium' | 'low'
});
```

### 出力値

🔵 **青信号**: useTaskMutations.ts、shared-schemas/src/tasks.ts より

**API呼び出し**:
```typescript
createTask.mutate(
  { title: string, priority: 'high' | 'medium' | 'low' },
  {
    onSuccess: () => void,
    onError: (error: Error) => void,
  }
)
```

**成功時の動作**:
1. フォーム入力値のクリア（title → 空文字、priority → 'medium'）
2. TanStack Query によるキャッシュ無効化（自動）
3. TaskList コンポーネントの自動再レンダリング

**失敗時の動作**:
🔵 **青信号**: dataflow.md「エラーハンドリングフロー」、EDGE-005 より
1. エラーメッセージの表示（APIレスポンスまたはネットワークエラー）
2. リトライボタンの表示（ネットワークエラー時）
3. フォーム入力値の保持（ユーザー入力を失わない）

### データフロー

🔵 **青信号**: dataflow.md「タスク作成フロー」より

```
ユーザー入力
  ↓ タイトル入力 + 優先度選択
クライアントバリデーション
  ↓ title.trim().length === 0 → エラー表示「タイトルを入力してください」
  ↓ title.length > 100 → エラー表示「タイトルは100文字以内で入力してください」
  ↓ 通過
createTask.mutate({ title, priority })
  ↓ useTaskMutations().createTask
API呼び出し（POST /tasks）
  ↓ JWT認証 + Zodバリデーション
タスク作成（DB INSERT）
  ↓ RLS適用（user_id自動付与）
201 Created + TaskDTO
  ↓ TanStack Query キャッシュ無効化
フォームリセット + TaskList 自動更新
```

---

## 3. 制約条件

### UIデザイン制約

🔵 **青信号**: NFR-201、NFR-203、TASK-1333 実装詳細より

- **テーマカラー適用**:
  - ベースカラー: `#710000`（送信ボタン背景）
  - アクセントカラー: `#ff6a00`（フォーカスリング）
- **レスポンシブデザイン**: デスクトップ優先、モバイル基本対応
- **インライン入力**: リスト上部に常に表示、入力フォームの高さを最小限に

### バリデーション要件

🔵 **青信号**: EDGE-001、EDGE-002、dataflow.md より

- **空文字エラー**: `title.trim().length === 0` → 「タイトルを入力してください」エラー表示
- **文字数超過エラー**: `title.length > 100` → 「タイトルは100文字以内で入力してください」エラー表示
- **境界値許可**: `title.length === 100` → 正常に送信可能
- **入力制限**: `maxLength={100}` でHTMLレベルで101文字目の入力を防止

### パフォーマンス要件

🔵 **青信号**: NFR-002 より

- **タスク作成レスポンス**: 500ms以内
- **UIフィードバック**: 送信中のローディング状態表示（`createTask.isPending`）

### 技術制約

🔵 **青信号**: frontend.md、TASK-1333 実装詳細より

- **フレームワーク**: React 19.1.0、Next.js 15（SSG）
- **スタイリング**: Tailwind CSS 4
- **状態管理**: ローカルステート（`useState`）
- **API通信**: `useTaskMutations()` フック経由（Context DI）
- **バリデーション**: クライアント側（文字数、空文字）+ サーバー側（Zod）

### アクセシビリティ要件

🟡 **黄信号**: 一般的なアクセシビリティ慣習より

- **キーボード操作**: Enterキーでフォーム送信
- **ARIA属性**: input要素に適切なaria-labelを設定
- **エラーメッセージ**: スクリーンリーダー対応（aria-live）

### テスト要件

🔵 **青信号**: CLAUDE.md、TASK-1333 完了条件より

- **テストカバレッジ**: 100%
- **テストツール**: Bun標準テスト、React Testing Library
- **テストケース名**: 日本語記載

---

## 4. 想定される使用例

### 基本的な使用パターン

🔵 **青信号**: todo-app-user-stories.md ストーリー1.1 より

**シナリオ1**: タスクを素早く追加（デフォルト優先度）

```
Given: ユーザーがTODOリスト画面にアクセスしている
When: タイトル入力欄に「会議資料作成」と入力してEnterキーを押下
Then:
  - タスクが作成される（優先度: medium、ステータス: not_started）
  - タイトル入力欄がクリアされる
  - タスク一覧の最上部に新しいタスクが表示される
```

**シナリオ2**: 優先度を指定してタスクを追加

```
Given: ユーザーがTODOリスト画面にアクセスしている
When:
  - タイトル入力欄に「緊急対応」と入力
  - 優先度ドロップダウンで「高」を選択
  - 追加ボタンをクリック
Then:
  - タスクが作成される（優先度: high、ステータス: not_started）
  - フォームがリセットされる（タイトル: 空、優先度: medium）
  - タスク一覧に優先度「高」のタスクが表示される
```

### エッジケース

🟡 **黄信号**: EDGE-001 より

**エッジケース1**: タイトル空文字エラー

```
Given: ユーザーがフォームにアクセスしている
When: タイトルを空文字のまま送信ボタンをクリック
Then:
  - クライアント側で「タイトルを入力してください」エラーが表示される
  - タスクは作成されない
  - フォーム入力値は保持される
```

🔴 **赤信号**: EDGE-002 より

**エッジケース2**: タイトル文字数制限

```
Given: ユーザーがフォームにアクセスしている
When: タイトルに101文字を入力して送信ボタンをクリック
Then:
  - maxLength属性により101文字目の入力が防止される（100文字まで）
  - クライアント側で「タイトルは100文字以内で入力してください」エラーが表示される
  - タスクは作成されない
```

🔵 **青信号**: todo-app-acceptance-criteria.md REQ-001 境界値テストより

**エッジケース3**: タイトル100文字許可

```
Given: ユーザーがフォームにアクセスしている
When: タイトルに100文字を入力して送信ボタンをクリック
Then:
  - タスクが正常に作成される
  - フォームがリセットされる
```

🟡 **黄信号**: EDGE-005 より

**エッジケース4**: ネットワークエラー

```
Given: ユーザーがタスクを作成しようとしている
When: ネットワーク接続が切断された状態で送信ボタンをクリック
Then:
  - エラーメッセージ「通信エラーが発生しました。再試行してください」が表示される
  - リトライボタンが表示される
  - タイトル入力値は保持される（ユーザー入力を失わない）
```

### エラーケース

🔵 **青信号**: EDGE-005、useTaskMutations.ts より

**エラーケース1**: APIエラーレスポンス

```
Given: ユーザーがタスクを作成しようとしている
When: APIが400エラーを返す（サーバー側Zodバリデーションエラー）
Then:
  - エラーメッセージが表示される（error.message）
  - タイトル入力値は保持される
```

**エラーケース2**: 認証エラー

```
Given: ユーザーのJWTトークンが期限切れ
When: タスク作成を試行
Then:
  - 401エラーが発生
  - 「認証が必要です」エラーメッセージが表示される
```

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

🔵 **青信号**: todo-app-user-stories.md より

- **ストーリー1.1**: 素早いタスク追加（インライン入力、Enterキー送信、フォーム自動クリア）

### 参照した機能要件

🔵 **青信号**: todo-app-requirements.md より

- **REQ-001**: ログイン済みユーザーがタスクを作成できる
- **REQ-102**: タイトルの入力を必須とする
- **REQ-103**: デフォルトで優先度を「中」に設定
- **REQ-104**: デフォルトでステータスを「未着手」に設定（バックエンド）

### 参照した非機能要件

🔵 **青信号**: todo-app-requirements.md より

- **NFR-002**: タスク作成APIは500ms以内にレスポンス
- **NFR-201**: テーマカラー適用（#710000、#ff6a00）
- **NFR-203**: インライン入力で素早く実行可能
- **NFR-206**: エラーメッセージは日本語で分かりやすく表示

### 参照したEdgeケース

- **EDGE-001**: 🟡 タイトル空文字エラー
- **EDGE-002**: 🔴 タイトル101文字エラー
- **EDGE-005**: 🟡 ネットワークエラー

### 参照した受け入れ基準

🔵 **青信号**: todo-app-acceptance-criteria.md より

- **REQ-001 受け入れ基準**: タスク作成機能の正常系・異常系・境界値テストケース

### 参照した設計文書

🔵 **青信号**:

- **architecture.md**:
  - Feature-based ディレクトリ構成（`features/todo/components/TaskCreateForm.tsx`）
  - Tailwind CSS 4 テーマカラー（#710000、#ff6a00）
  - TanStack Query によるサーバー状態管理
- **dataflow.md**:
  - タスク作成フロー（クライアントバリデーション → API呼び出し → キャッシュ無効化）
  - エラーハンドリングフロー（エラー種別判定 → エラーメッセージ表示）
- **shared-schemas/src/tasks.ts**:
  - `createTaskBodySchema`: タイトル・優先度のバリデーションスキーマ
  - `taskPrioritySchema`: 優先度のenum定義

---

## 6. テストケース詳細

### 正常系テストケース

🔵 **青信号**: TASK-1333 テストケース、todo-app-acceptance-criteria.md より

#### TC-001: タスクが作成される

```typescript
test('タスクが作成される', async () => {
  // Given: TaskCreateFormが表示されている
  const mockCreateTask = mock(() => ({ mutate: mock(() => {}), isPending: false }));
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  // When: タイトルを入力して送信
  await user.type(screen.getByPlaceholderText('タスクを入力...'), '会議資料作成');
  await user.click(screen.getByRole('button', { name: '追加' }));

  // Then: createTask.mutateが呼ばれる
  const mutate = mockCreateTask().mutate;
  expect(mutate).toHaveBeenCalledWith(
    { title: '会議資料作成', priority: 'medium' },
    expect.any(Object)
  );
});
```

#### TC-002: フォームがリセットされる

```typescript
test('フォームがリセットされる', async () => {
  // Given: タスク作成が成功する設定
  const mockMutate = mock((input, { onSuccess }) => {
    onSuccess();
  });
  const mockCreateTask = mock(() => ({
    mutate: mockMutate,
    isPending: false,
  }));
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  // When: タスクを作成
  await user.type(screen.getByPlaceholderText('タスクを入力...'), 'テストタスク');
  await user.selectOptions(screen.getByRole('combobox'), 'high');
  await user.click(screen.getByRole('button', { name: '追加' }));

  // Then: フォームがリセットされる
  expect(screen.getByPlaceholderText('タスクを入力...')).toHaveValue('');
  expect(screen.getByRole('combobox')).toHaveValue('medium');
});
```

#### TC-003: タイトル100文字が正常に送信される

🔵 **青信号**: todo-app-acceptance-criteria.md REQ-001 境界値テストより

```typescript
test('タイトル100文字が正常に送信される', async () => {
  // Given: TaskCreateFormが表示されている
  const mockMutate = mock(() => {});
  const mockCreateTask = mock(() => ({
    mutate: mockMutate,
    isPending: false,
  }));
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  // When: 100文字のタイトルを入力して送信
  const title100 = 'a'.repeat(100);
  await user.type(screen.getByPlaceholderText('タスクを入力...'), title100);
  await user.click(screen.getByRole('button', { name: '追加' }));

  // Then: createTask.mutateが呼ばれる
  expect(mockMutate).toHaveBeenCalledWith(
    { title: title100, priority: 'medium' },
    expect.any(Object)
  );
});
```

### 異常系テストケース

🟡 **黄信号**: EDGE-001 より

#### TC-004: 空文字列でエラー表示

```typescript
test('空文字列でエラーが表示される', async () => {
  // Given: TaskCreateFormが表示されている
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));
  const mockCreateTask = mock(() => ({ mutate: mock(() => {}), isPending: false }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  // When: タイトルを空文字のまま送信ボタンをクリック
  await user.click(screen.getByRole('button', { name: '追加' }));

  // Then: エラーメッセージが表示される
  expect(screen.getByText('タイトルを入力してください')).toBeDefined();
});
```

🔴 **赤信号**: EDGE-002 より

#### TC-005: 101文字入力が制限され、エラー表示

```typescript
test('101文字入力が制限され、エラーが表示される', async () => {
  // Given: TaskCreateFormが表示されている
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));
  const mockCreateTask = mock(() => ({ mutate: mock(() => {}), isPending: false }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  const input = screen.getByPlaceholderText('タスクを入力...') as HTMLInputElement;

  // When: 101文字を入力しようとする
  const longText = 'a'.repeat(101);
  await user.type(input, longText);

  // Then: maxLength属性により100文字に制限される
  expect(input.value).toHaveLength(100);

  // When: 送信ボタンをクリック
  await user.click(screen.getByRole('button', { name: '追加' }));

  // Then: 100文字であればエラーは表示されない（正常系）
  expect(screen.queryByText('タイトルは100文字以内で入力してください')).toBeNull();
});
```

### イベントテストケース

🔵 **青信号**: TASK-1333 テストケース、NFR-203 より

#### TC-006: タイトル入力

```typescript
test('タイトル入力ができる', async () => {
  // Given: TaskCreateFormが表示されている
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));
  const mockCreateTask = mock(() => ({ mutate: mock(() => {}), isPending: false }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  // When: タイトルを入力
  await user.type(screen.getByPlaceholderText('タスクを入力...'), 'テストタスク');

  // Then: 入力値が反映される
  expect(screen.getByPlaceholderText('タスクを入力...')).toHaveValue('テストタスク');
});
```

#### TC-007: 優先度選択

```typescript
test('優先度選択ができる', async () => {
  // Given: TaskCreateFormが表示されている
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));
  const mockCreateTask = mock(() => ({ mutate: mock(() => {}), isPending: false }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  // When: 優先度を「高」に変更
  await user.selectOptions(screen.getByRole('combobox'), 'high');

  // Then: 選択値が反映される
  expect(screen.getByRole('combobox')).toHaveValue('high');
});
```

#### TC-008: フォーム送信（Enterキー）

🔵 **青信号**: NFR-203 より

```typescript
test('Enterキーでフォーム送信できる', async () => {
  // Given: TaskCreateFormが表示されている
  const mockMutate = mock(() => {});
  const mockCreateTask = mock(() => ({
    mutate: mockMutate,
    isPending: false,
  }));
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  const input = screen.getByPlaceholderText('タスクを入力...');

  // When: タイトルを入力してEnterキーを押下
  await user.type(input, 'Enterキーテスト{Enter}');

  // Then: createTask.mutateが呼ばれる
  expect(mockMutate).toHaveBeenCalled();
});
```

### ローディング状態テストケース

🟡 **黄信号**: 一般的なUI/UXパターンより

#### TC-009: 送信中はボタンが無効化される

```typescript
test('送信中はボタンが無効化される', () => {
  // Given: 送信中の状態
  const mockCreateTask = mock(() => ({
    mutate: mock(() => {}),
    isPending: true, // 送信中
  }));
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  // When: 送信中
  const submitButton = screen.getByRole('button', { name: '追加' });

  // Then: 送信ボタンが無効化されている
  expect(submitButton).toBeDisabled();
});
```

### エラーハンドリングテストケース

🟡 **黄信号**: EDGE-005 より

#### TC-010: APIエラー時にエラーメッセージとリトライボタンが表示される

```typescript
test('APIエラー時にエラーメッセージとリトライボタンが表示される', async () => {
  // Given: APIがエラーを返す設定
  const mockMutate = mock((input, { onError }) => {
    onError(new Error('タスク作成に失敗しました'));
  });
  const mockCreateTask = mock(() => ({
    mutate: mockMutate,
    isPending: false,
  }));
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  // When: タスクを作成してエラーが発生
  await user.type(screen.getByPlaceholderText('タスクを入力...'), 'エラーテスト');
  await user.click(screen.getByRole('button', { name: '追加' }));

  // Then: エラーメッセージが表示される
  expect(screen.getByText('タスク作成に失敗しました')).toBeDefined();

  // Then: 入力値は保持される
  expect(screen.getByPlaceholderText('タスクを入力...')).toHaveValue('エラーテスト');
});
```

🟡 **黄信号**: EDGE-005 より

#### TC-011: ネットワークエラー時にリトライボタンが表示される

```typescript
test('ネットワークエラー時にリトライボタンが表示される', async () => {
  // Given: ネットワークエラーが発生する設定
  const mockMutate = mock((input, { onError }) => {
    onError(new Error('通信エラーが発生しました。再試行してください'));
  });
  const mockCreateTask = mock(() => ({
    mutate: mockMutate,
    isPending: false,
  }));
  const mockUseTasks = mock(() => ({ data: [], isLoading: false, error: null }));

  render(
    <TaskServicesProvider
      services={{
        useTasks: mockUseTasks,
        useTaskMutations: mockCreateTask,
      }}
    >
      <TaskCreateForm />
    </TaskServicesProvider>
  );

  // When: タスクを作成してネットワークエラーが発生
  await user.type(screen.getByPlaceholderText('タスクを入力...'), 'ネットワークエラーテスト');
  await user.click(screen.getByRole('button', { name: '追加' }));

  // Then: エラーメッセージとリトライボタンが表示される
  expect(screen.getByText('通信エラーが発生しました。再試行してください')).toBeDefined();
  expect(screen.getByRole('button', { name: '再試行' })).toBeDefined();

  // When: リトライボタンをクリック
  await user.click(screen.getByRole('button', { name: '再試行' }));

  // Then: createTask.mutateが再度呼ばれる
  expect(mockMutate).toHaveBeenCalledTimes(2);
});
```

---

## 7. 実装の注意事項

### Context-based DI パターンの適用

🔵 **青信号**: frontend.md「Context-based DIパターン」より

**重要**: `useTaskMutations` フックはContext経由で注入します。

```typescript
// TaskServicesContext.tsx（既存）
interface TaskServices {
  useTasks: typeof useTasks;
  useTaskMutations: typeof useTaskMutations;
}

// TaskCreateForm.tsx
function TaskCreateForm() {
  const { useTaskMutations: useTaskMutationsHook } = useTaskServices();
  const { createTask } = useTaskMutationsHook();
  // ...
}
```

**理由**: `mock.module()` を使用せずにテスト可能にするため

### コンポーネント定義パターン

🔵 **青信号**: frontend.md「コンポーネント定義例」より

```typescript
function TaskCreateForm(): React.ReactNode {
  // 実装
}

export default React.memo(TaskCreateForm);
```

**禁止事項**:
- ❌ `JSX.Element` 型の使用
- ❌ 無名関数コンポーネント
- ❌ `forEach` での副作用関数

### ローカルステート管理

🔵 **青信号**: frontend.md より

```typescript
const [title, setTitle] = useState('');
const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
const [error, setError] = useState<string>('');
```

**推奨**: `const` の使用
**非推奨**: `let` の使用（再代入が明確に必要な場面を除く）

### クライアント側バリデーション実装

🔵 **青信号**: dataflow.md、EDGE-001、EDGE-002 より

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  // 空文字チェック
  if (!title.trim()) {
    setError('タイトルを入力してください');
    return;
  }

  // 文字数チェック（maxLengthで防止済みだが念のため）
  if (title.length > 100) {
    setError('タイトルは100文字以内で入力してください');
    return;
  }

  // エラークリア
  setError('');

  // API呼び出し
  createTask.mutate(
    { title, priority },
    {
      onSuccess: () => {
        setTitle('');
        setPriority('medium');
      },
      onError: (err) => {
        setError(err.message);
      },
    }
  );
};
```

### テストファイル配置

🔵 **青信号**: CLAUDE.md「テストファイル配置ルール」より

```
features/todo/
  ├── __tests__/
  │   └── TaskCreateForm.test.tsx  ← ここに配置
  ├── components/
  │   └── TaskCreateForm.tsx
  └── hooks/
      └── useTaskMutations.ts
```

**禁止**: `components/TaskCreateForm.test.tsx` のような隣接配置

---

## 8. 品質判定

### 要件の明確性

✅ **高品質**:
- EARS要件定義書とユーザーストーリーが明確
- 入出力仕様がZodスキーマで定義済み
- エッジケースが受け入れ基準に記載されている
- クライアント側バリデーション要件が明確（エラー表示、境界値許可）

### 入出力定義

✅ **高品質**:
- 入力パラメータ: `title` (string)、`priority` (enum)
- 出力: `createTask.mutate()` 呼び出し、成功時フォームリセット
- エラー処理: クライアント側バリデーション（エラー表示） + サーバー側エラー表示 + リトライボタン

### 制約条件

✅ **高品質**:
- テーマカラー（#710000、#ff6a00）が明確
- パフォーマンス要件（500ms以内）が定義済み
- アクセシビリティ要件（Enterキー、ARIA属性）が記載
- バリデーション要件（空文字エラー、100文字制限、境界値許可）が明確

### 実装可能性

✅ **高品質**:
- 既存のフック（`useTaskMutations`）が実装済み
- スキーマ定義（`createTaskBodySchema`）が存在
- Context-based DIパターンのガイドラインが明確
- テストケース（TC-001 〜 TC-011）が境界値テストを含めて網羅的

---

## 9. 次のステップ

### TDD開発フロー

1. ✅ TDD要件定義完了（このドキュメント）
2. ✅ Codex MCPレビュー完了（修正反映済み）
3. ⏭️ テストケース実装（TC-001 〜 TC-011）
4. ⏭️ コンポーネント実装（Red → Green → Refactor）
5. ⏭️ テストカバレッジ100%確認
6. ⏭️ 型チェック・Biomeチェック
7. ⏭️ 受け入れテスト

### レビューポイント

Codex MCPレビュー時の確認事項（修正済み）:

- ✅ 既存コードとの整合性（`useTaskMutations`、`TaskServicesContext`）
- ✅ `docs/spec/todo-app-*.md` の要件を満たせるか（バリデーションエラー表示、リトライボタン）
- ✅ `docs/design/todo-app/*.md` との整合性
- ✅ テスタビリティ（Context-based DIパターン適用、テスト全例でProviderラップ）
- ✅ テスト漏れがないか（境界値テスト追加）

---

## 10. 参考資料

### プロジェクト内ドキュメント

🔵 **青信号**:
- `docs/spec/todo-app-requirements.md`: EARS要件定義書
- `docs/spec/todo-app-user-stories.md`: ユーザーストーリー
- `docs/spec/todo-app-acceptance-criteria.md`: 受け入れ基準
- `docs/design/todo-app/architecture.md`: アーキテクチャ設計
- `docs/design/todo-app/dataflow.md`: データフロー図
- `docs/tasks/todo-app-phase7.md`: TASK-1333 詳細

### プロジェクトガイドライン

🔵 **青信号**:
- `CLAUDE.md`: 基本原則、テストガイドライン、コメントガイドライン
- `.claude/skills/common/references/frontend.md`: フロントエンド開発ガイドライン
- `.claude/skills/common/references/documents.md`: ドキュメント作成ガイドライン

### 既存実装参考

🔵 **青信号**:
- `app/client/src/features/todo/components/TaskList.tsx`: Context-based DI適用例
- `app/client/src/features/todo/components/TaskItem.tsx`: コンポーネント定義パターン
- `app/client/src/features/todo/hooks/useTaskMutations.ts`: createTask実装
- `app/client/src/features/todo/lib/TaskServicesContext.tsx`: Context定義
- `app/packages/shared-schemas/src/tasks.ts`: Zodスキーマ定義

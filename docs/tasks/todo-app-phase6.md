# TODO リストアプリ - Phase 6: フロントエンド基盤実装

## 📄 フェーズ情報

- **要件名**: TODO リストアプリ
- **フェーズ**: Phase 6 / 8
- **期間**: 4日間（32時間）
- **担当**: フロントエンド
- **目標**: Redux設定、API型定義、TanStack Query設定

## 🎯 フェーズ概要

### 目的

フロントエンド開発の基盤を整備し、Redux ToolkitでUIフィルタ・ソート状態を管理、
TanStack Queryでサーバー状態を管理するための設定を実装。

### 成果物

- ✅ Redux Store設定（taskSlice）
- ✅ TanStack Query設定（queryClient）
- ✅ API Client設定（openapi-fetch）
- ✅ カスタムフック（useTaskQuery, useTaskMutations）
- ✅ ユニットテスト

### 依存関係

- **前提条件**: Phase 1, 5完了（型定義、API実装）
- **このフェーズ完了後に開始可能**: Phase 7（UI実装）

## 📅 週次計画

### Week 1（4日間）

**Day 1**: TASK-1327 - Redux Store設定
**Day 2**: TASK-1328 - TanStack Query設定
**Day 3**: TASK-1329 - API Client設定
**Day 4**: TASK-1330 - カスタムフック実装

## 📋 タスク一覧

### TASK-1327: Redux Store設定

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1326
- **要件名**: TODO リストアプリ

#### 実装詳細

ファイル: `app/client/src/features/todo/store/taskSlice.ts`

```typescript
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TaskPriority, TaskStatus } from '@/types/api/generated';

export interface TaskFilterState {
  priority: TaskPriority | 'all';
  status: TaskStatus[];
}

export interface TaskSortState {
  sortBy: 'created_at_desc' | 'created_at_asc' | 'priority_desc';
}

export interface TaskSliceState {
  filters: TaskFilterState;
  sort: TaskSortState;
}

const initialState: TaskSliceState = {
  filters: {
    priority: 'all',
    status: [],
  },
  sort: {
    sortBy: 'created_at_desc',
  },
};

export const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setPriorityFilter: (state, action: PayloadAction<TaskPriority | 'all'>) => {
      state.filters.priority = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<TaskStatus[]>) => {
      state.filters.status = action.payload;
    },
    setSortBy: (state, action: PayloadAction<TaskSortState['sortBy']>) => {
      state.sort.sortBy = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.sort = initialState.sort;
    },
  },
});

export const { setPriorityFilter, setStatusFilter, setSortBy, resetFilters } = taskSlice.actions;
export default taskSlice.reducer;
```

ファイル: `app/client/src/store/index.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import taskReducer from '@/features/todo/store/taskSlice';

export const store = configureStore({
  reducer: {
    task: taskReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

テストケース:
- 正常系: 優先度フィルタ変更
- 正常系: ステータスフィルタ変更
- 正常系: ソート変更
- 正常系: フィルタリセット

#### 完了条件

- [ ] Redux Storeが設定される
- [ ] taskSliceが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-201, REQ-202, REQ-203
- 技術スタック: Redux Toolkit 2.8.2

---

### TASK-1328: TanStack Query設定

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1327
- **要件名**: TODO リストアプリ

#### 実装詳細

ファイル: `app/client/src/lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30秒
      gcTime: 5 * 60 * 1000, // 5分
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

ファイル: `app/client/src/app/providers.tsx`

```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { queryClient } from '@/lib/queryClient';
import { store } from '@/store';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );
}
```

テストケース:
- 正常系: QueryClientが作成される
- 正常系: デフォルトオプション確認

#### 完了条件

- [ ] TanStack Queryが設定される
- [ ] Providersコンポーネントが実装される
- [ ] テストカバレッジ100%

#### 参照

- 技術スタック: TanStack React Query 5.84.2

---

### TASK-1329: API Client設定

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1328
- **要件名**: TODO リストアプリ

#### 実装詳細

ファイル: `app/client/src/lib/api.ts`

```typescript
import createClient from 'openapi-fetch';
import type { paths } from '@/types/api/generated';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = createClient<paths>({
  baseUrl,
});

// JWT認証ヘッダー追加
export const setAuthToken = (token: string) => {
  apiClient.use({
    onRequest: async ({ request }) => {
      request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
  });
};
```

テストケース:
- 正常系: apiClientが作成される
- 正常系: 認証ヘッダーが設定される

#### 完了条件

- [ ] API Clientが設定される
- [ ] 認証ヘッダー設定が実装される
- [ ] テストカバレッジ100%

#### 参照

- 技術スタック: openapi-fetch 0.15.0

---

### TASK-1330: カスタムフック実装

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1329
- **要件名**: TODO リストアプリ

#### 実装詳細

ファイル: `app/client/src/features/todo/hooks/useTasks.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '@/lib/api';
import type { RootState } from '@/store';

export const useTasks = () => {
  const filters = useSelector((state: RootState) => state.task.filters);
  const sort = useSelector((state: RootState) => state.task.sort);

  return useQuery({
    queryKey: ['tasks', filters, sort],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/api/tasks', {
        params: {
          query: {
            priority: filters.priority === 'all' ? undefined : filters.priority,
            status: filters.status.length > 0 ? filters.status.join(',') : undefined,
            sort: sort.sortBy,
          },
        },
      });

      if (error) throw error;
      return data.data;
    },
  });
};
```

ファイル: `app/client/src/features/todo/hooks/useTaskMutations.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useTaskMutations = () => {
  const queryClient = useQueryClient();

  const createTask = useMutation({
    mutationFn: async (input: { title: string; description?: string; priority?: string }) => {
      const { data, error } = await apiClient.POST('/api/tasks', { body: input });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: any }) => {
      const { data, error } = await apiClient.PUT('/api/tasks/{id}', {
        params: { path: { id } },
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE('/api/tasks/{id}', {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await apiClient.PATCH('/api/tasks/{id}/status', {
        params: { path: { id } },
        body: { status },
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return { createTask, updateTask, deleteTask, changeStatus };
};
```

テストケース:
- 正常系: useTasks（フィルタ・ソート適用）
- 正常系: createTask
- 正常系: updateTask
- 正常系: deleteTask
- 正常系: changeStatus
- モック: apiClient

#### 完了条件

- [ ] useTasksが実装される
- [ ] useTaskMutationsが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-001〜REQ-007

---

## 🎉 フェーズ完了チェックリスト

### Redux

- [ ] Redux Storeが設定される
- [ ] taskSliceが実装される
- [ ] フィルタ・ソート状態管理が動作する

### TanStack Query

- [ ] QueryClientが設定される
- [ ] Providersコンポーネントが実装される

### API Client

- [ ] apiClientが設定される
- [ ] 認証ヘッダー設定が実装される

### カスタムフック

- [ ] useTasksが実装される
- [ ] useTaskMutationsが実装される
- [ ] すべてのフックが動作する

### テスト

- [ ] すべてのユニットテストが通る
- [ ] テストカバレッジ80%以上
- [ ] Biomeチェック合格
- [ ] 型チェック合格

---

## 📚 参考資料

- [Redux Toolkit公式ドキュメント](https://redux-toolkit.js.org/)
- [TanStack Query公式ドキュメント](https://tanstack.com/query/latest)
- [openapi-fetch公式ドキュメント](https://openapi-ts.pages.dev/openapi-fetch/)

---

## 📝 メモ

### 実装時の注意事項

1. **Redux**: UIフィルタ・ソート状態のみ管理
2. **TanStack Query**: サーバー状態管理、キャッシュ戦略
3. **API Client**: 型安全なAPI呼び出し
4. **カスタムフック**: ビジネスロジックのカプセル化

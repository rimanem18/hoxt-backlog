# TODO リストアプリ - Phase 7: フロントエンドUI実装

## 📄 フェーズ情報

- **要件名**: todo-app
- **フェーズ**: Phase 7 / 8
- **期間**: 8日間（64時間）
- **担当**: フロントエンド
- **目標**: タスク一覧、作成、編集、削除のUI実装

## 🎯 フェーズ概要

### 目的

TODOリストアプリのUIを実装し、ユーザーがタスクを視覚的に管理できるようにする。
Tailwind CSS 4を使用したレスポンシブデザイン、Markdown表示、テーマカラー適用。

### 成果物

- ✅ TaskList（タスク一覧）
- ✅ TaskItem（タスクアイテム）
- ✅ TaskCreateForm（タスク作成フォーム）
- ✅ TaskEditModal（タスク編集モーダル）
- ✅ TaskFilter（フィルタUI）
- ✅ TaskSort（ソートUI）
- ✅ ユニットテスト（@testing-library/react）

### 依存関係

- **前提条件**: Phase 6完了（Redux, TanStack Query, カスタムフック）
- **このフェーズ完了後に開始可能**: Phase 8（E2Eテスト）

## 📅 週次計画

### Week 1（5日間）

**Day 1**: TASK-1331 - TaskItemコンポーネント
**Day 2**: TASK-1332 - TaskListコンポーネント
**Day 3**: TASK-1333 - TaskCreateFormコンポーネント
**Day 4**: TASK-1334 - TaskEditModalコンポーネント
**Day 5**: TASK-1335 - TaskFilterコンポーネント

### Week 2（3日間）

**Day 6**: TASK-1336 - TaskSortコンポーネント
**Day 7**: TASK-1337 - Markdownレンダリング
**Day 8**: TASK-1338 - レスポンシブデザイン・テーマカラー適用

## 📋 タスク一覧

### TASK-1331: TaskItemコンポーネント

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1330
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/src/features/todo/components/TaskItem.tsx`

```typescript
import React from 'react';
import type { TaskDTO } from '@/types/api/generated';

interface TaskItemProps {
  task: TaskDTO;
  onEdit: (task: TaskDTO) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const priorityColor = {
    high: 'text-[#ff6a00]',
    medium: 'text-gray-700',
    low: 'text-gray-400',
  }[task.priority];

  const statusBadge = {
    not_started: 'bg-gray-200 text-gray-700',
    in_progress: 'bg-blue-200 text-blue-700',
    in_review: 'bg-yellow-200 text-yellow-700',
    completed: 'bg-green-200 text-green-700',
  }[task.status];

  return (
    <div className="border-b border-gray-200 py-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${priorityColor}`}>
            {task.title}
          </h3>
          {task.description && (
            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge}`}
          >
            <option value="not_started">未着手</option>
            <option value="in_progress">進行中</option>
            <option value="in_review">レビュー中</option>
            <option value="completed">完了</option>
          </select>
          <button
            onClick={() => onEdit(task)}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
          >
            編集
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
};
```

テストケース:
- 正常系: タスクが表示される
- 正常系: 優先度カラーが適用される
- 正常系: ステータスバッジが表示される
- イベント: 編集ボタンクリック
- イベント: 削除ボタンクリック
- イベント: ステータス変更

#### 完了条件

- [ ] TaskItemコンポーネントが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-101, NFR-201

---

### TASK-1332: TaskListコンポーネント

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1331
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/src/features/todo/components/TaskList.tsx`

```typescript
import React from 'react';
import { useTasks } from '../hooks/useTasks';
import { useTaskMutations } from '../hooks/useTaskMutations';
import { TaskItem } from './TaskItem';

export const TaskList: React.FC = () => {
  const { data: tasks, isLoading, error } = useTasks();
  const { deleteTask, changeStatus } = useTaskMutations();

  if (isLoading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">エラーが発生しました</div>;
  }

  if (!tasks || tasks.length === 0) {
    return <div className="text-center py-8 text-gray-500">タスクがありません</div>;
  }

  return (
    <div className="space-y-0">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onEdit={(task) => {/* モーダル表示 */}}
          onDelete={(id) => deleteTask.mutate(id)}
          onStatusChange={(id, status) => changeStatus.mutate({ id, status })}
        />
      ))}
    </div>
  );
};
```

テストケース:
- 正常系: タスク一覧が表示される
- 正常系: ローディング表示
- 正常系: エラー表示
- 正常系: 空状態表示
- イベント: タスク削除
- イベント: ステータス変更

#### 完了条件

- [x] TaskListコンポーネントが実装される
- [x] テストカバレッジ100%

#### 参照

- 要件: REQ-006

---

### TASK-1333: TaskCreateFormコンポーネント

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1332
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/src/features/todo/components/TaskCreateForm.tsx`

テストケース（全12件、100%カバレッジ）:
- TC-001: タスクが作成される
- TC-002: フォームがリセットされる
- TC-003: タイトル100文字が正常に送信される
- TC-004: 空文字列または空白のみでボタンが無効化される
- TC-005: 101文字入力が制限され、100文字で送信される
- TC-006: タイトル入力ができる
- TC-007: 優先度選択ができる
- TC-008: Enterキーでフォーム送信できる
- TC-009: 送信中はボタンが無効化される
- TC-010: APIエラー時にエラーメッセージが表示される
- TC-011: ネットワークエラー時にリトライボタンが表示される
- TC-012: 再試行時は最新の入力値で送信される

#### 完了条件

- [x] TaskCreateFormコンポーネントが実装される
- [x] テストカバレッジ100%（12件すべてのテストが合格）

#### 参照

- 要件: REQ-001

---

### TASK-1334: TaskEditModalコンポーネント

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1333
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/src/features/todo/components/TaskEditModal.tsx`

実装済み。TDD (Red-Green-Refactor) で完全に実装されました。

#### 完了条件

- [x] TaskEditModalコンポーネントが実装される
- [x] テストカバレッジ100%

#### 参照

- 要件: REQ-002

---

### TASK-1335: TaskFilterコンポーネント

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1334
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/src/features/todo/components/TaskFilter.tsx`

```typescript
import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setPriorityFilter, setStatusFilter } from '../store/taskSlice';

export const TaskFilter: React.FC = () => {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.task.filters);

  return (
    <div className="flex gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium mb-1">優先度</label>
        <select
          value={filters.priority}
          onChange={(e) => dispatch(setPriorityFilter(e.target.value as any))}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">すべて</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">ステータス</label>
        <select
          multiple
          value={filters.status}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, (option) => option.value);
            dispatch(setStatusFilter(selected as any));
          }}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="not_started">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="in_review">レビュー中</option>
          <option value="completed">完了</option>
        </select>
      </div>
    </div>
  );
};
```

テストケース:
- 正常系: フィルタが表示される
- イベント: 優先度選択
- イベント: ステータス選択（複数）
- Redux: フィルタ状態が更新される

#### 完了条件

- [x] TaskFilterコンポーネントが実装される
- [x] テストカバレッジ100%

#### 参照

- 要件: REQ-201, REQ-202

---

### TASK-1336: TaskSortコンポーネント

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1335
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/src/features/todo/components/TaskSort.tsx`

```typescript
import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSortBy } from '../store/taskSlice';

export const TaskSort: React.FC = () => {
  const dispatch = useAppDispatch();
  const sort = useAppSelector((state) => state.task.sort);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">並び替え</label>
      <select
        value={sort.sortBy}
        onChange={(e) => dispatch(setSortBy(e.target.value as any))}
        className="px-4 py-2 border rounded-lg"
      >
        <option value="created_at_desc">作成日時（新しい順）</option>
        <option value="created_at_asc">作成日時（古い順）</option>
        <option value="priority_desc">優先度（高→低）</option>
      </select>
    </div>
  );
};
```

テストケース:
- 正常系: ソートが表示される
- イベント: ソート選択
- Redux: ソート状態が更新される

#### 完了条件

- [ ] TaskSortコンポーネントが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-203

---

### TASK-1337: Markdownレンダリング

- [ ] **タスク完了**
- **タスクタイプ**: TDD
- **推定工数**: 8時間
- **依存タスク**: TASK-1336
- **要件名**: todo-app

#### 実装詳細

ファイル: `app/client/src/features/todo/components/MarkdownRenderer.tsx`

```typescript
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none"
    >
      {content}
    </ReactMarkdown>
  );
};
```

テストケース:
- 正常系: Markdownが表示される
- 正常系: チェックリストが表示される
- 正常系: リンクが表示される

#### 完了条件

- [ ] MarkdownRendererコンポーネントが実装される
- [ ] テストカバレッジ100%

#### 参照

- 要件: REQ-007

---

### TASK-1338: レスポンシブデザイン・テーマカラー適用

- [ ] **タスク完了**
- **タスクタイプ**: DIRECT
- **推定工数**: 8時間
- **依存タスク**: TASK-1337
- **要件名**: todo-app

#### 実装詳細

Tailwind CSS設定:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: '#710000',
        accent: '#ff6a00',
      },
    },
  },
};
```

レスポンシブデザイン:
- モバイル: 1カラム
- タブレット: 1カラム
- デスクトップ: 最適化

テーマカラー適用:
- ベースカラー: `#710000`
- アクセントカラー: `#ff6a00`

#### 完了条件

- [ ] レスポンシブデザインが適用される
- [ ] テーマカラーが適用される
- [ ] デスクトップ最適化が完了する

#### 参照

- 要件: NFR-201

---

## 🎉 フェーズ完了チェックリスト

### UI コンポーネント

- [ ] TaskItem実装完了
- [ ] TaskList実装完了
- [ ] TaskCreateForm実装完了
- [ ] TaskEditModal実装完了
- [ ] TaskFilter実装完了
- [ ] TaskSort実装完了
- [ ] MarkdownRenderer実装完了

### デザイン

- [ ] レスポンシブデザイン適用
- [ ] テーマカラー適用
- [ ] デスクトップ最適化完了

### テスト

- [ ] すべてのユニットテストが通る
- [ ] テストカバレッジ80%以上
- [ ] Biomeチェック合格
- [ ] 型チェック合格

---

## 📚 参考資料

- [React公式ドキュメント](https://react.dev/)
- [Tailwind CSS公式ドキュメント](https://tailwindcss.com/)
- [react-markdown公式ドキュメント](https://remarkjs.github.io/react-markdown/)

---

## 📝 メモ

### 実装時の注意事項

1. **Tailwind CSS**: ユーティリティファーストアプローチ
2. **Markdown**: react-markdown + remark-gfm
3. **レスポンシブ**: モバイルファースト
4. **アクセシビリティ**: role属性、aria-label使用

# TaskFilterコンポーネント TDD要件定義書

## ドキュメント情報

- **作成日**: 2025-12-16
- **要件名**: todo-app
- **タスクID**: TASK-1335
- **機能名**: TaskFilterコンポーネント
- **関連要件**: REQ-201, REQ-202

## 1. 機能の概要

### 基本機能

🔵 **タスク定義書 Line:286-359 より**

タスク一覧をフィルタリングするためのUIコンポーネント。優先度フィルタとステータスフィルタを提供し、ユーザーの選択に応じてRedux stateを更新する。

### ユーザーストーリー

🔵 **要件定義書 REQ-201, REQ-202 より**

- 優先度（高・中・低・すべて）でタスクを絞り込める
- ステータス（未着手・進行中・レビュー中・完了）の複数選択でタスクを絞り込める
- フィルタ選択はリアルタイムでタスク一覧に反映される

### システム内での位置づけ

🔵 **アーキテクチャ設計書 フロントエンド より**

```
app/client/src/features/todo/components/TaskFilter.tsx
```

- Feature-based ディレクトリ構成の一部
- Redux による UIフィルタ状態管理
- TanStack Query のタスクデータ取得と連携

### 想定されるユーザー

🔵 **要件定義書より**

ログイン済みのタスク管理ユーザー（デスクトップ環境優先）

## 2. 入力・出力の仕様

### 入力

#### Props

🟡 **タスク定義書 Line:303-341 より推測**

なし（PropsなしのReact.FC）

#### Redux State（読み込み）

🔵 **taskSlice.ts Line:17-22, Line:46-54 より**

```typescript
interface TaskFilterState {
  priority: TaskPriority | 'all';
  status: TaskStatus[];
}
```

現在のフィルタ状態を読み込み、UIの初期値として使用する。

- `state.task.filters.priority`: 現在選択中の優先度フィルタ
- `state.task.filters.status`: 現在選択中のステータス配列

### 出力

#### Redux Action（ディスパッチ）

🔵 **taskSlice.ts Line:68-78 より**

```typescript
// 優先度フィルタの更新
dispatch(setPriorityFilter('high' | 'medium' | 'low' | 'all'))

// ステータスフィルタの更新（複数選択）
dispatch(setStatusFilter(TaskStatus[]))
```

### データフロー

🔵 **フロントエンド開発ガイドライン、タスク定義書より**

```
ユーザー操作（select変更）
  ↓
onChange イベント
  ↓
dispatch(setPriorityFilter / setStatusFilter)
  ↓
Redux state更新
  ↓
TanStack Query（useTasks）がstate変化を検知
  ↓
API呼び出し（GET /api/tasks?priority=high&status=in_progress,in_review）
  ↓
タスク一覧表示更新
```

### 型定義

🔵 **shared-schemas/tasks.ts Line:13-24 より**

```typescript
// 優先度の型
type TaskPriority = 'high' | 'medium' | 'low';

// ステータスの型
type TaskStatus = 'not_started' | 'in_progress' | 'in_review' | 'completed';
```

## 3. 制約条件

### UI制約

🔵 **要件定義書 NFR-201, NFR-202 より**

- テーマカラー適用: ベース#710000、アクセント#ff6a00
- 言語に依存せず直感的なデザイン
- デスクトップ環境での快適な操作

🔵 **タスク定義書 Line:308-341 より**

- 優先度フィルタ: 単一選択（`<select>`要素）
- ステータスフィルタ: 複数選択（`<select multiple>`要素）
- スタイル: `px-4 py-2 border rounded-lg`

### パフォーマンス制約

🔵 **要件定義書 NFR-004 より**

- フィルタ選択は即座にUIに反映される（Redux state更新は同期的）

### アクセシビリティ制約

🟡 **フロントエンド開発ガイドラインより推測**

- `<label>`要素でフォームコントロールを明示
- セマンティックHTMLの使用

### アーキテクチャ制約

🔵 **CLAUDE.md、フロントエンド開発ガイドラインより**

- Redux Toolkitの`useAppDispatch`、`useAppSelector`を使用
- Tailwind CSSでスタイリング
- React.memo()でメモ化（必要に応じて）

## 4. 想定される使用例

### 基本的な使用パターン

🔵 **タスク定義書 Line:344-348 より**

#### 正常系: フィルタが表示される

- Given: TaskFilterコンポーネントがレンダリングされる
- When: 初期状態を確認
- Then: 優先度セレクトボックスが表示される
- And: ステータスセレクトボックスが表示される
- And: ラベル「優先度」「ステータス」が表示される

#### イベント: 優先度選択

- Given: 優先度フィルタが「すべて」に設定されている
- When: ユーザーが優先度セレクトボックスで「高」を選択
- Then: `setPriorityFilter('high')`がディスパッチされる
- And: Redux stateが更新される

#### イベント: ステータス選択（複数）

- Given: ステータスフィルタが空配列に設定されている
- When: ユーザーがステータスセレクトボックスで「未着手」と「進行中」を選択
- Then: `setStatusFilter(['not_started', 'in_progress'])`がディスパッチされる
- And: Redux stateが更新される

#### Redux: フィルタ状態が更新される

- Given: TaskFilterコンポーネントが表示されている
- When: フィルタを変更
- Then: `state.task.filters`が更新される
- And: タスク一覧が再取得される

### エッジケース

🟡 **一般的なフォーム動作より推測**

#### ステータスフィルタの全解除

- Given: ステータスフィルタで「進行中」「レビュー中」が選択されている
- When: ユーザーがすべての選択を解除
- Then: `setStatusFilter([])`がディスパッチされる
- And: すべてのステータスのタスクが表示される

#### 優先度フィルタを「すべて」に戻す

- Given: 優先度フィルタが「高」に設定されている
- When: ユーザーが「すべて」を選択
- Then: `setPriorityFilter('all')`がディスパッチされる
- And: すべての優先度のタスクが表示される

### UIスタイル

🔵 **タスク定義書 Line:308-341 より**

#### 優先度セレクトボックス

- クラス: `px-4 py-2 border rounded-lg`
- オプション: すべて、高、中、低

#### ステータスセレクトボックス

- 属性: `multiple`
- クラス: `px-4 py-2 border rounded-lg`
- オプション: 未着手、進行中、レビュー中、完了

#### ラベル

- クラス: `block text-sm font-medium mb-1`
- テキスト: 「優先度」「ステータス」

#### レイアウト

- コンテナ: `flex gap-4 mb-4`
- 各フィルタセクション: `<div>`でラップ

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

🔵 **要件定義書**

- REQ-201: 優先度フィルタが適用されている場合、選択された優先度のタスクのみを表示
- REQ-202: ステータスフィルタが適用されている場合、選択されたステータス（複数選択可能）のタスクのみを表示

### 参照した機能要件

🔵 **要件定義書**

- REQ-201: 優先度フィルタ機能
- REQ-202: ステータスフィルタ機能（複数選択）

### 参照した非機能要件

🔵 **要件定義書**

- NFR-004: フィルタ操作は即座にUIに反映
- NFR-201: テーマカラー適用
- NFR-202: 直感的なデザイン
- NFR-205: デスクトップ環境で快適に動作

### 参照した設計文書

🔵 **アーキテクチャ設計書**

- フロントエンド技術構成: Redux Toolkit + TanStack Query
- Feature-based ディレクトリ構成

🔵 **taskSlice.ts**

- `TaskFilterState`型定義（Line:17-22）
- `setPriorityFilter`アクション（Line:68-70）
- `setStatusFilter`アクション（Line:76-78）

🔵 **shared-schemas/tasks.ts**

- `TaskPriority`型定義（Line:140）
- `TaskStatus`型定義（Line:141）

🔵 **タスク定義書 Line:286-359**

- TaskFilterコンポーネントの実装詳細
- テストケース概要

## 6. テスト戦略

### テスト方針

🔵 **フロントエンド開発ガイドライン**

- Bun標準テストを使用
- React Testing Libraryで画面表示をテスト
- `@testing-library/user-event`でユーザー操作を再現
- Redux storeのモック化（configureStore）
- テストケース名は日本語で記載

### テスト対象

🔵 **タスク定義書 Line:344-348 より**

1. 正常系: フィルタが表示される
2. イベント: 優先度選択
3. イベント: ステータス選択（複数）
4. Redux: フィルタ状態が更新される

### テスト配置

🔵 **CLAUDE.md テストファイル配置ルールより**

```
app/client/src/features/todo/__tests__/TaskFilter.test.tsx
```

### 参考実装

🔵 **既存テストファイル**

- `TaskList.test.tsx`: Redux storeとReact Testing Libraryの統合パターン
- `taskSlice.test.ts`: Redux actionのテストパターン

## 7. 実装時の留意事項

### 必須事項

🔵 **CLAUDE.md、フロントエンド開発ガイドラインより**

- コンポーネント定義は`function TaskFilter = (props: Props) => {}`形式
- `export React.memo(TaskFilter)`でメモ化（パフォーマンス最適化）
- Context経由での依存注入は不要（Redux hooksで十分）
- `props.hoge`のようにprops明示（今回はPropsなし）

### 推奨事項

🟡 **フロントエンド開発ガイドラインより推測**

- 優先度・ステータスのオプションをマップで定義（DRY原則）
- `onChange`ハンドラを適切に型付け
- セマンティックHTMLとアクセシビリティを考慮

### 禁止事項

🔵 **CLAUDE.md、フロントエンド開発ガイドラインより**

- `any`型の使用
- `JSX.Element`型の返却（`React.ReactNode`を使用）
- `Func.displayName`の使用（無名関数コンポーネントにしない）

### スタイリング

🔵 **要件定義書 NFR-201 より**

- Tailwind CSSでスタイリング
- テーマカラーを適用する場合は、既存のTailwind設定を利用

## 8. 品質基準

### カバレッジ目標

🔵 **タスク定義書 Line:353 より**

- テストカバレッジ100%

### 完了条件

🔵 **タスク定義書 Line:350-353 より**

- [x] TaskFilterコンポーネントが実装される
- [x] テストカバレッジ100%
- [x] 型チェックが通る（`docker compose exec client bunx tsc --noEmit`）
- [x] テストが通る（`docker compose exec client bun test`）

## 9. コードレビュー対応記録

### 対応日: 2025-12-16

#### Issue 1: フィルタ選択肢の型安全性強化
- **対応推奨度**: ⭐⭐⭐⭐
- **対応内容**: `priorityOptions`/`statusOptions`を`as const`で厳密化し、配列の`as`キャストを最小化
- **修正箇所**: `app/client/src/features/todo/components/TaskFilter.tsx` Line:26-51
- **状態**: ✅ 完了

#### Issue 2: ユーザー中心クエリの使用
- **対応推奨度**: ⭐⭐⭐
- **対応内容**: テストで`getByDisplayValue`を`getByLabelText`に変更し、アクセシビリティ階層の高いクエリを使用
- **修正箇所**: `app/client/src/features/todo/__tests__/TaskFilter.test.tsx` 複数箇所
- **状態**: ✅ 完了

#### Issue 3: ステータス全解除シナリオのテスト追加
- **対応推奨度**: ⭐⭐⭐⭐
- **対応内容**: ステータスを複数選択してから全解除するテストケースを追加（空配列のdispatch検証）
- **修正箇所**: `app/client/src/features/todo/__tests__/TaskFilter.test.tsx` Line:219-244
- **状態**: ✅ 完了

### 最終確認結果

- ✅ テスト: 18件すべて合格
- ✅ 型チェック: エラーなし
- ✅ Lint (Biome): エラーなし
- ✅ Semgrep: 問題なし

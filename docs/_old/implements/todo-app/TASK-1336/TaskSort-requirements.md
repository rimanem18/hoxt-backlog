# TaskSortコンポーネント TDD要件定義書

## ドキュメント情報

- **作成日**: 2025-12-29
- **更新日**: 2025-12-29
- **要件名**: todo-app
- **タスクID**: TASK-1336
- **機能名**: TaskSortコンポーネント
- **関連要件**: REQ-203

## 1. 機能の概要

### 基本機能

🔵 **タスク定義書 Line:361-409 より**

タスク一覧のソート順を変更するためのUIコンポーネント。作成日時（新しい順/古い順）、優先度（高→低）の3パターンのソート順を提供し、ユーザーの選択に応じてRedux stateを更新する。

### ユーザーストーリー

🔵 **要件定義書 REQ-203 より**

- ソート順が指定されている場合、システムは指定された順序でタスクを並べ替えなければならない
- デフォルトでは作成日時（新しい順）でソートされる

🟡 **shared-schemas/tasks.ts Line:26-32 より推測**

- ユーザーは作成日時（新しい順/古い順）、優先度（高→低）の3パターンから選択できる

### システム内での位置づけ

🟡 **タスク定義書 Line:361-409、既存feature構成より推測**

```
app/client/src/features/todo/components/TaskSort.tsx
```

- Feature-based ディレクトリ構成の一部
- Redux による UIフィルタ・ソート状態管理
- TanStack Query のタスクデータ取得と連携
- TaskFilterコンポーネントと並列で配置（フィルタとソートのUI分離）

### 想定されるユーザー

🔵 **要件定義書より**

ログイン済みのタスク管理ユーザー（デスクトップ環境優先）

## 2. 入力・出力の仕様

### 入力

#### Props

🟡 **タスク定義書 Line:373-397、TaskFilterコンポーネントパターンより推測**

なし（PropsなしのReact.FC）

#### Redux State（読み込み）

🔵 **taskSlice.ts Line:24-30, Line:46-54 より**

```typescript
interface TaskSortState {
  sortBy: 'created_at_desc' | 'created_at_asc' | 'priority_desc';
}
```

現在のソート状態を読み込み、UIの初期値として使用する。

- `state.task.sort.sortBy`: 現在選択中のソート順

### 出力

#### Redux Action（ディスパッチ）

🔵 **taskSlice.ts Line:84-86 より**

```typescript
// ソート順の更新
dispatch(setSortBy('created_at_desc' | 'created_at_asc' | 'priority_desc'))
```

### データフロー

🔵 **フロントエンド開発ガイドライン、TaskFilterコンポーネントパターンより**

```
ユーザー操作（select変更）
  ↓
onChange イベント
  ↓
dispatch(setSortBy)
  ↓
Redux state更新
  ↓
TanStack Query（useTasks）がstate変化を検知
  ↓
API呼び出し（GET /api/tasks?sort=priority_desc）
  ↓
タスク一覧表示更新（ソート順変更）
```

### 型定義

🔵 **shared-schemas/tasks.ts Line:26-32 より**

```typescript
// ソート順の型
export const taskSortSchema = z.enum([
  'created_at_desc',
  'created_at_asc',
  'priority_desc',
]).openapi('TaskSort', {
  description: 'タスクのソート順',
});

export type TaskSort = z.infer<typeof taskSortSchema>;
```

## 3. 制約条件

### UI制約

🔵 **要件定義書 NFR-201, NFR-202 より**

- テーマカラー適用: ベース#710000、アクセント#ff6a00
- 言語に依存せず直感的なデザイン
- デスクトップ環境での快適な操作

🔵 **TaskFilter.tsx Line:54-99、TaskFilterコンポーネントパターンより**

- ソート順: 単一選択（`<select>`要素）
- スタイル: `px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00]`（TaskFilterと統一）

### パフォーマンス制約

🔴 **要件定義書 NFR-004（推測）より**

- ソート選択は即座にUIに反映される（Redux state更新は同期的）

### アクセシビリティ制約

🟡 **フロントエンド開発ガイドライン、TaskFilterコンポーネントパターンより推測**

- `<label>`要素でフォームコントロールを明示
- セマンティックHTMLの使用
- `aria-label`属性で補助情報を提供

### アーキテクチャ制約

🔵 **CLAUDE.md、フロントエンド開発ガイドラインより**

- Redux Toolkitの`useAppDispatch`、`useAppSelector`を使用
- Tailwind CSSでスタイリング
- React.memo()でメモ化（パフォーマンス最適化）
- クライアントコンポーネント（`'use client';`指定）

## 4. 想定される使用例

### 基本的な使用パターン

🔵 **タスク定義書 Line:399-402 より**

#### 正常系: ソートが表示される

- Given: TaskSortコンポーネントがレンダリングされる
- When: 初期状態を確認
- Then: ソートセレクトボックスが表示される
- And: ラベル「並び替え」が表示される
- And: デフォルト値「作成日時（新しい順）」が選択されている

#### イベント: ソート選択

- Given: ソート順が「作成日時（新しい順）」に設定されている
- When: ユーザーがソートセレクトボックスで「作成日時（古い順）」を選択
- Then: `setSortBy('created_at_asc')`がディスパッチされる
- And: Redux stateが更新される

#### イベント: 優先度ソート選択

- Given: ソート順が「作成日時（新しい順）」に設定されている
- When: ユーザーがソートセレクトボックスで「優先度（高→低）」を選択
- Then: `setSortBy('priority_desc')`がディスパッチされる
- And: Redux stateが更新される

#### Redux: ソート状態が更新される

- Given: TaskSortコンポーネントが表示されている
- When: ソート順を変更
- Then: `state.task.sort.sortBy`が更新される
- And: タスク一覧が再取得される（ソート順適用）

### エッジケース

🟡 **一般的なフォーム動作、taskSlice.test.ts パターンより推測**

#### ソート順を「作成日時（新しい順）」に戻す

- Given: ソート順が「優先度（高→低）」に設定されている
- When: ユーザーが「作成日時（新しい順）」を選択
- Then: `setSortBy('created_at_desc')`がディスパッチされる
- And: 初期状態に戻る

#### 同じソート順を再選択

- Given: ソート順が「作成日時（新しい順）」に設定されている
- When: ユーザーが再度「作成日時（新しい順）」を選択
- Then: `setSortBy('created_at_desc')`がディスパッチされる
- And: Redux stateは変わらない（冪等性）

### UIスタイル

🔵 **タスク定義書 Line:383-397、TaskFilterコンポーネントパターンより**

#### ソートセレクトボックス

- クラス: `px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00]`
- オプション:
  - `created_at_desc`: 作成日時（新しい順）
  - `created_at_asc`: 作成日時（古い順）
  - `priority_desc`: 優先度（高→低）

#### ラベル

- クラス: `block text-sm font-medium mb-1`
- テキスト: 「並び替え」

#### レイアウト

- コンテナ: `<div>`でラップ
- TaskFilterと並列で配置される場合は、親コンポーネントでレイアウト制御

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

🔵 **要件定義書**

- REQ-203: ソート順が指定されている場合、システムは指定された順序でタスクを並べ替えなければならない

### 参照した機能要件

🔵 **要件定義書**

- REQ-203: ソート機能

### 参照した非機能要件

🔵 **要件定義書**

- NFR-201: テーマカラー適用
- NFR-202: 直感的なデザイン
- NFR-205: デスクトップ環境で快適に動作

🔴 **要件定義書（推測）**

- NFR-004: ソート操作は即座にUIに反映

### 参照した設計文書

🔵 **アーキテクチャ設計書**

- フロントエンド技術構成: Redux Toolkit + TanStack Query
- Feature-based ディレクトリ構成

🔵 **taskSlice.ts**

- `TaskSortState`型定義（Line:24-30）
- `setSortBy`アクション（Line:84-86）

🔵 **shared-schemas/tasks.ts**

- `TaskSort`型定義（Line:142）
- `taskSortSchema`定義（Line:26-32）

🔵 **タスク定義書 Line:361-409**

- TaskSortコンポーネントの実装詳細
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

🔵 **タスク定義書 Line:399-402、TaskFilterテストパターンより**

1. 正常系: ソートが表示される
2. イベント: ソート選択
3. Redux: ソート状態が更新される
4. UIスタイル: スタイルクラスの検証

### テストケース詳細

#### 正常系: ソートが表示される

- ソートセレクトボックスが表示される
- ラベルが表示される
- デフォルト値が選択されている

#### イベント: ソート選択

- ソート順が「作成日時（古い順）」に変更される
- ソート順が「優先度（高→低）」に変更される
- ソート順が「作成日時（新しい順）」に戻される

#### Redux: ソート状態が更新される

- ソート順変更でstate.task.sort.sortByが更新される

#### UIスタイル

- ソートセレクトボックスが正しいスタイルクラスを持つ
- ラベルが正しいクラスを持つ
- コンテナが正しいクラスを持つ

### テスト配置

🔵 **CLAUDE.md テストファイル配置ルールより**

```
app/client/src/features/todo/__tests__/TaskSort.test.tsx
```

### 参考実装

🔵 **既存テストファイル**

- `TaskFilter.test.tsx`: Redux storeとReact Testing Libraryの統合パターン
- `taskSlice.test.ts`: Redux actionのテストパターン

## 7. 実装時の留意事項

### 必須事項

🔵 **CLAUDE.md、フロントエンド開発ガイドライン、TaskFilter.tsx パターンより**

- ファイル先頭に`'use client';`を記載（クライアントコンポーネント）
- コンポーネント定義は`function TaskSort(): React.ReactNode { ... }`形式
- `export default React.memo(TaskSort);`でメモ化（パフォーマンス最適化）
- Context経由での依存注入は不要（Redux hooksで十分）

### 推奨事項

🟡 **フロントエンド開発ガイドライン、TaskFilterコンポーネントパターンより推測**

- ソート順のオプションをマップで定義（DRY原則）
- `onChange`ハンドラを適切に型付け
- セマンティックHTMLとアクセシビリティを考慮
- `id`属性と`htmlFor`属性でラベルとフォームコントロールを紐付け

### 禁止事項

🔵 **CLAUDE.md、フロントエンド開発ガイドラインより**

- `any`型の使用
- `JSX.Element`型の返却（`React.ReactNode`を使用）
- `Func.displayName`の使用（無名関数コンポーネントにしない）

### スタイリング

🔵 **要件定義書 NFR-201、TaskFilter.tsx パターンより**

- Tailwind CSSでスタイリング
- テーマカラーを適用（`focus:ring-[#ff6a00]`）
- TaskFilterコンポーネントと統一されたスタイル

## 8. 品質基準

### カバレッジ目標

🔵 **タスク定義書 Line:407 より**

- テストカバレッジ100%

### 完了条件

🔵 **タスク定義書 Line:404-408 より**

- [ ] TaskSortコンポーネントが実装される
- [ ] テストカバレッジ100%
- [ ] 型チェックが通る（`docker compose exec client bunx tsc --noEmit`）
- [ ] テストが通る（`docker compose exec client bun test`）

## 9. 既存コンポーネントとの比較

### TaskFilterコンポーネントとの共通点

🔵 **TaskFilter.tsx、TaskFilter.test.tsx より**

1. **Redux統合パターン**: `useAppDispatch`, `useAppSelector`の使用
2. **クライアントコンポーネント**: `'use client';`指定
3. **UIスタイル**: `px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff6a00]`
4. **テスト構造**: 正常系、イベント、Redux、UIスタイルの4カテゴリ
5. **メモ化**: `React.memo()`でパフォーマンス最適化
6. **エクスポート**: `export default React.memo(...)`

### TaskFilterコンポーネントとの相違点

🟡 **タスク定義書 Line:383-397、TaskFilter.tsx より推測**

1. **選択方式**: TaskSortは単一選択のみ（`<select>`）、TaskFilterはステータスが複数選択（`<select multiple>`）
2. **アクション**: TaskSortは`setSortBy`のみ、TaskFilterは`setPriorityFilter`, `setStatusFilter`の2つ
3. **オプション数**: TaskSortは3つ、TaskFilterは優先度4つ+ステータス4つ

## 10. 実装ファイル

### 新規作成ファイル

🔵 **タスク定義書 Line:371 より**

1. **`app/client/src/features/todo/components/TaskSort.tsx`**
   - TaskSortコンポーネントの実装
   - Redux統合（`useAppDispatch`, `useAppSelector`）
   - ソート選択UIの提供
   - `'use client';`指定

2. **`app/client/src/features/todo/__tests__/TaskSort.test.tsx`**
   - TaskSortコンポーネントのユニットテスト
   - Given-When-Thenパターン
   - テストカバレッジ100%

### 既存ファイル（参照のみ）

🔵 **既存実装パターン**

- `app/client/src/features/todo/components/TaskFilter.tsx`: UIパターンの参考
- `app/client/src/features/todo/__tests__/TaskFilter.test.tsx`: テストパターンの参考
- `app/client/src/features/todo/store/taskSlice.ts`: Redux統合の参考
- `app/client/src/store/hooks.ts`: Redux hooksの使用方法

## 11. 参考資料

- [Redux Toolkit公式ドキュメント](https://redux-toolkit.js.org/)
- [React Testing Library公式ドキュメント](https://testing-library.com/docs/react-testing-library/intro/)
- **既存実装パターン**: `app/client/src/features/todo/components/TaskFilter.tsx`

---

## 📊 品質判定

### 判定結果: ✅ 高品質

- **要件の曖昧さ**: 一部あり（ソート選択肢の詳細は shared-schemas から推測）
- **入出力定義**: 完全（taskSlice.ts、shared-schemas/tasks.tsから明確）
- **制約条件**: 明確（既存技術スタック、TaskFilterパターン統一）
- **実装可能性**: 確実（TaskFilterコンポーネントと同様のパターン）

### 信頼性レベルサマリー

- 🔵 **青信号**: 75%（EARS要件REQ-203、既存設計、タスクファイルから確実）
- 🟡 **黄信号**: 20%（ソート選択肢詳細、UIスタイル詳細はTaskFilterパターンからの推測）
- 🔴 **赤信号**: 5%（NFR-004の確度）

---

## 12. コードレビュー対応記録

### 対応日: 2025-12-29

#### Issue 1: コンポーネント定義構文の誤り

- **対応推奨度**: ⭐⭐⭐⭐⭐（必須）
- **対応内容**: `function TaskSort = (props: Props) => {}`という無効な構文を`function TaskSort(): React.ReactNode { ... }`に修正
- **修正箇所**: 7章 実装時の留意事項
- **状態**: ✅ 完了

#### Issue 2: クライアントコンポーネント指定の欠如

- **対応推奨度**: ⭐⭐⭐⭐⭐（必須）
- **対応内容**: `'use client';`指定を必須事項に追加
- **修正箇所**: 3章、7章
- **状態**: ✅ 完了

#### Issue 3: UIスタイルの詳細不足

- **対応推奨度**: ⭐⭐⭐⭐（推奨）
- **対応内容**: TaskFilterと同じ完全なスタイルクラス（`border-gray-300`, `focus:ring-[#ff6a00]`）を明記
- **修正箇所**: 3章、4章
- **状態**: ✅ 完了

#### Issue 4: NFR-004の確度修正

- **対応推奨度**: ⭐⭐⭐⭐（推奨）
- **対応内容**: NFR-004を🔴（推測）に変更
- **修正箇所**: 3章、5章
- **状態**: ✅ 完了

#### Issue 5: ソート選択肢の出典明記

- **対応推奨度**: ⭐⭐⭐（推奨）
- **対応内容**: ソート選択肢が shared-schemas/tasks.ts 由来であることを🟡で明記
- **修正箇所**: 1章
- **状態**: ✅ 完了

#### Issue 6: アーキテクチャ設計書参照の誤り

- **対応推奨度**: ⭐⭐⭐（推奨）
- **対応内容**: 「アーキテクチャ設計書 フロントエンド より」を🟡（推測）に変更
- **修正箇所**: 1章
- **状態**: ✅ 完了

### 最終確認結果

- ✅ 必須修正: すべて完了
- ✅ 推奨修正: すべて完了
- ⚠️ テスタビリティ: sortクエリ値の検証については、実装時にテストケースとして追加対応

---

**次のステップ**: TaskSortコンポーネントの実装開始

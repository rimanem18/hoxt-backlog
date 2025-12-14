# フロントエンド開発ガイドライン

## 技術スタック

- **フロントエンド**: Next.js 16 + TypeScript 5
  - **パッケージ管理**: Bun（`bun.lock`）
  - **テスト**: Bun 標準
  - **フォーマット**: Biome + TypeScript
  - **型チェック**: TypeScript + Zod 実行時検証（server 側とスキーマシェア）
  - **レンダリング**: SSG ビルド前提
  - **TypeScript**: 全面採用による型安全性確保
  - **スタイリング**: Tailwind CSS（ユーティリティファースト）
  - **状態管理**: Redux

## コマンド操作

フロントエンド関連のコマンドは client コンテナ内で実行してください：

```bash
# example
docker compose exec client bun run dev
```

E2E テストの実行は e2e コンテナで実施してください
```bash
# example
docker compose exec e2e npx playwright test
```

## コード品質・フォーマット

以下を考慮し、コードの品質を保ってください：

- **必須**: 実装前に `libs`, `utils`, `shared`, `helper` などのディレクトリが存在しないか確認し、車輪の再発明を防ぐ
- **必須**: ファイルの末尾には改行を入れて空行を作る
- **必須**: 親コンポーネントから受け取った pros を使用する際は、`props.hoge`, `props.fuga` のように、 props であることが明示的になるように使用
- **推奨**: 1 行あたりの文字数は 80 字以内になるように改行
- **推奨**: `const` の使用
- **非推奨**: `let` の使用
  - ただし、再代入が明確に必要な場面（ループ変数や一時的な状態）の使用可
- **禁止**: `z.string().uuid()`, `z.string().email()`, `z.string().datetime()` メソッドの使用
  - `z.uuid()`,`z.email()`, `z.iso.datetime()` で代用
- **禁止**: `any` 型の使用
  - ただし、型が取得不能な外部ライブラリや JSON パースなどの場合に限り、理由コメントを添えて明示的に使用可
- **禁止**: `var` の使用
- **禁止**: `JSX.Element` 型の返却
  - `React.ReactNode` 型で代用
- **禁止**: `forEach` での副作用関数（戻り値のある関数）の使用
  - `clearTimeout`, `clearInterval` などは `for-of` ループで代用
- **禁止**: Func.displayName の使用
  - そもそも無名関数コンポーネントにしない。

### コンポーネント定義例:
```tsx
interface TaskItemProps {
  ...
}

function TaskItem = (props: TaskItemProps) => {
  return (
    ...
  )
}

export React.memo(TaskItem)
```

# テストガイドライン

## フロントエンドユニット/統合テストガイドライン

### 実行環境

#### コマンド
```bash
docker compose exec client bun test
```

#### DOM環境のセットアップ（必須）

BunのテストランナーはブラウザDOMを自動提供しません。React Testing Libraryを使用する場合は、DOM実装を`preload`で注入する必要があります。

**bunfig.toml**（または`package.json`の`bun.test`セクション）:
```toml
[test]
preload = ["./test-setup.ts"]
```

**test-setup.ts**:
```typescript
/// <reference lib="dom" />
import { beforeAll } from "bun:test";

// happy-domをグローバルに注入
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

// Testing Library のカスタムマッチャー（オプション）
import "@testing-library/jest-dom";

// タイムゾーンをUTCに統一（Bunのデフォルト動作）
beforeAll(() => {
  process.env.TZ = "UTC";
});
```

#### TypeScript型定義
`tsconfig.json`に以下を追加してDOM型を有効化：
```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "types": ["bun-types", "@testing-library/jest-dom"]
  }
}
```

### 運用指針詳細

- **必須**: テスト駆動開発
  - 実装を更新したらテストコードも更新
  - テストコードに記載するテストケース名は日本語で記載
- **必須**: Bun標準テストを使用
- **必須**: `docker compose exec client bunx tsc --noEmit`による型チェック
- **必須**: `docker compose exec client bun test`による自動テスト実行
- **必須**: `docker compose run --rm semgrep semgrep <args...>`によるセキュリティチェック
- **必須**: テストランナー・モック・アサーションは`bun:test`を使用（`describe` / `it` / `expect` / `mock` / `spyOn`）
- **必須**: UI操作・クエリはTesting Libraryを使用（React Testing Library、`@testing-library/user-event`）
- **必須**: `user-event`を標準とする（原則：`fireEvent`禁止、例外：`user-event`で表現不可能なイベントのみ、理由コメント必須）
- **必須**: ユーザー中心のクエリ使用（優先順：`getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`）
  - 理由：アクセシビリティに近いクエリほど実装変更に強く、壊れにくいテストになる
- **必須**: Testing Libraryの`cleanup()`を`afterEach`で必ず呼び出す（テスト間のDOM汚染を防ぐため）
  - Bunのテストランナーでは自動クリーンアップがないため、手動でのクリーンアップが必須
  - `cleanup()`、`mock.restore()`、`mock.clearAllMocks()`をすべて呼び出す
- **必須**: テスト用依存注入はContext APIを使用（`mock.module()`は原則禁止）
  - Custom Hooksの注入は`XxxServicesProvider`パターンで実装
  - 既存の`ApiClientProvider`パターンとの一貫性を保つ
  - Context経由で取得した変数名は`use`で始めること
- **推奨**: テスト終了時のクリーンアップ（`mock.restore()`と`mock.clearAllMocks()`）
- **推奨**: 依存注入を優先（DI可能な設計、差し替えは`mock()` / `spyOn()`）
- **推奨**: カスタムマッチャー活用（共通マッチャーは`__tests__/helpers`に配置）
- **推奨**: DIパターンでのモック生成（テストごとに新しいモックを生成）
- **非推奨**: 非同期 import（原則、トップレベルの同期 import。動的importが必要な状況自体を避けるべき）
- **非推奨**: モックの乱用（実装との乖離を生む過度なスタブは避け、E2E/統合テストとのバランスを考慮）
- **非推奨**: `data-testid`の使用（ユーザー中心のクエリを優先）
- **禁止**: `mock.module()`の使用（Bunでは`mock.restore()`でリセットされず、テスト間で汚染が発生。Context-based DIを使用すること）
- **禁止**: Jestエコシステムへの依存（`@jest/*`, `@types/jest`, Jestランタイム導入）
  - 例外：Bunが提供する`jest`/`vi`互換API（`bun:test`の一部として扱う。例：`jest.fn()`）
- **禁止**: テストの`.skip`（意図的な未実装はTODOコメント）
- **禁止**: `as unknown as`などの乱暴なキャスト

### 依存と型
- `bun test`を前提とし、追加のテスティングランタイムは導入しない
- TypeScriptは`tsconfig.json`の`types`に`["bun-types"]`を設定、`@types/jest`は含めない
- すべてのテストファイルは`.test.ts` / `.test.tsx`

### 使ってよいAPI（`bun:test`のみ）
```ts
import {
  describe, it, test, expect,
  beforeEach, afterEach,
  mock, spyOn,
  // 必要に応じて
  // mock.module, setSystemTime
} from "bun:test";
```

### 設計原則
- **まずDI**: 可能な限り依存注入を優先し、直接importした依存を差し替えるより、呼び出し側に抽象を注入してモック
- **外部性のラップ**: 時刻・乱数・I/Oなどはラッパー関数経由にしてテストでモック
- **スナップショット**: 安定化処理をしてから比較
- **非同期処理**: `await`を徹底、`done`コールバックは禁止

### 既存コードからの移行ルール
- `jest.fn()` → `mock(fn)`
- `jest.spyOn(obj, "m")` → `spyOn(obj, "m")`
- `jest.mock("mod", factory)` → `mock.module("mod", factory)`（基本は非推奨）
- `jest.clearAllMocks()` / `jest.restoreAllMocks()` → `mock.clearAllMocks()` / `mock.restore()`
- `jest.Mocked<T>` → `satisfies T`と`mock()`の組み合わせ

### クリーンアップパターン（重要）

#### 基本パターン：UI/統合テスト
```typescript
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  beforeEach(() => {
    // 各テスト前の準備
  });

  afterEach(() => {
    // DOM要素のクリーンアップ（必須）
    cleanup();
    // モックのクリーンアップ
    mock.restore();
    mock.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeDefined();
  });
});
```

#### mock.module()を使用する場合（最小限に抑える）
```typescript
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';

describe('ComponentWithMockedHooks', () => {
  const mockHook = mock(() => ({ data: [], isLoading: false }));

  // describe単位でmock.moduleを固定
  mock.module('@/hooks/useData', () => ({
    useData: mockHook,
  }));

  beforeEach(() => {
    mockHook.mockClear?.();
  });

  afterEach(() => {
    // 重要: cleanup()、mock.restore()、mock.clearAllMocks()をすべて呼び出す
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('displays data', async () => {
    mockHook.mockImplementation(() => ({
      data: [{ id: '1', name: 'Test' }],
      isLoading: false,
    }));

    const Component = (await import('../Component')).default;
    render(<Component />);
    expect(screen.getByText('Test')).toBeDefined();
  });
});
```

#### フックテスト（renderHook使用）
```typescript
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';

describe('useCustomHook', () => {
  afterEach(() => {
    // フックテストでもクリーンアップは必要
    mock.restore();
    mock.clearAllMocks();
  });

  test('returns correct value', async () => {
    const { result } = renderHook(() => useCustomHook());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

### テスト用依存注入パターン（重要）

#### 基本方針：Context-based DIを優先

**テストのための依存注入は、Context APIを使用すること**を最優先としてください。`mock.module()`は**原則禁止**です。

**理由**:
- Bunテストランナーでは`mock.module()`が`mock.restore()`でリセットされず、テスト間で汚染が発生
- Context APIはReact公式のDIメカニズムであり、設計思想に準拠
- React 19+、React Compilerとの互換性を保証
- テスト間の完全な分離を実現

**既存パターンとの整合性**:
- プロジェクトでは既に`ApiClientProvider`でContext DIを採用
- Hooksも同じパターンで統一することで一貫性を保つ

### mock.moduleの扱い（重要）

#### 基本方針：原則として禁止

**`mock.module()`は原則として使用禁止**です。代わりに**Context-based DIパターン**を使用してください。

#### Bunにおける`mock.module()`の致命的な問題

1. **`mock.restore()`でリセットされない**（最も深刻）
   - `mock.module()`で上書きしたモジュールは`mock.restore()`で元に戻らない
   - **同一プロセス内の他テストへ影響が残り、テストが汚染される**
   - 実例：`TaskList.test.tsx`で`useTasks`をモックすると、`hooks/__tests__/useTasks.test.tsx`でも影響が残り、16個のテストが失敗

2. **並行実行（`--concurrent`）と相性が悪い**
   - モジュールキャッシュ（ESM/CJS）への書き込みは共有状態
   - 並行実行するとテスト同士が踏み合い、フレーク（不安定なテスト）の原因になる
   - ESMはlive bindingで既存importも更新される（その場で差し替わる）

3. **React Compilerの最適化対象外**
   - React 19+のCompilerは静的解析を前提としており、動的なモジュール差し替えは最適化対象外
   - 将来的なパフォーマンス向上の機会を失う

#### 推奨パターン：Context-based DI

**すべてのケースでContext-based DIパターンを使用してください**（詳細は「Context-based DIパターン（推奨）」セクション参照）：

```typescript
// ❌ 禁止：mock.module()に依存
mock.module('@/hooks/useTasks', () => ({
  useTasks: mockUseTasks,
}));

// ✅ 推奨：Context-based DI
// 1. Contextを作成
export function TaskServicesProvider({ services, children }) {
  const defaultServices = useMemo(() => services || { useTasks, useTaskMutations }, [services]);
  return <TaskServicesContext.Provider value={defaultServices}>{children}</TaskServicesContext.Provider>;
}

// 2. コンポーネントで使用
function TaskList() {
  const { useTasks: useTasksHook } = useTaskServices();
  const data = useTasksHook();
}

// 3. テストでモックを注入
render(
  <TaskServicesProvider services={{ useTasks: mockUseTasks }}>
    <TaskList />
  </TaskServicesProvider>
);
```

#### 例外的な使用（非推奨だが許容）

以下の**すべての条件**を満たす場合のみ、例外的に`mock.module()`の使用を許容：

1. **DI化が技術的に不可能**（外部ライブラリの内部実装、グローバル変数など）
2. **専用ファイルに完全隔離**（他のテストと混在させない）
3. **ファイル名を`zzz-`で始める**（アルファベット順で最後に実行されるようにする）
4. **テストファイルの冒頭にコメントで理由を明記**

```typescript
// zzz-ExternalLibrary.test.tsx
/**
 * 注意: このファイルではmock.module()を使用しています
 * 理由: ExternalLibraryはグローバル変数を使用しており、DI化が不可能
 * 影響範囲: このファイル内のテストのみ
 * TODO: ExternalLibraryがDI対応したら、Context-based DIに移行する
 */
```

#### タイムゾーン・時刻のモック
時間依存のテストは`setSystemTime`を使用してUTC時刻を固定：
```typescript
import { setSystemTime } from "bun:test";

test('時刻依存のテスト', () => {
  setSystemTime(new Date('2025-12-13T00:00:00Z'));
  // テスト実行
  setSystemTime(); // リセット
});
```

---

## Context-based DIパターン（推奨）

### 概要

Custom HooksをContext経由で注入することで、`mock.module()`を使わずにテスタブルなコンポーネントを実装します。

### 実装パターン

#### 1. Contextの作成

```typescript
// features/todo/lib/TaskServicesContext.tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useTaskMutations } from '../hooks/useTaskMutations';

/**
 * Taskサービスの型定義
 *
 * 注意: 静的解析を維持するため、変数名は`use`で始めること
 */
interface TaskServices {
  useTasks: typeof useTasks;
  useTaskMutations: typeof useTaskMutations;
}

const TaskServicesContext = createContext<TaskServices | null>(null);

export interface TaskServicesProviderProps {
  /** テスト用のサービス注入（省略時はデフォルトのhooksを使用） */
  services?: TaskServices;
  children: ReactNode;
}

/**
 * Taskサービスを提供するProvider
 *
 * @example
 * // 本番環境（デフォルトのhooksを使用）
 * <TaskServicesProvider>
 *   <TaskList />
 * </TaskServicesProvider>
 *
 * // テスト環境（mockを注入）
 * const mockServices = {
 *   useTasks: mock(() => ({ data: [], isLoading: false, error: null })),
 *   useTaskMutations: mock(() => ({ deleteTask, changeStatus })),
 * };
 * <TaskServicesProvider services={mockServices}>
 *   <TaskList />
 * </TaskServicesProvider>
 */
export function TaskServicesProvider({
  services,
  children,
}: TaskServicesProviderProps) {
  // servicesが未指定の場合はデフォルトのhooksを使用
  const defaultServices = useMemo(
    () =>
      services || {
        useTasks,
        useTaskMutations,
      },
    [services],
  );

  return (
    <TaskServicesContext.Provider value={defaultServices}>
      {children}
    </TaskServicesContext.Provider>
  );
}

/**
 * Taskサービスを取得するフック
 *
 * TaskServicesProvider内で使用する必要がある
 *
 * @returns TaskServices（useTasks、useTaskMutations）
 * @throws {Error} TaskServicesProviderが見つからない場合
 */
export function useTaskServices(): TaskServices {
  const services = useContext(TaskServicesContext);
  if (!services) {
    throw new Error(
      'useTaskServices must be used within TaskServicesProvider. ' +
        'Wrap your component with <TaskServicesProvider>.',
    );
  }
  return services;
}
```

#### 2. コンポーネントでの使用

```typescript
// features/todo/components/TaskList.tsx
import { useTaskServices } from '../lib/TaskServicesContext';

function TaskList() {
  // 重要: 変数名を`use`で始めることでESLintの静的解析を維持
  const {
    useTasks,
    useTaskMutations
  } = useTaskServices();

  const { data, isLoading, error } = useTasks();
  const { deleteTask, changeStatus } = useTaskMutations();

  // ...
}
```

#### 3. テストでの使用

```typescript
// features/todo/__tests__/TaskList.test.tsx
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { TaskServicesProvider } from '../lib/TaskServicesContext';
import TaskList from '../components/TaskList';

describe('TaskList', () => {
  // モックサービスを定義
  const mockUseTasks = mock(() => ({
    data: [],
    isLoading: false,
    error: null,
  }));

  const mockUseTaskMutations = mock(() => ({
    deleteTask: { mutate: mock(() => {}) },
    changeStatus: { mutate: mock(() => {}) },
  }));

  beforeEach(() => {
    mockUseTasks.mockClear?.();
    mockUseTaskMutations.mockClear?.();
  });

  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('タスク一覧が表示される', () => {
    // Given: タスク一覧を返すモック
    mockUseTasks.mockImplementation(() => ({
      data: [
        { id: '1', title: 'タスク1', priority: 'high', status: 'not_started' },
      ],
      isLoading: false,
      error: null,
    }));

    // When: TaskListをProviderでラップしてレンダリング
    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskList />
      </TaskServicesProvider>,
    );

    // Then: タスクが表示される
    expect(screen.getByText('タスク1')).toBeDefined();
  });

  test('ローディング状態が表示される', () => {
    // Given: ローディング状態を返すモック
    mockUseTasks.mockImplementation(() => ({
      data: undefined,
      isLoading: true,
      error: null,
    }));

    // When: レンダリング
    render(
      <TaskServicesProvider
        services={{
          useTasks: mockUseTasks,
          useTaskMutations: mockUseTaskMutations,
        }}
      >
        <TaskList />
      </TaskServicesProvider>,
    );

    // Then: ローディングテキストが表示される
    expect(screen.getByText('読み込み中...')).toBeDefined();
  });
});
```

### 重要な注意事項

#### ✅ DO（推奨）

1. **変数名を`use`で始める**
   ```typescript
   // ✅ 正しい
   const { useTasks } = useTaskServices();
   const data = useTasks();
   ```

2. **デフォルト値を提供する**
   ```typescript
   // ✅ 本番環境では自動的にデフォルトのhooksを使用
   <TaskServicesProvider>
     <TaskList />
   </TaskServicesProvider>
   ```

3. **型安全性を保つ**
   ```typescript
   // ✅ typeof で型を推論
   interface TaskServices {
     useTasks: typeof useTasks;
   }
   ```

#### ❌ DON'T（禁止）

1. **変数名を`use`で始めない**
   ```typescript
   // ❌ ESLintが警告を出す
   const { useTasks: tasks } = useTaskServices();
   const data = tasks(); // ← hooksとして認識されない
   ```

2. **`mock.module()`を併用する**
   ```typescript
   // ❌ Context DIと併用しない
   mock.module('@/hooks/useTasks', ...);
   ```

3. **本番コードで`services` propを指定する**
   ```typescript
   // ❌ テスト専用、本番では指定しない
   <TaskServicesProvider services={customServices}>
   ```

### 既存パターンとの統一

このプロジェクトでは既に`ApiClientProvider`で同じパターンを採用しています：

```typescript
// lib/apiClientContext.tsx（既存）
export function ApiClientProvider({ client, children }: ApiClientProviderProps) {
  const defaultClient = useMemo(() => client || apiClient, [client]);
  return (
    <ApiClientContext.Provider value={defaultClient}>
      {children}
    </ApiClientContext.Provider>
  );
}
```

新しいContext（`TaskServicesProvider`など）も同じパターンに従うことで、一貫性を保ちます。

---

## 実装パターン例

### フロントエンドユニット/統合テスト

#### DIパターンでのモック生成

**注意**: Bunの`Mock`型は`Mock<T extends (...args) => any>`の形式で関数型を渡します。

```typescript
import { mock, type Mock } from "bun:test";

type MockUserService = {
  getUserProfile: Mock<(id: string) => Promise<User>>;
};

let testUserService: MockUserService;

beforeEach(() => {
  testUserService = {
    getUserProfile: mock((id: string) =>
      Promise.resolve({ id, name: "Test User" })
    ),
  };
});
```

#### DI可能な設計の推奨範囲

**適切なDI対象**（外部性）:
- 時刻・乱数生成
- fetch / HTTPクライアント
- localStorage / sessionStorage
- 外部SDK（Analytics、認証プロバイダーなど）

**過剰なDI（避けるべき）**:
- 純粋なstate / derived state
- コンポーネント内部のロジック全般
  - 推奨：ロジックを純関数へ抽出し、hookは薄く保つ

**運用バランス**:
外部性のみDI（またはContext経由）+ ロジックを純関数化 = テスタビリティと設計負債のバランスが取りやすい

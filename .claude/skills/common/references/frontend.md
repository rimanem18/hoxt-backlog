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
- **推奨**: テスト終了時のクリーンアップ（`mock.restore()`と`mock.clearAllMocks()`）
- **推奨**: 依存注入を優先（DI可能な設計、差し替えは`mock()` / `spyOn()`）
- **推奨**: カスタムマッチャー活用（共通マッチャーは`__tests__/helpers`に配置）
- **推奨**: DIパターンでのモック生成（テストごとに新しいモックを生成）
- **非推奨**: 非同期 import（原則、トップレベルの同期 import。動的importが必要な状況自体を避けるべき）
- **非推奨**: モックの乱用（実装との乖離を生む過度なスタブは避け、E2E/統合テストとのバランスを考慮）
- **非推奨**: `mock.module()`の使用（原則避ける。最後の手段として、1ファイル隔離・describe単位で使用。詳細は後述）
- **非推奨**: `data-testid`の使用（ユーザー中心のクエリを優先）
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

### mock.moduleの扱い（重要）

#### 基本方針：原則として避ける

**`mock.module()`は最後の手段**として扱い、可能な限りDI（依存注入）+ `mock()` / `spyOn()`で差し替えることを優先してください。

#### Bunにおける`mock.module()`の制約

1. **`mock.restore()`でリセットされない**
   - `mock.module()`で上書きしたモジュールは`mock.restore()`で元に戻らない
   - 同一プロセス内の他テストへ影響が残る可能性がある

2. **並行実行（`--concurrent`）と相性が悪い**
   - モジュールキャッシュ（ESM/CJS）への書き込みは共有状態
   - 並行実行するとテスト同士が踏み合い、フレーク（不安定なテスト）の原因になる
   - ESMはlive bindingで既存importも更新される（その場で差し替わる）

3. **テスト境界での確実な隔離が困難**
   - 各test内で宣言しても、完全な独立性は保証されない
   - ファイルを跨いで影響する報告もある

#### やむを得ず使用する場合の運用ルール

**どうしても`mock.module()`が必要**な場合（例：fetchクライアント、外部SDK、router等で、DI化が困難な依存）：

1. **1ファイルに隔離**
   - `mock.module()`を使うテストは専用ファイルに分離
   - 同じ依存を扱う他のテストと混在させない

2. **describe/ファイル単位で固定の`mock.module()`を使う**
   - 各test内で繰り返すのではなく、describeまたはファイルのトップで一度だけ宣言
   - 冗長性を下げ、意図を明確にする

3. **並行実行から外す**
   - `test.serial`を明示、または`--concurrent`前提から除外
   - フレークリスクを低減

4. **副作用回避が必要なら`--preload`を検討**
   - 先にimportされた場合の副作用を防ぐ

#### 推奨パターン：DI化

```typescript
// ❌ 避ける：mock.module()に依存
mock.module('@/lib/api', () => ({
  fetchData: mockFn,
}));

// ✅ 推奨：DI可能な設計
// lib/api.ts
export const createApiClient = (fetcher: Fetcher) => ({
  fetchData: (id: string) => fetcher(`/api/data/${id}`),
});

// Component.tsx
function Component({ apiClient }: { apiClient: ApiClient }) {
  // apiClientを使用
}

// test
const mockApiClient = {
  fetchData: mock(() => Promise.resolve({ data: 'mocked' })),
};
render(<Component apiClient={mockApiClient} />);
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

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
```bash
docker compose exec client bun test
```

### 運用指針詳細

- **必須**: テスト駆動開発
  - 実装を更新したらテストコードも更新
  - テストコードに記載するテストケース名は日本語で記載
- **必須**: Bun標準テストを使用
- **必須**: `docker compose exec client bunx tsc --noEmit`による型チェック
- **必須**: `docker compose exec client bun test`による自動テスト実行
- **必須**: `docker compose run --rm semgrep semgrep <args...>`によるセキュリティチェック
- **必須**: `bun:test`の組込みAPIのみ使用（`describe` / `it` / `expect` / `mock` / `spyOn`）
- **必須**: `user-event`を標準とする（`fireEvent`は禁止）
- **必須**: ユーザー中心のクエリ使用（`getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`）
- **推奨**: テスト終了時のクリーンアップ（`mock.restore()`と`mock.clearAllMocks()`）
- **推奨**: 依存注入を優先（DI可能な設計、差し替えは`mock()` / `spyOn()`）
- **推奨**: カスタムマッチャー活用（共通マッチャーは`__tests__/helpers`に配置）
- **推奨**: DIパターンでのモック生成（テストごとに新しいモックを生成）
- **非推奨**: 非同期 import（原則、トップレベルの同期 import）
- **非推奨**: モックの乱用（実装との乖離を生む過度なスタブは避け、E2E/統合テストとのバランスを考慮）
- **非推奨**: `mock.module()`の使用（DI不可能な外部依存のみに限定）
- **非推奨**: `data-testid`の使用（ユーザー中心のクエリを優先）
- **非推奨**: 動的importの使用
- **禁止**: `jest`名前空間の使用（`@jest/*`, `@types/jest`, Jestエコシステム）
- **禁止**: テストの`.skip`（意図的な未実装はTODOコメント）
- **禁止**: `fireEvent`の使用（`@testing-library/user-event`で代用）
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

### mock.moduleの注意点
- **トップレベルでの使用は禁止**
- **各test内でのみ宣言し、その後に動的import**すること
- 並列実行やグローバル共有を避け、**最小限の最後の手段**として扱う

---

## 実装パターン例

### フロントエンドユニット/統合テスト

#### DIパターンでのモック生成
```typescript
type MockUserService = {
  getUserProfile: Mock<[string], Promise<User>>;
};

let testUserService: MockUserService;

beforeEach(() => {
  testUserService = {
    getUserProfile: mock().mockName("getUserProfile"),
  };
});
```

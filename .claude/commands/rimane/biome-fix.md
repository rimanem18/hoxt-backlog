---
description: import パスの修正や biome での lint & format を実施し、問題があったら修正します。
---

## 事前情報

エラーが生じた場合、試行錯誤回数よりも質を重視するため、gemini MCP, Codex MCP, o3 MCP などを利用してください。  
ただし、MCP は背景を理解しきれません。仕様やプロジェクトルールに反する提案は無視してください。  
既存のコードベースの内容は、 Codex MCP, 検索や最新情報が必要な場合はまずは gemini の使用を優先し、応答がない場合は o3 を使用します。o3 は推論や検索が長いため、気長に待機してください。何度もメッセージを送るのは禁止です。

## 実行内容

1. `docker compose exec {コンテナ名} bun run fix` を実施
2. 使用されていない package を uninstall
3. 使用されていない import や変数や関数を削除
4. `docker compose exec {コンテナ名} bun test` を実施
    - コンテナ名に client が指定された場合に限り、`docker compose e2e exec npx playwright test` で E2E テストも実施
5. `docker compose exec {コンテナ名} bunx tsc --noEmit` を実施
6. 問題があれば修正
7. `docker compose exec {コンテナ名} bun run fix` を実施
8. 層が異なる相対パスを絶対パスに修正
9. 層が同じでも 3つ以上遡っている相対パスを絶対パスに修正

- **推奨**: biome の指摘と関係のないテストや型エラーも修正します。
- **禁止**: `--unsafe` オプションの実行。
  - 未使用変数はアンダースコアプレフィックスをつけずに削除。削除せずにアンダースコアをつけて残す必要がある場合、コメントで理由を明記します。

問題が解決するまで繰り返します。
三度繰り返しても解決しない場合、ユーザーに指示を求めます。

## テストファイル

**Testing Policy - Bun 標準のみ**  
`bun:test` の組込み API（`describe` / `it` / `expect` / `mock` / `spyOn` / `mock.module` ほか）だけを使用する。  
`jest` 名前空間・`@jest/*`・`@types/jest`・Jest エコシステムの導入・記法の混在を禁止する。  

依存注入と関数ラップを優先し、必要な差し替えは `mock()` / `spyOn()` を基本とする。  
`mock.module()` は最後の手段としてのみ使用する。  
テスト終了時は `mock.restore()` と `mock.clearAllMocks()` を徹底する。  

---

## 運用指針詳細

### 1. 依存と型
- `bun test` を前提とし、追加のテスティングランタイムは導入しない。
- TypeScript は `tsconfig.json` の `types` に `["bun-types"]` を設定し、`@types/jest` を含めない。
- すべてのテストファイルは `.test.ts` / `.test.tsx`。

### 2. 使ってよい API（`bun:test` のみ）
```ts
import {
  describe, it, test, expect,
  beforeEach, afterEach,
  mock, spyOn,
  // 必要に応じて
  // mock.module, setSystemTime
} from "bun:test";
```

- **モック**: `mock(fn)` を用いる（Jest の `jest.fn` は禁止）。
- **スパイ**: 既存オブジェクトには `spyOn(obj, "method")`。
- **モジュール差し替え**: `mock.module()` は「どうしても DI ができない外部依存」などに限定。
- **後片付け**: `afterEach(() => { mock.restore(); mock.clearAllMocks(); })` を共通化。

### 3. 禁止事項
- `jest` 名前空間の利用を禁止。
- Jest エコシステム由来のパッケージを禁止。
- `as unknown as` など乱暴なキャストでのモック化を禁止。

### 4. 標準パターン
（※現行の関数モック／spyOn／インターフェースモック／モジュール差し替え／共通フック例はそのまま）

### 5. 設計原則
- **まず DI**：可能な限り依存注入を優先し、直接 import した依存を差し替えるより、呼び出し側に抽象を注入してモックする。
- 時刻・乱数・I/O などの外部性は **ラッパー関数** 経由にし、テストでそのラッパーをモック。
- スナップショットは安定化処理をしてから比較。
- 非同期は `await` を徹底。`done` コールバックは禁止。

### 6. 既存コードからの移行ルール
- `jest.fn()` → `mock(fn)`
- `jest.spyOn(obj, "m")` → `spyOn(obj, "m")`
- `jest.mock("mod", factory)` → `mock.module("mod", factory)`（※基本は非推奨、必要最小限に）
- `jest.clearAllMocks()` / `jest.restoreAllMocks()` → `mock.clearAllMocks()` / `mock.restore()`
- `jest.Mocked<T>` → `satisfies T` と `mock()` の組み合わせ

### 7. DI 活用モック
- **mockClear / mockReset が煩雑になるケースでは DI を利用する。**
- **DI ではテストごとに新しいモックを生成**し、他テストに影響を及ぼすグローバル共有は避ける。
- **Bun の `Mock` 型**を使って依存のメソッドを型安全にスタブできるようにする。
- **DI パターンでは mockClear は通常不要**（毎テストで新規生成するため）。

```ts
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

### 8. mock.module の注意点
- **トップレベルでの使用は禁止**。  
- **各 test 内でのみ宣言し、その後に動的 import** すること。  
- 並列実行やグローバル共有を避け、**最小限の最後の手段**として扱う。  

## 実行後の確認

-  `jest`／`@jest/*`／`@types/jest` の導入・参照がない
-  すべてのモックは `mock()`／`spyOn()` を使用
-  モジュール差し替えは `mock.module()` のみであり、トップレベルで使用されていない。DI での対応が本当に不可能なのか検討する
-  `afterEach` で `mock.restore()` と `mock.clearAllMocks()` を実施
-  依存は注入可能で、直接 import を強く結合していない
-  テストは非同期を `await` で完結させ、グローバル状態を持ち越さない


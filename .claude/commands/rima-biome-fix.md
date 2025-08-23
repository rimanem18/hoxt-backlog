---
name: rima-fix-format
description: import パスの修正や biome での lint & format を実施し、問題があったら修正します。
---

## 実行内容

1. `docker compose exec {コンテナ名} bun run fix` を実施
2. 使用されていない import や変数や関数を削除
3. `docker compose exec {コンテナ名} bun test` を実施
4. `docker compose exec {コンテナ名} bunx tsc --noEmit` を実施
5. 問題があれば修正
6. `docker compose exec {コンテナ名} bun run fix` を実施
7. 層が異なる相対パスを絶対パスに修正
8. 層が同じでも 3つ以上遡っている相対パスを絶対パスに修正

- **推奨**: biome の指摘と関係のないテストや型エラーも修正します。
- **禁止**: `--unsafe` オプションの実行。

問題が解決するまで繰り返します。
三度繰り返しても解決しない場合、ユーザーに指示を求めます。

## テストファイル

**Testing Policy - Bun 標準のみ**
`bun:test` の組込み API（`describe` / `it` / `expect` / `mock` / `spyOn` / `mock.module` ほか）だけを使用する。
`jest` 名前空間・`@jest/*`・`@types/jest`・Jest エコシステムの導入・記法の混在を禁止する。
依存注入と関数ラップを優先し、必要な差し替えは `mock()` / `spyOn()` / `mock.module()` で行う。テスト終了時は `mock.restore()` と `mock.clearAllMocks()` を徹底する。

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

- **モック**: `mock(fn)` を用いる（Jest の `jest.fn` は使用禁止）。
- **スパイ**: 既存オブジェクトには `spyOn(obj, "method")`。
- **モジュール差し替え**: 依存丸ごとは `mock.module("specifier", factory)`。
- **後片付け**: `afterEach(() => { mock.restore(); mock.clearAllMocks(); })` を共通化。

### 3. 禁止事項

- `import { jest } from "bun:test"`／`import * as jest from ...` を含む **あらゆる `jest` 名前空間の利用を禁止**。
- `@jest/globals`, `@types/jest`, `jest-extended` など **Jest 由来のパッケージの追加を禁止**。
- `as unknown as` による乱暴なキャストでのモック化を禁止。

### 4. 標準パターン（最小テンプレート）

**関数の置き換え（単体モック）**

```ts
const verifyToken = mock(async (token: string) => ({ valid: true, payload: { sub: "u1" } }));
verifyToken.mockResolvedValue({ valid: true, payload: { sub: "u2" } });
```

**既存オブジェクトの監視／一時差し替え**

```ts
const spy = spyOn(authProvider, "verifyToken");
spy.mockResolvedValue({ valid: true, payload: { sub: "u1" } });
// expect(spy).toHaveBeenCalledWith("token");
```

**インターフェース全体を“Bun 流”でモック**

```ts
const authProviderMock = {
  verifyToken: mock(async (_: string) => ({ valid: true, payload: { sub: "u" } })),
  getExternalUserInfo: mock(async (_: JwtPayload) => ({ id: "ext1" }))
} satisfies IAuthProvider;
```

**モジュール単位の差し替え**

```ts
mock.module("@/auth/provider", () => ({
  verifyToken: mock(async () => ({ valid: true, payload: { sub: "mock" } })),
  getExternalUserInfo: mock(async () => ({ id: "ext-mock" }))
}));
```

**共通フック**

```ts
afterEach(() => {
  mock.restore();
  mock.clearAllMocks();
});
```

### 5. 設計原則

- 可能な限り **依存注入（DI）** を用い、直接 `import` した単体を差し替えるより、呼び出し側に抽象を注入してモックする。
- 時刻・乱数・I/O などの外部性は **ラッパー関数** 経由にし、テストでそのラッパーを `mock()`／`spyOn()`。
- スナップショットは **安定化**（正規化・小数点固定・順序ソート）してから比較する。
- 非同期は `await` を徹底し、`done` コールバックは使用しない。

### 6. 既存コードからの移行ルール

- `jest.fn()` → `mock(fn)`
- `jest.spyOn(obj, "m")` → `spyOn(obj, "m")`
- `jest.mock("mod", factory)` → `mock.module("mod", factory)`
- `jest.clearAllMocks()` / `jest.restoreAllMocks()` → `mock.clearAllMocks()` / `mock.restore()`
- `jest.Mocked<Interface>` 依存の型は撤廃し、`satisfies Interface` と `mock()` の組み合わせに置換。

## 実行後の確認

-  `jest`／`@jest/*`／`@types/jest` の導入・参照がない
-  すべてのモックは `mock()`／`spyOn()` を使用
-  モジュール差し替えは `mock.module()` のみ
-  `afterEach` で `mock.restore()` と `mock.clearAllMocks()` を実施
-  依存は注入可能で、直接 import を強く結合していない
-  テストは非同期を `await` で完結させ、グローバル状態を持ち越さない

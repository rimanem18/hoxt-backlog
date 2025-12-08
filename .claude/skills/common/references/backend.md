# バックエンド開発ガイドライン

## 技術スタック

- **バックエンド**: Hono 4 API + PostgreSQL
  - **認証**: Supabase
  - **パッケージ管理**: Bun（`bun.lock`）
  - **本番環境ランタイム**: Node.js 22.x
  - **テスト**: Bun 標準
  - **フォーマット**: Biome + TypeScript
  - **型チェック**: TypeScript + Zod 実行時検証（client 側とスキーマシェア）
  - **TypeScript**: 全面採用による型安全性確保

## コマンド操作

バックエンド関連のコマンドは server コンテナ内で実行してください：

```bash
# example
docker compose exec server bun run dev
```


## コード品質・フォーマット

以下を考慮し、コードの品質を保ってください：

- **必須**: 実装前に `libs`, `utils`, `shared`, `helper` などのディレクトリが存在しないか確認し、車輪の再発明を防ぐ
- **必須**: ファイルの末尾には改行を入れて空行を作る
- **必須**: 同一層の import には相対パスを使用し、他の層からの import には `@/...` を使った絶対パス import を使う
- **必須**: ドメインエラーは `errors` ディレクトリ、値オブジェクトは `valueobjects` ディレクトリに配置する。エンティティは `index` と同じディレクトリに配置する
- **推奨**: 1 行あたりの文字数は 80 字以内になるように改行
- **推奨**: `const` の使用
- **非推奨**: `let` の使用
  - ただし、再代入が明確に必要な場面（ループ変数や一時的な状態）の使用可
- **禁止**: `z.string().uuid()`, `z.string().email()`, `z.string().datetime()` メソッドの使用
  - `z.uuid()`,`z.email()`, `z.iso.datetime()` で代用
- **禁止**: `@ts-ignore` ディレクティブの使用
  - `@ts-expect-error` ディレクティブで代用
- **禁止**: `any` 型の使用
  - ただし、型が取得不能な外部ライブラリや JSON パースなどの場合に限り、理由コメントを添えて明示的に使用可
- **禁止**: `var` の使用
- **禁止**: Supabase JWT Secret 認証の使用（現在非推奨、 JWKS 認証で代用）

# テストガイドライン

## バックエンドユニット/統合テストガイドライン

### 実行環境
```bash
docker compose exec server bun test
```

### 運用指針詳細

- **必須**: テスト駆動開発
  - 実装を更新したらテストコードも更新
  - テストコードに記載するテストケース名は日本語で記載
- **必須**: Bun標準テストを使用
- **必須**: `docker compose exec server bunx tsc --noEmit`による型チェック
- **必須**: `docker compose exec server bun test`による自動テスト実行
- **必須**: `docker compose run --rm semgrep semgrep <args...>`によるセキュリティチェック
- **必須**: `bun:test`の組込みAPIのみ使用（`describe` / `it` / `expect` / `mock` / `spyOn`）
- **推奨**: テスト終了時のクリーンアップ（`mock.restore()`と`mock.clearAllMocks()`）
- **推奨**: 依存注入を優先（DI可能な設計、差し替えは`mock()` / `spyOn()`）
- **推奨**: カスタムマッチャー活用（共通マッチャーは`__tests__/helpers`に配置）
- **推奨**: DIパターンでのモック生成（テストごとに新しいモックを生成）
- **非推奨**: `mock.module()`の使用（DI不可能な外部依存のみに限定）
- **非推奨**: 動的importの使用
- **禁止**: `jest`名前空間の使用（`@jest/*`, `@types/jest`, Jestエコシステム）
- **禁止**: テストの`.skip`（意図的な未実装はTODOコメント）
- **禁止**: `as unknown as`などの乱暴なキャスト

### 依存と型
- `bun test`を前提とし、追加のテスティングランタイムは導入しない
- TypeScriptは`tsconfig.json`の`types`に`["bun-types"]`を設定、`@types/jest`は含めない
- すべてのテストファイルは`.test.ts`

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

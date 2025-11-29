# 基本原則

- 日本語で応答してください。
- README.md には実装済み機能などを記載しないでください。
- ホストマシンのユーザー名やプロジェクトよりも上位のディレクトリ名が露出しないようにハードコードを避けてください。記録が必要な場合はマスクしてください。
- プロジェクト名やリポジトリ名を推測できる値をハードコードしないでください。

# プロジェクト概要

このプロジェクトは、Docker コンテナによって、バックエンドとフロントエンドがわかれています。

バックエンドは server サービスとして提供されており、フロントエンドは client サービスとして提供されています。

また、Zod スキーマをバックエンドとフロントエンドでシェアし、スキーマ駆動開発をしています。

## ディレクトリ構成

- **`app/client/`**: client コンテナにバインド（Next.js アプリケーション）
  - feature-based ディレクトリ
  - WORKDIR: /home/bun/app/client
- **`app/server/`**: server コンテナにバインド（Hono API アプリケーション）
  - DDD + クリーンアーキテクチャ
  - WORKDIR: /home/bun/app/server
- **`app/packages/shared-shemas/`**: client と server でシェアされるスキーマ
- **`docker/`**: Dockerfile とコンテナ設定
- **`compose.yml`**: Docker Compose 設定ファイル
- sub agents に依頼する際は、以下を必ず伝えてください
  - docker compose exec コマンドの活用は重要
  - コンテナの WORKDIR

## アーキテクチャ概要

- **SSG + API 構成**: フロントエンド（Next.js）とバックエンド（Hono API）の完全分離
- **コンテナベース**: Docker Compose によるコンテナ環境での開発
- **DDD + クリーンアーキテクチャ**: ドメインごとに関心を分離

# フロントエンド開発ガイドライン

## 技術スタック

- **フロントエンド**: Next.js 15 + TypeScript 5
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

# スキーマ駆動開発ガイドライン

Drizzle ORM を Single Source of Truth のベースをしています:

```bash
# 1. データベーススキーマ変更後
docker compose exec server bun run generate:schemas

# 2. OpenAPI仕様生成
docker compose exec server bun run generate:openapi

# 3. TypeScript型定義生成
docker compose exec client bun run generate:types

# 4. 型チェック
docker compose exec server bun run typecheck
docker compose exec client bun run typecheck
```

## 新規テーブル追加時の手順

1. `app/server/src/infrastructure/database/schema.ts` にテーブル定義を追加
2. `app/server/scripts/generate-schemas.ts` の `tableConfigs` 配列に設定を追加

```typescript
const tableConfigs: TableConfig[] = [
  {
    tableName: 'users',
    tableObject: users,
    outputFile: 'users.ts',
    enums: [/* enum設定 */],
  },
  // 新規テーブルの設定を追加
];
```

3. スキーマ生成コマンドを実行

## 自動生成ファイルの取り扱い

- **必須**: 冒頭に手動編集禁止の警告コメントが残るように生成スクリプトを作成
- **禁止**: 自動生成されたファイルの手動編集
  - ファイル冒頭の警告コメントを確認
  - スキーマ変更時は必ずスキーマ駆動開発のコマンドで再生成

# IaC

インフラは Terraform によって構築されます。

terraform コマンドは、iac コンテナの中で実行してください。

```bash
# example
make iac
make iac-init
make iac-plan-save
```

aws コマンドも iac コンテナの中で利用できます。

```bash
# example
docker compose exec iac -c 'source ../scripts/create-session.sh && aws ...'
```

# ドキュメント記述ガイドライン

- **禁止**: ダミー機密情報のハードコード
  - ダミートークンなどであっても正しい形式に則って記述せず、省略することで示す（`eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...`）

## mermaid で図示する際の注意事項

### クラス図（classDiagram）の記法ルール

これらのルールに従うことで、mermaidクラス図のパースエラーを防ぐ：

- **必須**: **クラス名・プロパティ名・メソッド名は英数字のみ使用
- **推奨**: 複雑なジェネリクスを単純な型名に置き換え
- **推奨**: Union Typesを意味のある型名に変換
- **推奨**: 関係線は単純な記法を使用
  - `-->` 推奨
  - `||--o` や `||--||` などの複雑な記法は避ける
- **非推奨**: ドット記法 object.method の使用
- **非推奨**: 日本語のメソッド名や特殊文字の使用
- **禁止**: 波括弧 {} を直接使用
- **禁止**: パイプ | を型定義で使用
- **禁止**: 疑問符 ? をオプショナル表記で使用
- **禁止**: 型定義でコロン `:` を使用
  - (`+property: string` → `+property string`)

### フローチャート（flowchart）の記法ルール

mermaidフローチャートを記述する際の確認項目：

1. **ノードラベルは必ずダブルクォート（`""`）で囲む**
   - ❌ 悪い例: `A[データベーススキーマ変更]`
   - ✅ 良い例: `A["データベーススキーマ変更"]`

2. **特殊文字を含むラベルは必ずクォートで囲む**
   - 特殊文字の例: `@`, `/`, `-`, `.`, `:`, `(`, `)`, `{`, `}`, `[`, `]`
   - ❌ 悪い例: `D[@hono/zod-openapi]`
   - ✅ 良い例: `D["@hono/zod-openapi"]`

3. **リンクラベル（エッジのテキスト）もクォートで囲む**
   - ❌ 悪い例: `A -->|失敗| B`
   - ✅ 良い例: `A -->|"失敗"| B`

4. **改行タグ `<br/>` は問題ない**
   - `A["データベーススキーマ変更<br/>Drizzle ORM schema.ts"]` は正常に動作

5. **すべてのノードラベルを統一的にクォートで囲む**
   - 一部だけクォートすると可読性が低下するため、すべてクォートで統一

これらのルールに従うことで、mermaidフローチャートのパースエラーを防ぐことができ、適切な図を作成できます。

### シーケンス図（sequenceDiagram）の注意点

- シーケンス図では参加者名（`participant`）やノート内のテキストに特殊文字があっても問題ない
- ただし、一貫性のため可能な限りクォートを使用することを推奨
- **参加者名にmermaidの予約語を使用しない**
  - 予約語の例: `Title`, `title`, `Note`, `note`, `end`, `loop`, `alt`, `else`, `opt`, `par`, `rect`, `activate`, `deactivate`
  - ❌ 悪い例: `participant Title as TaskTitle`
  - ✅ 良い例: `participant TT as TaskTitle`
- **参加者名は短縮形（2-3文字の略称）を推奨**
  - ❌ 悪い例: `participant Entity as TaskEntity`
  - ✅ 良い例: `participant TE as TaskEntity`

# テストガイドライン

## テスト哲学（共通）

### 良いテストの原則
- **明確な意図**: テストケース名から何を検証しているか一目で理解できる
- **テスト独立性**: 他のテストの実行順序や結果に依存しない
- **決定論的**: 同じ条件で実行すれば常に同じ結果を返す
- **適切な速度**: ユニットテストは高速、E2Eテストは信頼性重視

### 命名規則
- **テストファイル**: `.test.ts` / `.test.tsx` (ユニット/統合), `.spec.ts` (E2E)
- **テストケース名**: 日本語で記載、動詞-主語パターン
- **例**: `test('空文字列トークンが適切に拒否される', ...)`

### フレーク対処方針
1. ローカル環境で再現可能か確認
2. CI環境のTrace Viewerやログを活用
3. タイミング依存を排除（`setTimeout`や固定待機時間を避ける）
4. 環境依存を排除（ハードコードされたURLや日時を避ける）

---

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

## E2Eテストガイドライン（Playwright）

### 実行環境
```bash
docker compose exec e2e npx playwright test
```

### 運用指針詳細

- **必須**: `storageState` APIの使用（ハイドレーション前に確実に設定、レース条件回避）
- **必須**: Locatorsの優先利用（`page.locator()`で自動待機機能を活用）
- **必須**: Web First Assertions（`expect(locator).toBeVisible()`で自動リトライ）
- **必須**: テスト独立性の確保（`test.afterEach`でクリーンアップ徹底）
- **推奨**: リダイレクト検証はDOM要素待機（`waitForURL()`だけでなくページ要素の表示も待機）
- **推奨**: APIによるテストデータセットアップ（UI操作ではなくAPI直接呼び出し）
- **推奨**: Trace Viewerの積極的活用（`trace: 'on-first-retry'`設定、CI失敗時の視覚的デバッグ）
- **非推奨**: `addInitScript`によるlocalStorage設定（タイミング依存、ハイドレーション競合）
- **禁止**: ハイドレーションタイミングへの依存（`waitForTimeout()`など固定待機時間は禁止）

### CI環境への配慮
- **直列実行**: `workers: 1`で安定性重視（`playwright.config.ts`）
- **リトライ**: `retries: 1`で高速フィードバック
- **タイムアウト**: 余裕を持たせる（15秒推奨）
- **環境変数**: `process.env.GITHUB_ACTIONS`でbaseURLを分岐

### デバッグ手法
1. **ローカル**: `npx playwright test --debug`で実行
2. **CI失敗時**: Trace Viewerでartifactを確認
3. **視覚的確認**: スクリーンショット・動画を活用
4. **ヘッドフルモード**: `npx playwright test --headed`で実際のブラウザ動作確認

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

### E2Eテスト（Playwright）

#### storageState APIの使用
```typescript
const context = await browser.newContext({
  storageState: {
    cookies: [],
    origins: [{
      origin: baseURL,
      localStorage: [
        { name: 'auth-token', value: JSON.stringify(authData) }
      ],
    }],
  },
});
const page = await context.newPage();
```

#### リダイレクト検証の正しい書き方
```typescript
// ❌ 非推奨: ハイドレーション完了を保証しない
await page.waitForURL('/dashboard');

// ✅ 推奨: UIが操作可能になったことを確認
await expect(page.getByRole('button', { name: /ログイン/i }))
  .toBeVisible({ timeout: 15000 });
await expect(page).toHaveURL('/dashboard');
```

#### ハイドレーション待機の正しい書き方
```typescript
// ❌ 禁止: 固定待機時間
await page.waitForTimeout(1000);

// ✅ 正しい: DOM要素の出現を待機
await expect(page.getByRole('heading')).toBeVisible();
```

#### テスト独立性の確保
```typescript
test.afterEach(async ({ page }) => {
  await page.unrouteAll();
  await page.evaluate(() => localStorage.clear());
});
```

#### Trace Viewerの設定
```typescript
// playwright.config.ts
use: {
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

# コメントガイドライン

- 機能の「What」を明確に記述
  - クラスDocコメント：冗長な説明を削除し、機能概要や使用例のみに簡潔化
  - メソッドDocコメント：基本的な役割と引数・戻り値の説明に集約
- 実装の「Why」を簡潔かつ明確に記述
  - インラインコメント：実装の理由のみを簡潔に記述
  - エラーメッセージ・定数の説明：機能を端的に表現
- テストファイルは Given-When-Then パターンを意識した構造
  - テストデータの準備（Given）
  - 実際の処理の実行（When）
  - 結果の検証（Then）
  - **禁止**: テストファイルではなく実装ファイルに対する記載。
- 過度な説明を削除し、コード本来の意図を明確化
- TODOコメント：将来の改善点を明記
- **禁止**: コマンドを使用した置換

## 簡潔さと明確さの基準

コメントを記載する必要があるか、あるいはコメントの詳細度に関しては、コードから読み取れるかどうかを基準にします:

詳細度は5が最も高く、1が最も低いです。3がニュートラルで一般的な詳細度とします。
コメントを残した基準はコメントにしないでください。

- **不要**:ジュニアエンジニアであってもコードを読めば理解できる自明なコードに対しての記載
- **詳細度3**:ミドルエンジニアであってもコードを読めば理解できる自明なコードに対しての記載
- **詳細度4**:ミドルエンジニアであっても知らない可能性がある標準関数に対しての記載
- **詳細度4**:シニアエンジニアならコードを読めば理解できる自明なコードに対しての記載
- **詳細度4**:3つの別ファイルからの呼び出しをまたいでいるコードに対しての記載
- **詳細度5**:4つ以上の別ファイルからの呼び出しをまたいでいるコードに対しての記載
- **詳細度5**:シニアエンジニアでも調査が必要な複雑性を持つコードに対しての記載

## 出力フォーマット例

### テストファイル

```typescript
// example
test('空文字列やnullトークンが適切に拒否される', async () => {
  // Given: 空文字列のトークン
  const emptyToken = '';

  // When: JWT検証を実行
  const result: JwtVerificationResult =
    await authProvider.verifyToken(emptyToken);

  // Then: 必須パラメータエラーを返す
  expect(result.valid).toBe(false);
  expect(result.error).toBeDefined();
  expect(result.error).toContain('Token is required');
  expect(result.payload).toBeUndefined();
});
```

```typescript
// example 短ければ When と Then を入れ子にしてもよい
test('必須フィールド不足ペイロードでエラーが発生する', async () => {
  // Given: 必須フィールド（sub）が不足したペイロード
  const incompletePayload = {
    // sub フィールドなし
    email: 'test@example.com',
    app_metadata: { provider: 'hoge', providers: ['hoge'] },
    user_metadata: { name: 'Test User' },
    iss: 'https://your-example.url',
    iat: 1692780800,
    exp: 1692784400,
  } as JwtPayload;

  // When & Then: ユーザー情報を抽出し、エラーが発生する
  await expect(
    authProvider.getExternalUserInfo(incompletePayload),
  ).rejects.toThrow();
});
```

### 実装ファイル
````typescript
/*
 * IAuthProviderインターフェースのHoge向け実装。
 * JWT検証とユーザー情報抽出を提供する。
 * @example
 * ```typescript
 * const provider = new HogeAuthProvider();
 * const result = await provider.verifyToken(jwtToken);
 * if (result.valid) {
 *   const userInfo = await provider.getExternalUserInfo(result.payload!);
 * }
 * ```
 */
export class HogeAuthProvider implements IAuthProvider {
  /**
   * HogeAuthProviderのコンストラクタ
   *
   * 環境変数からJWT秘密鍵を取得し、バリデーションを実行する。
   */
  constructor() {
    this.jwtSecret = this.getJwtSecretFromEnvironment();
    this.validateJwtSecret();
  }

   /**
   * JWT秘密鍵の有効性を検証する
   *
   * @throws {Error} JWT秘密鍵が設定されていない場合
   */
  private validateJwtSecret(): void {
    if (!this.jwtSecret.trim()) {
      throw new Error(ERROR_MESSAGES.MISSING_JWT_SECRET);
    }
  }
}
````

# テストファイル配置ルール

プロジェクト全体でテストファイルの配置を統一し、可読性と保守性を向上させます。

## 基本方針

- **サーバー側**: `__tests__`ディレクトリによる集約型
- **クライアント側**: feature配下の`__tests__`ディレクトリ集約型
- **テストケース数に応じた柔軟な構造化**

## サーバー側 (app/server/src/)

### 配置ルール

各ディレクトリに`__tests__`ディレクトリを作成し、そこにテストファイルを集約します。

```
app/server/src/
├── domain/
│   ├── user/
│   │   ├── __tests__/
│   │   │   ├── UserEntity.test.ts
│   │   │   └── errors.test.ts
│   │   ├── UserEntity.ts
│   │   └── errors/
│   └── services/
│       ├── __tests__/
│       │   └── AuthenticationDomainService.test.ts
│       └── AuthenticationDomainService.ts
│
├── application/
│   └── usecases/
│       ├── __tests__/
│       │   ├── authenticate-user/          # 大規模(11個以上)
│       │   │   ├── validation.test.ts
│       │   │   ├── success-password.test.ts
│       │   │   └── ...
│       │   ├── GetUserProfile.success.test.ts  # 小規模(10個以下)
│       │   ├── GetUserProfile.errors.test.ts
│       │   └── contracts/
│       │       └── auth-provider.contract.test.ts
│       ├── AuthenticateUserUseCase.ts
│       └── GetUserProfileUseCase.ts
│
├── infrastructure/
│   ├── __tests__/
│   │   ├── DatabaseConnection.test.ts
│   │   └── BaseSchemaValidation.test.ts
│   └── auth/
│       ├── __tests__/
│       │   ├── SupabaseJwtVerifier.test.ts
│       │   └── MockJwtVerifier.test.ts
│       └── SupabaseJwtVerifier.ts
│
└── presentation/
    └── http/
        ├── controllers/
        │   ├── __tests__/
        │   │   ├── AuthController.test.ts
        │   │   └── UserController.test.ts
        │   └── AuthController.ts
        ├── routes/
        │   ├── __tests__/
        │   │   ├── authRoutes.test.ts
        │   │   └── userRoutes.integration.test.ts
        │   └── authRoutes.ts
        └── middleware/
            ├── __tests__/
            │   └── metricsMiddleware.test.ts
            └── metricsMiddleware.ts
```

### テストケース数による使い分け

#### 小規模(テストケース10個以下)
- **ファイル名**: `[対象名].[関心事].test.ts`
- **例**: `GetUserProfile.success.test.ts`, `GetUserProfile.validation.test.ts`
- **利点**: ファイル数が少なく、検索・移動が容易

#### 大規模(テストケース11個以上)
- **ディレクトリ名**: `__tests__/[対象名]/`(小文字ケバブケース)
- **ファイル名**: `[シナリオ名].test.ts`
- **例**: `__tests__/authenticate-user/validation.test.ts`
- **利点**: 階層が深くならず整理しやすい

#### 契約テスト
- **ディレクトリ**: `__tests__/contracts/`
- **例**: `__tests__/contracts/auth-provider.contract.test.ts`

## クライアント側 (app/client/src/)

### 配置ルール

各feature配下に`__tests__`ディレクトリを作成し、feature全体のテストを集約します。

```
app/client/src/
├── features/
│   ├── auth/
│   │   ├── __tests__/
│   │   │   ├── sessionRestore.test.ts
│   │   │   ├── errorHandling.test.ts
│   │   │   ├── authProviderInterface.test.ts
│   │   │   └── ui-ux/
│   │   │       └── LoadingState.test.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   │
│   ├── google-auth/
│   │   ├── __tests__/
│   │   │   ├── authSlice.test.ts
│   │   │   └── UserProfile.test.tsx
│   │   ├── components/
│   │   └── store/
│   │
│   └── user/
│       ├── __tests__/
│       │   ├── useUser.test.tsx
│       │   └── useUpdateUser.test.tsx
│       ├── components/
│       ├── hooks/
│       │   ├── useUser.ts
│       │   └── useUpdateUser.ts
│       └── services/
│
└── lib/
    ├── __tests__/
    │   └── api.test.ts
    └── api.ts
```

### ルール詳細

- **必須**: 各feature配下に`__tests__`ディレクトリを作成
- **UI/UX別テスト**: UIに特化したテストは`__tests__/ui-ux/`にサブディレクトリ化
- **hooks/utils**: feature内の`__tests__`に集約(ファイル隣接ではなく)
- **lib/shared**: 同様に`__tests__`ディレクトリに集約

## shared-schemas

```
app/packages/shared-schemas/
├── __tests__/
│   ├── userSchema.test.ts
│   └── authSchema.test.ts
├── userSchema.ts
└── authSchema.ts
```

スキーマのバリデーションテストは`__tests__`に集約します。

## 命名規則

### テストファイル命名

| パターン | 命名例 | 用途 |
|---------|--------|------|
| 単一対象 | `UserEntity.test.ts` | 単一クラス/関数のテスト |
| 関心事別 | `AuthenticateUser.validation.test.ts` | 関心事で分割 |
| シナリオ別 | `success-password.test.ts` | サブディレクトリ内 |
| 統合テスト | `userRoutes.integration.test.ts` | 統合テスト明示 |
| 契約テスト | `auth-provider.contract.test.ts` | 契約テスト明示 |

### テストディレクトリ命名

- **小文字ケバブケース**: `__tests__/authenticate-user/`
- **関心事サブディレクトリ**: `__tests__/ui-ux/`, `__tests__/contracts/`

## 禁止事項

- **禁止**: 実装ファイルと同じディレクトリにテストを配置
  - ❌ `hooks/useUser.ts`, `hooks/useUser.test.tsx`
  - ✅ `hooks/useUser.ts`, `__tests__/useUser.test.tsx`
- **禁止**: `__tests__`外へのテストファイル配置
- **禁止**: テストファイルの拡張子を`.spec.ts`にする
  - 必ず`.test.ts`または`.test.tsx`を使用

# データベース運用ガイドライン

## 環境別のマイグレーション戦略

- **運用方式**: drizzle-kit generate → migrate（マイグレーション管理）
- **BASE_SCHEMA**:
  - Local: `app_test`
  - Preview: `app_${PROJECT_NAME}_preview`
  - Production: `app_${PROJECT_NAME}`
- **特徴**:
  - マイグレーションファイルをGitで管理
  - 本番環境での計画的なマイグレーション実行
  - ロールバック可能な履歴管理

```bash
# 開発時：マイグレーションファイル生成
docker compose exec server bun run db:generate

# 生成されたファイルをコミット
git add app/server/src/infrastructure/database/migrations/
git commit -m "feat: add new migration for XXX"

# CD環境：マイグレーション実行
docker compose exec server bun run db:migrate:preview  # or :production
docker compose exec server bun run db:setup
```

## CI/CDでの運用フロー

### CI（Pull Request時）

マイグレーション同期チェックを実行し、generate漏れを防止：

```bash
# マイグレーション同期チェック
docker compose exec server bash scripts/check-migration-sync.sh
```

**チェック内容**:
1. `db:generate` を実行
2. Git diff で `migrations/` に差分がないか確認
3. 差分があればエラー終了（generate漏れ）

### CD（Deploy時）

#### Preview環境
```bash
export BASE_SCHEMA=app_${PROJECT_NAME}_preview

# マイグレーション実行
docker compose exec server bun run db:migrate:preview

# RLSポリシー適用
docker compose exec server bun run db:setup
```

#### Production環境
```bash
export BASE_SCHEMA=app_${PROJECT_NAME}

# マイグレーション実行
docker compose exec server bun run db:migrate:production

# RLSポリシー適用
docker compose exec server bun run db:setup
```

## RLSポリシー管理

Row Level Security (RLS) ポリシーは `db:setup` で適用

```bash
docker compose exec server bun run db:setup
```

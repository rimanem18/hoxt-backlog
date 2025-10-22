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

- **必須**: テスト駆動開発
  - 実装を更新したらテストコードも更新
  - テストコードに記載するテストケース名は日本語で記載
- **必須**: テストは Bun 標準を使用する
- **必須**: ファイルの末尾には改行を入れて空行を作る
- **必須**: `docker compose exec client bunx tsc --noEmit` による型チェック
- **必須**: `docker compose exec client bun test` による自動テスト
- **推奨**: 1 行あたりの文字数は 80 字以内になるように改行
- **推奨**: `const` の使用
- **非推奨**: テストでのモックの乱用
  - 特に実装との乖離を生むような過度なスタブは避け、E2E または統合テストとのバランスを考慮
- **非推奨**: `let` の使用
  - ただし、再代入が明確に必要な場面（ループ変数や一時的な状態）の使用可
- **非推奨**: `data-testid` の使用
- **禁止**: `@ts-ignore` ディレクティブの使用
  - `@ts-expect-error` ディレクティブで代用
- **禁止**: `any` 型の使用
  - ただし、型が取得不能な外部ライブラリや JSON パースなどの場合に限り、理由コメントを添えて明示的に使用可
- **禁止**: `var` の使用
- **禁止**: テストの `.skip`
  - 意図的な未実装は TODO コメントで
- **禁止**: `JSX.Element` 型の返却
  - `React.ReactNode` 型で代用
- **禁止**: `fireEvent` の使用
  - `userEvent` で代用

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

## スキーマ駆動開発（Drizzle Zod）

### Zodスキーマ自動生成

データベーススキーマ（Drizzle ORM）から Zod スキーマを自動生成します。

```bash
# スキーマ自動生成
docker compose exec server bun run generate:schemas
```

### 新規テーブル追加時の手順

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
4. 生成されたファイルをコミット

### 自動生成ファイルの取り扱い

- **禁止**: `app/packages/shared-schemas/*.ts` の手動編集
  - ファイル冒頭の警告コメントを確認
  - スキーマ変更時は必ず `bun run generate:schemas` で再生成

## コード品質・フォーマット

以下を考慮し、コードの品質を保ってください：

- **必須**: テスト駆動開発
  - 実装を更新したらテストコードも更新
  - テストコードに記載するテストケース名は日本語で記載
- **必須**: テストは Bun 標準を使用する
- **必須**: ファイルの末尾には改行を入れて空行を作る
- **必須**: `docker compose exec client bunx tsc --noEmit` による型チェック
- **必須**: `docker compose exec client bun test` による自動テスト
- **必須**: 同一層の import には相対パスを使用し、他の層からの import には `@/...` を使った絶対パス import を使う
- **必須**: ドメインエラーは `errors` ディレクトリ、値オブジェクトは `valueobjects` ディレクトリに配置する。エンティティは `index` と同じディレクトリに配置する
- **推奨**: 1 行あたりの文字数は 80 字以内になるように改行
- **推奨**: `const` の使用
- **非推奨**: テストでのモックの乱用
  - 特に実装との乖離を生むような過度なスタブは避け、E2E または統合テストとのバランスを考慮
- **非推奨**: `let` の使用
  - ただし、再代入が明確に必要な場面（ループ変数や一時的な状態）の使用可
- **非推奨**: `data-testid` の使用
- **禁止**: `@ts-ignore` ディレクティブの使用
  - `@ts-expect-error` ディレクティブで代用
- **禁止**: `any` 型の使用
  - ただし、型が取得不能な外部ライブラリや JSON パースなどの場合に限り、理由コメントを添えて明示的に使用可
- **禁止**: `var` の使用
- **禁止**: テストの `.skip`
  - 意図的な未実装は TODO コメントで

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

# mermaid で図示する際の注意事項

## クラス図（classDiagram）の記法ルール

mermaidクラス図を記述する際の確認項目：

  - 波括弧 {} を直接使用していない
  - パイプ | を型定義で使用していない
  - 疑問符 ? をオプショナル表記で使用していない
  - ドット記法 object.method を避けている
  - 複雑なジェネリクスを単純な型名に置き換えている
  - Union Typesを意味のある型名に変換している
  - **型定義でコロン `:` を使用しない** (`+property: string` → `+property string`)
  - **日本語のメソッド名や特殊文字を避ける** (パースエラーの原因となる)
  - **関係線は単純な記法を使用** (`-->` 推奨、`||--o` や `||--||` などの複雑な記法は避ける)
  - **クラス名・プロパティ名・メソッド名は英数字のみ使用**

これらのルールに従うことで、mermaidクラス図のパースエラーを防ぐことができ、適切な図を作成できます。

## フローチャート（flowchart）の記法ルール

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

## シーケンス図（sequenceDiagram）の注意点

- シーケンス図では参加者名（`participant`）やノート内のテキストに特殊文字があっても問題ない
- ただし、一貫性のため可能な限りクォートを使用することを推奨

## パースエラーが発生した場合の対処法

1. エラーメッセージで図の種類（classDiagram / flowchart / sequenceDiagram）を確認
2. エラーメッセージの行番号を確認
3. 該当行で以下をチェック：
   - クラス図: 型定義のコロン（`:`）、特殊文字、日本語の使用
   - フローチャート: ノードラベルのダブルクォート、特殊文字（`@`, `/`, `-`, `.` 等）
   - シーケンス図: 複雑な記法の使用
4. 上記のルールに従って修正


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


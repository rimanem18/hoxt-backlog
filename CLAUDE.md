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

# 実装基本ガイドライン

コードを変更したら、以下のコマンドを実行します。コンテナ名は必要に応じて取捨選択します。:

  - `docker compose exec {コンテナサービス名} bunx tsc --noEmit`
  - `docker compose exec {コンテナサービス名} bun run fix`
  - `docker compose exec {コンテナサービス名} test`
  - `docker compose run --rm semgrep semgrep <args...>`

# テストガイドライン

## テスト哲学（共通）

### 良いテストの原則
- **明確な意図**: テストケース名から何を検証しているか一目で理解できる
- **テスト独立性**: 他のテストの実行順序や結果に依存しない
- **決定論的**: 同じ条件で実行すれば常に同じ結果を返す
- **適切な速度**: ユニットテストは高速、E2Eテストは信頼性重視
- **価値のあるテスト**: ライブラリの既定挙動テストは書かず、プロジェクト固有の仕様に集中

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

- **必須**: 各 feature 直下に`__tests__`ディレクトリを作成
- **UI/UX別テスト**: UIに特化したテストは`__tests__/ui-ux/`にサブディレクトリ化
- **hooks/utils**: feature 直下の`__tests__`に集約(ファイル隣接ではなく)
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


# TASK-1320: SupabaseJwtVerifier実装 - TDD要件定義書

## 📄 ドキュメント情報

- **作成日**: 2025-11-28
- **タスクID**: TASK-1320
- **要件名**: todo-app
- **フェーズ**: Phase 4 / 8
- **機能名**: SupabaseJwtVerifier（JWT検証器）

## 1. 機能の概要

### 🔵 青信号: EARS要件定義書・設計文書ベース

**何をする機能か**:
- Supabase AuthのJWKS（JSON Web Key Set）エンドポイントを使用してJWTトークンを検証
- 検証済みJWTペイロードから外部ユーザー情報を抽出・正規化
- RS256/ES256非対称鍵暗号による署名検証を提供

**参照したEARS要件**:
- REQ-402: JWT認証機能
- NFR-103: セキュリティ要件（JWKS認証）

**参照した設計文書**:
- [architecture.md:332-349](docs/design/todo-app/architecture.md) - JWT認証フロー
- [api-endpoints.md:566-579](docs/design/todo-app/api-endpoints.md) - JWT検証フロー

**どのような問題を解決するか**:
- JWT Secret認証（非推奨）から安全なJWKS認証への移行
- トークンの偽造・改ざん防止
- ユーザー認証の一元管理（Supabase Auth連携）

**想定されるユーザー**:
- バックエンドAPI（Presentation層の認証ミドルウェア）
- Infrastructure層のリポジトリ（RLS設定時のuser_id取得）

**システム内での位置づけ**:
- Infrastructure層 - 認証サブシステム
- IAuthProviderインターフェースのJWKS実装
- 依存: jose 6.1.0（JWT検証ライブラリ）
- 依存先: Domain層のIAuthProvider

## 2. 入力・出力の仕様

### 🔵 青信号: EARS機能要件・TypeScript型定義ベース

**参照したEARS要件**: REQ-402
**参照した設計文書**: [IAuthProvider.ts:64-81](app/server/src/domain/services/IAuthProvider.ts)

### verifyToken メソッド

**入力パラメータ**:
| パラメータ | 型 | 説明 | 制約 |
|-----------|---|------|------|
| token | string | 検証対象のJWTトークン | Bearer トークン形式、3部構成（header.payload.signature） |

**出力値**:
```typescript
type JwtVerificationResult = {
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
}
```

**成功時の例**:
```typescript
{
  valid: true,
  payload: {
    sub: "google_1234567890",
    email: "user@example.com",
    aud: "authenticated",
    exp: 1732800000,
    iat: 1732796400,
    iss: "https://project.supabase.co/auth/v1",
    user_metadata: {
      name: "Test User",
      avatar_url: "https://example.com/avatar.jpg"
    },
    app_metadata: {
      provider: "google"
    }
  }
}
```

**失敗時の例**:
```typescript
{
  valid: false,
  error: "Token expired"
}
```

### getExternalUserInfo メソッド

**入力パラメータ**:
| パラメータ | 型 | 説明 | 制約 |
|-----------|---|------|------|
| payload | JwtPayload | 検証済みJWTペイロード | 必須フィールド: sub, email, user_metadata.name, app_metadata.provider |

**出力値**:
```typescript
type ExternalUserInfo = {
  id: string;
  provider: string;
  email: string;
  name: string;
  avatarUrl?: string;
}
```

**出力例**:
```typescript
{
  id: "google_1234567890",
  provider: "google",
  email: "user@example.com",
  name: "Test User",
  avatarUrl: "https://example.com/avatar.jpg"
}
```

**データフロー**:
1. JWTトークン受信 → 形式検証（3部構成チェック）
2. JWKSエンドポイントから公開鍵取得
3. 署名検証（RS256/ES256）
4. issuer/audience検証
5. ペイロード型変換（jose JWTPayload → ドメイン JwtPayload）
6. ユーザー情報抽出・正規化

## 3. 制約条件

### 🔵 青信号: EARS非機能要件・アーキテクチャ設計ベース

**参照したEARS要件**:
- REQ-402: JWT認証機能
- NFR-103: セキュリティ要件（JWKS認証、JWT Secret非推奨）

**参照した設計文書**:
- [architecture.md:332-350](docs/design/todo-app/architecture.md) - JWT認証フロー
- [api-endpoints.md:566-579](docs/design/todo-app/api-endpoints.md) - JWT検証フロー

### セキュリティ要件

- **必須**: JWKS（JSON Web Key Set）による非対称鍵検証
- **禁止**: JWT Secret認証の使用（Supabase公式非推奨）
- **必須**: issuer検証（`{supabaseUrl}/auth/v1`）
- **必須**: audience検証（`authenticated`）
- **推奨**: clockTolerance 30秒（クロックスキュー許容）

### パフォーマンス要件

- **JWKSキャッシュTTL**: 10分（600000ms）
- **接続タイムアウト**: 5秒（5000ms）
- **リトライ回数**: 3回

### アーキテクチャ制約

- **必須**: IAuthProviderインターフェースの実装
- **必須**: Infrastructure層に配置
- **必須**: Domain層への依存禁止（インターフェースのみ参照）
- **必須**: 依存性注入対応（コンストラクタでsupabaseUrl受け取り可能）

### 環境変数制約

- **必須**: `SUPABASE_URL` 環境変数の設定
- **バリデーション**: URL形式チェック（new URL()で検証）
- **フォールバック**: コンストラクタ引数 > 環境変数

### ライブラリバージョン

- **jose**: 6.1.0
- **TypeScript**: 5.9.2

## 4. 想定される使用例

### 🔵 青信号: EARS Edgeケース・データフローベース

**参照したEARS要件**: REQ-402, EDGE-401, EDGE-402
**参照した設計文書**: [architecture.md:236-260](docs/design/todo-app/architecture.md) - タスク作成フロー

### 基本的な使用パターン

```typescript
// Given: SupabaseJwtVerifierインスタンス作成
const verifier = new SupabaseJwtVerifier();

// When: 有効なJWTトークンを検証
const result = await verifier.verifyToken(validJwtToken);

// Then: 検証成功、ペイロード取得
if (result.valid && result.payload) {
  const userInfo = await verifier.getExternalUserInfo(result.payload);
  console.log(`User ID: ${userInfo.id}`);
}
```

### エッジケース1: トークン形式不正

```typescript
// Given: 不正な形式のトークン（部品数が2つ）
const invalidToken = "header.payload";

// When: JWT検証を実行
const result = await verifier.verifyToken(invalidToken);

// Then: 形式エラーが返される
expect(result.valid).toBe(false);
expect(result.error).toBe("Invalid token format");
```

### エッジケース2: トークン期限切れ

```typescript
// Given: 期限切れのJWTトークン
const expiredToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...";

// When: JWT検証を実行
const result = await verifier.verifyToken(expiredToken);

// Then: 期限切れエラーが返される
expect(result.valid).toBe(false);
expect(result.error).toBe("Token expired");
```

### エッジケース3: 署名検証失敗

```typescript
// Given: 署名が改ざんされたトークン
const tamperedToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.invalid_signature";

// When: JWT検証を実行
const result = await verifier.verifyToken(tamperedToken);

// Then: 署名エラーが返される
expect(result.valid).toBe(false);
expect(result.error).toBe("Invalid signature");
```

### エッジケース4: JWKS取得失敗

```typescript
// Given: ネットワークエラーでJWKS取得不可
// （モック環境、または実際のネットワークエラー）

// When: JWT検証を実行
const result = await verifier.verifyToken(validToken);

// Then: JWKS取得エラーが返される
expect(result.valid).toBe(false);
expect(result.error).toBe("Failed to fetch JWKS");
```

### エッジケース5: 必須フィールド不足（getExternalUserInfo）

```typescript
// Given: subフィールドが不足したペイロード
const incompletPayload = {
  email: "user@example.com",
  // sub フィールドなし
  user_metadata: { name: "User" },
  app_metadata: { provider: "google" }
};

// When: ユーザー情報抽出を実行
// Then: 例外が発生
await expect(verifier.getExternalUserInfo(incompletPayload))
  .rejects.toThrow("Missing required field: sub");
```

### エラーケース: 環境変数未設定

```typescript
// Given: SUPABASE_URL環境変数が空
process.env.SUPABASE_URL = "";

// When: インスタンス作成を試みる
// Then: 例外が発生
expect(() => new SupabaseJwtVerifier())
  .toThrow("SUPABASE_URL environment variable is required");
```

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

なし（認証機能は全体の共通基盤）

### 参照した機能要件

- **REQ-402**: JWT認証機能
  - Supabase AuthのJWT検証
  - JWKS認証によるトークン検証

### 参照した非機能要件

- **NFR-103**: セキュリティ要件
  - JWKS認証（JWT Secret非推奨）
  - 非対称鍵暗号による署名検証

### 参照したEdgeケース

- **EDGE-401**: 無効なJWT（形式不正、期限切れ、署名不正）
- **EDGE-402**: ネットワークエラー（JWKS取得失敗）

### 参照した受け入れ基準

なし（既存実装の確認のみ）

### 参照した設計文書

#### アーキテクチャ

- [architecture.md:199-218](docs/design/todo-app/architecture.md) - Infrastructure層の責務
- [architecture.md:332-349](docs/design/todo-app/architecture.md) - JWT認証フロー

#### データフロー

- [architecture.md:236-260](docs/design/todo-app/architecture.md) - タスク作成フロー（JWT検証含む）

#### 型定義

- [IAuthProvider.ts:64-81](app/server/src/domain/services/IAuthProvider.ts) - IAuthProviderインターフェース
- [IAuthProvider.ts:5-62](app/server/src/domain/services/IAuthProvider.ts) - JwtPayload, JwtVerificationResult, ExternalUserInfo型定義

#### API仕様

- [api-endpoints.md:39-79](docs/design/todo-app/api-endpoints.md) - 共通仕様（認証ヘッダー、エラーレスポンス）
- [api-endpoints.md:566-579](docs/design/todo-app/api-endpoints.md) - JWT認証セクション

## 6. 既存実装の状況

### 🔵 青信号: 既存コードベース確認済み

**既存ファイル**:
- `app/server/src/infrastructure/auth/SupabaseJwtVerifier.ts` - 実装済み（294行）
- `app/server/src/infrastructure/auth/__tests__/SupabaseJwtVerifier.test.ts` - テスト済み（296行）

**実装済み機能**:
- ✅ コンストラクタ（環境変数/直接指定対応）
- ✅ verifyToken メソッド
- ✅ getExternalUserInfo メソッド
- ✅ JWKS設定（キャッシュTTL、タイムアウト）
- ✅ エラー分類（署名不正、期限切れ、JWKS取得失敗等）
- ✅ セキュリティ監査ログ

**テスト済みケース**:
- ✅ コンストラクタ（環境変数取得、直接指定、バリデーション）
- ✅ verifyToken（空トークン、形式不正、null/undefined）
- ✅ getExternalUserInfo（完全ペイロード、アバターなし、必須フィールド不足）
- ⚠️ JWKS統合テスト（CI環境でスキップ）

**TASK-1320の実装タスク**:
- **既存実装の確認**: 実装済みコードとテストを確認
- **不足テストケースの洗い出し**: 以下のケースが不足
  - 署名検証失敗の実テスト（モックJWKS使用）
  - トークン期限切れの実テスト
  - issuer/audience検証失敗
  - JWKS取得失敗（ネットワークエラー）
  - 各種エラーカテゴリの網羅的テスト
- **テストカバレッジ80%以上の達成**

## 7. 品質判定

### ✅ 高品質

- ✅ 要件の曖昧さ: なし（既存実装済み、EARS要件・設計文書と一致）
- ✅ 入出力定義: 完全（型定義済み、インターフェース準拠）
- ✅ 制約条件: 明確（JWKS認証、環境変数、パフォーマンス要件）
- ✅ 実装可能性: 確実（既存実装済み、jose 6.1.0使用）

**判定理由**:
- 既存実装が存在し、基本的なテストも済んでいる
- EARS要件定義書（REQ-402, NFR-103）との整合性確認済み
- 設計文書（architecture.md, api-endpoints.md）との対応確認済み
- 不足しているのは一部のエッジケーステストのみ

## 8. 次のステップ

次のお勧めステップ: `/tsumiki:tdd-testcases` でテストケースの洗い出しを行います。

**洗い出し対象**:
- 既存テストケースの確認
- 不足しているエッジケース・エラーケースの特定
- テストカバレッジ80%以上を達成するための追加テストケース

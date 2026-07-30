# authMiddleware TDD要件定義書

## ドキュメント情報

- **作成日**: 2025-11-30
- **TASK-ID**: TASK-1322
- **機能名**: authMiddleware
- **要件名**: todo-app
- **フェーズ**: Phase 5 / 8 - バックエンドPresentation層実装

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

- 🔵 **何をする機能か**: HTTPリクエストのJWTトークンを検証し、認証されたユーザーのリクエストのみを通過させるミドルウェア
- 🔵 **どのような問題を解決するか**:
  - 未認証ユーザーからの不正なAPIアクセスを防止
  - JWT署名検証により、トークン偽造を検出
  - ユーザーIDを抽出し、Row-Level Security（RLS）設定を自動化
  - 認証エラーの一貫したエラーレスポンスを提供
- 🔵 **想定されるユーザー**: Honoフレームワークで実装されたAPIエンドポイント
- 🔵 **システム内での位置づけ**:
  - **レイヤ**: Presentation層（HTTP層）
  - **役割**: すべてのAPIエンドポイントの前段で実行される認証ゲート
  - **依存関係**:
    - `SupabaseJwtVerifier` (Infrastructure層) - JWT検証を委譲
    - `RlsHelper` (Infrastructure層) - RLS設定を委譲
    - `DatabaseConnection` (Infrastructure層) - DBインスタンスを取得

**参照したEARS要件**:
- REQ-402: ユーザーは、Google OAuth経由でログインして認証トークンを取得できる
- NFR-103: JWTトークン検証はJWKS（JSON Web Key Set）エンドポイントを使用して署名を検証すること

**参照した設計文書**:
- [architecture.md - セキュリティ設計](../../../design/todo-app/architecture.md#セキュリティ設計)
- [api-endpoints.md - 認証](../../../design/todo-app/api-endpoints.md#認証)
- [dataflow.md - JWT認証フロー](../../../design/todo-app/dataflow.md#jwt認証フロー)

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 入力パラメータ

#### Context型（Honoコンテキスト）

- 🔵 **型**: `Context` from `hono`
- 🔵 **説明**: Honoフレームワークのリクエストコンテキスト
- 🔵 **主要プロパティ**:
  - `c.req.header(name: string)`: HTTPヘッダー取得
  - `c.json(data, status)`: JSONレスポンス返却
  - `c.set(key, value)`: コンテキスト変数設定
  - `c.get(key)`: コンテキスト変数取得

#### Next関数

- 🔵 **型**: `Next` from `hono`
- 🔵 **説明**: 次のミドルウェア・ハンドラーを呼び出す関数
- 🔵 **使用タイミング**: 認証成功時にのみ呼び出し、次の処理へ進める

#### 入力データフロー

```
Authorization ヘッダー
  └─> "Bearer {jwt_token}" 形式
      └─> JWT検証
          ├─> 成功: user_id抽出 → RLS設定 → next()呼び出し
          └─> 失敗: 401エラーレスポンス返却
```

**参照したEARS要件**: REQ-402, NFR-103

**参照した設計文書**:
- [api-endpoints.md - 認証](../../../design/todo-app/api-endpoints.md#認証)
- [dataflow.md - JWT認証フロー](../../../design/todo-app/dataflow.md#jwt認証フロー)

### 出力値

#### 認証成功時

- 🔵 **動作**: `await next()` を呼び出し、次のミドルウェア・ハンドラーへ処理を委譲
- 🔵 **副作用**:
  - `c.set('userId', userId)` - ユーザーIDをコンテキストに設定
  - `RlsHelper.setCurrentUser(db, userId)` - PostgreSQL RLS設定

#### 認証失敗時（401 Unauthorized）

- 🔵 **型**: JSONレスポンス
- 🔵 **HTTPステータス**: 401
- 🔵 **ボディ形式**:

```typescript
{
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: string // エラー内容に応じたメッセージ
  }
}
```

- 🔵 **エラーメッセージパターン**:
  - `"認証が必要です"` - Authorizationヘッダーなし
  - `"認証が必要です"` - Bearerスキーム以外
  - `"JWT検証に失敗しました"` - JWT検証エラー全般

**参照したEARS要件**:
- REQ-402: 認証トークン検証
- NFR-103: JWKS検証

**参照した設計文書**:
- [api-endpoints.md - エラーレスポンス](../../../design/todo-app/api-endpoints.md#エラーレスポンス)

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### パフォーマンス要件

- 🔵 **NFR-001**: APIエンドポイントのレスポンス時間は1秒以内であること
  - authMiddlewareの処理時間は100ms以内を目標（JWT検証含む）
  - JWKSキャッシュ機能によりJWT検証を高速化（TTL: 10分）

### セキュリティ要件

- 🔵 **NFR-103**: JWTトークン検証はJWKS（JSON Web Key Set）エンドポイントを使用して署名を検証すること
  - Supabase JWT Secret認証は非推奨、JWKS認証を使用
  - JWKSエンドポイント: `https://{supabase_url}/auth/v1/.well-known/jwks.json`

- 🔵 **NFR-102**: データベースアクセスはRow-Level Security（RLS）により保護されること
  - JWT検証後、必ず `RlsHelper.setCurrentUser(db, userId)` を呼び出し
  - RLS設定により、他ユーザーのデータへのアクセスを完全にブロック

- 🔵 **REQ-403**: ユーザーは、自分のタスクのみを閲覧・編集・削除できること
  - authMiddlewareでRLS設定を行うことで実現

### アーキテクチャ制約

- 🔵 **CLAUDE.md**: 依存注入（DI）パターンの遵守
  - `SupabaseJwtVerifier`、`RlsHelper` は外部依存として注入可能
  - テスト時にモック差し替えが容易

- 🔵 **CLAUDE.md**: エラーハンドリングの一貫性
  - すべての認証エラーは401ステータスコード
  - エラーレスポンスは共通フォーマット（`success: false, error: {...}`）

- 🔵 **CLAUDE.md**: Honoミドルウェアの規約準拠
  - `async (c: Context, next: Next) => Promise<Response | void>` の形式
  - 認証成功時は必ず `await next()` を呼び出し
  - 認証失敗時は `c.json(...)` でレスポンス返却（`next()` 呼び出し不要）

### データベース制約

- 🔵 **architecture.md**: RLS Policy適用
  - `SET LOCAL app.current_user_id = '{userId}'` でセッション変数設定
  - PostgreSQLのRLSポリシーが自動的に `user_id` フィルタを適用

**参照したEARS要件**:
- REQ-402, REQ-403, NFR-001, NFR-102, NFR-103

**参照した設計文書**:
- [architecture.md - セキュリティ設計](../../../design/todo-app/architecture.md#セキュリティ設計)
- [architecture.md - レイヤ構成](../../../design/todo-app/architecture.md#レイヤ構成dddクリーンアーキテクチャ)

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 基本的な使用パターン（通常要件REQ-402から抽出）

#### ケース1: 正常な認証フロー

```typescript
// Given: 有効なJWTトークン
const validToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...";
const request = {
  headers: {
    Authorization: `Bearer ${validToken}`
  }
};

// When: authMiddleware実行
await authMiddleware(context, next);

// Then:
// - JWT検証成功
// - user_id抽出
// - RLS設定: SET LOCAL app.current_user_id = '{user_id}'
// - context.set('userId', user_id) 設定
// - next() 呼び出し → 次のハンドラーへ進む
```

**参照したEARS要件**: REQ-402

**参照した設計文書**:
- [dataflow.md - タスク作成フロー](../../../design/todo-app/dataflow.md#タスク作成フロー)

### エッジケース（EDGE要件から抽出）

#### ケース2: Authorizationヘッダーなし

```typescript
// Given: Authorizationヘッダーなし
const request = {
  headers: {}
};

// When: authMiddleware実行
const response = await authMiddleware(context, next);

// Then:
// - 401 Unauthorized
// - { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }
// - next() 呼び出しなし
```

**参照したEARS要件**: 🟡 一般的なHTTP認証の慣習

**参照した設計文書**:
- [api-endpoints.md - エラーレスポンス](../../../design/todo-app/api-endpoints.md#エラーレスポンス)

#### ケース3: Bearerスキーム以外

```typescript
// Given: Basic認証スキーム
const request = {
  headers: {
    Authorization: "Basic dXNlcjpwYXNzd29yZA=="
  }
};

// When: authMiddleware実行
const response = await authMiddleware(context, next);

// Then:
// - 401 Unauthorized
// - { success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }
// - next() 呼び出しなし
```

**参照したEARS要件**: 🟡 一般的なHTTP認証の慣習

#### ケース4: 無効なJWT（署名検証失敗）

```typescript
// Given: 改ざんされたJWT
const tamperedToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.改ざん.署名";
const request = {
  headers: {
    Authorization: `Bearer ${tamperedToken}`
  }
};

// When: authMiddleware実行
const response = await authMiddleware(context, next);

// Then:
// - SupabaseJwtVerifier.verify() でエラー
// - 401 Unauthorized
// - { success: false, error: { code: 'UNAUTHORIZED', message: 'JWT検証に失敗しました' } }
// - next() 呼び出しなし
```

**参照したEARS要件**:
- NFR-103: JWKS検証

**参照した設計文書**:
- [architecture.md - JWT認証フロー](../../../design/todo-app/architecture.md#jwt認証フロー)

#### ケース5: 期限切れJWT

```typescript
// Given: 期限切れJWT（exp < 現在時刻）
const expiredToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...（expが過去）";
const request = {
  headers: {
    Authorization: `Bearer ${expiredToken}`
  }
};

// When: authMiddleware実行
const response = await authMiddleware(context, next);

// Then:
// - SupabaseJwtVerifier.verify() でエラー（Token expired）
// - 401 Unauthorized
// - { success: false, error: { code: 'UNAUTHORIZED', message: 'JWT検証に失敗しました' } }
// - next() 呼び出しなし
```

**参照したEARS要件**:
- NFR-103: JWT検証（有効期限チェック含む）

#### ケース6: RLS設定成功後、次のハンドラーへ進む

```typescript
// Given: 有効なJWT（user_id: "550e8400-e29b-41d4-a716-446655440000"）
const validToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...";
const request = {
  headers: {
    Authorization: `Bearer ${validToken}`
  }
};

// When: authMiddleware実行
await authMiddleware(context, next);

// Then:
// - JWT検証成功
// - user_id = "550e8400-e29b-41d4-a716-446655440000"
// - RLS設定: SET LOCAL app.current_user_id = '550e8400-e29b-41d4-a716-446655440000'
// - context.set('userId', '550e8400-e29b-41d4-a716-446655440000')
// - next() 呼び出し
// - 次のハンドラー（TaskControllerなど）が実行される
```

**参照したEARS要件**:
- REQ-402, REQ-403, NFR-102

**参照した設計文書**:
- [dataflow.md - タスク一覧取得フロー](../../../design/todo-app/dataflow.md#タスク一覧取得フローフィルタソート)
- [architecture.md - セキュリティフロー（RLS）](../../../design/todo-app/architecture.md#セキュリティフローrls)

### エラーケース（エラー処理から抽出）

#### ケース7: SupabaseJwtVerifier.verify() が例外をスロー

```typescript
// Given: SupabaseJwtVerifierが予期しない例外をスロー
const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...";
const request = {
  headers: {
    Authorization: `Bearer ${token}`
  }
};

// When: authMiddleware実行（SupabaseJwtVerifier内部でネットワークエラーなど）
const response = await authMiddleware(context, next);

// Then:
// - 401 Unauthorized
// - { success: false, error: { code: 'UNAUTHORIZED', message: 'JWT検証に失敗しました' } }
// - next() 呼び出しなし
```

**参照したEARS要件**: 🟡 一般的なエラーハンドリング

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー

- 🔵 **ストーリー**: 「ユーザーとして、Google OAuth経由でログインして、自分のタスクを安全に管理したい」

### 参照した機能要件

- 🔵 **REQ-402**: ユーザーは、Google OAuth経由でログインして認証トークンを取得できる
- 🔵 **REQ-403**: ユーザーは、自分のタスクのみを閲覧・編集・削除できること

### 参照した非機能要件

- 🔵 **NFR-001**: APIエンドポイントのレスポンス時間は1秒以内であること
- 🔵 **NFR-102**: データベースアクセスはRow-Level Security（RLS）により保護されること
- 🔵 **NFR-103**: JWTトークン検証はJWKS（JSON Web Key Set）エンドポイントを使用して署名を検証すること

### 参照したEdgeケース

- 🟡 **一般的なHTTP認証の慣習**: Authorizationヘッダーなし、Bearerスキーム以外のエラーハンドリング

### 参照した受け入れ基準

- 🔵 **authMiddleware実装**:
  - Authorizationヘッダーから "Bearer {token}" を抽出
  - SupabaseJwtVerifierでJWT検証
  - user_idを抽出し、RLS設定
  - コンテキストにuserIdを設定
  - 認証失敗時は401エラー返却

### 参照した設計文書

#### アーキテクチャ

- 🔵 [architecture.md - Presentation層](../../../design/todo-app/architecture.md#presentation層プレゼンテーション層)
- 🔵 [architecture.md - セキュリティ設計](../../../design/todo-app/architecture.md#セキュリティ設計)
- 🔵 [architecture.md - JWT認証フロー](../../../design/todo-app/architecture.md#jwt認証フロー)
- 🔵 [architecture.md - セキュリティフロー（RLS）](../../../design/todo-app/architecture.md#セキュリティフローrls)

#### データフロー

- 🔵 [dataflow.md - JWT認証フロー](../../../design/todo-app/dataflow.md#jwt認証フロー)
- 🔵 [dataflow.md - セキュリティフロー（JWT + RLS）](../../../design/todo-app/dataflow.md#セキュリティフローjwt--rls)

#### 型定義

- 🔵 Honoフレームワーク型定義: `Context`, `Next` from `hono`
- 🔵 `SupabaseJwtVerifier`: `verify(token: string)` メソッド
- 🔵 `RlsHelper`: `setCurrentUser(db, userId)` メソッド

#### API仕様

- 🔵 [api-endpoints.md - 認証](../../../design/todo-app/api-endpoints.md#認証)
- 🔵 [api-endpoints.md - エラーレスポンス](../../../design/todo-app/api-endpoints.md#エラーレスポンス)

## 6. 品質判定

### ✅ 高品質:

- **要件の曖昧さ**: なし
  - EARS要件（REQ-402, REQ-403, NFR-102, NFR-103）から明確に導出
  - 既存の `SupabaseJwtVerifier`、`RlsHelper` 実装を参照
- **入出力定義**: 完全
  - Hono `Context`, `Next` 型を明確に定義
  - エラーレスポンス形式を具体的に記載
- **制約条件**: 明確
  - パフォーマンス目標: 100ms以内
  - セキュリティ: JWKS検証、RLS設定
  - アーキテクチャ: DIパターン、Honoミドルウェア規約
- **実装可能性**: 確実
  - 既存の `SupabaseJwtVerifier.verify()` を呼び出し
  - 既存の `RlsHelper.setCurrentUser()` を呼び出し
  - Honoミドルウェアの標準パターン

## 次のステップ

次のお勧めステップ: `/tsumiki:tdd-testcases` でテストケースの洗い出しを行います。

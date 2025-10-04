# TDD要件定義・機能仕様：TASK-202 AuthMiddleware + UserController実装

**作成日**: 2025-08-25  
**更新日**: 2025-08-26（AuthMiddleware要件追加・実装完了状況反映）
**機能名**: mvp-google-auth  
**タスクID**: TASK-202  
**タスクタイプ**: TDD  

**【信頼性レベル指示】**:
- 🟢 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない場合
- 🟡 **黄信号**: EARS要件定義書・設計文書から妥当な推測の場合  
- 🔴 **赤信号**: EARS要件定義書・設計文書にない推測の場合

## 事前準備完了

✅ **TDD関連ファイルの読み込み**・コンテキスト準備完了
✅ **AuthMiddleware実装完了**（2025-08-26追加）

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### UserController機能
🟢 **青信号**: EARS要件定義書・設計文書から詳細仕様を参照して推測なしで抽出

- **何をする機能か**: 認証済みユーザーのプロフィール情報を取得するHTTP APIエンドポイント（GET /api/user/profile）を提供するPresentation層コントローラー
- **どのような問題を解決するか**: フロントエンド（Next.js）が認証されたユーザーの詳細情報（名前、メールアドレス、アバター画像等）をセキュアに取得し、画面に表示するためのHTTP API基盤を提供
- **想定されるユーザー**: Google OAuth認証済みのアプリケーション利用者（フロントエンドアプリケーション経由）
- **システム内での位置づけ**: DDD + クリーンアーキテクチャのPresentation層（Interface Adapters）に位置し、HTTP要求・応答の変換、認証ミドルウェア適用、Application層（GetUserProfileUseCase）との連携を担う

### AuthMiddleware機能
🟢 **青信号**: architecture.mdで明確に定義された必須コンポーネント

- **何をする機能か**: JWTトークンを検証し、ユーザーIDをContextに設定するミドルウェア
- **どのような問題を解決するか**: すべての保護されたエンドポイントで統一されたJWT認証処理を提供し、認証ロジックの重複を排除
- **想定されるユーザー**: バックエンドAPIの各エンドポイント（認証が必要なすべてのAPI）
- **システム内での位置づけ**: DDD Presentation層の認証ミドルウェア、Hono Context拡張による型安全な認証情報管理

**参照したEARS要件**: REQ-005（バックエンドAPIは認証済みユーザーのプロフィール情報を返却しなければならない）、REQ-402（Hono使用）、REQ-407（Presentation層の実装要件）
**参照した設計文書**: architecture.md Presentation層の責務定義・AuthMiddleware（57行目）、api-endpoints.md GET /api/user/profile仕様・JWT検証フロー（212-213行目）

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### UserController仕様
🟢 **青信号**: interfaces.ts、api-endpoints.mdから型定義とAPI仕様を完全抽出

**HTTPエンドポイント**: `GET /api/user/profile`
**認証方式**: `Authorization: Bearer {JWT}` ヘッダー必須（AuthMiddleware適用）
**Content-Type**: レスポンスは `application/json`

**リクエスト仕様**:
```http
GET /api/user/profile
Authorization: Bearer <JWT_TOKEN_REDACTED>.
```

**成功レスポンス (200 OK) - api-endpoints.md仕様準拠**:
```typescript
{
  success: true,
  data: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    externalId: "google_123456789",
    provider: "google",
    email: "user@example.com",
    name: "山田太郎",
    avatarUrl: "https://lh3.googleusercontent.com/a/avatar.jpg",
    createdAt: "2025-08-12T10:30:00.000Z",
    updatedAt: "2025-08-12T10:30:00.000Z",  // 設計仕様準拠（必須フィールド）
    lastLoginAt: "2025-08-12T13:45:00.000Z"
  }
}
```

**実装との乖離**: 実装では updatedAt を削除しているが、設計仕様では必須フィールド（要修正対象）

### AuthMiddleware仕様
🟢 **青信号**: architecture.mdの「JWT検証（Supabase JWT Secret）」仕様に準拠

**認証方式（設計仕様準拠）**: Supabase JWT Secret による検証
**実装方式の乖離**: 実装では jose + JWKS取得を使用（要修正対象）

**入力**: 
- `Authorization: Bearer {JWT}` HTTPヘッダー
- Supabase発行のJWTトークン

**出力**:
- `c.set('userId', string)`: 認証成功時のユーザーID設定
- `c.set('claims', JWTPayload)`: JWT Payloadの設定
- AuthError投げ: 認証失敗時のエラー

**エラーレスポンス（設計仕様準拠）**:
```typescript
// 401 Unauthorized - api-endpoints.md準拠
{
  success: false,
  error: {
    code: "AUTHENTICATION_REQUIRED",
    message: "ログインが必要です"
  }
}

// 404 Not Found - ユーザー不存在（通常発生しない）
{
  success: false,
  error: {
    code: "USER_NOT_FOUND", 
    message: "ユーザーが見つかりません"
  }
}
```

### 入出力の関係性
- JWTトークン（Authorization ヘッダー） → AuthMiddleware → ユーザーID抽出 → GetUserProfileUseCase → User情報返却
- データフロー: JWT検証・ユーザーID取得 → UseCase実行 → HTTPレスポンス変換

**参照したEARS要件**: REQ-005、REQ-104（認証済みの場合の処理要件）、NFR-002（認証チェック1秒以内）
**参照した設計文書**: interfaces.ts GetUserProfileResponse、api-endpoints.md GET /api/user/profile仕様・エラーコード定義、dataflow.md ユーザープロフィール取得フロー

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### パフォーマンス要件
🟢 **青信号**: EARS非機能要件、アーキテクチャ設計から明確な制約を抽出

- **レスポンス時間**: 500ms以内（UserController - api-endpoints.md性能仕様）
- **JWT検証時間**: 1秒以内（AuthMiddleware - NFR-002）
- **同時リクエスト処理**: 100リクエスト/分/ユーザー（将来のレート制限準備）

### セキュリティ要件
🟢 **青信号**: architecture.md、api-endpoints.mdのセキュリティ仕様

- **HTTPS通信必須**: 本番環境でのHTTPS通信のみ許可（NFR-101）
- **JWT検証方式**: Supabase JWT Secret による検証（architecture.md仕様準拠）
- **実装乖離**: 実装では jose + JWKS取得を使用（要修正対象）
- **認証エラーハンドリング**: AUTHENTICATION_REQUIRED（api-endpoints.md準拠）
- **実装乖離**: 実装では TOKEN_MISSING/INVALID/EXPIRED/USER_BANNED（要修正対象）
- **認可チェック**: AuthMiddlewareによるJWT検証・ユーザー情報のコンテキスト設定必須

### 互換性要件
🟢 **青信号**: 設計文書から明確に抽出

- **フロントエンド連携**: Next.jsからのfetchAPI、axios等のHTTPクライアント対応（REQ-101、REQ-104）
- **CORS対応**: localhost:3000（開発環境）、本番ドメインからのアクセス許可（api-endpoints.md）

### アーキテクチャ制約
🟢 **青信号**: architecture.md DDD層構造から抽出

- **Honoフレームワーク**: UserController は Hono Context 対応実装必須（REQ-402）
- **依存性逆転原則**: Application層（GetUserProfileUseCase）にのみ依存、Infrastructure層に直接依存禁止（REQ-407）
- **依存性方向**: Presentation → Application → Domain
- **SOLID原則準拠**: 単一責任、開放閉鎖の原則適用
- **RESTful API**: GET /api/user/profileの単一責任（認証済みユーザー情報取得のみ）
- **統一レスポンス形式**: api-endpoints.md共通レスポンス形式準拠
- **Hono Context拡張**: userId、claimsのContext型安全設定

### データベース制約
🟢 **青信号**: database-schema.sqlから抽出

- **読み取り専用**: プロフィール取得は読み取り専用操作、トランザクション分離レベル考慮
- **インデックス活用**: users(id)プライマリキーインデックスによる高速検索

### 実装制約
🔴 **赤信号**: 実装が設計仕様から乖離（要修正）

**設計仕様準拠の要件**:
- **JWT検証方式**: Supabase JWT Secret による直接検証
- **エラーコード**: AUTHENTICATION_REQUIRED 統一使用
- **レスポンス形式**: updatedAt フィールド必須

**現在の実装乖離**:
- **JWT検証ライブラリ**: `jose` + JWKS取得（設計外の技術選定）
- **エラーハンドリング**: TOKEN_MISSING/INVALID/EXPIRED（設計外の分類）
- **レスポンス欠損**: updatedAt フィールドの削除
- **認証ミドルウェア**: AuthMiddleware適用によるJWT検証・エラーハンドリング
- **エラーハンドリング**: UserNotFoundError、AuthenticationError のHTTPエラー変換

**参照したEARS要件**: NFR-002（APIレスポンス時間・認証時間）、NFR-101（HTTPS必須）、NFR-202（日本語エラーメッセージ）、REQ-402（Hono使用）、REQ-407（層構造実装）
**参照した設計文書**: architecture.md セキュリティ・パフォーマンス設計、api-endpoints.md レスポンス時間目標・セキュリティ仕様・エラーコード一覧、database-schema.sql インデックス戦略

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 基本的な使用パターン
🟢 **青信号**: dataflow.md、EARS Edgeケースから具体的なフローとエラーケースを抽出

```typescript
// フロントエンドからのAPIコール
const response = await fetch('/api/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  }
});
const result = await response.json();
// result.data にユーザー情報が格納される
```

### データフロー
1. **HTTPリクエスト受信**: GET /api/user/profile + Authorization ヘッダー
2. **AuthMiddleware実行**: JWT検証（jose + JWKS）・ユーザー情報コンテキスト設定
3. **UserController.getProfile実行**: 認証前提のUseCaseの呼び出し
4. **GetUserProfileUseCase実行**: ユーザー情報取得
5. **HTTPレスポンス変換**: User Entity → JSON形式のAPIレスポンス
6. **フロントエンド表示**: ユーザー情報の画面表示

### エッジケース
🟢 **青信号**: api-endpoints.mdエラー仕様から抽出

- **EDGE-001**: Authorizationヘッダー不存在 → AuthMiddleware が AUTHENTICATION_REQUIRED (401)「ログインが必要です」（api-endpoints.md準拠）
- **EDGE-002**: 無効・期限切れJWT → AuthMiddleware が AUTHENTICATION_REQUIRED (401)「ログインが必要です」（api-endpoints.md準拠）
- **実装乖離**: 実装では TOKEN_MISSING/INVALID/EXPIRED を使用（要修正対象）
- **EDGE-003**: ユーザー不存在（通常発生しない）→ GetUserProfileUseCase が UserNotFoundError → 404エラー「ユーザーが見つかりません」
- **EDGE-101**: ネットワーク通信エラー → フロントエンドで「APIサーバーとの通信に失敗しました」表示

### 統合テスト課題
🔴 **赤信号**: 実装中に判明した課題（設計文書に記載なし）

- **課題**: 統合テストでJWT検証が実際に動作し、モック認証が困難
- **影響**: HTTP統合テストが実認証エラーで失敗
- **対策**: AuthMiddleware専用テストとUserController統合テストの分離が必要

### エラーケース
```typescript
// 認証エラー例
try {
  const response = await fetch('/api/user/profile', {
    headers: { /* Authorization ヘッダーなし */ }
  });
} catch (error) {
  // 401 Unauthorized レスポンス
  // フロントエンドでログイン画面にリダイレクト
}

// サーバー内部エラー例  
try {
  // データベース接続エラー等
} catch (error) {
  // 500 Internal Server Error
  // 「一時的にサービスが利用できません」メッセージ表示
}
```

**参照したEARS要件**: EDGE-002（JWT検証失敗エラー）、EDGE-003（API通信エラー）
**参照した設計文書**: dataflow.md ユーザープロフィール表示フロー、api-endpoints.md エラーレスポンス仕様・エラーコード一覧

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- **ストーリー2**: 「ログイン済みユーザーとして、私はバックエンドAPIから自分のユーザー情報を取得して画面に表示されることを確認したい」

### 参照した機能要件
- **REQ-005**: バックエンドAPIは認証済みユーザーのプロフィール情報を返却しなければならない
- **REQ-104**: ユーザーが認証済みの場合、システムはユーザー情報とログアウトボタンを表示しなければならない
- **REQ-402**: バックエンドはHono フレームワークを使用しなければならない
- **REQ-407**: バックエンドは以下の層構造を実装しなければならない（Presentation層の実装）

### 参照した非機能要件
- **NFR-002**: バックエンドAPIの認証チェックは1秒以内に完了しなければならない
- **NFR-101**: すべての認証通信はHTTPS経由で行われなければならない
- **NFR-202**: 認証エラーは理解しやすい日本語で表示されなければならない

### 参照したEdgeケース
- **EDGE-002**: JWT検証失敗時はバックエンドが401エラーを返却する
- **EDGE-003**: バックエンドAPI通信エラー時は「APIサーバーとの通信に失敗しました」メッセージを表示する

### 参照した受け入れ基準
- ユーザー情報を取得して画面に表示される
- ページリロード後も認証状態が維持される
- モバイルデバイスでスムーズに認証できる

### 参照した設計文書
- **アーキテクチャ**: architecture.md 
  - Presentation層（Interface Adapters）の責務・依存関係管理
  - AuthMiddleware: JWT検証ミドルウェア（57行目）
  - 認証方式: JWT検証（Supabase JWT Secret）（46行目）
- **データフロー**: dataflow.md 2回目以降ログインフロー、ユーザープロフィール表示フロー
- **型定義**: interfaces.ts GetUserProfileResponse, User, AuthenticatedRequest
- **データベース**: database-schema.sql users テーブル定義・インデックス戦略
- **API仕様**: api-endpoints.md 
  - GET /api/user/profile エンドポイント詳細仕様（161-216行目）
  - 処理フロー: JWT検証・ユーザーID取得（212-213行目）
  - エラーコード定義（66-74行目）
  - エラーハンドリング仕様

### 設計仕様との乖離分析
🔴 **赤信号**: 実装が設計文書から重大に乖離（要修正）

#### 重大な仕様乖離項目

1. **JWT検証方式の乖離**
   - **設計仕様**: 「JWT検証（Supabase JWT Secret）」（architecture.md 46行目）
   - **実装状況**: 「jose + JWKS取得」アプローチで実装
   - **修正要件**: Supabase JWT Secret による直接検証に変更必須

2. **エラーコードの乖離**
   - **設計仕様**: 「AUTHENTICATION_REQUIRED」統一（api-endpoints.md 68行目）
   - **実装状況**: 「TOKEN_MISSING/INVALID/EXPIRED/USER_BANNED」の詳細分類
   - **修正要件**: AUTHENTICATION_REQUIRED 統一に変更必須

3. **レスポンス形式の乖離**
   - **設計仕様**: 「updatedAt」フィールド必須（api-endpoints.md 183行目）
   - **実装状況**: 「updatedAt」フィールドを削除
   - **修正要件**: updatedAt フィールド復活必須

#### 修正優先度
- **最優先**: JWT検証方式（セキュリティに直結）
- **高優先**: エラーコード統一（フロントエンド連携に影響）
- **中優先**: レスポンス形式（データ整合性）

---

## 実装完了状況（2025-08-26更新）

### ✅ 完了済み実装
1. **AuthMiddleware** - jose + JWKS による JWT検証・Context設定
   - JWT検証ライブラリ: `jose` （v6.0.13）
   - JWKS取得: createRemoteJWKSetによる1時間キャッシュ
   - Context拡張: userId・claims の型安全設定
   - エラーハンドリング: AuthError統一クラス（TOKEN_MISSING/INVALID/EXPIRED/USER_BANNED）
2. **UserController** - requireAuth()前提の認証済みユーザー処理  
   - 認証前提実装: userId はrequireAuth()により保証
   - UseCase連携: GetUserProfileUseCaseとの適切な連携
   - エラーハンドリング: UserNotFoundError、ValidationError、InfrastructureError対応
3. **userRoutes統合** - requireAuth()ミドルウェア適用
4. **型安全性** - Context拡張による完全な型サポート

### ✅ テスト完了状況
- **UserController単体テスト**: 6/6テスト成功 
- **GetUserProfileUseCase継続テスト**: 30/30テスト成功
- **TypeScript型チェック**: コンパイルエラーなし

### ⚠️ 課題と制限事項
1. **統合テスト** - 実JWT検証により認証テスト困難（0/11成功）
2. **設計乖離** - JWT検証方式の技術選定による差異
3. **DIコンテナ未統合** - userRoutes.tsでの直接依存関係作成

---

## 品質判定結果

🔴 **設計仕様乖離あり（要修正）**:
- **要件の明確性**: 設計文書は明確、実装が仕様から乖離
- **入出力定義**: 設計仕様は完全、実装がレスポンス形式で乖離
- **制約条件**: 設計文書準拠、但し実装でJWT検証方式が乖離
- **実装適合性**: 実装完了済みだが設計仕様との重大な不整合あり

### 必須修正項目（設計仕様準拠）
1. **JWT検証方式修正** - jose+JWKS → Supabase JWT Secret検証
2. **エラーコード統一** - TOKEN_*/USER_BANNED → AUTHENTICATION_REQUIRED
3. **レスポンス修正** - updatedAt フィールド復活
4. **統合テスト修正** - 上記修正に伴うテスト更新

---

## 次のステップ

**必須ステップ**: 設計仕様準拠への修正
1. **仕様乖離修正** - JWT検証・エラーコード・レスポンス形式の設計準拠修正
2. **`/tdd-refactor`** - 設計仕様準拠 + 品質改善（DIコンテナ統合等）
3. **`/tdd-testcases`** - 修正後のテストケース再整備

**設計変更が必要な場合**:
- architecture.md・api-endpoints.md の仕様変更協議
- 実装方針（jose+JWKS vs Supabase JWT Secret）の技術選定見直し
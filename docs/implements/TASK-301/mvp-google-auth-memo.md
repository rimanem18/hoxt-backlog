# TDD開発メモ: mvp-google-auth

## 概要

- 機能名: mvp-google-auth（Google認証のMVP実装）
- 開発開始: 2025-08-28
- 現在のフェーズ: Red（失敗テスト作成完了）

## 関連ファイル

- 要件定義: `docs/implements/TASK-301/mvp-google-auth-requirements.md`
- テストケース定義: `docs/implements/TASK-301/mvp-google-auth-testcases.md`
- 実装ファイル: `app/server/src/` （各層ファイル群）
- テストファイル: `app/server/src/**/__tests__/` （層別テストファイル群）

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-08-28

### 作成したテストケース

#### 1. JWT検証・ユーザー認証成功テスト
- **ファイル**: `app/server/src/application/usecases/__tests__/auth-verify/jwt-authentication-success.spec.ts`
- **テスト内容**: 有効なJWTでの既存ユーザー認証処理の正常フロー
- **検証項目**: JWT検証・ユーザー検索・lastLoginAt更新・レスポンス形式・isNewUser=false
- **信頼性**: 🟢 EARS要件REQ-002・interfaces.ts・api-endpoints.mdから直接抽出

#### 2. JITプロビジョニング成功テスト
- **ファイル**: `app/server/src/application/usecases/__tests__/auth-verify/jit-provisioning-success.spec.ts`
- **テスト内容**: 初回ログイン時の新規ユーザー自動作成処理
- **検証項目**: JWT検証・ユーザー不存在確認・JIT新規作成・UUID生成・タイムスタンプ設定・isNewUser=true・ドメインオブジェクト構築
- **信頼性**: 🟢 EARS要件REQ-004・interfaces.ts・dataflow.md・DDD UserEntity設計から直接抽出

#### 3. ユーザープロフィール取得成功テスト
- **ファイル**: `app/server/src/presentation/http/controllers/__tests__/UserController-profile-success.spec.ts`
- **テスト内容**: GET /api/user/profile エンドポイントでの認証済みユーザー情報取得
- **検証項目**: 認証ミドルウェア通過・UserController連携・GetUserProfileUseCase実行・HTTPレスポンス形式・ミドルウェアチェーン
- **信頼性**: 🟢 EARS要件REQ-005・api-endpoints.md・Hono仕様・architecture.mdから直接抽出

#### 4. 無効JWT検証エラーテスト
- **ファイル**: `app/server/src/application/usecases/__tests__/auth-verify/invalid-jwt-error.spec.ts`
- **テスト内容**: 不正署名・不正形式・期限切れJWTでの認証失敗処理
- **検証項目**: JWT署名検証・形式チェック・期限管理・AuthenticationError/TokenExpiredError発生・適切なエラーコード・セキュリティ情報非開示
- **信頼性**: 🟢 EARS要件EDGE-002・JWT標準仕様・セキュリティ要件から直接抽出

### 期待される失敗

現在、以下のテストは全て失敗する予定です：

1. **AuthenticateUserUseCase未実装**: `new AuthenticateUserUseCase()` でインポートエラーまたは実装不足エラー
2. **UserController統合未実装**: Honoアプリケーションのルーティング・ミドルウェア統合が未完成
3. **JWT検証機能未実装**: SupabaseAuthProvider・JwtValidationServiceの統合が未完成
4. **エラーハンドリング未実装**: AuthenticationError・TokenExpiredError・適切なエラーコード設定が未完成
5. **DDD統合未実装**: UserAggregate・AuthenticationDomainService・UserRepository統合が未完成

### テスト実行コマンド

```bash
# 個別テストファイルの実行
docker compose exec server bun test src/application/usecases/__tests__/auth-verify/jwt-authentication-success.spec.ts
docker compose exec server bun test src/application/usecases/__tests__/auth-verify/jit-provisioning-success.spec.ts
docker compose exec server bun test src/presentation/http/controllers/__tests__/UserController-profile-success.spec.ts
docker compose exec server bun test src/application/usecases/__tests__/auth-verify/invalid-jwt-error.spec.ts

# 全認証関連テストの実行
docker compose exec server bun test src/**/__tests__/**/*auth*.spec.ts

# 型チェック（テスト前推奨）
docker compose exec server bunx tsc --noEmit
```

### 次のフェーズへの要求事項

Greenフェーズで実装すべき最小要件：

#### Application層
- **AuthenticateUserUseCase**: JWT検証・ユーザー検索・JIT処理・レスポンス生成の最小実装
- **GetUserProfileUseCase**: 認証済みユーザーのプロフィール情報取得の最小実装

#### Domain層
- **AuthenticationDomainService**: JIT プロビジョニング・ユーザー作成の最小実装
- **UserEntity**: ユーザードメインオブジェクトの最小構築
- **AuthenticationError/TokenExpiredError**: 適切なドメインエラーの最小実装

#### Infrastructure層
- **SupabaseAuthProvider**: JWT検証・ユーザー情報抽出の最小実装
- **PostgreSQLUserRepository**: ユーザーCRUD操作の最小実装

#### Presentation層
- **AuthMiddleware**: JWT抽出・検証・コンテキスト設定の最小実装
- **UserController**: GET /api/user/profile エンドポイントの最小実装
- **ルーティング統合**: 認証ミドルウェア・コントローラーの統合

### 品質方針

- **テスト駆動**: 全てのテストが先に失敗し、実装により成功に導く
- **最小実装**: テストを通すための必要最小限の実装のみ
- **DDD準拠**: ドメイン層の純粋性・依存性逆転の原則維持
- **型安全性**: TypeScript型定義との完全整合性
- **セキュリティ**: JWT検証・エラーハンドリングの堅牢性確保

---

## Greenフェーズ（最小実装）

### 実装日時

未実装

### 実装方針

TBD（次フェーズで決定）

### 実装コード

TBD

### テスト結果

TBD

### 課題・改善点

TBD

---

## Refactorフェーズ（品質改善）

### リファクタ日時

未実装

### 改善内容

TBD

### セキュリティレビュー

TBD

### パフォーマンスレビュー

TBD

### 最終コード

TBD

### 品質評価

TBD
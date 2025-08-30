

# TDD Redフェーズ実装記録

**【機能名】**: mvp-google-auth (Google認証のMVP実装)
**【タスクID】**: TASK-301
**【フェーズ】**: Red（失敗テスト作成）
**【作成日】**: 2025-08-28
**【更新日】**: 2025-08-28

- **フロントエンド未実装**

- **実装詳細**:
  - Supabase Auth の設定
  - Google OAuth フローの実装
  - JWT取得・保存
  - 認証状態管理（Redux）
- **ファイル構成**:
  ```
  app/client/src/
  ├── features/auth/
  │   ├── components/
  │   │   ├── LoginButton.tsx
  │   │   └── LogoutButton.tsx
  │   ├── hooks/
  │   │   └── useAuth.tsx
  │   ├── store/
  │   │   ├── authSlice.ts
  │   │   └── authActions.ts
  │   └── services/
  │       └── authService.ts
  └── lib/
      └── supabase.ts
  ```
- **機能実装**:
  - Google OAuth によるログイン
  - JWT の自動取得・保存
  - ログアウト機能
  - 認証状態の永続化
- **UI/UX要件**:
  - [ ] ローディング状態: ログインボタン無効化 + スピナー
  - [ ] エラー表示: トースト通知またはインラインエラー
  - [ ] モバイル対応: レスポンシブデザインでの適切表示
  - [ ] アクセシビリティ: キーボード操作・ARIA属性対応
- **テスト要件**:
  - [ ] コンポーネントテスト: LoginButton・LogoutButton
  - [ ] ストアテスト: authSlice の状態変更
  - [ ] 統合テスト: 認証フロー全体のE2E


## Redフェーズ概要

TDD開発サイクルのRedフェーズとして、実装前に失敗するテストを作成しました。これにより、実装すべき機能の契約と期待値を明確に定義し、過剰実装を防ぎます。

### 実装原則
- **契約駆動開発**: テストが実装すべき機能の明確な契約を定義
- **失敗確認**: 全てのテストが現時点で失敗することを確認
- **最小要件定義**: 次のGreenフェーズで実装すべき最小要件を明確化
- **品質保証**: 日本語コメント・信頼性レベル・検証ポイントの明示

---

## 作成したテストファイル

### 1. JWT検証・ユーザー認証成功テスト

**ファイル**: `app/server/src/application/usecases/__tests__/auth-verify/jwt-authentication-success.spec.ts`

#### テスト目的
- POST /api/auth/verify エンドポイントが有効なJWTを正常に検証し、ユーザー情報を返却することを確認
- AuthenticateUserUseCaseの正常フローを検証

#### 主要検証項目
- JWT検証成功
- 既存ユーザー情報取得
- lastLoginAt更新
- isNewUser=false設定
- レスポンス形式の正確性

#### 期待される失敗理由
- `AuthenticateUserUseCase` クラスが未実装
- JWT検証機能の統合が未完成
- ユーザー検索・更新機能が未実装

---

### 2. JITプロビジョニング成功テスト

**ファイル**: `app/server/src/application/usecases/__tests__/auth-verify/jit-provisioning-success.spec.ts`

#### テスト目的
- 初回ログイン時のJIT（Just-In-Time）新規ユーザー作成が正常に動作することを確認
- AuthenticationDomainServiceのJIT機能を検証

#### 主要検証項目
- JWT検証成功
- ユーザー不存在確認
- JIT新規ユーザー作成
- UUID生成の正確性
- タイムスタンプ設定
- isNewUser=true設定
- ドメインオブジェクトとしての品質

#### 期待される失敗理由
- JITプロビジョニング機能が未実装
- `AuthenticationDomainService` の統合が未完成
- `UserAggregate` によるドメインオブジェクト生成が未実装

---

### 3. ユーザープロフィール取得成功テスト

**ファイル**: `app/server/src/presentation/http/controllers/__tests__/UserController-profile-success.spec.ts`

#### テスト目的
- GET /api/user/profile エンドポイントが認証済みユーザーのプロフィール情報を正常に返却することを確認
- UserController・認証ミドルウェア・GetUserProfileUseCaseの統合を検証

#### 主要検証項目
- HTTPステータス200 OK
- 適切なContent-Type
- 認証ミドルウェア通過
- UserController連携
- GetUserProfileUseCase実行
- JSON レスポンス形式の正確性
- ミドルウェアチェーンの正常動作

#### 期待される失敗理由
- `UserController` が未実装
- 認証ミドルウェアの統合が未完成
- Honoルーティングの設定が未完成
- `GetUserProfileUseCase` の統合が未完成

---

### 4. 無効JWT検証エラーテスト

**ファイル**: `app/server/src/application/usecases/__tests__/auth-verify/invalid-jwt-error.spec.ts`

#### テスト目的
- 無効なJWTトークンでの認証失敗が適切にハンドリングされることを確認
- セキュリティ・エラーハンドリングの堅牢性を検証

#### 主要検証項目
- 無効署名JWT の拒否
- 不正形式JWT の拒否
- 期限切れJWT の拒否
- 適切なドメインエラー発生（AuthenticationError・TokenExpiredError）
- 正確なエラーコード設定（INVALID_TOKEN・TOKEN_EXPIRED）
- セキュリティ情報の非開示
- ユーザーフレンドリーなエラーメッセージ

#### 期待される失敗理由
- JWT検証エラーハンドリングが未実装
- `AuthenticationError`・`TokenExpiredError` が未実装
- Supabase連携での署名検証が未実装
- 期限チェック機能が未実装

---

## テストコード設計方針

### 日本語コメント必須要件

全てのテストファイルで以下の日本語コメント構造を採用：

```typescript
// 【テスト目的】: [このテストで何を確認するかを日本語で明記]
// 【テスト内容】: [具体的にどのような処理をテストするかを説明]
// 【期待される動作】: [正常に動作した場合の結果を説明]
// 🟢🟡🔴 信頼性レベル: [このテストの内容が元資料のどの程度に基づいているか]

// 【テストデータ準備】: [なぜこのデータを用意するかの理由]
// 【実際の処理実行】: [どの機能/メソッドを呼び出すかを説明]
// 【結果検証】: [何を検証するかを具体的に説明]

expect(result.property).toBe(expectedValue); // 【確認内容】: [この検証で確認している具体的な項目] 🟢🟡🔴
```

### 信頼性レベル評価

- **🟢 青信号（85%）**: EARS要件定義書・設計文書からの直接抽出
- **🟡 黄信号（10%）**: 技術標準・既存実装からの妥当推測
- **🔴 赤信号（5%）**: 実装詳細での必要最小限推測

### Given-When-Then パターン

全てのテストで以下の構造を採用：

1. **Given（準備）**: テストデータ・初期条件設定
2. **When（実行）**: 実際の処理・メソッド呼び出し
3. **Then（検証）**: 結果の検証・期待値との比較

---

## テスト実行・失敗確認

### 実行コマンド

```bash
# 個別テストファイル実行
docker compose exec server bun test src/application/usecases/__tests__/auth-verify/jwt-authentication-success.spec.ts
docker compose exec server bun test src/application/usecases/__tests__/auth-verify/jit-provisioning-success.spec.ts
docker compose exec server bun test src/presentation/http/controllers/__tests__/UserController-profile-success.spec.ts
docker compose exec server bun test src/application/usecases/__tests__/auth-verify/invalid-jwt-error.spec.ts

# 型チェック（推奨）
docker compose exec server bunx tsc --noEmit
```

### 期待される失敗パターン

1. **インポートエラー**: `AuthenticateUserUseCase`・`UserController` 等が未実装
2. **型エラー**: TypeScript型定義と実装の不整合
3. **実行時エラー**: メソッド・プロパティが undefined
4. **統合エラー**: ミドルウェア・ルーティング・依存性注入が未完成

---

## 次フェーズ（Green）への要求仕様

### 最小実装要件

#### Application層
- **AuthenticateUserUseCase.execute()**: JWT検証・ユーザー検索・JIT・レスポンス生成
- **GetUserProfileUseCase.execute()**: 認証済みユーザー情報取得

#### Domain層
- **AuthenticationDomainService**: JITプロビジョニング・ユーザー作成ロジック
- **UserEntity**: ユーザードメインオブジェクト
- **AuthenticationError**: 認証失敗ドメインエラー
- **TokenExpiredError**: トークン期限切れドメインエラー

#### Infrastructure層
- **SupabaseAuthProvider**: JWT検証・ユーザー情報抽出
- **PostgreSQLUserRepository**: ユーザーCRUD操作

#### Presentation層
- **AuthMiddleware**: JWT抽出・検証・コンテキスト設定
- **UserController**: GET /api/user/profile エンドポイント
- **ルーティング統合**: ミドルウェア・コントローラー統合

### 品質制約

- **型安全性**: TypeScript型定義との完全整合
- **DDD準拠**: ドメイン層の純粋性・依存性逆転
- **セキュリティ**: JWT検証の堅牢性・エラー情報非開示
- **テスト通過**: 全ての作成したテストが成功すること

---

## 品質判定

### ✅ 高品質判定結果

- **テスト実行**: 成功（失敗することを確認済み）
- **期待値**: 明確で具体的な検証ポイント
- **アサーション**: 適切なexpectステートメント
- **実装方針**: 次フェーズへの明確な要求仕様

### 品質保証項目

- **契約明確性**: テストが実装すべき機能を明確に定義
- **日本語可読性**: 全てのテストに詳細な日本語コメント
- **信頼性透明性**: 各項目の元資料との対応関係を明示
- **段階的実装**: 最小要件から段階的に実装可能な設計

---

## 次のステップ

**次のお勧めステップ**: `/tdd-green` でGreenフェーズ（最小実装）を開始します。

作成した失敗テストを成功させるための最小限の実装を行い、TDD開発サイクルの次フェーズに進んでください。

---

## 更新履歴
- 2025-08-28: 初回作成（TASK-301）- TDD Redフェーズ完了・失敗テスト4件作成・品質判定実施

# TASK-104: Supabase認証プロバイダー実装 - TDD要件定義

作成日: 2025-08-17  
更新日: 2025-08-17

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 概要

🟢 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない場合

- **何をする機能か**: Supabase AuthのJWT検証・ユーザー情報抽出を行う認証プロバイダー実装
- **どのような問題を解決するか**: 外部認証サービスとの統一的な連携インターフェースを提供し、プロバイダー固有の実装詳細をDomain層から隠蔽
- **想定されるユーザー**: AuthenticateUserUseCaseから呼び出される内部システムユーザー
- **システム内での位置づけ**: Infrastructure層でのIAuthProviderインターフェース実装

**参照したEARS要件**: REQ-002（バックエンドはJWTを検証してユーザー認証を行わなければならない）、REQ-408（プロバイダー非依存の認証アーキテクチャを実装しなければならない）

**参照した設計文書**: architecture.md Infrastructure層・SupabaseAuthProvider

### 1.2 主要責務

🟢 **青信号**: アーキテクチャ設計文書から明確に定義済み

- **JWT署名検証**: Supabase JWT Secretを使用したトークン検証
- **ユーザー情報抽出**: JWTペイロードから正規化されたユーザー情報の生成
- **エラーハンドリング**: JWT関連エラーの適切な処理・変換
- **セキュリティ保証**: 不正なトークンの確実な拒否

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 verifyToken メソッド

🟢 **青信号**: IAuthProviderインターフェースで完全定義済み

#### 入力パラメータ
```typescript
token: string  // フロントエンドから送信されたJWTトークン文字列
```

**制約条件**:
- JWT形式（header.payload.signature）である必要がある
- 空文字・null・undefinedは無効
- Base64URLエンコード済みである必要がある

#### 出力値
```typescript
Promise<JwtVerificationResult> {
  valid: boolean,      // 検証成功フラグ
  payload?: JwtPayload, // 検証成功時のペイロード情報
  error?: string       // 検証失敗時のエラー詳細
}
```

**検証成功時のJwtPayload**:
```typescript
{
  sub: string,         // Google Sub Claim（外部ID）
  email: string,       // ユーザーメールアドレス
  app_metadata: {
    provider: 'google',
    providers: ['google']
  },
  user_metadata: {
    name: string,      // フルネーム
    avatar_url?: string, // プロフィール画像URL
    email: string,     // 重複だが含まれる
    full_name: string  // フルネーム（nameと同じ）
  },
  iss: string,         // 発行者（Supabase）
  iat: number,         // 発行日時（Unix timestamp）
  exp: number          // 有効期限（Unix timestamp）
}
```

**参照したEARS要件**: REQ-002（JWT検証）
**参照した設計文書**: interfaces.ts JwtVerificationResult・JwtPayload定義

### 2.2 getExternalUserInfo メソッド

🟢 **青信号**: IAuthProviderインターフェースで完全定義済み

#### 入力パラメータ
```typescript
payload: JwtPayload  // verifyTokenで検証済みのJWTペイロード
```

#### 出力値
```typescript
Promise<ExternalUserInfo> {
  id: string,          // payload.sub（外部プロバイダーID）
  provider: 'google',  // 固定値
  email: string,       // payload.email
  name: string,        // payload.user_metadata.name
  avatarUrl?: string   // payload.user_metadata.avatar_url
}
```

**参照したEARS要件**: REQ-004（JITプロビジョニング対応）
**参照した設計文書**: interfaces.ts ExternalUserInfo定義

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 パフォーマンス要件

🟢 **青信号**: アーキテクチャ設計文書から明確に定義済み

- **JWT検証時間**: 1秒以内（NFR-002）
- **メモリ内署名検証**: メモリ効率を重視した実装
- **タイムアウト設定**: 外部API呼び出し時の適切なタイムアウト

**参照したEARS要件**: NFR-002（認証チェック1秒以内）

### 3.2 セキュリティ要件

🟢 **青信号**: EARS要件定義書・設計文書から明確に定義済み

- **署名検証**: Supabase JWT Secretによる厳密な署名検証
- **有効期限チェック**: exp claimによる期限切れトークン拒否
- **発行者検証**: iss claimによる発行者の確認
- **改ざん検知**: 署名不一致時の確実な拒否

**参照したEARS要件**: NFR-101（HTTPS通信）、NFR-102（Secure Token管理）

### 3.3 アーキテクチャ制約

🟢 **青信号**: アーキテクチャ設計文書から明確に定義済み

- **依存性逆転**: IAuthProviderインターフェースの実装
- **Infrastructure層配置**: infrastructure/auth/SupabaseAuthProvider.ts
- **シングルトン管理**: 環境設定の一元管理
- **プロバイダー独立性**: Googleプロバイダー固有の実装を隠蔽

**参照したEARS要件**: REQ-407（層構造実装）、REQ-408（プロバイダー非依存）
**参照した設計文書**: architecture.md Infrastructure層設計

### 3.4 環境設定制約

🟢 **青信号**: 技術実装要件から明確に定義済み

- **必須環境変数**: SUPABASE_JWT_SECRET
- **設定検証**: 起動時の環境変数存在確認
- **エラーハンドリング**: 設定不正時の適切なエラー

**参照したEARS要件**: REQ-401（技術スタック制約）

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン

🟢 **青信号**: データフロー図から明確に定義済み

#### 正常な認証フロー
```typescript
// 1. AuthenticateUserUseCaseからの呼び出し
const result = await authProvider.verifyToken(jwtToken);

if (result.valid && result.payload) {
  // 2. ユーザー情報の抽出
  const userInfo = await authProvider.getExternalUserInfo(result.payload);
  
  // 3. JITプロビジョニングまたは既存ユーザー取得
  const user = await userRepository.findByExternalId(userInfo.id, userInfo.provider);
}
```

**参照したEARS要件**: REQ-002（JWT検証フロー）
**参照した設計文書**: dataflow.md 認証フローシーケンス

### 4.2 エッジケース

🟢 **青信号**: EARS要件定義書Edgeケースセクションから明確に定義済み

#### 無効なJWTトークン
```typescript
// 不正な署名のJWT
const invalidResult = await authProvider.verifyToken("invalid.jwt.token");
// 期待: { valid: false, error: "Invalid signature" }

// 期限切れのJWT  
const expiredResult = await authProvider.verifyToken(expiredToken);
// 期待: { valid: false, error: "Token expired" }

// 形式不正のトークン
const malformedResult = await authProvider.verifyToken("not-a-jwt");
// 期待: { valid: false, error: "Invalid token format" }
```

**参照したEARS要件**: EDGE-002（JWT検証失敗時は401エラー）

#### 不完全なJWTペイロード
```typescript
// 必須フィールド不足のペイロード
const incompletePayload = { sub: "123", /* email missing */ };
const userInfoResult = await authProvider.getExternalUserInfo(incompletePayload);
// 期待: ExternalUserInfoExtractionError throw
```

**参照したEARS要件**: EDGE-004（Supabaseサービス障害対応）

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー
- **ストーリー1**: Googleアカウントでログイン（JWT検証が核心機能）
- **ストーリー2**: バックエンドAPIでのユーザー情報取得（認証後の情報抽出）

### 5.2 参照した機能要件
- **REQ-002**: バックエンドはJWTを検証してユーザー認証を行わなければならない
- **REQ-004**: システムはJIT（Just-In-Time）プロビジョニングでユーザー作成を行わなければならない
- **REQ-408**: システムはプロバイダー非依存の認証アーキテクチャを実装しなければならない
- **REQ-409**: Domain層は特定の認証プロバイダーに依存してはならない

### 5.3 参照した非機能要件
- **NFR-002**: バックエンドAPIの認証チェックは1秒以内に完了しなければならない
- **NFR-101**: すべての認証通信はHTTPS経由で行われなければならない
- **NFR-102**: 認証トークンはSupabaseが管理するSecure Cookieに保存されなければならない

### 5.4 参照したEdgeケース
- **EDGE-002**: JWT検証失敗時はバックエンドが401エラーを返却する
- **EDGE-004**: Supabaseサービス障害時は「認証サービスが一時的に利用できません」メッセージを表示する

### 5.5 参照した設計文書
- **アーキテクチャ**: architecture.md Infrastructure層・SupabaseAuthProvider
- **データフロー**: dataflow.md 認証フローシーケンス図（Step 14-15）
- **型定義**: interfaces.ts IAuthProvider・JwtVerificationResult・ExternalUserInfo
- **API仕様**: api-endpoints.md POST /api/auth/verify

## 6. 技術実装詳細

### 6.1 ファイル構成

🟢 **青信号**: アーキテクチャ設計から明確に定義済み

```
app/server/src/infrastructure/
└── auth/
    └── SupabaseAuthProvider.ts
```

### 6.2 依存関係

🟢 **青信号**: 技術実装要件から明確に定義済み

```typescript
import { IAuthProvider, JwtVerificationResult, JwtPayload, ExternalUserInfo } from '@/domain/services/IAuthProvider';
import { AuthProvider } from '@/domain/user/AuthProvider';
import { EnvironmentConfig } from '@/infrastructure/config/EnvironmentConfig';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
```

### 6.3 環境変数要件

🟢 **青信号**: 技術実装要件から明確に定義済み

```env
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
```

### 6.4 実装方針

🟢 **青信号**: セキュリティ・アーキテクチャ要件から明確に定義済み

- **JWT検証**: jsonwebtoken ライブラリによるHS256署名検証
- **エラーハンドリング**: 詳細なエラー情報を含むJwtVerificationResult返却
- **セキュリティ**: 署名・有効期限・発行者の三重チェック
- **ログ**: 検証結果の適切なログ出力（成功/失敗の監査ログ）

## 7. 品質判定

### 7.1 品質評価

✅ **高品質**:
- **要件の曖昧さ**: なし（EARS要件定義書・設計文書から完全定義）
- **入出力定義**: 完全（TypeScript型定義で厳密に定義済み）
- **制約条件**: 明確（パフォーマンス・セキュリティ・アーキテクチャ制約すべて明記）
- **実装可能性**: 確実（既存のSupabase・JWT技術スタックで実現可能）

### 7.2 信頼性レベルサマリー
- 🟢 **要件・仕様**: 95%が青信号（EARS要件定義書・設計文書ベース）
- 🟡 **技術詳細**: 5%が黄信号（JWT検証の具体的実装方式は妥当な推測）
- 🔴 **推測部分**: 0%（設計文書にない新規推測は含まれていない）

## 8. 受け入れ基準

### 8.1 機能受け入れ基準

🟢 **青信号**: EARS受け入れ基準から明確に定義済み

- [ ] 有効なGoogle OAuth JWTを正しく検証できる
- [ ] 無効なJWTを確実に拒否できる
- [ ] JWTペイロードから正確なユーザー情報を抽出できる
- [ ] エラー発生時に適切なエラー情報を返却できる
- [ ] 1秒以内でJWT検証が完了する
- [ ] IAuthProviderインターフェースに完全準拠している

### 8.2 セキュリティ受け入れ基準

🟢 **青信号**: EARS非機能要件から明確に定義済み

- [ ] 不正な署名のJWTを確実に拒否する
- [ ] 期限切れのJWTを確実に拒否する
- [ ] 発行者が異なるJWTを確実に拒否する
- [ ] JWT Secretの環境変数管理が適切に実装されている

### 8.3 アーキテクチャ受け入れ基準

🟢 **青信号**: アーキテクチャ設計から明確に定義済み

- [ ] Domain層への依存関係が存在しない（依存性逆転準拠）
- [ ] Infrastructure層の適切な配置
- [ ] プロバイダー固有の実装詳細がDomain層から隠蔽されている
- [ ] 将来の他プロバイダー追加時の拡張性を考慮した設計

**参照したEARS要件**: DDD学習効果テスト項目

## 9. 次のステップ

**次のお勧めステップ**: `/tdd-testcases.md` でテストケースの洗い出しを行います。

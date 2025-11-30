# TASK-105: ユーザー認証UseCase実装 - TDD要件定義

作成日: 2025-08-18  
更新日: 2025-08-18

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 1.1 概要

🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない場合

- **何をする機能か**: JWT検証からユーザー認証・JITプロビジョニングまでの一連のビジネスフローを管理するApplication層のUseCase実装
- **どのような問題を解決するか**: フロントエンドから送信されたJWTトークンを安全に検証し、既存ユーザーの認証または新規ユーザーのJIT作成を実行
- **想定されるユーザー**: AuthController（Presentation層）から呼び出される内部システム  
- **システム内での位置づけ**: Application層の中核UseCase、Domain層とInfrastructure層を協調させるオーケストレーター

**参照したEARS要件**: REQ-002（バックエンドはJWTを検証してユーザー認証を行わなければならない）、REQ-004（JITプロビジョニングでユーザー作成を行わなければならない）

**参照した設計文書**: architecture.md Application層・AuthenticateUserUseCase、dataflow.md 認証フローシーケンス

### 1.2 主要責務

🔵 **青信号**: アーキテクチャ設計文書から明確に定義済み

- **JWT検証の調整**: SupabaseAuthProviderを使用したトークン検証処理の実行
- **ユーザー認証**: 既存ユーザーの特定と認証状態の確立
- **JITプロビジョニング**: 新規ユーザーの自動作成・永続化
- **ビジネスフロー管理**: 認証フロー全体の一貫した実行とトランザクション管理
- **エラーハンドリング**: 各層のエラーを適切にキャッチし、ビジネス例外として変換

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 2.1 execute メソッド

🔵 **青信号**: IAuthenticateUserUseCaseインターフェースで完全定義済み

#### 入力パラメータ
```typescript
input: AuthenticateUserUseCaseInput {
  jwt: string  // フロントエンドから送信されたJWTトークン文字列
}
```

**制約条件**:
- JWT形式である必要がある（header.payload.signature構造）
- 空文字・null・undefinedは無効
- 最大長制限: 2048文字（JWT標準的な上限）

#### 出力値
```typescript
Promise<AuthenticateUserUseCaseOutput> {
  user: User,           // 認証成功したユーザー情報（完全なUserエンティティ）
  isNewUser: boolean    // JIT作成された新規ユーザーかどうか
}
```

**成功時のUser構造**:
```typescript
{
  id: string,              // UUID v4（システム内部ID）
  externalId: string,      // Google Sub Claim（外部プロバイダーID）
  provider: 'google',      // 認証プロバイダー種別
  email: string,           // ユーザーメールアドレス
  name: string,            // 表示名
  avatarUrl?: string,      // プロフィール画像URL（オプション）
  createdAt: Date,         // アカウント作成日時
  updatedAt: Date,         // 最終更新日時
  lastLoginAt: Date        // 今回ログイン日時（必ず更新）
}
```

**参照したEARS要件**: REQ-005（バックエンドAPIは認証済みユーザーのプロフィール情報を返却しなければならない）
**参照した設計文書**: interfaces.ts AuthenticateUserUseCaseInput・AuthenticateUserUseCaseOutput定義

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 3.1 パフォーマンス要件

🔵 **青信号**: アーキテクチャ設計文書から明確に定義済み

- **認証処理時間**: 1秒以内（JWT検証 + DB処理含む）（NFR-002）
- **JITプロビジョニング時間**: 2秒以内（NFR-003）
- **並列処理**: JWT検証とユーザー検索の並列実行による高速化
- **データベース接続**: 効率的なコネクションプール使用

**参照したEARS要件**: NFR-002（認証チェック1秒以内）、NFR-003（JITプロビジョニング2秒以内）

### 3.2 セキュリティ要件

🔵 **青信号**: EARS要件定義書・設計文書から明確に定義済み

- **JWT検証**: SupabaseAuthProviderによる厳密な署名・有効期限検証
- **認証失敗時**: 詳細なエラー情報の秘匿（攻撃者への情報漏洩防止）
- **最小権限**: 必要最小限のユーザー情報のみ取得・返却
- **監査ログ**: 認証試行（成功/失敗）の適切なログ出力

**参照したEARS要件**: NFR-101（HTTPS通信）、NFR-102（Secure Token管理）

### 3.3 アーキテクチャ制約

🔵 **青信号**: アーキテクチャ設計文書から明確に定義済み

- **依存性方向**: Application → Domain ← Infrastructure（依存性逆転の原則）
- **層配置**: application/usecases/AuthenticateUserUseCase.ts
- **DI管理**: IUserRepository・IAuthProviderの抽象化に依存
- **トランザクション管理**: ユーザー作成処理のACID特性保証
- **ビジネスロジック分離**: Domain層への適切な責務委譲

**参照したEARS要件**: REQ-407（層構造実装）、REQ-408（プロバイダー非依存）
**参照した設計文書**: architecture.md Application層設計

### 3.4 可用性・エラーハンドリング制約

🔵 **青信号**: データフロー図・エラーハンドリング仕様から明確に定義済み

- **部分障害への対応**: 外部サービス障害時の適切なエラーメッセージ
- **リトライ機構**: データベース一時的障害に対する適切な再試行
- **データ整合性**: JIT作成時の重複ユーザー回避（unique制約活用）
- **グレースフルデグラデーション**: 一部機能障害時の最低限動作保証

**参照したEARS要件**: EDGE-003（API通信エラー）、EDGE-004（Supabase障害）

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 4.1 基本的な使用パターン

🔵 **青信号**: データフロー図から明確に定義済み

#### 既存ユーザーの認証フロー
```typescript
// AuthControllerからの呼び出し
const input: AuthenticateUserUseCaseInput = {
  jwt: "<JWT_TOKEN_REDACTED>."
};

const result = await authenticateUserUseCase.execute(input);

// 期待される結果
// result.user: 既存のユーザー情報（lastLoginAtが更新済み）
// result.isNewUser: false
```

**内部処理フロー**:
1. JWT検証（SupabaseAuthProvider.verifyToken）
2. 外部ユーザー情報抽出（SupabaseAuthProvider.getExternalUserInfo）
3. 既存ユーザー検索（UserRepository.findByExternalId）
4. lastLoginAt更新（UserRepository.update）
5. ユーザー情報返却

**参照した設計文書**: dataflow.md 2回目以降のログインフロー（Step 95-102）

#### 新規ユーザーのJITプロビジョニングフロー
```typescript
// 同様の呼び出しだが、ユーザーが未存在の場合
const result = await authenticateUserUseCase.execute(input);

// 期待される結果
// result.user: 新規作成されたユーザー情報（初回ログイン）
// result.isNewUser: true
```

**内部処理フロー**:
1. JWT検証（SupabaseAuthProvider.verifyToken）
2. 外部ユーザー情報抽出（SupabaseAuthProvider.getExternalUserInfo）
3. 既存ユーザー検索（UserRepository.findByExternalId → null）
4. 新規ユーザー作成（UserRepository.create）
5. ユーザー情報返却

**参照した設計文書**: dataflow.md 初回ログインフロー（Step 66-76）

### 4.2 エッジケース・エラーハンドリング

🔵 **青信号**: EARS要件定義書Edgeケースセクションから明確に定義済み

#### 無効なJWTトークン
```typescript
// 不正・期限切れ・形式不正のJWT
try {
  await authenticateUserUseCase.execute({ jwt: "invalid.jwt.token" });
} catch (error) {
  // 期待: AuthenticationError がthrowされる
  // エラーメッセージ: "認証トークンが無効です"
  // HTTPコントローラーで401 Unauthorizedに変換
}
```

**参照したEARS要件**: EDGE-002（JWT検証失敗時は401エラー）

#### データベース一時的障害
```typescript
// DB接続エラー時
try {
  await authenticateUserUseCase.execute({ jwt: validJwt });
} catch (error) {
  // 期待: InfrastructureError がthrowされる
  // リトライ機構による再試行（3回まで）
  // 最終的に500 Internal Server Errorに変換
}
```

#### JIT作成時の重複ユーザー（競合状態）
```typescript
// 同じユーザーが複数リクエストを同時実行
// unique制約によりDB側で重複回避
// 2回目以降は既存ユーザーとして扱う
```

**参照したEARS要件**: EDGE-004（Supabase障害対応）

### 4.3 境界値・特殊状況

🔵 **青信号**: EARS要件定義書・データフロー仕様から明確に定義済み

#### 長いユーザー名の処理
```typescript
// 50文字を超えるユーザー名（Google名前フィールド）
const longNameUser = {
  name: "非常に長い名前が設定されているユーザーの場合の処理テストケース"  // 50文字超
};
// 期待: User.nameフィールドで適切に切り詰められる、またはバリデーションエラー
```

#### アバター画像URL不存在
```typescript
// Googleプロフィールでアバター未設定
const userWithoutAvatar = {
  avatar_url: null  // またはundefined
};
// 期待: User.avatarUrlはnullでデータ保存、フロントエンドでデフォルト画像表示
```

**参照したEARS要件**: EDGE-101（長いユーザー名の省略表示）、EDGE-102（デフォルト画像表示）

## 5. EARS要件・設計文書との対応関係

### 5.1 参照したユーザストーリー
- **ストーリー1**: Googleアカウントでログイン（JWT検証→認証確立が核心フロー）
- **ストーリー2**: バックエンドAPIでのユーザー情報取得（認証後の情報返却）

### 5.2 参照した機能要件
- **REQ-002**: バックエンドはJWTを検証してユーザー認証を行わなければならない
- **REQ-004**: システムはJIT（Just-In-Time）プロビジョニングでユーザー作成を行わなければならない
- **REQ-005**: バックエンドAPIは認証済みユーザーのプロフィール情報を返却しなければならない
- **REQ-407**: バックエンドは層構造を実装しなければならない（Application層の実装）

### 5.3 参照した非機能要件
- **NFR-002**: バックエンドAPIの認証チェックは1秒以内に完了しなければならない
- **NFR-003**: JIT プロビジョニングは2秒以内に完了しなければならない
- **NFR-101**: すべての認証通信はHTTPS経由で行われなければならない

### 5.4 参照したEdgeケース
- **EDGE-002**: JWT検証失敗時はバックエンドが401エラーを返却する
- **EDGE-003**: バックエンドAPI通信エラー時は「APIサーバーとの通信に失敗しました」メッセージを表示する
- **EDGE-004**: Supabaseサービス障害時は「認証サービスが一時的に利用できません」メッセージを表示する

### 5.5 参照した設計文書
- **アーキテクチャ**: architecture.md Application層・AuthenticateUserUseCase
- **データフロー**: dataflow.md 認証フローシーケンス図（初回・2回目以降ログイン）
- **型定義**: interfaces.ts IAuthenticateUserUseCase・AuthenticateUserUseCaseInput・AuthenticateUserUseCaseOutput
- **API仕様**: api-endpoints.md POST /api/auth/verify
- **データベース**: database-schema.sql users テーブル設計

## 6. 技術実装詳細

### 6.1 ファイル構成

🔵 **青信号**: アーキテクチャ設計から明確に定義済み

```
app/server/src/application/
├── usecases/
│   └── AuthenticateUserUseCase.ts
└── services/
    └── ApplicationService.ts  # 横断的関心事（将来対応）
```

### 6.2 依存関係

🔵 **青信号**: DDD設計原則から明確に定義済み

```typescript
import { IAuthenticateUserUseCase, AuthenticateUserUseCaseInput, AuthenticateUserUseCaseOutput } from '@/domain/usecases/IAuthenticateUserUseCase';
import { IUserRepository } from '@/domain/repositories/IUserRepository';  
import { IAuthProvider } from '@/domain/services/IAuthProvider';
import { IAuthenticationDomainService } from '@/domain/services/IAuthenticationDomainService';
import { AuthenticationError, UserNotFoundError } from '@/domain/user/errors/';
import { Logger } from '@/shared/logging/Logger';
```

### 6.3 DI（依存性注入）要件

🔵 **青信号**: クリーンアーキテクチャ設計原則から明確に定義済み

```typescript
export class AuthenticateUserUseCase implements IAuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authProvider: IAuthProvider,  
    private readonly authDomainService: IAuthenticationDomainService,
    private readonly logger: Logger
  ) {}
}
```

### 6.4 トランザクション管理方針

🔵 **青信号**: セキュリティ・データ整合性要件から明確に定義済み

- **JIT作成時**: ユーザー作成のトランザクション境界設定
- **更新処理**: lastLoginAt更新のアトミック性保証  
- **エラー時ロールバック**: 部分的な状態変更の防止
- **並行制御**: 同一ユーザーの同時認証リクエスト制御

## 7. 品質判定

### 7.1 品質評価

✅ **高品質**:
- **要件の曖昧さ**: なし（EARS要件定義書・設計文書から完全定義）
- **入出力定義**: 完全（TypeScript型定義で厳密に定義済み）
- **制約条件**: 明確（パフォーマンス・セキュリティ・アーキテクチャ制約すべて明記）
- **実装可能性**: 確実（TASK-103・TASK-104の完成により依存関係解決済み）

### 7.2 信頼性レベルサマリー
- 🔵 **要件・仕様**: 95%が青信号（EARS要件定義書・設計文書ベース）
- 🟡 **実装詳細**: 5%が黄信号（トランザクション管理・エラーハンドリングの具体的実装方式は妥当な推測）
- 🔴 **推測部分**: 0%（設計文書にない新規推測は含まれていない）

## 8. 受け入れ基準

### 8.1 機能受け入れ基準

🔵 **青信号**: EARS受け入れ基準から明確に定義済み

- [ ] 有効なJWTで既存ユーザーの認証が成功する
- [ ] 有効なJWTで新規ユーザーのJIT作成が成功する  
- [ ] 無効なJWTで適切な認証エラーが発生する
- [ ] 認証成功時にlastLoginAtが正しく更新される
- [ ] JIT作成時にisNewUser=trueが返却される
- [ ] 既存ユーザー認証時にisNewUser=falseが返却される
- [ ] 認証処理が1秒以内に完了する（既存ユーザー）
- [ ] JIT作成が2秒以内に完了する（新規ユーザー）

### 8.2 セキュリティ受け入れ基準

🔵 **青信号**: EARS非機能要件から明確に定義済み

- [ ] JWT署名検証失敗時に認証が拒否される
- [ ] JWT有効期限切れ時に認証が拒否される
- [ ] 認証失敗時に詳細な内部エラー情報が外部漏洩しない
- [ ] 認証成功・失敗の適切なログが出力される
- [ ] ユーザー情報に機密データが含まれていない

### 8.3 アーキテクチャ受け入れ基準

🔵 **青信号**: アーキテクチャ設計から明確に定義済み

- [ ] Domain層・Infrastructure層への適切な依存方向（依存性逆転準拠）
- [ ] Application層の適切な配置・責務分離
- [ ] ビジネスロジックがDomain層に委譲されている
- [ ] 外部サービスの詳細がApplication層から隠蔽されている
- [ ] IAuthenticateUserUseCaseインターフェースに完全準拠している

### 8.4 エラーハンドリング受け入れ基準

🔵 **青信号**: Edgeケース仕様から明確に定義済み

- [ ] AuthenticationError の適切なthrow・catch
- [ ] データベースエラーの適切な変換・処理
- [ ] 外部サービス障害時の適切なエラーメッセージ
- [ ] JIT作成時の重複ユーザー制約エラーの適切な処理
- [ ] 部分的な処理失敗時の適切なロールバック

**参照したEARS要件**: DDD学習効果テスト項目、機能・セキュリティ・ユーザビリティテスト

## 9. 依存タスク

### 9.1 完了必須タスク

🔵 **青信号**: タスク管理文書から明確に定義済み

- **TASK-103**: PostgreSQLUserRepository実装（ユーザーデータ永続化）
- **TASK-104**: SupabaseAuthProvider実装（JWT検証・ユーザー情報抽出）
- **TASK-102**: リポジトリ・サービスインターフェース実装（抽象化定義）

### 9.2 後続タスク

- **TASK-106**: GetUserProfileUseCase実装（認証後のプロフィール取得）  
- **TASK-201**: AuthController実装（HTTP層での本UseCase利用）

## 10. 次のステップ

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。

### テストケース作成の焦点

1. **正常系**: 既存ユーザー認証・JIT作成の両パターン
2. **異常系**: JWT検証失敗・データベースエラー・外部サービス障害  
3. **境界値**: 長いデータ・null値・空文字への適切な対応
4. **パフォーマンス**: レスポンス時間要件の確認
5. **セキュリティ**: 認証失敗時の情報秘匿・ログ出力の適切性

実装完了時には、このTDD要件定義に照らした品質確認を行います。

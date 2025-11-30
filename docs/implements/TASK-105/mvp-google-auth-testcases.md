# TASK-105: ユーザー認証UseCase実装 - TDDテストケース

作成日: 2025-08-18  
更新日: 2025-08-18

## 開発言語・テストフレームワーク

🔵 **青信号**: プロジェクト技術スタックから明確に定義済み

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: プロジェクト全体がTypeScriptで統一されており、型安全性によるビジネスロジックの品質保証が期待できる
  - **テストに適した機能**: DI・インターフェース準拠の確認、UseCase層の複雑なビジネスフロー検証
- **テストフレームワーク**: Bun標準テスト
  - **フレームワーク選択の理由**: プロジェクトでBunを採用しており、別途テストランナーの導入が不要
  - **テスト実行環境**: Docker compose server コンテナ内での実行（`docker compose exec server bun test`）

## テストケース一覧

### 1. execute メソッドの正常系テストケース

#### 1.1 既存ユーザーの認証成功

🔵 **青信号**: 要件定義書・データフロー図から明確に定義済み

- **テスト名**: 有効なJWTで既存ユーザーの認証が成功する
  - **何をテストするか**: JWT検証→既存ユーザー検索→lastLoginAt更新→認証完了までの一連のフロー
  - **期待される動作**: 既存ユーザーの認証が完了し、lastLoginAtが現在時刻で更新される
- **入力値**: 
  ```typescript
  input: AuthenticateUserUseCaseInput = {
    jwt: "<JWT_TOKEN_REDACTED>." // 有効なSupabase JWT
  };
  ```
  - **入力データの意味**: フロントエンドで取得した、既存ユーザーの有効なGoogle OAuth JWT
- **期待される結果**: 
  ```typescript
  {
    user: {
      id: "uuid-4-existing-user",
      externalId: "google_1234567890",
      provider: "google",
      email: "existing@example.com",
      name: "田中太郎",
      avatarUrl: "https://lh3.googleusercontent.com/avatar.jpg",
      createdAt: new Date("2025-08-01T10:00:00Z"), // 過去の作成日時
      updatedAt: new Date(), // 現在時刻（更新済み）
      lastLoginAt: new Date() // 現在時刻（更新済み）
    },
    isNewUser: false
  }
  ```
  - **期待結果の理由**: 既存ユーザーの情報が返却され、isNewUser=falseで新規作成でないことを示す
- **テストの目的**: 既存ユーザー認証フローの正常動作確認
  - **確認ポイント**: JWT検証・ユーザー検索・lastLoginAt更新・認証成功レスポンス

#### 1.2 新規ユーザーのJIT作成成功

🔵 **青信号**: 要件定義書・JITプロビジョニング仕様から明確に定義済み

- **テスト名**: 有効なJWTで新規ユーザーのJIT作成が成功する
  - **何をテストするか**: JWT検証→ユーザー不存在確認→JIT作成→認証完了までの一連のフロー
  - **期待される動作**: 新規ユーザーが自動作成され、初回ログイン情報で認証が完了する
- **入力値**: 
  ```typescript
  input: AuthenticateUserUseCaseInput = {
    jwt: "<JWT_TOKEN_REDACTED>." // 新規ユーザーの有効なJWT
  };
  ```
  - **入力データの意味**: 初回ログインユーザーの有効なGoogle OAuth JWT
- **期待される結果**: 
  ```typescript
  {
    user: {
      id: "uuid-4-new-user", // 新規生成されたUUID
      externalId: "google_9876543210",
      provider: "google",
      email: "newuser@example.com",
      name: "山田花子",
      avatarUrl: "https://lh3.googleusercontent.com/new-avatar.jpg",
      createdAt: new Date(), // 現在時刻（新規作成）
      updatedAt: new Date(), // 現在時刻（新規作成）
      lastLoginAt: new Date() // 現在時刻（初回ログイン）
    },
    isNewUser: true
  }
  ```
  - **期待結果の理由**: 新規作成されたユーザー情報が返却され、isNewUser=trueで新規作成を示す
- **テストの目的**: JITプロビジョニング機能の正常動作確認
  - **確認ポイント**: JWT検証・ユーザー未存在確認・新規作成・初期値設定・認証成功レスポンス

### 2. execute メソッドの異常系テストケース

#### 2.1 JWT検証失敗による認証拒否

🔵 **青信号**: EARS要件EDGE-002から明確に定義済み

- **テスト名**: 無効なJWTで認証エラーが発生する
  - **エラーケースの概要**: IAuthProviderのJWT検証が失敗した場合の適切なエラー処理
  - **エラー処理の重要性**: セキュリティ要件を満たす認証失敗時の適切な例外スロー
- **入力値**: 
  ```typescript
  input: AuthenticateUserUseCaseInput = {
    jwt: "invalid.jwt.token" // 不正なJWT
  };
  ```
  - **不正な理由**: 署名不正・期限切れ・形式不正のいずれかによりJWT検証が失敗
  - **実際の発生シナリオ**: 改ざんされたトークン送信、期限切れトークンの使用
- **期待される結果**: 
  ```typescript
  // AuthenticationError例外をスロー
  throw new AuthenticationError("認証トークンが無効です")
  ```
  - **エラーメッセージの内容**: 攻撃者に詳細情報を漏洩しない適切なメッセージ
  - **システムの安全性**: JWT検証失敗で即座に認証処理を中断
- **テストの目的**: セキュリティ要件の確認
  - **品質保証の観点**: 不正なトークンでの認証を確実に防止

#### 2.2 データベース障害による処理失敗

🔵 **青信号**: 可用性制約・エラーハンドリング要件から明確に定義済み

- **テスト名**: データベース接続エラー時に適切なエラーが発生する
  - **エラーケースの概要**: UserRepositoryでのDB操作失敗時のエラー処理
  - **エラー処理の重要性**: インフラ障害時の適切なエラーレスポンスとシステム安定性確保
- **入力値**: 
  ```typescript
  input: AuthenticateUserUseCaseInput = {
    jwt: "valid.jwt.token" // 有効なJWT（DB障害は別要因）
  };
  ```
  - **不正な理由**: データベース接続障害・クエリタイムアウト・制約違反
  - **実際の発生シナリオ**: DB一時的障害、ネットワーク断絶、トランザクション競合
- **期待される結果**: 
  ```typescript
  // InfrastructureError例外をスロー
  throw new InfrastructureError("ユーザー情報の取得に失敗しました")
  ```
  - **エラーメッセージの内容**: 技術的詳細を隠し、ユーザーフレンドリーなメッセージ
  - **システムの安全性**: 部分的な状態更新を防ぎ、データ整合性を保持
- **テストの目的**: エラーハンドリング機能の確認
  - **品質保証の観点**: インフラ障害時の適切なエラー処理とログ出力

#### 2.3 外部サービス（Supabase）障害による処理失敗

🔵 **青信号**: EARS要件EDGE-004から明確に定義済み

- **テスト名**: SupabaseAuthProvider障害時に適切なエラーが発生する
  - **エラーケースの概要**: IAuthProviderの内部で外部サービス接続に失敗した場合
  - **エラー処理の重要性**: 外部依存サービス障害に対する適切な障害処理
- **入力値**: 
  ```typescript
  input: AuthenticateUserUseCaseInput = {
    jwt: "valid.jwt.token" // 有効なJWTだがSupabase側で障害
  };
  ```
  - **不正な理由**: Supabase API障害、ネットワーク接続問題、レート制限
  - **実際の発生シナリオ**: Supabaseサービス障害、AWS障害、ネットワーク分断
- **期待される結果**: 
  ```typescript
  // ExternalServiceError例外をスロー
  throw new ExternalServiceError("認証サービスが一時的に利用できません")
  ```
  - **エラーメッセージの内容**: 外部サービス障害を示すユーザー向けメッセージ
  - **システムの安全性**: 外部サービス障害でも適切にエラー処理し、システム継続
- **テストの目的**: 外部サービス依存の確認
  - **品質保証の観点**: 外部障害時の適切なフォールバック処理

#### 2.4 JIT作成時の重複ユーザー制約エラー

🟡 **黄信号**: データベース制約・並行処理から妥当な推測

- **テスト名**: 同一ユーザーの同時JIT作成で適切に処理される
  - **エラーケースの概要**: 同一externalId+providerのユーザーを複数リクエストで同時作成
  - **エラー処理の重要性**: 並行処理でのデータ整合性保証とユーザー重複回避
- **入力値**: 
  ```typescript
  // 複数の並行リクエストで同一ユーザーのJWT
  input: AuthenticateUserUseCaseInput = {
    jwt: "同一externalIdを含む有効なJWT"
  };
  ```
  - **不正な理由**: unique制約違反（複数プロセスでの同時INSERT）
  - **実際の発生シナリオ**: ユーザーが複数タブで同時ログイン、フロントエンドでの重複リクエスト
- **期待される結果**: 
  ```typescript
  // 2回目以降のリクエストは既存ユーザーとして処理
  {
    user: existingUser, // 先に作成されたユーザー情報
    isNewUser: false   // 重複作成ではなく既存ユーザーとして扱う
  }
  ```
  - **エラーメッセージの内容**: エラーとせず、既存ユーザー認証として正常処理
  - **システムの安全性**: データ整合性を保ち、ユーザーには透過的に処理
- **テストの目的**: 並行処理の確認
  - **品質保証の観点**: 競合状態での適切なデータ整合性保証

### 3. execute メソッドの境界値テストケース

#### 3.1 空文字・null値の入力処理

🔵 **青信号**: 入力検証制約から明確に定義済み

- **テスト名**: 空文字・null JWTで適切なエラーが発生する
  - **境界値の意味**: 文字列入力の最小値（空文字・null・undefined）
  - **境界値での動作保証**: 入力検証の網羅性と適切なエラーメッセージ
- **入力値**: 
  ```typescript
  emptyInput: AuthenticateUserUseCaseInput = { jwt: "" };
  nullInput = { jwt: null as any };
  undefinedInput = { jwt: undefined as any };
  ```
  - **境界値選択の根拠**: 文字列パラメータの無効値の代表例
  - **実際の使用場面**: フロントエンドでのトークン取得失敗、初期化不備
- **期待される結果**: 
  ```typescript
  throw new ValidationError("JWTトークンが必要です")
  ```
  - **境界での正確性**: 無効入力に対する統一的なバリデーションエラー
  - **一貫した動作**: null・empty・undefinedすべてで同じエラー処理
- **テストの目的**: 入力検証の確認
  - **堅牢性の確認**: 不正入力でのクラッシュや予期しない動作の防止

#### 3.2 最大長JWT文字列の処理

🟡 **黄信号**: JWT仕様・パフォーマンス制約から妥当な推測

- **テスト名**: 非常に長いJWTが適切に処理される
  - **境界値の意味**: JWT文字列の実用的最大長での処理能力確認
  - **境界値での動作保証**: メモリ効率とパフォーマンスの維持
- **入力値**: 
  ```typescript
  longJwtInput: AuthenticateUserUseCaseInput = {
    jwt: "a".repeat(2048) + ".valid.payload.signature" // 2KB程度の長大JWT
  };
  ```
  - **境界値選択の根拠**: JWT標準的上限とパフォーマンス要件を考慮
  - **実際の使用場面**: 大量のclaim情報を含むJWT、複数権限を持つユーザー
- **期待される結果**: 
  ```typescript
  // 正常に処理されるか、適切な制限エラー
  正常処理 or throw new ValidationError("JWTサイズが上限を超えています")
  ```
  - **境界での正確性**: 大きなデータでも安定した処理
  - **一貫した動作**: メモリ効率を保ちながら適切な制限適用
- **テストの目的**: パフォーマンス境界の確認
  - **堅牢性の確認**: 大きなデータでのメモリ使用量とレスポンス時間

#### 3.3 パフォーマンス要件の境界値確認

🔵 **青信号**: NFR-002・NFR-003パフォーマンス要件から明確に定義済み

- **テスト名**: 認証処理が時間制限内に完了する
  - **境界値の意味**: 既存ユーザー認証1秒以内、JIT作成2秒以内の性能要件
  - **境界値での動作保証**: 要件で定められたレスポンス時間の確実な遵守
- **入力値**: 
  ```typescript
  // 既存ユーザーの場合
  existingUserInput = { jwt: "existing-user-jwt" };
  startTime = performance.now();
  
  // 新規ユーザーの場合
  newUserInput = { jwt: "new-user-jwt" };
  ```
  - **境界値選択の根拠**: NFR-002（1秒）・NFR-003（2秒）の性能要件
  - **実際の使用場面**: 実運用での標準的な認証処理パフォーマンス
- **期待される結果**: 
  ```typescript
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  
  // 既存ユーザー認証: 1秒以内
  expect(executionTime).toBeLessThan(1000);
  
  // JIT作成: 2秒以内  
  expect(executionTime).toBeLessThan(2000);
  ```
  - **境界での正確性**: 性能要件を満たすレスポンス時間
  - **一貫した動作**: 負荷状況に関わらず要件内での処理完了
- **テストの目的**: パフォーマンス要件の確認
  - **堅牢性の確認**: システム負荷下でも要求水準を維持

### 4. 依存関係・統合テストケース

#### 4.1 依存注入の適切性確認

🔵 **青信号**: DI・クリーンアーキテクチャ制約から明確に定義済み

- **テスト名**: 必要な依存関係が正しく注入される
  - **何をテストするか**: コンストラクタでのDI、インターフェースへの依存、null/undefined注入の検出
  - **期待される動作**: すべての依存関係が適切に注入され、nullチェックが機能する
- **入力値**: 
  ```typescript
  // 正常なDI
  validDependencies = {
    userRepository: mockUserRepository,
    authProvider: mockAuthProvider,
    authDomainService: mockAuthDomainService,
    logger: mockLogger
  };
  
  // 不正なDI（null依存関係）
  invalidDependencies = {
    userRepository: null,
    // その他の依存関係
  };
  ```
- **期待される結果**: 
  ```typescript
  // 正常なDI: インスタンス化成功
  const useCase = new AuthenticateUserUseCase(validDependencies);
  
  // 不正なDI: 初期化時エラー
  throw new Error("Required dependency is null")
  ```
- **テストの目的**: アーキテクチャ制約の確認
  - **確認ポイント**: 依存性逆転の原則遵守、適切なDI設計

#### 4.2 ログ出力の適切性確認

🔵 **青信号**: 監査要件・デバッグ要件から明確に定義済み

- **テスト名**: 認証成功・失敗時に適切なログが出力される
  - **何をテストするか**: 認証試行の監査ログ、エラー時の詳細ログ、セキュリティ情報の秘匿
  - **期待される動作**: 成功・失敗・エラーの各状況で適切なレベルとメッセージでログ出力
- **入力値**: 
  ```typescript
  // 各種認証シナリオのJWT
  successJwt = "valid-jwt-for-existing-user";
  failureJwt = "invalid-jwt";
  errorJwt = "valid-jwt-but-db-error";
  ```
- **期待される結果**: 
  ```typescript
  // 成功時ログ
  expect(mockLogger.info).toHaveBeenCalledWith(
    "User authentication successful",
    { userId: "uuid", externalId: "google_123", isNewUser: false }
  );
  
  // 失敗時ログ  
  expect(mockLogger.warn).toHaveBeenCalledWith(
    "User authentication failed",
    { reason: "Invalid JWT", ip: "xxx.xxx.xxx.xxx" }
  );
  
  // エラー時ログ
  expect(mockLogger.error).toHaveBeenCalledWith(
    "User authentication error", 
    { error: "Database connection failed", jwt: "[REDACTED]" }
  );
  ```
- **テストの目的**: 監査・デバッグ機能の確認
  - **確認ポイント**: 適切なログレベル、機密情報の秘匿、デバッグ情報の充実度

## テストケース実装時の日本語コメント指針

### テストケース開始時のコメント

```typescript
// 【テスト目的】: 有効なJWTでの既存ユーザー認証フローの正常動作確認
// 【テスト内容】: JWT検証→ユーザー検索→lastLoginAt更新→認証成功レスポンス
// 【期待される動作】: 認証成功・既存ユーザー情報返却・isNewUser=false
// 🔵 要件定義書の既存ユーザー認証仕様から明確に定義済み
```

### Given（準備フェーズ）のコメント

```typescript
// 【テストデータ準備】: 既存ユーザーのGoogle OAuth JWTと対応するUserエンティティを準備
// 【初期条件設定】: UserRepository・AuthProviderのモックを適切に設定
// 【前提条件確認】: 依存関係が正しく注入され、UseCase初期化が完了している
```

### When（実行フェーズ）のコメント

```typescript
// 【実際の処理実行】: AuthenticateUserUseCase.executeメソッドにJWTを渡して実行
// 【処理内容】: JWT検証・外部ユーザー情報抽出・既存ユーザー検索・lastLoginAt更新
// 【実行タイミング】: AuthController経由で実際にAPI呼び出しされるフローを再現
```

### Then（検証フェーズ）のコメント

```typescript
// 【結果検証】: AuthenticateUserUseCaseOutputの構造とUser情報の確認
// 【期待値確認】: 既存ユーザー情報・isNewUser=false・lastLoginAt更新の確認
// 【品質保証】: アーキテクチャ制約・パフォーマンス要件・セキュリティ要件の遵守確認
```

### 各expectステートメントのコメント

```typescript
// 【検証項目】: 認証処理の成功確認
// 🔵 AuthenticateUserUseCaseOutput型定義から明確に定義済み
expect(result).toBeDefined();

// 【検証項目】: 既存ユーザー情報の正確な返却確認  
// 🔵 User エンティティ仕様から明確に定義済み
expect(result.user.id).toBe("uuid-4-existing-user");

// 【検証項目】: 新規作成フラグの適切な設定確認
// 🔵 既存ユーザー認証フロー仕様から明確に定義済み
expect(result.isNewUser).toBe(false);

// 【検証項目】: lastLoginAt更新の確認（現在時刻から5秒以内）
// 🔵 認証成功時の要件から明確に定義済み
const timeDiff = Math.abs(result.user.lastLoginAt.getTime() - Date.now());
expect(timeDiff).toBeLessThan(5000);
```

### セットアップ・クリーンアップのコメント

```typescript
beforeEach(() => {
  // 【テスト前準備】: モックオブジェクトの初期化とテストデータの準備
  // 【環境初期化】: 各テストが独立実行できるようクリーンな状態に設定
});

afterEach(() => {
  // 【テスト後処理】: モックの状態リセットとメモリリークの防止
  // 【状態復元】: 次のテストに影響しないよう全ての変更を元に戻す
});
```

## 品質判定

### 品質評価

✅ **高品質**:
- **テストケース分類**: 正常系・異常系・境界値が網羅されている
  - 正常系: 2件（既存ユーザー認証・JIT作成）
  - 異常系: 4件（JWT失敗・DB障害・外部障害・重複制約）
  - 境界値: 3件（null値・最大長・パフォーマンス）
  - 統合テスト: 2件（DI・ログ）
- **期待値定義**: 各テストケースの期待値が明確
  - 具体的な入出力値と例外の詳細定義
  - ビジネス要件とアーキテクチャ制約を考慮した期待値設定
- **技術選択**: プログラミング言語・テストフレームワークが確定
  - TypeScript（型安全性・DDD適合性）+ Bun標準テスト（プロジェクト統一）
- **実装可能性**: 現在の技術スタックで実現可能
  - 依存タスク（TASK-102・103・104）の完成により全依存関係解決済み

### テストケース信頼性レベルサマリー
- 🔵 **80%**: EARS要件定義書・設計文書・型定義から明確に定義済み
- 🟡 **20%**: パフォーマンス・並行処理・境界値設定から妥当な推測
- 🔴 **0%**: 根拠のない新規推測は含まれていない

### テストカバレッジ
- **機能カバレッジ**: IAuthenticateUserUseCaseインターフェースの全メソッド
- **ビジネスフローカバレッジ**: 既存ユーザー認証・JITプロビジョニング・エラー処理
- **エラーケースカバレッジ**: EARS Edgeケース要件を完全網羅
- **アーキテクチャテスト**: DI・依存性逆転・層分離の確認
- **パフォーマンステスト**: NFR-002・NFR-003要件の検証

## 実装対象ファイル

```
app/server/src/application/usecases/
└── __tests__/
    └── AuthenticateUserUseCase.test.ts
```

## テスト実行コマンド

```bash
# 個別テスト実行
docker compose exec server bun test app/server/src/application/usecases/__tests__/AuthenticateUserUseCase.test.ts

# 型チェック
docker compose exec server bunx tsc --noEmit

# 全テスト実行
docker compose exec server bun test

# テストカバレッジ確認（将来対応）
docker compose exec server bun test --coverage
```

## モック戦略

### 依存関係のモック方針

🔵 **青信号**: DDD・クリーンアーキテクチャの分離要件から明確に定義済み

- **IUserRepository**: データベース操作をモック化、結果データは事前定義
- **IAuthProvider**: JWT検証・ユーザー情報抽出をモック化、成功/失敗パターンを制御
- **IAuthenticationDomainService**: ビジネスロジックをモック化、JIT作成処理を制御
- **Logger**: ログ出力をモック化、出力内容・レベルを検証

### モック実装方針

```typescript
// 【モック設計】: インターフェースベースのモック作成
// 【テスト分離】: Infrastructure層の実装詳細から完全独立
const mockUserRepository: IUserRepository = {
  findByExternalId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  // その他メソッド
};

const mockAuthProvider: IAuthProvider = {
  verifyToken: jest.fn(),
  getExternalUserInfo: jest.fn()
};
```

## 次のステップ

**次のお勧めステップ**: `tdd-red` でRedフェーズ（失敗テスト作成）を開始します。

### Redフェーズでの重点ポイント

1. **失敗テストの実装**: まず全テストケースが失敗することを確認
2. **モック設定**: 依存関係の適切なモック化と振る舞い定義
3. **テストデータ**: 各シナリオに対応したテストデータの準備
4. **エラーケース**: 例外スロー・エラーハンドリングの詳細な検証設定
5. **パフォーマンステスト**: 実行時間測定機能の実装

実装完了時には、この要件定義とテストケース定義に照らした品質確認を行います。

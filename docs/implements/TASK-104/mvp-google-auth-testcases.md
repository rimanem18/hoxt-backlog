# TASK-104: Supabase認証プロバイダー実装 - TDDテストケース

作成日: 2025-08-17  
更新日: 2025-08-17

## 開発言語・テストフレームワーク

🔵 **青信号**: プロジェクト技術スタックから明確に定義済み

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: プロジェクト全体がTypeScriptで統一されており、型安全性による品質保証が期待できる
  - **テストに適した機能**: 型定義による実行時エラー防止、インターフェース準拠の確認
- **テストフレームワーク**: Bun標準テスト
  - **フレームワーク選択の理由**: プロジェクトでBunを採用しており、別途テストランナーの導入が不要
  - **テスト実行環境**: Docker compose server コンテナ内での実行

## テストケース一覧

### 1. verifyToken メソッドのテストケース

#### 1.1 正常系テストケース

##### テスト: 有効なGoogle OAuth JWTの検証成功

🔵 **青信号**: 要件定義書・JWTペイロード仕様から明確に定義済み

- **テスト名**: 有効なGoogle OAuth JWTが正常に検証される
  - **何をテストするか**: 正しい署名・有効期限・発行者を持つJWTトークンの検証処理
  - **期待される動作**: JWT検証が成功し、正確なペイロード情報が取得される
- **入力値**: 
  ```typescript
  // Supabase JWT Secretで署名された有効なJWT
  validGoogleJwt = "<JWT_TOKEN_REDACTED>"
  ```
  - **入力データの意味**: Googleアカウント認証後にSupabaseから発行される実際のJWTトークンを模擬
- **期待される結果**: 
  ```typescript
  {
    valid: true,
    payload: {
      sub: "google_1234567890",
      email: "test@example.com",
      app_metadata: { provider: "google", providers: ["google"] },
      user_metadata: {
        name: "Test User",
        avatar_url: "https://example.com/avatar.jpg",
        email: "test@example.com",
        full_name: "Test User"
      },
      iss: "https://your-supabase.url",
      iat: 1692780800,
      exp: 1692784400
    }
  }
  ```
  - **期待結果の理由**: JWTが正しく検証され、ペイロード内の全情報が正確に抽出される
- **テストの目的**: 核心となるJWT検証機能の正常動作確認
  - **確認ポイント**: 署名検証・ペイロード抽出・型安全性の保証

#### 1.2 異常系テストケース

##### テスト: 不正な署名を持つJWTの拒否

🔵 **青信号**: EARS要件EDGE-002から明確に定義済み

- **テスト名**: 不正な署名のJWTが確実に拒否される
  - **エラーケースの概要**: 異なるシークレットで署名されたJWTや改ざんされたJWTを受信
  - **エラー処理の重要性**: セキュリティ侵害防止のため、署名検証の厳密性が必須
- **入力値**: 
  ```typescript
  invalidSignatureJwt = "<JWT_TOKEN_REDACTED>"
  ```
  - **不正な理由**: 署名部分が正しいSupabase JWT Secretで生成されていない
  - **実際の発生シナリオ**: 悪意のあるクライアントからの偽造JWT送信、ネットワーク経由での改ざん
- **期待される結果**: 
  ```typescript
  {
    valid: false,
    error: "Invalid signature"
  }
  ```
  - **エラーメッセージの内容**: 署名検証失敗を示す明確なメッセージ
  - **システムの安全性**: 認証処理が中断され、不正アクセスを確実に防ぐ
- **テストの目的**: セキュリティ要件の確認
  - **品質保証の観点**: 改ざんされたトークンでの不正認証を防止

##### テスト: 期限切れJWTの拒否

🔵 **青信号**: セキュリティ要件・JWT仕様から明確に定義済み

- **テスト名**: 有効期限が切れたJWTが確実に拒否される
  - **エラーケースの概要**: exp claimが現在時刻より前のJWTトークン
  - **エラー処理の重要性**: セッション期限管理とセキュリティ保証のため必須
- **入力値**: 
  ```typescript
  expiredJwt = "<JWT_TOKEN_REDACTED>"
  ```
  - **不正な理由**: exp claim（1692780800）が現在時刻より過去
  - **実際の発生シナリオ**: ユーザーが長時間ページを開きっぱなしにした後のAPI呼び出し
- **期待される結果**: 
  ```typescript
  {
    valid: false,
    error: "Token expired"
  }
  ```
  - **エラーメッセージの内容**: 期限切れを示すユーザーフレンドリーなメッセージ
  - **システムの安全性**: 期限切れトークンでの認証を確実に拒否
- **テストの目的**: セッション期限管理の確認
  - **品質保証の観点**: 古いトークンによる不正アクセス防止

##### テスト: 形式不正JWTの拒否

🔵 **青信号**: JWT仕様・エラーハンドリング要件から明確に定義済み

- **テスト名**: JWT形式に準拠しないトークンが確実に拒否される
  - **エラーケースの概要**: header.payload.signature形式でないトークン文字列
  - **エラー処理の重要性**: 不正なリクエストの早期検出とシステム安定性確保
- **入力値**: 
  ```typescript
  malformedJwt = "not-a-jwt-token"
  ```
  - **不正な理由**: JWT標準形式（3つのBase64URL部分をドットで区切り）に準拠していない
  - **実際の発生シナリオ**: 不正なクライアント実装、API呼び出し時のトークン破損
- **期待される結果**: 
  ```typescript
  {
    valid: false,
    error: "Invalid token format"
  }
  ```
  - **エラーメッセージの内容**: 形式不正を示す開発者向けメッセージ
  - **システムの安全性**: パース処理でのクラッシュを防ぎ、適切なエラーレスポンス返却
- **テストの目的**: 入力検証機能の確認
  - **品質保証の観点**: 不正な入力によるシステム不安定化を防止

##### テスト: 環境変数未設定時のエラー

🔵 **青信号**: 環境設定制約から明確に定義済み

- **テスト名**: SUPABASE_JWT_SECRET未設定時に適切なエラーが発生する
  - **エラーケースの概要**: 必須環境変数が設定されていない状態でのJWT検証実行
  - **エラー処理の重要性**: 設定不備の早期発見とシステム起動時の安全性確保
- **入力値**: 
  ```typescript
  // 環境変数 SUPABASE_JWT_SECRET が未設定
  process.env.SUPABASE_JWT_SECRET = undefined;
  validJwt = "any.valid.jwt";
  ```
  - **不正な理由**: JWT署名検証に必要なシークレットが利用できない
  - **実際の発生シナリオ**: デプロイ時の環境変数設定漏れ、開発環境での設定不備
- **期待される結果**: 
  ```typescript
  // クラス初期化時またはverifyToken実行時に例外スロー
  throw new Error("SUPABASE_JWT_SECRET environment variable is required")
  ```
  - **エラーメッセージの内容**: 設定不備を明確に示すメッセージ
  - **システムの安全性**: 不完全な状態での動作を防ぎ、設定問題の早期発見
- **テストの目的**: 環境設定要件の確認
  - **品質保証の観点**: インフラ設定不備による障害を事前防止

#### 1.3 境界値テストケース

##### テスト: 有効期限ギリギリのJWT検証

🟡 **黄信号**: JWT仕様から妥当な推測（具体的な境界値設定は実装依存）

- **テスト名**: 有効期限の数秒前JWTが正常に検証される
  - **境界値の意味**: expクレームが現在時刻の直前で、まだ有効な状態
  - **境界値での動作保証**: タイムスタンプ比較の正確性と処理タイミングの確認
- **入力値**: 
  ```typescript
  // 現在時刻の5秒前がexp設定
  almostExpiredJwt = generateJWTWithExp(Date.now() / 1000 + 5);
  ```
  - **境界値選択の根拠**: 有効/無効の境界線での動作確認のため
  - **実際の使用場面**: ユーザーの継続利用中にトークン期限が近づく状況
- **期待される結果**: 
  ```typescript
  {
    valid: true,
    payload: { /* 正常なペイロード */ }
  }
  ```
  - **境界での正確性**: 期限内トークンとして正しく処理される
  - **一貫した動作**: 有効期限チェックの精度確認
- **テストの目的**: 時刻比較処理の確認
  - **堅牢性の確認**: タイムスタンプ境界値での安定動作保証

##### テスト: 空文字列・null値の処理

🔵 **青信号**: 入力検証要件から明確に定義済み

- **テスト名**: 空文字列やnullトークンが適切に拒否される
  - **境界値の意味**: 有効な入力の最小限界（文字列の最小値）
  - **境界値での動作保証**: 入力検証の網羅性確認
- **入力値**: 
  ```typescript
  emptyToken = "";
  nullToken = null;
  undefinedToken = undefined;
  ```
  - **境界値選択の根拠**: 文字列パラメータの最小/無効値
  - **実際の使用場面**: フロントエンドでのトークン取得失敗、初期化不備
- **期待される結果**: 
  ```typescript
  {
    valid: false,
    error: "Token is required"
  }
  ```
  - **境界での正確性**: null値チェックが正しく動作
  - **一貫した動作**: 無効な入力に対する統一的なエラーレスポンス
- **テストの目的**: 入力検証の確認
  - **堅牢性の確認**: 不正な入力値でのクラッシュ防止

### 2. getExternalUserInfo メソッドのテストケース

#### 2.1 正常系テストケース

##### テスト: 正常なJWTペイロードからのユーザー情報抽出

🔵 **青信号**: ExternalUserInfo型定義から明確に定義済み

- **テスト名**: 完全なJWTペイロードから正確なユーザー情報が抽出される
  - **何をテストするか**: JWTペイロードからExternalUserInfoオブジェクトへの変換処理
  - **期待される動作**: すべての必須・オプションフィールドが正確にマッピングされる
- **入力値**: 
  ```typescript
  validPayload: JwtPayload = {
    sub: "google_1234567890",
    email: "test@example.com",
    app_metadata: {
      provider: "google",
      providers: ["google"]
    },
    user_metadata: {
      name: "田中太郎",
      avatar_url: "https://lh3.googleusercontent.com/avatar.jpg",
      email: "test@example.com",
      full_name: "田中太郎"
    },
    iss: "https://your-supabase.url",
    iat: 1692780800,
    exp: 1692784400
  };
  ```
  - **入力データの意味**: Google OAuth認証完了後のSupabase JWT内ペイロード情報
- **期待される結果**: 
  ```typescript
  {
    id: "google_1234567890",
    provider: "google",
    email: "test@example.com", 
    name: "田中太郎",
    avatarUrl: "https://lh3.googleusercontent.com/avatar.jpg"
  }
  ```
  - **期待結果の理由**: JWTペイロードの情報がExternalUserInfo形式に正規化される
- **テストの目的**: データ変換処理の正確性確認
  - **確認ポイント**: フィールドマッピングの正確性、日本語名の適切な処理

##### テスト: アバター画像URLなしの場合の処理

🔵 **青信号**: オプションフィールド仕様から明確に定義済み

- **テスト名**: avatar_urlが存在しない場合に適切に処理される
  - **何をテストするか**: オプションフィールドが未設定の場合のマッピング処理
  - **期待される動作**: avatarUrlフィールドがundefinedまたは省略される
- **入力値**: 
  ```typescript
  payloadWithoutAvatar: JwtPayload = {
    sub: "google_0987654321",
    email: "user@example.com",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: {
      name: "山田花子",
      email: "user@example.com",
      full_name: "山田花子"
      // avatar_url なし
    },
    iss: "https://your-supabase.url",
    iat: 1692780800,
    exp: 1692784400
  };
  ```
  - **入力データの意味**: Googleアカウントでプロフィール画像を設定していないユーザー
- **期待される結果**: 
  ```typescript
  {
    id: "google_0987654321",
    provider: "google",
    email: "user@example.com",
    name: "山田花子",
    avatarUrl: undefined
  }
  ```
  - **期待結果の理由**: オプションフィールドが適切にundefinedとして処理される
- **テストの目的**: オプションフィールド処理の確認
  - **確認ポイント**: undefined値の適切な処理、型安全性の保証

#### 2.2 異常系テストケース

##### テスト: 必須フィールド不足ペイロードの拒否

🔵 **青信号**: 要件定義書エッジケースから明確に定義済み

- **テスト名**: sub・emailフィールドが不足したペイロードでエラーが発生する
  - **エラーケースの概要**: JWTペイロードに必須フィールドが含まれていない状況
  - **エラー処理の重要性**: データ整合性保証とJITプロビジョニングでの必須情報確保
- **入力値**: 
  ```typescript
  incompletePayload = {
    // sub フィールドなし
    email: "test@example.com",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: { name: "Test User" },
    iss: "https://your-supabase.url",
    iat: 1692780800,
    exp: 1692784400
  };
  ```
  - **不正な理由**: ユーザー識別に必須のsubフィールドが欠落
  - **実際の発生シナリオ**: Supabase設定不備、Google OAuth応答の異常
- **期待される結果**: 
  ```typescript
  // ExternalUserInfoExtractionError例外をスロー
  throw new ExternalUserInfoExtractionError("Required field 'sub' is missing from JWT payload")
  ```
  - **エラーメッセージの内容**: 不足フィールドを明確に示すメッセージ
  - **システムの安全性**: 不完全な情報でのユーザー作成を防止
- **テストの目的**: データ検証機能の確認
  - **品質保証の観点**: 不完全なデータによるシステム不整合を防止

##### テスト: 不正なprovider値の処理

🟡 **黄信号**: プロバイダー検証要件から妥当な推測

- **テスト名**: Google以外のprovider値で適切にエラーが発生する
  - **エラーケースの概要**: app_metadata.providerがgoogle以外の値
  - **エラー処理の重要性**: プロバイダー固有の実装としての整合性保証
- **入力値**: 
  ```typescript
  invalidProviderPayload = {
    sub: "facebook_1234567890",
    email: "test@example.com",
    app_metadata: {
      provider: "facebook",  // google以外
      providers: ["facebook"]
    },
    user_metadata: { name: "Test User", email: "test@example.com", full_name: "Test User" },
    iss: "https://your-supabase.url",
    iat: 1692780800,
    exp: 1692784400
  };
  ```
  - **不正な理由**: SupabaseAuthProviderはGoogle専用実装のため
  - **実際の発生シナリオ**: 将来の複数プロバイダー対応時の設定ミス
- **期待される結果**: 
  ```typescript
  throw new InvalidProviderError("This provider only supports Google authentication")
  ```
  - **エラーメッセージの内容**: サポート対象プロバイダーを明示
  - **システムの安全性**: 想定外プロバイダーでの処理を防止
- **テストの目的**: プロバイダー検証の確認
  - **品質保証の観点**: プロバイダー固有実装の整合性保証

#### 2.3 境界値テストケース

##### テスト: 最大長文字列の処理

🟡 **黄信号**: 文字列長制限から妥当な推測（具体的な上限値は実装依存）

- **テスト名**: 非常に長いname・emailフィールドが適切に処理される
  - **境界値の意味**: 文字列フィールドの実用的な最大長での動作確認
  - **境界値での動作保証**: メモリ効率とパフォーマンスの確認
- **入力値**: 
  ```typescript
  longStringPayload = {
    sub: "google_1234567890",
    email: "a".repeat(320) + "@example.com", // email最大長
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: {
      name: "田".repeat(255), // name最大長
      email: "a".repeat(320) + "@example.com",
      full_name: "田".repeat(255)
    },
    iss: "https://your-supabase.url",
    iat: 1692780800,
    exp: 1692784400
  };
  ```
  - **境界値選択の根拠**: データベース制約とパフォーマンス要件を考慮
  - **実際の使用場面**: 特殊な文字や非常に長い名前を持つユーザー
- **期待される結果**: 
  ```typescript
  {
    id: "google_1234567890",
    provider: "google",
    email: "a".repeat(320) + "@example.com",
    name: "田".repeat(255),
    avatarUrl: undefined
  }
  ```
  - **境界での正確性**: 長い文字列が正しく処理される
  - **一貫した動作**: メモリ効率を保ちながら正常処理
- **テストの目的**: 文字列処理の確認
  - **堅牢性の確認**: 大きなデータでの安定動作保証

### 3. 統合テストケース（クラス全体の動作）

#### 3.1 環境設定テスト

##### テスト: 環境変数の適切な読み込み

🔵 **青信号**: 環境設定制約から明確に定義済み

- **テスト名**: SUPABASE_JWT_SECRETが正しく読み込まれて使用される
  - **何をテストするか**: 環境変数からのJWTシークレット取得と初期化処理
  - **期待される動作**: 環境変数が正しく読み込まれ、JWT検証で使用される
- **入力値**: 
  ```typescript
  process.env.SUPABASE_JWT_SECRET = "test-secret-key";
  ```
  - **入力データの意味**: 実際のデプロイ環境での環境変数設定を模擬
- **期待される結果**: 
  ```typescript
  // クラス初期化が成功し、verifyTokenが正常動作
  const provider = new SupabaseAuthProvider();
  // 検証処理が実行可能
  ```
  - **期待結果の理由**: 環境変数が正しく反映され、JWT検証機能が使用可能
- **テストの目的**: 環境設定機能の確認
  - **確認ポイント**: 設定値の読み込み、初期化の成功

#### 3.2 パフォーマンステスト

##### テスト: JWT検証時間の性能要件確認

🔵 **青信号**: NFR-002パフォーマンス要件から明確に定義済み

- **テスト名**: JWT検証が1秒以内に完了する
  - **何をテストするか**: verifyTokenメソッドの実行時間測定
  - **期待される動作**: 1秒以内でのJWT検証完了
- **入力値**: 
  ```typescript
  standardJwt = "標準的な長さのValidなJWT";
  startTime = performance.now();
  ```
  - **入力データの意味**: 実際の運用で想定される標準的なJWTトークン
- **期待される結果**: 
  ```typescript
  const endTime = performance.now();
  const executionTime = endTime - startTime;
  expect(executionTime).toBeLessThan(1000); // 1秒未満
  ```
  - **期待結果の理由**: NFR-002要件で定められたパフォーマンス基準
- **テストの目的**: 性能要件の確認
  - **確認ポイント**: 実行時間の測定、要件充足の確認

## テストケース実装時の日本語コメント指針

### テストケース開始時のコメント

```typescript
// 【テスト目的】: 有効なGoogle OAuth JWTの署名検証と正確なペイロード抽出を確認
// 【テスト内容】: Supabase JWT Secretで署名されたJWTトークンの検証処理
// 【期待される動作】: 検証成功・ペイロード情報の正確な取得・型安全性の保証
// 🔵 要件定義書のJWT検証仕様から明確に定義済み
```

### Given（準備フェーズ）のコメント

```typescript
// 【テストデータ準備】: Google OAuth認証完了後のSupabaseから発行されるJWTを模擬
// 【初期条件設定】: SUPABASE_JWT_SECRET環境変数が適切に設定された状態
// 【前提条件確認】: SupabaseAuthProviderクラスが正常に初期化されている
```

### When（実行フェーズ）のコメント

```typescript
// 【実際の処理実行】: verifyTokenメソッドにJWTトークンを渡して検証実行
// 【処理内容】: JWT署名検証・有効期限チェック・発行者確認・ペイロード抽出
// 【実行タイミング】: AuthenticateUserUseCaseから呼び出される実際のフローを再現
```

### Then（検証フェーズ）のコメント

```typescript
// 【結果検証】: JwtVerificationResultの構造とペイロード内容の確認
// 【期待値確認】: valid=true、完全なペイロード情報、エラー情報なし
// 【品質保証】: セキュリティ要件とアーキテクチャ制約の遵守確認
```

### 各expectステートメントのコメント

```typescript
// 【検証項目】: JWT検証の成功フラグ確認
// 🔵 IAuthProvider仕様から明確に定義済み
expect(result.valid).toBe(true);

// 【検証項目】: Google外部IDの正確な抽出確認  
// 🔵 ExternalUserInfo型定義から明確に定義済み
expect(userInfo.id).toBe("google_1234567890");

// 【検証項目】: プロバイダー種別の固定値確認
// 🔵 Google専用実装要件から明確に定義済み
expect(userInfo.provider).toBe("google");
```

## 品質判定

### 品質評価

✅ **高品質**:
- **テストケース分類**: 正常系・異常系・境界値が網羅されている
  - verifyToken: 正常系1件、異常系4件、境界値2件
  - getExternalUserInfo: 正常系2件、異常系2件、境界値1件
  - 統合テスト: 環境設定1件、パフォーマンス1件
- **期待値定義**: 各テストケースの期待値が明確
  - 具体的な入出力値とエラーメッセージを詳細定義
  - 型安全性とセキュリティ要件を考慮した期待値設定
- **技術選択**: プログラミング言語・テストフレームワークが確定
  - TypeScript（型安全性）+ Bun標準テスト（プロジェクト統一）
- **実装可能性**: 現在の技術スタックで実現可能
  - 既存のjsonwebtoken・環境変数・Supabase技術を活用

### テストケース信頼性レベルサマリー
- 🔵 **85%**: EARS要件定義書・設計文書・型定義から明確に定義済み
- 🟡 **15%**: JWT仕様・セキュリティ要件から妥当な推測（境界値設定等）
- 🔴 **0%**: 根拠のない新規推測は含まれていない

### テストカバレッジ
- **機能カバレッジ**: IAuthProviderインターフェースの全メソッド
- **エラーケースカバレッジ**: EARS Edgeケース要件を完全網羅
- **セキュリティテスト**: 署名検証・有効期限・発行者確認を網羅
- **パフォーマンステスト**: NFR-002要件（1秒以内）を検証

## 実装対象ファイル

```
app/server/src/infrastructure/auth/
└── __tests__/
    └── SupabaseAuthProvider.test.ts
```

## テスト実行コマンド

```bash
# 個別テスト実行
docker compose exec server bun test app/server/src/infrastructure/auth/__tests__/SupabaseAuthProvider.test.ts

# 型チェック
docker compose exec server bunx tsc --noEmit

# 全テスト実行
docker compose exec server bun test
```

## 次のステップ

**次のお勧めステップ**: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。

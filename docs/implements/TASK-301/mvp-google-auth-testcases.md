# TDDテストケース一覧

**【機能名】**: mvp-google-auth (Google認証のMVP実装)
**【タスクID】**: TASK-301
**【作成日】**: 2025-08-28
**【更新日】**: 2025-08-28

---

## テスト実行環境

### 技術スタック
- **プログラミング言語**: TypeScript
- **ランタイム**: Bun  
- **HTTP フレームワーク**: Hono 4
- **テストフレームワーク**: Bun 標準テスト
- **データベース**: PostgreSQL + Drizzle ORM
- **実行環境**: Docker Compose server コンテナ

### テスト実行コマンド
```bash
# サーバーコンテナ内でのテスト実行
docker compose exec server bun test

# 型チェック（テスト前実行推奨）
docker compose exec server bunx tsc --noEmit
```

---

## 1. 正常系テストケース（基本的な動作）

### 1.1 JWT検証・ユーザー認証テスト

#### テスト名: 有効なJWTでのユーザー認証成功
- **何をテストするか**: POST /api/auth/verify エンドポイントが有効なJWTを正常に検証し、ユーザー情報を返却する
- **期待される動作**: JWT検証→既存ユーザー取得→レスポンス返却の一連の流れが正常実行される

**入力値**:
```typescript
const validJwtRequest = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid_jwt_payload.signature"
};
```
- **入力データの意味**: Supabase Auth発行の有効なJWT（Google OAuth認証済み）

**期待される結果**:
```typescript
const expectedResponse = {
  success: true,
  data: {
    user: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      externalId: "google_123456789", 
      provider: "google",
      email: "user@example.com",
      name: "山田太郎",
      avatarUrl: "https://lh3.googleusercontent.com/avatar.jpg",
      createdAt: "2025-08-12T10:30:00.000Z",
      updatedAt: "2025-08-12T10:30:00.000Z",
      lastLoginAt: "2025-08-12T13:45:00.000Z"
    },
    isNewUser: false
  }
};
```
- **期待結果の理由**: JWT検証成功時、既存ユーザー情報とログイン日時更新が正常実行される

**テストの目的**: AuthenticateUserUseCase の正常フローを確認
- **確認ポイント**: JWT検証・ユーザー検索・lastLoginAt更新・レスポンス形式の正確性

**信頼性**: 🟢 EARS要件REQ-002・interfaces.ts・api-endpoints.mdから抽出

---

### 1.2 JITプロビジョニング成功テスト

#### テスト名: 初回ログイン時のJIT新規ユーザー作成成功
- **何をテストするか**: 未登録ユーザーの初回認証時に自動的にユーザーレコードが作成される
- **期待される動作**: JWT検証→ユーザー不存在確認→新規ユーザー作成→レスポンス返却

**入力値**:
```typescript
const newUserJwtRequest = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_user_jwt_payload.signature"
};
```
- **入力データの意味**: 初回認証ユーザーのJWT（external_idがDB未登録）

**期待される結果**:
```typescript
const expectedJITResponse = {
  success: true,
  data: {
    user: {
      id: expect.any(String), // 新規UUID
      externalId: "google_987654321",
      provider: "google", 
      email: "newuser@example.com",
      name: "新規ユーザー",
      avatarUrl: "https://example.com/new-avatar.jpg",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      lastLoginAt: expect.any(String)
    },
    isNewUser: true
  }
};
```
- **期待結果の理由**: JITプロビジョニングによる新規ユーザー作成成功・isNewUser=trueフラグ設定

**テストの目的**: AuthenticationDomainService のJIT機能確認
- **確認ポイント**: ユーザー作成処理・UUID生成・タイムスタンプ設定・isNewUserフラグの正確性

**信頼性**: 🟢 EARS要件REQ-004・interfaces.ts・dataflow.mdから抽出

---

### 1.3 ユーザープロフィール取得成功テスト

#### テスト名: 認証済みユーザーのプロフィール情報取得成功
- **何をテストするか**: GET /api/user/profile エンドポイントが認証済みユーザーの情報を正常に返却する
- **期待される動作**: Authorization ヘッダー検証→ユーザー情報取得→プロフィール返却

**入力値**: 
```typescript
const authHeaders = {
  headers: {
    authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid_payload.sig"
  }
};
```
- **入力データの意味**: 認証済みユーザーのJWT Bearer トークン

**期待される結果**:
```typescript
const expectedProfileResponse = {
  success: true,
  data: {
    id: "550e8400-e29b-41d4-a716-446655440000",
    externalId: "google_123456789",
    provider: "google",
    email: "user@example.com", 
    name: "山田太郎",
    avatarUrl: "https://lh3.googleusercontent.com/avatar.jpg",
    createdAt: "2025-08-12T10:30:00.000Z",
    updatedAt: "2025-08-12T10:30:00.000Z",
    lastLoginAt: "2025-08-12T13:45:00.000Z"
  }
};
```
- **期待結果の理由**: GetUserProfileUseCase実行による認証済みユーザー情報の正常取得

**テストの目的**: UserController・GetUserProfileUseCase の連携確認
- **確認ポイント**: 認証ミドルウェア通過・ユーザーID抽出・プロフィール取得・レスポンス形式

**信頼性**: 🟢 EARS要件REQ-005・api-endpoints.md・interfaces.tsから抽出

---

### 1.4 認証ミドルウェア成功テスト

#### テスト名: AuthMiddleware による JWT検証・コンテキスト設定成功
- **何をテストするか**: 認証ミドルウェアが有効なJWTを検証し、リクエストコンテキストにユーザー情報を設定する
- **期待される動作**: JWT抽出→署名検証→ペイロード解析→コンテキスト設定→次ミドルウェア呼び出し

**入力値**:
```typescript
const validAuthHeader = {
  authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid_payload.signature"
};
```
- **入力データの意味**: 正しい形式・有効な署名を持つJWT Bearer トークン

**期待される結果**:
```typescript
// Context内にユーザー情報が設定される
const expectedContextUser = {
  sub: "google_123456789",
  email: "user@example.com",
  app_metadata: {
    provider: "google",
    providers: ["google"]
  },
  user_metadata: {
    name: "山田太郎",
    avatar_url: "https://lh3.googleusercontent.com/avatar.jpg",
    email: "user@example.com",
    full_name: "山田太郎"
  }
};
```
- **期待結果の理由**: JWT検証成功によるユーザーコンテキストの正常設定

**テストの目的**: AuthMiddleware の基本機能確認
- **確認ポイント**: JWT抽出ロジック・署名検証・コンテキスト設定・エラーハンドリング未発生

**信頼性**: 🟢 architecture.md・api-endpoints.md・Honoミドルウェア仕様から抽出

---

## 2. 異常系テストケース（エラーハンドリング）

### 2.1 無効JWT検証エラーテスト

#### テスト名: 無効なJWTトークンでの認証失敗
- **エラーケースの概要**: 不正な署名・改ざんされたJWTを送信した際のエラーハンドリング
- **エラー処理の重要性**: セキュリティ侵害を防ぎ、不正アクセスを確実に遮断する

**入力値**: 
```typescript
const invalidJwtRequest = {
  token: "invalid.jwt.token"
};
```
- **不正な理由**: JWT署名が無効・ペイロードが改ざん・形式不正のいずれか
- **実際の発生シナリオ**: 悪意のあるユーザーによるトークン偽造・通信中のデータ破損

**期待される結果**:
```typescript
const expectedErrorResponse = {
  success: false,
  error: {
    code: "INVALID_TOKEN",
    message: "認証トークンが無効です",
    details: "JWT signature verification failed"
  }
};
```
- **エラーメッセージの内容**: ユーザーに分かりやすく、攻撃者に有用な情報を与えない適切なバランス
- **システムの安全性**: 不正アクセス遮断・セッション状態のクリーンアップ・ログ記録

**テストの目的**: JWT検証の堅牢性・セキュリティ確保
- **品質保証の観点**: 認証システムの信頼性・不正アクセス防止・データ保護

**信頼性**: 🟢 EARS要件EDGE-002・api-endpoints.md・JWTセキュリティ仕様から抽出

---

### 2.2 JWT期限切れエラーテスト

#### テスト名: 有効期限切れJWTでの認証失敗
- **エラーケースの概要**: exp クレームが現在時刻を過ぎたJWTでの認証試行
- **エラー処理の重要性**: セッションハイジャック防止・適切な再認証フロー誘導

**入力値**:
```typescript
const expiredJwtRequest = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired_payload.signature"
};
```
- **不正な理由**: JWT の exp クレームが現在のUnix時間より小さい（過去の時刻）
- **実際の発生シナリオ**: 長時間ページ放置・ネットワーク断絶後の復帰・タイムゾーン問題

**期待される結果**:
```typescript
const expectedExpiredResponse = {
  success: false,
  error: {
    code: "TOKEN_EXPIRED", 
    message: "認証トークンの有効期限が切れています",
    details: "JWT expired at 1703123456"
  }
};
```
- **エラーメッセージの内容**: 再ログインを促す明確な指示・期限切れの明確な説明
- **システムの安全性**: セッション状態クリア・自動リダイレクト・攻撃耐性維持

**テストの目的**: JWT ライフサイクル管理・タイムベースセキュリティ確認
- **品質保証の観点**: セッション管理の正確性・タイムアタック耐性・ユーザビリティ配慮

**信頼性**: 🟢 JWT標準仕様・api-endpoints.md・セキュリティ要件から抽出

---

### 2.3 認証ヘッダー不存在エラーテスト

#### テスト名: Authorization ヘッダー不存在での認証要求エラー
- **エラーケースの概要**: 認証が必要なエンドポイントに未認証でアクセスした場合
- **エラー処理の重要性**: 不正アクセス防止・認証フロー誘導・システム保護

**入力値**:
```typescript
const requestWithoutAuth = {
  headers: {}
  // Authorization ヘッダーなし
};
```
- **不正な理由**: 認証が必須のエンドポイントに認証情報を提供していない
- **実際の発生シナリオ**: 直接URL入力・未ログイン状態でのAPI呼び出し・フロントエンド実装ミス

**期待される結果**:
```typescript
const expectedUnauthResponse = {
  success: false,
  error: {
    code: "AUTHENTICATION_REQUIRED",
    message: "ログインが必要です"
  }
};
```
- **エラーメッセージの内容**: ユーザーに必要なアクションを明確に示す
- **システムの安全性**: 個人情報保護・不正アクセス防止・適切なHTTPステータス(401)

**テストの目的**: AuthMiddleware の認証チェック機能確認
- **品質保証の観点**: アクセス制御の確実性・ユーザビリティ・セキュリティ境界の明確化

**信頼性**: 🟢 EARS要件NFR-101・api-endpoints.md・Hono認証仕様から抽出

---

### 2.4 データベース接続エラーテスト

#### テスト名: PostgreSQL接続失敗時のシステムエラーハンドリング
- **エラーケースの概要**: DB接続プールの枯渇・PostgreSQL サーバーダウン・ネットワーク障害
- **エラー処理の重要性**: システム障害時の適切な復旧・ユーザーへの分かりやすい通知・データ整合性保護

**入力値**:
```typescript
const validRequestButDbDown = {
  token: "valid_jwt_token"
};
```
- **不正な理由**: リクエスト自体は正常だが、インフラストラクチャ層でDB接続エラーが発生
- **実際の発生シナリオ**: DB メンテナンス・ネットワーク障害・リソース不足・設定ミス

**期待される結果**:
```typescript
const expectedDbErrorResponse = {
  success: false,
  error: {
    code: "INTERNAL_SERVER_ERROR",
    message: "一時的にサービスをご利用いただけません。しばらく経ってから再度お試しください"
  }
};
```
- **エラーメッセージの内容**: 技術詳細を隠し、ユーザーに適切な対応を示す
- **システムの安全性**: 内部エラー情報の非開示・適切なログ記録・復旧手順の明確化

**テストの目的**: Infrastructure 層のエラーハンドリング・回復可能性の確認
- **品質保証の観点**: 障害耐性・運用性・セキュリティ・ユーザー体験の維持

**信頼性**: 🟢 DDD Infrastructure設計・運用要件・PostgreSQL接続仕様から抽出

---

### 2.5 Supabase連携エラーテスト

#### テスト名: Supabase Auth接続失敗時のプロバイダーエラーハンドリング
- **エラーケースの概要**: Supabase Auth サービス障害・API制限・認証設定ミス
- **エラー処理の重要性**: 外部サービス依存による障害の適切な処理・代替手段の提供

**入力値**:
```typescript
const validJwtButSupabaseDown = {
  token: "valid_format_jwt_but_supabase_down"
};
```
- **不正な理由**: JWT形式は正常だが、Supabase Auth での検証時にサービスエラーが発生
- **実際の発生シナリオ**: Supabase障害・API レート制限・ネットワーク問題・設定ミス

**期待される結果**:
```typescript
const expectedProviderErrorResponse = {
  success: false,
  error: {
    code: "PROVIDER_ERROR",
    message: "認証サービスとの接続に失敗しました。しばらく経ってから再度お試しください"
  }
};
```
- **エラーメッセージの内容**: 外部サービス問題を適切に説明・ユーザーアクション指示
- **システムの安全性**: 外部依存障害の分離・内部状態の保護・監視アラートの発動

**テストの目的**: External Service 連携の障害耐性・プロバイダー非依存設計の確認  
- **品質保証の観点**: 外部依存管理・障害分離・サービス継続性・監視可能性

**信頼性**: 🟢 EARS要件EDGE-004・architecture.md プロバイダー戦略・Supabase仕様から抽出

---

## 3. 境界値テストケース（最小値、最大値、null等）

### 3.1 ユーザー名最大長テスト

#### テスト名: 255文字のユーザー名での正常処理確認
- **境界値の意味**: database-schema.sqlでname VARCHAR(255)と定義された上限値での動作確認
- **境界値での動作保証**: 最大長でもデータベース保存・表示が正常に動作することを保証

**入力値**:
```typescript
const maxLengthNameJwt = {
  token: generateJwtWithPayload({
    name: "あ".repeat(255) // 255文字の名前
  })
};
```
- **境界値選択の根拠**: PostgreSQL VARCHAR(255)制限・UI表示制限・メモリ効率の考慮
- **実際の使用場面**: 長い本名を持つユーザー・多言語名・フルネーム利用時

**期待される結果**:
```typescript
const expectedMaxNameResponse = {
  success: true,
  data: {
    user: {
      name: "あ".repeat(255) // 255文字すべて保存・取得成功
    }
  }
};
```
- **境界値での正確性**: 255文字すべてが切り捨てなしで保存・取得される
- **一貫した動作**: 254文字と256文字（エラー）の動作と一貫している

**テストの目的**: データベース制約・文字列処理の境界確認
- **堅牢性の確認**: 極端なデータサイズでも安定したシステム動作を保証

**信頼性**: 🟢 database-schema.sql VARCHAR(255)制限・EARS要件EDGE-101から抽出

---

### 3.2 メールアドレス最大長テスト

#### テスト名: RFC 5321準拠320文字メールアドレスでの正常処理
- **境界値の意味**: email VARCHAR(320)制限でのRFC準拠最大値での動作確認
- **境界値での動作保証**: 標準準拠の最大長メールアドレスでも認証・保存が正常動作

**入力値**:
```typescript
const maxEmailJwt = {
  token: generateJwtWithPayload({
    email: "very-long-localpart-" + "a".repeat(200) + "@very-long-domain-name-example.com"
  })
};
```
- **境界値選択の根拠**: RFC 5321 メールアドレス最大長標準・国際化ドメイン対応
- **実際の使用場面**: 長いローカル部・長いドメイン名・国際化メールアドレス

**期待される結果**:
```typescript
const expectedMaxEmailResponse = {
  success: true,
  data: {
    user: {
      email: "very-long-localpart-aaaaaaaaaa...@very-long-domain-name-example.com"
    }
  }
};
```
- **境界値での正確性**: 320文字メールアドレスの完全保存・検索機能の正常動作
- **一貫した動作**: メール形式チェック・一意制約・インデックス検索すべて正常

**テストの目的**: RFC準拠・データベース設計の検証
- **堅牢性の確認**: 標準最大値でのシステム安定性・互換性確保

**信頼性**: 🟢 database-schema.sql email制約・RFC 5321標準・interfaces.tsから抽出

---

### 3.3 Avatar URL空値テスト

#### テスト名: アバター画像URLが null の場合の正常処理
- **境界値の意味**: オプション項目でのnull値処理・デフォルト動作確認
- **境界値での動作保証**: 必須でない項目の省略時も正常にユーザー作成・表示される

**入力値**:
```typescript
const noAvatarJwt = {
  token: generateJwtWithPayload({
    email: "user@example.com",
    name: "テストユーザー",
    avatar_url: null // アバターURL なし
  })
};
```
- **境界値選択の根拠**: interfaces.ts avatarUrl?: string オプション定義・Googleプロフィール画像なしケース
- **実際の使用場面**: プロフィール画像未設定・プライバシー設定・画像取得エラー

**期待される結果**:
```typescript
const expectedNoAvatarResponse = {
  success: true,
  data: {
    user: {
      id: expect.any(String),
      externalId: expect.any(String),
      provider: "google",
      email: "user@example.com",
      name: "テストユーザー",
      avatarUrl: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      lastLoginAt: expect.any(String)
    }
  }
};
```
- **境界値での正確性**: null値の適切な処理・JSON シリアライゼーション正常
- **一貫した動作**: avatarUrl有りの場合と一貫したレスポンス形式

**テストの目的**: オプション項目処理・null安全性の確認
- **堅牢性の確認**: 不完全なデータでもシステムが安定動作・ユーザビリティ維持

**信頼性**: 🟢 interfaces.ts オプション型定義・EARS要件EDGE-102・database-schema.sqlから抽出

---

### 3.4 JWT有効期限境界値テスト

#### テスト名: JWT有効期限の1秒前での正常認証確認
- **境界値の意味**: exp クレーム境界での時間精度・認証タイミングの厳密性確認
- **境界値での動作保証**: 有効期限ギリギリでも確実に認証成功・適切な時間管理

**入力値**:
```typescript
const almostExpiredJwt = {
  token: generateJwtWithExpiry(Math.floor(Date.now() / 1000) + 1) // 1秒後に期限切れ
};
```
- **境界値選択の根拠**: JWT exp クレーム時間精度・システムクロック差異・ネットワーク遅延考慮
- **実際の使用場面**: 長時間セッション・ページ遷移タイミング・API呼び出し直前

**期待される結果**:
```typescript
const expectedAlmostExpiredResponse = {
  success: true,
  data: {
    user: {
      lastLoginAt: expect.any(String) // 現在時刻で更新
    }
  }
};
```
- **境界値での正確性**: 1秒前なら成功・1秒後なら失敗の厳密な境界動作
- **一貫した動作**: サーバー時刻基準での一貫した判定・時差影響なし

**テストの目的**: 時間ベースセキュリティ・精度検証
- **堅牢性の確認**: タイミング攻撃耐性・時刻同期依存性の最小化

**信頼性**: 🟡 JWT標準仕様・システム時刻管理要件から妥当推測

---

### 3.5 外部ID最大長テスト

#### テスト名: external_id VARCHAR(255)での境界値処理確認
- **境界値の意味**: プロバイダー発行IDの最大長でのシステム動作確認
- **境界値での動作保証**: Google等の外部IDが長い場合でも正常に一意制約・検索が動作

**入力値**:
```typescript
const maxExternalIdJwt = {
  token: generateJwtWithPayload({
    sub: "google_" + "a".repeat(248) // 255文字のexternal_id
  })
};
```
- **境界値選択の根拠**: database-schema.sql external_id VARCHAR(255)制限・Google Sub Claim長・将来プロバイダー考慮
- **実際の使用場面**: 新しいOAuth プロバイダー・長いユーザーID・国際化ID体系

**期待される結果**:
```typescript
const expectedMaxExternalIdResponse = {
  success: true,
  data: {
    user: {
      externalId: "google_" + "a".repeat(248) // 255文字external_id
    }
  }
};
```
- **境界値での正確性**: 255文字external_idでの一意制約・複合インデックス正常動作
- **一貫した動作**: 短いIDと長いIDでの検索・作成処理の一貫性

**テストの目的**: 外部ID管理・データベース制約の検証
- **堅牢性の確認**: プロバイダー非依存設計での極端値耐性・拡張性確保

**信頼性**: 🟢 database-schema.sql 制約定義・プロバイダー仕様・OAuth標準から抽出

---

## テストケース実装時の日本語コメント指針

### テストケース開始時のコメント

```typescript
// 【テスト目的】: [このテストで何を確認するかを日本語で明記]
// 【テスト内容】: [具体的にどのような処理をテストするかを説明]
// 【期待される動作】: [正常に動作した場合の結果を説明]
// 🟢🟡🔴 この内容の信頼性レベルを記載
```

### Given（準備フェーズ）のコメント

```typescript
// 【テストデータ準備】: [なぜこのデータを用意するかの理由]
// 【初期条件設定】: [テスト実行前の状態を説明]
// 【前提条件確認】: [テスト実行に必要な前提条件を明記]
```

### When（実行フェーズ）のコメント

```typescript
// 【実際の処理実行】: [どの機能/メソッドを呼び出すかを説明]
// 【処理内容】: [実行される処理の内容を日本語で説明]
// 【実行タイミング】: [なぜこのタイミングで実行するかを説明]
```

### Then（検証フェーズ）のコメント

```typescript
// 【結果検証】: [何を検証するかを具体的に説明]
// 【期待値確認】: [期待される結果とその理由を説明]
// 【品質保証】: [この検証がシステム品質にどう貢献するかを説明]
```

### 各expectステートメントのコメント

```typescript
// 【検証項目】: [この検証で確認している具体的な項目]
// 🟢🟡🔴 この内容の信頼性レベルを記載
expect(result.success).toBe(true); // 【確認内容】: APIレスポンスが正常成功を示すことを確認
expect(result.data.user.email).toBe('user@example.com'); // 【確認内容】: 取得されたユーザーメールアドレスが期待値と一致することを確認
```

### セットアップ・クリーンアップのコメント

```typescript
beforeEach(() => {
  // 【テスト前準備】: [各テスト実行前に行う準備作業の説明]
  // 【環境初期化】: [テスト環境をクリーンな状態にする理由と方法]
});

afterEach(() => {
  // 【テスト後処理】: [各テスト実行後に行うクリーンアップ作業の説明]
  // 【状態復元】: [次のテストに影響しないよう状態を復元する理由]
});
```

---

## 品質判定

### ✅ 高品質判定結果
- **テストケース分類**: 正常系・異常系・境界値が網羅されている
  - 正常系4項目: JWT検証・JIT・プロフィール取得・ミドルウェア
  - 異常系5項目: 無効JWT・期限切れ・未認証・DB障害・プロバイダー障害
  - 境界値5項目: 名前・メール・Avatar・JWT期限・外部ID
- **期待値定義**: 各テストケースの期待値が明確
  - TypeScript型定義による厳密な期待値設定
  - JSON形式での具体的なレスポンス例示
  - エラーケースでの適切なメッセージ・コード定義
- **技術選択**: プログラミング言語・テストフレームワークが確定
  - TypeScript + Bun + Hono の一貫したスタック
  - プロジェクト標準技術の完全準拠
  - Docker環境での実行方法明確化
- **実装可能性**: 現在の技術スタックで実現可能
  - 既存interfaces.ts型定義との完全整合性
  - DDD + クリーンアーキテクチャ対応
  - 具体的なテストコード例・コメント指針提供

### 信頼性レベル評価
- **🟢 青信号**: 90% - EARS要件定義・設計文書・技術仕様からの直接抽出
- **🟡 黄信号**: 10% - JWT時間境界など技術標準からの妥当推測
- **🔴 赤信号**: 0% - 未定義推測項目なし

---

## 次のステップ

**次のお勧めステップ**: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。

---

## 更新履歴
- 2025-08-28: 初回作成（TASK-301）- TDDテストケース洗い出し完了・品質判定実施
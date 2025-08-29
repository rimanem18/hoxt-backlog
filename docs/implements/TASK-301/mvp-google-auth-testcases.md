# TDDテストケース一覧

**【機能名】**: mvp-google-auth (Google認証のMVP実装)
**【タスクID】**: TASK-301
**【作成日】**: 2025-08-28
**【更新日】**: 2025-08-29

- **バックエンド実装済み・テストケース完了**
- **フロントエンド実装推奨・テストケース追加完了**

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

---

# フロントエンド（Next.js）テストケース

**対象**: Next.js フロントエンド認証機能  
**実行環境**: Dockerコンテナ内のclientサービス  
**テストフレームワーク**: Bun標準テストランナー

## フロントエンドテスト実行環境

### 技術スタック
- **プログラミング言語**: TypeScript
- **フレームワーク**: Next.js 15 + React 19  
- **状態管理**: Redux Toolkit + React Redux
- **テストフレームワーク**: Bun 標準テスト
- **HTTP クライアント**: TanStack Query（React Query）
- **認証ライブラリ**: Supabase Auth SDK
- **実行環境**: Docker Compose client コンテナ

### フロントエンドテスト実行コマンド
```bash
# クライアントコンテナ内でのテスト実行
docker compose exec client bun test

# 型チェック（テスト前実行推奨）
docker compose exec client bunx tsc --noEmit
```

### 必要な依存関係追加
```json
{
  "@supabase/supabase-js": "^2.39.0",
  "@reduxjs/toolkit": "^2.2.1", 
  "react-redux": "^9.1.0",
  "@testing-library/react": "^14.2.1",
  "@testing-library/jest-dom": "^6.4.2",
  "@testing-library/user-event": "^14.5.2"
}
```

---

## フロントエンド正常系テストケース

### F1.1 認証状態管理テスト

#### F1.1.1: 認証状態の初期値が正しく設定される
- **テスト名**: 認証状態の初期値確認
  - **何をテストするか**: アプリケーション起動時の認証状態初期化
  - **期待される動作**: 未認証状態、ユーザー情報null、ローディングfalse、エラーnull
- **入力値**: なし（初期化）
  - **入力データの意味**: アプリケーション起動時の初期状態
- **期待される結果**: `{ isAuthenticated: false, user: null, isLoading: false, error: null }`
  - **期待結果の理由**: ユーザーがまだ認証していない初期状態を表現
- **テストの目的**: 認証状態管理の初期化が正しく動作することを確認
  - **確認ポイント**: 全ての状態プロパティが期待値と一致している
- 🟢 **信頼性レベル**: 要件定義書のAuthState型定義から直接抽出

#### F1.1.2: Google認証成功時の状態更新
- **テスト名**: Google認証成功時の認証状態更新
  - **何をテストするか**: 認証成功アクションによる状態変更
  - **期待される動作**: 認証済み状態、ユーザー情報設定、ローディング終了
- **入力値**: `AUTH_SUCCESS`アクション + `{ user: mockUser, isNewUser: false }`
  - **入力データの意味**: 認証API呼び出し成功時のレスポンスデータ
- **期待される結果**: `{ isAuthenticated: true, user: mockUser, isLoading: false, error: null }`
  - **期待結果の理由**: 認証完了後のアプリケーション状態を正確に反映
- **テストの目的**: 認証成功時の状態遷移が正しく動作することを確認
  - **確認ポイント**: ユーザー情報の設定、認証フラグの更新、エラー状態のクリア
- 🟢 **信頼性レベル**: 要件定義書のAuthAction・AuthState型から抽出

### F1.2 Googleログインコンポーネントテスト

#### F1.2.1: Googleログインボタンの表示
- **テスト名**: 未認証時のGoogleログインボタン表示
  - **何をテストするか**: 認証状態に応じたUI表示制御
  - **期待される動作**: 「Googleでログイン」ボタンの表示、ログアウトボタンの非表示
- **入力値**: `{ isAuthenticated: false }`
  - **入力データの意味**: ユーザーがまだログインしていない状態
- **期待される結果**: Googleログインボタンがレンダリングされる
  - **期待結果の理由**: 未認証ユーザーにログイン手段を提供するUI設計
- **テストの目的**: 条件付きUI表示が正しく動作することを確認
  - **確認ポイント**: ボタンテキスト、アクセシビリティ属性、イベントハンドラー設定
- 🟢 **信頼性レベル**: 要件REQ-101（未認証時のUIフロー）から抽出

#### F1.2.2: Googleログインボタンクリック処理
- **テスト名**: Googleログインボタンクリック時の認証フロー開始
  - **何をテストするか**: ボタンクリックイベントの処理とSupabase Auth連携
  - **期待される動作**: `signInWithOAuth`関数呼び出し、ローディング状態開始
- **入力値**: ボタンクリックイベント
  - **入力データの意味**: ユーザーの認証開始意思表示
- **期待される結果**: `supabase.auth.signInWithOAuth({ provider: 'google' })`が呼び出される
  - **期待結果の理由**: Supabase Auth SDKのGoogle OAuth仕様に準拠
- **テストの目的**: 認証フロー開始処理が正しく動作することを確認
  - **確認ポイント**: 関数呼び出し、引数の正確性、ローディング状態変更
- 🟢 **信頼性レベル**: 要件REQ-102（Google認証フロー）・Supabase公式ドキュメントから抽出

### F1.3 ユーザープロフィールコンポーネントテスト

#### F1.3.1: 認証済みユーザー情報の表示
- **テスト名**: 認証済み時のユーザー情報表示
  - **何をテストするか**: ユーザー情報の画面表示とフォーマット
  - **期待される動作**: 名前、メール、アバター画像、ログアウトボタンの表示
- **入力値**: 
  ```typescript
  {
    user: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "山田太郎",
      email: "user@example.com", 
      avatarUrl: "https://lh3.googleusercontent.com/a/avatar.jpg"
    }
  }
  ```
  - **入力データの意味**: バックエンドAPIから取得したユーザープロフィール情報
- **期待される結果**: 各情報項目が適切にレンダリングされる
  - **期待結果の理由**: 認証済みユーザーに対する情報表示機能の実現
- **テストの目的**: ユーザー情報表示機能が正しく動作することを確認
  - **確認ポイント**: データバインディング、画像読み込み、レイアウト
- 🟢 **信頼性レベル**: 要件REQ-104（認証済みUI表示）・User型定義から抽出

#### F1.3.2: アバター画像フォールバック処理
- **テスト名**: アバター画像取得失敗時のデフォルト画像表示
  - **何をテストするか**: 画像読み込みエラー時のフォールバック機能
  - **期待される動作**: デフォルトアバター画像の表示、エラー状態の非表示
- **入力値**: `{ user: { avatarUrl: null } }`
  - **入力データの意味**: Google OAuthでアバター画像が提供されないケース
- **期待される結果**: デフォルトアバター画像が表示される
  - **期待結果の理由**: ユーザー体験の一貫性確保、UI崩れ防止
- **テストの目的**: 画像フォールバック処理が正しく動作することを確認
  - **確認ポイント**: 条件分岐、デフォルト画像パス、alt属性設定
- 🟢 **信頼性レベル**: 要件EDGE-102（アバター画像取得失敗）から抽出

### F1.4 バックエンドAPI連携テスト

#### F1.4.1: ユーザープロフィール取得API呼び出し
- **テスト名**: 認証後のバックエンドAPIからユーザー情報取得
  - **何をテストするか**: JWT認証ヘッダー付きAPIリクエストの実行
  - **期待される動作**: `GET /api/user/profile`の呼び出し、レスポンス処理
- **入力値**: JWT token: `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
  - **入力データの意味**: Supabase Authから取得したJWTトークン
- **期待される結果**: 
  ```typescript
  {
    success: true,
    data: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "山田太郎",
      email: "user@example.com"
    }
  }
  ```
  - **期待結果の理由**: バックエンドAPI仕様（api-endpoints.md）に準拠
- **テストの目的**: フロントエンド・バックエンド連携が正しく動作することを確認
  - **確認ポイント**: 認証ヘッダー設定、APIレスポンス処理、エラーハンドリング
- 🟢 **信頼性レベル**: 要件REQ-005（API連携）・api-endpoints.mdから抽出

---

## フロントエンド異常系テストケース

### F2.1 認証エラー処理テスト

#### F2.1.1: Google認証拒否時のエラー処理
- **テスト名**: Google認証キャンセル時のエラーメッセージ表示
  - **エラーケースの概要**: ユーザーがGoogle認証ページで「キャンセル」を選択
  - **エラー処理の重要性**: ユーザーに状況を分かりやすく伝え、再試行可能な状態を維持
- **入力値**: Supabase Auth error: `{ message: 'Auth cancelled', code: 'auth_cancelled' }`
  - **不正な理由**: ユーザーが認証フローを中断した状態
  - **実際の発生シナリオ**: Google認証ポップアップでの「キャンセル」ボタンクリック
- **期待される結果**: エラーメッセージ「認証がキャンセルされました」の表示
  - **エラーメッセージの内容**: 日本語で分かりやすく、脅威的でない表現
  - **システムの安全性**: 認証状態は未認証のまま、アプリケーション続行可能
- **テストの目的**: ユーザー操作によるエラーの適切な処理を確認
  - **品質保証の観点**: UX向上、エラー状況でのアプリケーション安定性
- 🟢 **信頼性レベル**: 要件EDGE-001（認証キャンセル）から抽出

#### F2.1.2: JWT検証失敗時のエラー処理
- **テスト名**: 無効なJWTトークンでAPI呼び出し時のエラーハンドリング
  - **エラーケースの概要**: 期限切れまたは不正なJWTでのAPI アクセス
  - **エラー処理の重要性**: セキュリティ確保と適切な再認証フロー実行
- **入力値**: API Response: `{ status: 401, error: { code: 'INVALID_TOKEN', message: '認証トークンが無効です' } }`
  - **不正な理由**: JWTの有効期限切れまたは署名不正
  - **実際の発生シナリオ**: 長時間アプリ使用後のトークン期限切れ
- **期待される結果**: 
  - エラーメッセージ表示
  - 認証状態のリセット
  - ログインページへの自動リダイレクト
  - **エラーメッセージの内容**: 「セッションの有効期限が切れました。再度ログインしてください」
  - **システムの安全性**: 不正アクセス防止、自動的な安全状態への復帰
- **テストの目的**: JWT認証エラーの適切な処理を確認
  - **品質保証の観点**: セキュリティ確保、ユーザー体験の継続性
- 🟢 **信頼性レベル**: 要件EDGE-002（JWT検証失敗）から抽出

### F2.2 API通信エラー処理テスト

#### F2.2.1: バックエンドAPI接続エラー処理
- **テスト名**: バックエンドAPIサーバー利用不可時のエラーメッセージ表示
  - **エラーケースの概要**: ネットワーク障害またはサーバーダウンによるAPI接続失敗
  - **エラー処理の重要性**: ユーザーに状況説明と適切な対処法提示
- **入力値**: Network Error: `{ message: 'Network Error', code: 'ECONNREFUSED' }`
  - **不正な理由**: バックエンドサーバーの一時的な停止またはネットワーク分断
  - **実際の発生シナリオ**: サーバーメンテナンス時、ネットワーク不安定時
- **期待される結果**: エラーメッセージ「APIサーバーとの通信に失敗しました。しばらく時間をおいて再度お試しください」
  - **エラーメッセージの内容**: 原因と対処法が明確、技術的な詳細は非表示
  - **システムの安全性**: アプリケーション継続可能、再試行機能提供
- **テストの目的**: ネットワークエラーの適切な処理を確認
  - **品質保証の観点**: 障害時のユーザー体験向上、システム可用性確保
- 🟢 **信頼性レベル**: 要件EDGE-003（API通信エラー）から抽出

#### F2.2.2: Supabaseサービス障害時のエラー処理
- **テスト名**: Supabase認証サービス障害時の案内メッセージ表示
  - **エラーケースの概要**: Supabase外部サービスの一時的な障害
  - **エラー処理の重要性**: 外部依存サービス障害時のユーザー案内と信頼性確保
- **入力値**: Supabase Service Error: `{ status: 503, message: 'Service Unavailable' }`
  - **不正な理由**: Supabase側のサービス障害またはメンテナンス
  - **実際の発生シナリオ**: Supabaseプラットフォーム障害、計画メンテナンス
- **期待される結果**: エラーメッセージ「認証サービスが一時的に利用できません。しばらく時間をおいて再度お試しください」
  - **エラーメッセージの内容**: サービス側の問題であることを明示、時間を置いた再試行推奨
  - **システムの安全性**: 障害情報の適切な伝達、パニック防止
- **テストの目的**: 外部サービス障害時の適切な処理を確認
  - **品質保証の観点**: 外部依存に対する堅牢性、ユーザー満足度維持
- 🟢 **信頼性レベル**: 要件EDGE-004（Supabase障害）から抽出

---

## フロントエンド境界値テストケース

### F3.1 ユーザー名表示の境界値テスト

#### F3.1.1: 長いユーザー名の省略表示処理
- **テスト名**: 50文字以上の長いユーザー名の省略表示
  - **境界値の意味**: 一般的なUI表示領域での名前表示限界
  - **境界値での動作保証**: レイアウト崩れ防止と可読性確保
- **入力値**: 
  ```typescript
  { 
    user: { 
      name: "これは非常に長い名前のテストケースでありUIの表示限界を確認するためのものです" // 51文字
    } 
  }
  ```
  - **境界値選択の根拠**: UI設計上の表示可能文字数制限（50文字）
  - **実際の使用場面**: Google アカウントで長い名前を設定しているユーザー
- **期待される結果**: `"これは非常に長い名前のテストケースでありUIの表示限界を確認す..."`（47文字 + "..."）
  - **境界での正確性**: 文字数カウント、省略記号の追加が正確
  - **一貫した動作**: 他の長文項目でも同様の処理適用
- **テストの目的**: 長文テキストの表示処理が正しく動作することを確認
  - **堅牢性の確認**: UI崩れ防止、レスポンシブデザイン対応
- 🟢 **信頼性レベル**: 要件EDGE-101（長いユーザー名）から抽出

### F3.2 null値・undefined処理の境界値テスト

#### F3.2.1: ユーザー情報がnullの場合の処理
- **テスト名**: ユーザー情報null/undefined時のエラー回避
  - **境界値の意味**: APIレスポンスまたは状態管理でのnull値ケース
  - **境界値での動作保証**: null安全性の確保、例外発生防止
- **入力値**: `{ user: null }` および `{ user: undefined }`
  - **境界値選択の根拠**: JavaScript/TypeScriptでの一般的な未定義値
  - **実際の使用場面**: API障害時、ログアウト直後、初期化エラー時
- **期待される結果**: 
  - エラー例外が発生しない
  - デフォルト値または空白表示
  - アプリケーション継続動作
  - **境界での正確性**: null チェック処理の確実な実行
  - **一貫した動作**: 全てのユーザー情報フィールドで同様の処理
- **テストの目的**: null安全性が正しく実装されていることを確認
  - **堅牢性の確認**: 予期しない値に対する耐性、アプリケーション安定性
- 🟡 **信頼性レベル**: TypeScript型安全性とReact一般的なベストプラクティスから推定

### F3.3 メールアドレスの境界値テスト

#### F3.3.1: 最大長メールアドレスの表示処理
- **テスト名**: RFC 5321準拠320文字メールアドレスの表示
  - **境界値の意味**: メールアドレスの技術的最大長制限
  - **境界値での動作保証**: 長いメールアドレスでのUI表示確保
- **入力値**: 
  ```typescript
  { 
    user: { 
      email: "very.long.email.address.for.testing.display.boundaries.and.ui.layout.consistency@very-long-domain-name-for-testing-email-display.example.com" // 約140文字の例
    } 
  }
  ```
  - **境界値選択の根拠**: RFC 5321のメールアドレス最大長仕様（320文字）
  - **実際の使用場面**: 企業ドメインで長い組織名を使用している場合
- **期待される結果**: 
  - UI崩れなしでの表示
  - 必要に応じた改行処理
  - レスポンシブ対応
  - **境界での正確性**: 文字数制限内での適切な表示
  - **一貫した動作**: モバイル・デスクトップ両環境での表示統一
- **テストの目的**: 長いメールアドレスでのレイアウト処理を確認
  - **堅牢性の確認**: RFC準拠データでの表示安定性
- 🟡 **信頼性レベル**: RFC 5321仕様とUI設計のベストプラクティスから推定

---

## フロントエンドテストケース実装時の日本語コメント指針

### テストケース開始時のコメント
```typescript
// 【テスト目的】: Google認証成功時の認証状態更新を確認
// 【テスト内容】: AUTH_SUCCESSアクション発火時のState変更処理をテスト
// 【期待される動作】: 認証フラグON、ユーザー情報設定、エラー状態クリア
// 🟢 要件定義書AuthAction・AuthState型から直接抽出
```

### Given（準備フェーズ）のコメント
```typescript
// 【テストデータ準備】: 認証成功レスポンスを模擬するモックユーザーデータを作成
// 【初期条件設定】: 認証状態を未認証・ローディング中に初期化
// 【前提条件確認】: Redux StoreとAuthContext Providerが正常に動作している状態
```

### When（実行フェーズ）のコメント
```typescript
// 【実際の処理実行】: dispatchでAUTH_SUCCESSアクションを発火
// 【処理内容】: 認証状態管理のreducer関数でのState更新処理を実行
// 【実行タイミング】: Google OAuth成功後のJWT取得完了タイミングを想定
```

### Then（検証フェーズ）のコメント
```typescript
// 【結果検証】: 更新された認証状態の各プロパティを確認
// 【期待値確認】: isAuthenticated=true、user情報設定、error=nullを検証
// 【品質保証】: 認証状態の整合性とアプリケーション安定性を確保
```

### 各expectステートメントのコメント
```typescript
// 【検証項目】: 認証成功時の状態フラグ更新を確認
// 🟢 要件REQ-103から直接抽出
expect(authState.isAuthenticated).toBe(true); // 【確認内容】: 認証完了フラグが正しくtrueに設定されることを確認

// 【検証項目】: ユーザー情報の適切な設定を確認  
// 🟢 User型定義から直接抽出
expect(authState.user.name).toBe("山田太郎"); // 【確認内容】: バックエンドから取得したユーザー名が正しく設定されることを確認
```

### セットアップ・クリーンアップのコメント
```typescript
beforeEach(() => {
  // 【テスト前準備】: 各テスト実行前に認証状態を初期化し、モックAPIをセットアップ
  // 【環境初期化】: テストの独立性確保のため、状態とモックを毎回リセット
});

afterEach(() => {
  // 【テスト後処理】: モックの呼び出し履歴をクリアし、副作用を除去
  // 【状態復元】: 次のテストに影響しないよう、Supabase Authモックをリセット
});
```

---

## フロントエンド品質判定

### ✅ 高品質判定結果
- **テストケース分類**: 正常系・異常系・境界値が網羅されている（14テストケース）
- **期待値定義**: 各テストケースの期待値が明確かつ具体的
- **技術選択**: TypeScript + Bun標準テストランナーで確定、既存環境と整合性あり
- **実装可能性**: Next.js + TanStack Query + Supabase Authの技術スタックで実現可能

### フロントエンド信頼性レベル評価
- **🟢 青信号**: 85% - 要件定義書・API仕様書から直接抽出したテストケース
- **🟡 黄信号**: 15% - TypeScript・React一般的なベストプラクティスから推定
- **🔴 赤信号**: 0% - 推測に依存したテストケースなし

---

## 更新履歴
- 2025-08-28: 初回作成（TASK-301）- バックエンドTDDテストケース洗い出し完了・品質判定実施
- 2025-08-29: フロントエンド追加 - Next.js認証機能のテストケース14件を追加完了

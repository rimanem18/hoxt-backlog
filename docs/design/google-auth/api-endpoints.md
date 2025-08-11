# Google認証システム API エンドポイント仕様

## API設計原則

- **RESTful設計**: HTTPメソッドとステータスコードの適切な使用
- **一貫性**: 全エンドポイントで統一されたレスポンス形式
- **セキュリティ**: JWT Bearer認証による保護
- **エラーハンドリング**: 明確なエラーレスポンスとコード体系
- **バージョニング**: `/api/v1`でのAPIバージョン管理

## 共通レスポンス形式

### 成功レスポンス
```json
{
  "success": true,
  "data": { /* レスポンスデータ */ },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_12345"
  }
}
```

### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "認証トークンの有効期限が切れています",
    "details": {
      "expiredAt": "2024-01-01T00:00:00Z"
    }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_12345"
  }
}
```

## 認証ヘッダー

認証が必要なエンドポイントでは、以下のヘッダーを含める必要があります：

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 認証関連エンドポイント

### GET /api/v1/auth/me
現在ログイン中のユーザー情報を取得

**認証**: 必須  
**レート制限**: 100回/分

**リクエスト例:**
```http
GET /api/v1/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**レスポンス例（成功）:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "authProviderUserId": "google_123456789",
      "email": "user@example.com",
      "name": "山田太郎",
      "avatarUrl": "https://lh3.googleusercontent.com/a/...",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_auth_me_001"
  }
}
```

**エラーレスポンス:**
- `401 Unauthorized`: 無効なトークンまたは期限切れ
- `403 Forbidden`: トークンは有効だが権限なし
- `500 Internal Server Error`: サーバーエラー

---

### POST /api/v1/auth/refresh
認証トークンのリフレッシュ

**認証**: リフレッシュトークン必須  
**レート制限**: 10回/分

**リクエスト例:**
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

**レスポンス例（成功）:**
```json
{
  "success": true,
  "data": {
    "session": {
      "accessToken": "new_jwt_token_here",
      "refreshToken": "new_refresh_token_here",
      "expiresAt": 1704067200,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_refresh_001"
  }
}
```

---

### POST /api/v1/auth/logout
現在のセッションからログアウト

**認証**: 必須  
**レート制限**: 20回/分

**リクエスト例:**
```http
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**レスポンス例（成功）:**
```json
{
  "success": true,
  "data": {
    "message": "ログアウトが完了しました"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_logout_001"
  }
}
```

---

## ユーザー管理エンドポイント

### GET /api/v1/users/profile
ユーザープロフィール情報の詳細取得

**認証**: 必須  
**レート制限**: 100回/分

**リクエスト例:**
```http
GET /api/v1/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**レスポンス例（成功）:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "authProviderUserId": "google_123456789",
      "email": "user@example.com",
      "name": "山田太郎",
      "avatarUrl": "https://lh3.googleusercontent.com/a/...",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    "preferences": {
      "theme": "light",
      "language": "ja",
      "emailNotifications": true,
      "pushNotifications": true,
      "profileVisibility": "public"
    },
    "statistics": {
      "loginCount": 42,
      "lastLoginAt": "2024-01-01T00:00:00Z",
      "accountAge": 365
    }
  }
}
```

---

### PUT /api/v1/users/profile
ユーザープロフィール情報の更新

**認証**: 必須  
**レート制限**: 20回/分

**リクエスト例:**
```http
PUT /api/v1/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "山田次郎",
  "avatarUrl": "https://example.com/new-avatar.jpg"
}
```

**バリデーションルール:**
- `name`: 必須、1-255文字、空文字不可
- `avatarUrl`: オプション、有効なURL形式

**レスポンス例（成功）:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "authProviderUserId": "google_123456789",
      "email": "user@example.com",
      "name": "山田次郎",
      "avatarUrl": "https://example.com/new-avatar.jpg",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

**エラーレスポンス:**
- `400 Bad Request`: バリデーションエラー
- `401 Unauthorized`: 認証エラー
- `422 Unprocessable Entity`: データ形式エラー

---

### GET /api/v1/users/preferences
ユーザー設定の取得

**認証**: 必須  
**レート制限**: 50回/分

**リクエスト例:**
```http
GET /api/v1/users/preferences
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**レスポンス例（成功）:**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "theme": "dark",
      "language": "ja",
      "emailNotifications": true,
      "pushNotifications": false,
      "profileVisibility": "private",
      "customSettings": {
        "dashboardLayout": "compact",
        "autoSave": true
      }
    }
  }
}
```

---

### PUT /api/v1/users/preferences
ユーザー設定の更新

**認証**: 必須  
**レート制限**: 10回/分

**リクエスト例:**
```http
PUT /api/v1/users/preferences
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "theme": "dark",
  "emailNotifications": false,
  "customSettings": {
    "dashboardLayout": "comfortable",
    "autoSave": true,
    "newFeature": "enabled"
  }
}
```

**バリデーションルール:**
- `theme`: オプション、"light" | "dark" | "auto"
- `language`: オプション、"ja" | "en"
- `emailNotifications`: オプション、boolean
- `pushNotifications`: オプション、boolean
- `profileVisibility`: オプション、"public" | "private" | "friends"
- `customSettings`: オプション、JSONオブジェクト

---

## システム情報エンドポイント

### GET /api/v1/system/health
システムヘルスチェック

**認証**: 不要  
**レート制限**: 1000回/分

**リクエスト例:**
```http
GET /api/v1/system/health
```

**レスポンス例（成功）:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": "healthy",
      "supabase": "healthy",
      "cache": "healthy"
    }
  }
}
```

---

### GET /api/v1/system/auth/config
認証設定情報の取得（クライアント用）

**認証**: 不要  
**レート制限**: 100回/分

**リクエスト例:**
```http
GET /api/v1/system/auth/config
```

**レスポンス例（成功）:**
```json
{
  "success": true,
  "data": {
    "providers": ["google"],
    "sessionDuration": 86400,
    "refreshThreshold": 3600,
    "features": {
      "multiDevice": true,
      "sessionManagement": false,
      "profileEditing": true
    }
  }
}
```

---

## エラーコード一覧

### 認証エラー (AUTH_*)
- `AUTH_TOKEN_MISSING`: 認証トークンが指定されていません
- `AUTH_TOKEN_INVALID`: 無効な認証トークンです
- `AUTH_TOKEN_EXPIRED`: 認証トークンの有効期限が切れています
- `AUTH_PERMISSION_DENIED`: 操作する権限がありません
- `AUTH_SESSION_EXPIRED`: セッションの有効期限が切れています
- `AUTH_REFRESH_FAILED`: トークンのリフレッシュに失敗しました

### バリデーションエラー (VALIDATION_*)
- `VALIDATION_REQUIRED_FIELD`: 必須フィールドが入力されていません
- `VALIDATION_INVALID_FORMAT`: 入力形式が正しくありません
- `VALIDATION_LENGTH_EXCEEDED`: 文字数制限を超えています
- `VALIDATION_INVALID_EMAIL`: 無効なメールアドレス形式です
- `VALIDATION_INVALID_URL`: 無効なURL形式です

### ビジネスロジックエラー (BUSINESS_*)
- `BUSINESS_USER_NOT_FOUND`: ユーザーが見つかりません
- `BUSINESS_USER_ALREADY_EXISTS`: ユーザーは既に存在しています
- `BUSINESS_ACCOUNT_DEACTIVATED`: アカウントが無効化されています
- `BUSINESS_OPERATION_NOT_ALLOWED`: この操作は許可されていません

### システムエラー (SYSTEM_*)
- `SYSTEM_DATABASE_ERROR`: データベースエラーが発生しました
- `SYSTEM_EXTERNAL_SERVICE_ERROR`: 外部サービスとの通信でエラーが発生しました
- `SYSTEM_INTERNAL_ERROR`: 内部エラーが発生しました
- `SYSTEM_RATE_LIMIT_EXCEEDED`: レート制限に達しました

---

## レート制限

### 制限値
- **認証系API**: 10-20回/分（セキュリティ重視）
- **データ取得系API**: 100回/分（通常使用）
- **データ更新系API**: 10-20回/分（データ整合性重視）
- **システム情報API**: 100-1000回/分（高頻度アクセス対応）

### レート制限ヘッダー
レスポンスに以下のヘッダーが含まれます：

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

### 制限超過時のレスポンス
```json
{
  "success": false,
  "error": {
    "code": "SYSTEM_RATE_LIMIT_EXCEEDED",
    "message": "レート制限に達しました。しばらくしてから再度お試しください。",
    "details": {
      "limit": 100,
      "resetAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

---

## セキュリティ考慮事項

### CORS設定
```javascript
// 許可されたオリジン
const allowedOrigins = [
  'http://localhost:3000',  // 開発環境
  'https://yourdomain.com'  // 本番環境
];
```

### CSRFトークン
状態を変更するエンドポイント（POST, PUT, DELETE）では、CSRFトークンが必要：

```http
X-CSRF-Token: csrf_token_here
```

### HTTPS必須
すべてのAPI通信はHTTPS経由で実行される必要があります。HTTP接続は自動的にHTTPSにリダイレクトされます。

### IPホワイトリスト（オプション）
高セキュリティ要件がある場合、特定IPアドレスからのアクセスのみ許可：

```http
X-Forwarded-For: 192.168.1.100
```

---

## 実装ガイドライン

### DDD + Clean Architectureでの実装例

#### 認証ミドルウェア（Presentation層）
```typescript
import { createMiddleware } from 'hono/factory';
import { jwt } from 'hono/jwt';
import { AuthenticateUserUseCase } from '../../application/usecases/AuthenticateUserUseCase';
import { SupabaseAuthProvider } from '../../infrastructure/auth/SupabaseAuthProvider';
import { PostgresUserRepository } from '../../infrastructure/database/PostgresUserRepository';
import { InMemoryEventBus } from '../../infrastructure/events/InMemoryEventBus';

export const authMiddleware = createMiddleware(async (c, next) => {
  try {
    // 1. JWTトークン検証（基本的なフォーマットチェック）
    const jwtMiddleware = jwt({
      secret: c.env.SUPABASE_JWT_SECRET,
      alg: 'HS256',
    });
    
    await jwtMiddleware(c, async () => {});
    
    // 2. ドメイン層での認証処理（依存性注入）
    const authProvider = new SupabaseAuthProvider(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const userRepository = new PostgresUserRepository();
    const eventBus = new InMemoryEventBus();
    
    const authenticateUserUseCase = new AuthenticateUserUseCase(
      userRepository,
      authProvider,
      eventBus
    );
    
    // 3. ユースケース実行（JIT Provisioning含む）
    const token = c.get('jwtPayload');
    const result = await authenticateUserUseCase.execute(token);
    
    if (!result.success) {
      throw new HTTPException(401, { message: 'Authentication failed' });
    }
    
    // 4. 認証済みユーザーをコンテキストに設定
    c.set('authenticatedUser', result.data);
    
    await next();
  } catch (error) {
    if (error instanceof AuthDomainError) {
      const appError = AuthErrorHandler.mapToApplicationError(error);
      throw new HTTPException(appError.statusCode, { message: appError.message });
    }
    throw error;
  }
});
```

#### ユースケース実装（Application層）
```typescript
// application/usecases/AuthenticateUserUseCase.ts
export class AuthenticateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private authProvider: IAuthProvider,
    private eventBus: IDomainEventBus
  ) {}
  
  async execute(jwtPayload: any): Promise<AuthenticateUserResult> {
    try {
      // 1. 認証プロバイダーでトークン検証
      const authenticatedUser = await this.authProvider.validateToken(jwtPayload);
      
      // 2. ユーザー集約取得または作成（JIT Provisioning）
      let userAggregate = await this.userRepository.findByAuthProviderId(
        authenticatedUser.authProviderUserId
      );
      
      if (!userAggregate) {
        userAggregate = await this.createNewUserAggregate(authenticatedUser);
      }
      
      // 3. セッション認証（ビジネスルール適用）
      userAggregate.authenticateWithSession(authenticatedUser.session);
      
      // 4. 集約永続化
      await this.userRepository.save(userAggregate);
      
      // 5. ドメインイベント発行
      const events = userAggregate.getAndClearDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      
      return AuthenticateUserResult.success(userAggregate.user);
      
    } catch (error) {
      if (error instanceof AuthDomainError) {
        return AuthenticateUserResult.failure(error);
      }
      throw error;
    }
  }
  
  private async createNewUserAggregate(
    authenticatedUser: AuthenticatedUser
  ): Promise<UserAggregate> {
    const user: User = {
      id: generateId(),
      authProviderUserId: authenticatedUser.authProviderUserId,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      avatarUrl: authenticatedUser.avatarUrl,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const userAggregate = new UserAggregateImpl(user);
    
    // ユーザー作成イベント発行
    userAggregate.addDomainEvent(
      new UserCreatedEvent(user.id, user, 'google')
    );
    
    return userAggregate;
  }
}
```

#### ドメインエラーハンドリング（Application層）
```typescript
// application/services/AuthErrorHandler.ts
export class AuthErrorHandler {
  static mapToApplicationError(domainError: AuthDomainError): ApplicationError {
    const errorMappings: Record<string, ApplicationError> = {
      'AUTH_INVALID_TOKEN': new ApplicationError(
        'AUTHENTICATION_FAILED',
        '認証に失敗しました。再度ログインしてください。',
        401
      ),
      'AUTH_SESSION_EXPIRED': new ApplicationError(
        'SESSION_EXPIRED',
        'セッションの有効期限が切れています。',
        401
      ),
      'AUTH_MAX_SESSIONS_EXCEEDED': new ApplicationError(
        'TOO_MANY_SESSIONS',
        '同時ログイン数の上限に達しています。既存のセッションを終了してください。',
        429
      ),
      'USER_NOT_FOUND': new ApplicationError(
        'USER_NOT_FOUND',
        'ユーザーが見つかりません。',
        404
      ),
      'ACCOUNT_DEACTIVATED': new ApplicationError(
        'ACCOUNT_DEACTIVATED',
        'アカウントが無効化されています。管理者にお問い合わせください。',
        403
      )
    };
    
    return errorMappings[domainError.errorCode] || new ApplicationError(
      'AUTHENTICATION_ERROR',
      '認証処理でエラーが発生しました。',
      500
    );
  }
}

export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
```

#### イベントハンドラー（Application層）
```typescript
// application/events/AuthEventHandler.ts
export class AuthEventHandler {
  constructor(
    private auditLogService: AuditLogService,
    private notificationService: NotificationService
  ) {}
  
  async handleUserLoggedIn(event: UserLoggedInEvent): Promise<void> {
    // 監査ログ記録
    await this.auditLogService.logAuthEvent({
      eventType: 'LOGIN',
      userId: event.user.id,
      authProvider: event.loginMethod,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: event.occurredOn
    });
    
    // 通知処理（必要に応じて）
    if (this.isNewDeviceLogin(event)) {
      await this.notificationService.sendSecurityNotification(
        event.user.email,
        'new_device_login',
        { deviceInfo: event.session.id }
      );
    }
  }
  
  async handleUserLoggedOut(event: UserLoggedOutEvent): Promise<void> {
    // ログアウト監査ログ
    await this.auditLogService.logAuthEvent({
      eventType: 'LOGOUT',
      userId: event.userId,
      sessionId: event.sessionId,
      logoutReason: event.logoutReason,
      timestamp: event.occurredOn
    });
  }
  
  private isNewDeviceLogin(event: UserLoggedInEvent): boolean {
    // 新しいデバイスからのログインかチェック
    // 実装は要件に応じて
    return false;
  }
}
```

#### Infrastructure層の実装例
```typescript
// infrastructure/auth/SupabaseAuthProvider.ts
export class SupabaseAuthProvider implements IAuthProvider {
  private supabase: SupabaseClient;
  
  constructor(url: string, serviceRoleKey: string) {
    this.supabase = createClient(url, serviceRoleKey);
  }
  
  async validateToken(token: string): Promise<AuthenticatedUser> {
    try {
      const { data, error } = await this.supabase.auth.getUser(token);
      
      if (error || !data.user) {
        throw new InvalidTokenError('access', error);
      }
      
      return this.mapToAuthenticatedUser(data.user);
    } catch (error) {
      throw new InvalidTokenError('access', error);
    }
  }
  
  async refreshSession(refreshToken: string): Promise<AuthSession> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken
      });
      
      if (error || !data.session) {
        throw new SessionExpiredError('refresh_token');
      }
      
      return this.mapToAuthSession(data.session);
    } catch (error) {
      throw new SessionExpiredError('refresh_token');
    }
  }
  
  private mapToAuthenticatedUser(user: any): AuthenticatedUser {
    return {
      authProviderUserId: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      avatarUrl: user.user_metadata?.avatar_url,
      session: {
        id: generateSessionId(),
        accessToken: user.access_token,
        refreshToken: user.refresh_token,
        authProvider: 'google',
        expiresAt: user.expires_at * 1000,
        createdAt: new Date(),
        lastActivityAt: new Date()
      }
    };
  }
}
```

### フロントエンドでの使用例

#### APIクライアント
```typescript
class ApiClient {
  private baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
  private supabase = createClient();

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const session = await this.supabase.auth.getSession();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session?.access_token}`,
        ...options.headers,
      },
    });
    
    if (response.status === 401) {
      // トークンリフレッシュ処理
      await this.supabase.auth.refreshSession();
      // リクエスト再試行
    }
    
    return response.json();
  }
}
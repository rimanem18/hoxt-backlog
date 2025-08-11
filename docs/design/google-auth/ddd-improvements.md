# DDD・Clean Architecture改善提案

## 概要
専門家レビューに基づく、Google認証システムのDDD・Clean Architecture改善案

## 🔴 高優先度改善：アーキテクチャ根幹の修正

### 1. 認証プロバイダーの抽象化（依存性逆転）

#### 現在の問題
```typescript
// ❌ 直接Supabaseに依存
class UserSyncService {
  async findOrCreateUser(supabaseUser: SupabaseUser) {
    // Supabase固有の実装...
  }
}
```

#### 改善案
```typescript
// ✅ 抽象化による依存性逆転
// domain/auth/IAuthProvider.ts
export interface IAuthProvider {
  /**
   * JWTトークンを検証し、認証済みユーザー情報を取得
   */
  validateToken(token: string): Promise<AuthenticatedUser>;
  
  /**
   * リフレッシュトークンで新しいセッションを取得
   */
  refreshSession(refreshToken: string): Promise<AuthSession>;
  
  /**
   * セッションを無効化
   */
  invalidateSession(sessionId: string): Promise<void>;
}

// domain/auth/AuthDomainService.ts
export class AuthDomainService {
  constructor(private authProvider: IAuthProvider) {}
  
  async authenticateUser(token: string): Promise<User> {
    const authenticatedUser = await this.authProvider.validateToken(token);
    // ドメインロジックに集中
    return this.createDomainUser(authenticatedUser);
  }
}

// infrastructure/auth/SupabaseAuthProvider.ts
export class SupabaseAuthProvider implements IAuthProvider {
  async validateToken(token: string): Promise<AuthenticatedUser> {
    // Supabase固有の実装
    const { data } = await this.supabase.auth.getUser(token);
    return this.mapToAuthenticatedUser(data.user);
  }
}
```

### 2. ドメインイベントの導入

#### 改善案
```typescript
// domain/auth/AuthEvents.ts
export abstract class DomainEvent {
  abstract readonly eventName: string;
  readonly occurredOn: Date = new Date();
  readonly aggregateId: string;
  
  constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
  }
}

export class UserLoggedInEvent extends DomainEvent {
  readonly eventName = 'USER_LOGGED_IN';
  
  constructor(
    aggregateId: string,
    public readonly user: User,
    public readonly session: AuthSession,
    public readonly loginMethod: AuthProvider
  ) {
    super(aggregateId);
  }
}

export class UserLoggedOutEvent extends DomainEvent {
  readonly eventName = 'USER_LOGGED_OUT';
  
  constructor(
    aggregateId: string,
    public readonly userId: string,
    public readonly sessionId: string
  ) {
    super(aggregateId);
  }
}

export class SessionRefreshedEvent extends DomainEvent {
  readonly eventName = 'SESSION_REFRESHED';
  
  constructor(
    aggregateId: string,
    public readonly userId: string,
    public readonly newSession: AuthSession,
    public readonly oldSessionId: string
  ) {
    super(aggregateId);
  }
}

// domain/shared/DomainEventBus.ts
export interface IDomainEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventName: string, 
    handler: (event: T) => Promise<void>
  ): void;
}
```

## 🟡 中優先度改善：設計品質の向上

### 3. User集約の再設計

#### 改善案
```typescript
// domain/user/UserAggregate.ts
export class UserAggregate {
  private readonly _user: User;
  private readonly _sessions: Map<string, AuthSession> = new Map();
  private readonly _domainEvents: DomainEvent[] = [];
  
  constructor(user: User) {
    this._user = user;
  }
  
  /**
   * 新しいセッションで認証
   * ビジネスルール：同時セッション数制限
   */
  authenticateWithSession(session: AuthSession, maxSessions: number = 5): void {
    // 古いセッションのクリーンアップ
    this.cleanupExpiredSessions();
    
    // 同時セッション数制限チェック
    if (this._sessions.size >= maxSessions) {
      this.invalidateOldestSession();
    }
    
    // 新しいセッションを追加
    this._sessions.set(session.id, session);
    
    // ドメインイベント発行
    this._domainEvents.push(
      new UserLoggedInEvent(
        this._user.id,
        this._user,
        session,
        session.authProvider
      )
    );
  }
  
  /**
   * セッション無効化
   */
  invalidateSession(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    
    this._sessions.delete(sessionId);
    
    this._domainEvents.push(
      new UserLoggedOutEvent(this._user.id, this._user.id, sessionId)
    );
  }
  
  /**
   * ドメインイベント取得（発行後クリア）
   */
  getAndClearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents.length = 0;
    return events;
  }
  
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this._sessions) {
      if (session.expiresAt < now) {
        this._sessions.delete(sessionId);
      }
    }
  }
  
  private invalidateOldestSession(): void {
    const oldestSession = Array.from(this._sessions.values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    
    if (oldestSession) {
      this.invalidateSession(oldestSession.id);
    }
  }
  
  // ゲッター
  get user(): User { return this._user; }
  get activeSessions(): AuthSession[] { 
    return Array.from(this._sessions.values()); 
  }
  get sessionCount(): number { return this._sessions.size; }
}
```

### 4. エラーハンドリング戦略の改善

#### 改善案
```typescript
// domain/auth/AuthErrors.ts
export abstract class AuthDomainError extends Error {
  abstract readonly errorCode: string;
  readonly timestamp: Date = new Date();
  
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidTokenError extends AuthDomainError {
  readonly errorCode = 'AUTH_INVALID_TOKEN';
  
  constructor(tokenType: 'access' | 'refresh', cause?: Error) {
    super(`Invalid ${tokenType} token provided`, cause);
  }
}

export class SessionExpiredError extends AuthDomainError {
  readonly errorCode = 'AUTH_SESSION_EXPIRED';
  
  constructor(sessionId: string) {
    super(`Session ${sessionId} has expired`);
  }
}

export class SessionNotFoundError extends AuthDomainError {
  readonly errorCode = 'AUTH_SESSION_NOT_FOUND';
  
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`);
  }
}

export class MaxSessionsExceededError extends AuthDomainError {
  readonly errorCode = 'AUTH_MAX_SESSIONS_EXCEEDED';
  
  constructor(maxSessions: number) {
    super(`Maximum number of sessions (${maxSessions}) exceeded`);
  }
}

// application/auth/AuthErrorHandler.ts
export class AuthErrorHandler {
  static mapToApplicationError(domainError: AuthDomainError): ApplicationError {
    switch (domainError.errorCode) {
      case 'AUTH_INVALID_TOKEN':
        return new ApplicationError(
          'AUTHENTICATION_FAILED',
          '認証に失敗しました',
          401
        );
      case 'AUTH_SESSION_EXPIRED':
        return new ApplicationError(
          'SESSION_EXPIRED',
          'セッションの有効期限が切れています',
          401
        );
      case 'AUTH_MAX_SESSIONS_EXCEEDED':
        return new ApplicationError(
          'TOO_MANY_SESSIONS',
          '同時ログイン数の上限に達しています',
          429
        );
      default:
        return new ApplicationError(
          'AUTHENTICATION_ERROR',
          '認証処理でエラーが発生しました',
          500
        );
    }
  }
}
```

## 🟢 低優先度改善：コード品質向上

### 5. ユースケース層の強化

#### 改善案
```typescript
// application/auth/usecases/AuthenticateUserUseCase.ts
export class AuthenticateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private authProvider: IAuthProvider,
    private eventBus: IDomainEventBus
  ) {}
  
  async execute(token: string): Promise<AuthenticateUserResult> {
    try {
      // 1. トークン検証
      const authenticatedUser = await this.authProvider.validateToken(token);
      
      // 2. ユーザー集約取得または作成
      let userAggregate = await this.userRepository.findByAuthProviderId(
        authenticatedUser.authProviderUserId
      );
      
      if (!userAggregate) {
        userAggregate = await this.createNewUserAggregate(authenticatedUser);
      }
      
      // 3. セッション認証（ビジネスロジック）
      userAggregate.authenticateWithSession(authenticatedUser.session);
      
      // 4. 永続化
      await this.userRepository.save(userAggregate);
      
      // 5. ドメインイベント発行
      const events = userAggregate.getAndClearDomainEvents();
      for (const event of events) {
        await this.eventBus.publish(event);
      }
      
      return AuthenticateUserResult.success(userAggregate.user);
      
    } catch (error) {
      if (error instanceof AuthDomainError) {
        throw AuthErrorHandler.mapToApplicationError(error);
      }
      throw error;
    }
  }
  
  private async createNewUserAggregate(
    authenticatedUser: AuthenticatedUser
  ): Promise<UserAggregate> {
    const user = new User({
      id: generateId(),
      authProviderUserId: authenticatedUser.authProviderUserId,
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      avatarUrl: authenticatedUser.avatarUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return new UserAggregate(user);
  }
}
```

## 実装方針

### Phase 1: 高優先度改善（Week 1-2）
1. 認証プロバイダーインターフェース作成
2. ドメインイベントの基盤実装
3. 既存コードのリファクタリング

### Phase 2: 中優先度改善（Week 3-4）  
1. User集約の再設計
2. エラーハンドリング戦略の実装
3. テストコードの追加・修正

### Phase 3: 低優先度改善（Week 5）
1. ユースケース層の強化
2. コード品質向上
3. ドキュメント更新

これらの改善により、よりDDD・Clean Architectureの原則に忠実な設計となり、保守性・拡張性が大幅に向上します。
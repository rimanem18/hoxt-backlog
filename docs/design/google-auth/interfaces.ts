/**
 * Google認証システム TypeScript型定義
 * フロントエンドとバックエンドで共有される型定義
 */

// ========================
// Domain Layer - 基本エンティティ型定義
// ========================

/**
 * ユーザーエンティティ
 * アプリケーション内でのユーザー情報を表現
 * 集約ルート：UserAggregate の一部として管理される
 */
export interface User {
  /** アプリケーション内でのユーザーID（識別子） */
  readonly id: string;
  /** 認証プロバイダーから取得したユーザーID (Supabase Auth user.id) */
  readonly authProviderUserId: string;
  /** メールアドレス */
  email: string;
  /** ユーザー名 */
  name: string;
  /** プロフィール画像URL */
  avatarUrl?: string;
  /** アカウント有効状態 */
  isActive: boolean;
  /** アカウント作成日時 */
  readonly createdAt: Date;
  /** 最終更新日時 */
  updatedAt: Date;
}

/**
 * 認証セッション情報（値オブジェクト）
 * JWT形式で管理される認証状態
 * 不変性を保持し、ビジネスルールを含む
 */
export interface AuthSession {
  /** セッションID（一意識別子） */
  readonly id: string;
  /** JWT アクセストークン */
  readonly accessToken: string;
  /** リフレッシュトークン */
  readonly refreshToken: string;
  /** 認証プロバイダー */
  readonly authProvider: AuthProvider;
  /** トークン有効期限 */
  readonly expiresAt: number;
  /** セッション作成日時 */
  readonly createdAt: Date;
  /** 最終アクティビティ日時 */
  readonly lastActivityAt: Date;
}

/**
 * セッション作成用パラメータ
 */
export interface CreateAuthSessionParams {
  accessToken: string;
  refreshToken: string;
  authProvider: AuthProvider;
  expiresIn: number;
}

/**
 * 認証プロバイダー種別
 */
export type AuthProvider = 'google';

/**
 * 認証状態
 */
export type AuthState = 'authenticated' | 'unauthenticated' | 'loading';

// ========================
// JWT ペイロード型定義
// ========================

/**
 * Supabase JWT ペイロード
 * JWTトークンに含まれる標準的なクレーム
 */
export interface SupabaseJwtPayload {
  /** ユーザーID (Supabase Auth) */
  sub: string;
  /** メールアドレス */
  email: string;
  /** トークン発行者 */
  iss: string;
  /** トークン対象者 */
  aud: string;
  /** 発行日時 */
  iat: number;
  /** 有効期限 */
  exp: number;
  /** アプリメタデータ */
  app_metadata?: {
    provider: AuthProvider;
    providers: AuthProvider[];
  };
  /** ユーザーメタデータ */
  user_metadata?: {
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
}

// ========================
// API リクエスト/レスポンス型定義
// ========================

/**
 * 共通APIレスポンス形式
 */
export interface ApiResponse<T = unknown> {
  /** レスポンス成功フラグ */
  success: boolean;
  /** レスポンスデータ */
  data?: T;
  /** エラー情報 */
  error?: {
    /** エラーコード */
    code: string;
    /** エラーメッセージ */
    message: string;
    /** 詳細エラー情報 */
    details?: Record<string, unknown>;
  };
  /** メタ情報 */
  meta?: {
    /** タイムスタンプ */
    timestamp: string;
    /** リクエストID */
    requestId?: string;
  };
}

/**
 * ユーザープロファイル取得レスポンス
 */
export interface GetUserProfileResponse {
  user: User;
}

/**
 * ユーザープロファイル更新リクエスト
 */
export interface UpdateUserProfileRequest {
  /** 更新するユーザー名 */
  name?: string;
  /** 更新するプロフィール画像URL */
  avatarUrl?: string;
}

/**
 * ユーザープロファイル更新レスポンス
 */
export interface UpdateUserProfileResponse {
  user: User;
}

// ========================
// 認証フロー関連型定義
// ========================

/**
 * ログイン状態
 */
export interface LoginState {
  /** 認証状態 */
  state: AuthState;
  /** 現在のユーザー情報 */
  user?: User;
  /** セッション情報 */
  session?: AuthSession;
  /** ローディング状態 */
  loading: boolean;
  /** エラー情報 */
  error?: string;
}

/**
 * Google OAuth 認証設定
 */
export interface GoogleOAuthConfig {
  /** リダイレクトURL */
  redirectTo?: string;
  /** スコープ */
  scopes?: string;
  /** 追加パラメータ */
  queryParams?: Record<string, string>;
}

/**
 * 認証エラー種別
 */
export type AuthErrorType = 
  | 'invalid_token'           // 不正なトークン
  | 'token_expired'           // トークン期限切れ
  | 'refresh_failed'          // リフレッシュ失敗
  | 'network_error'           // ネットワークエラー
  | 'oauth_cancelled'         // OAuth認証キャンセル
  | 'oauth_error'             // OAuth認証エラー
  | 'permission_denied'       // 権限なし
  | 'unknown_error';          // 不明なエラー

/**
 * 認証エラー情報
 */
export interface AuthError {
  /** エラー種別 */
  type: AuthErrorType;
  /** エラーメッセージ */
  message: string;
  /** 原因となった元エラー */
  originalError?: Error;
  /** エラー発生時刻 */
  timestamp: Date;
}

// ========================
// Domain Layer - 依存性逆転（抽象化インターフェース）
// ========================

/**
 * 認証プロバイダー抽象インターフェース（依存性逆転の原則）
 * ドメイン層がインフラ層（Supabase）に依存しないための抽象化
 */
export interface IAuthProvider {
  /**
   * JWTトークンを検証し、認証済みユーザー情報を取得
   * @param token - 検証するJWTトークン
   * @returns 認証済みユーザー情報
   * @throws InvalidTokenError - 無効なトークンの場合
   */
  validateToken(token: string): Promise<AuthenticatedUser>;
  
  /**
   * リフレッシュトークンで新しいセッションを取得
   * @param refreshToken - リフレッシュトークン
   * @returns 新しい認証セッション
   * @throws SessionExpiredError - リフレッシュトークンが期限切れの場合
   */
  refreshSession(refreshToken: string): Promise<AuthSession>;
  
  /**
   * セッションを無効化
   * @param sessionId - 無効化するセッションID
   * @throws SessionNotFoundError - セッションが見つからない場合
   */
  invalidateSession(sessionId: string): Promise<void>;
  
  /**
   * OAuth認証URLを生成
   * @param provider - 認証プロバイダー
   * @param redirectUrl - リダイレクトURL
   * @returns 認証URL
   */
  generateOAuthUrl(provider: AuthProvider, redirectUrl: string): Promise<string>;
  
  /**
   * OAuth認証コードをセッションに交換
   * @param code - 認証コード
   * @returns 認証セッション
   */
  exchangeCodeForSession(code: string): Promise<AuthSession>;
}

/**
 * ユーザーリポジトリ抽象インターフェース
 * データ永続化の抽象化
 */
export interface IUserRepository {
  /**
   * 認証プロバイダーIDでユーザー集約を検索
   * @param authProviderUserId - 認証プロバイダーユーザーID
   * @returns ユーザー集約またはnull
   */
  findByAuthProviderId(authProviderUserId: string): Promise<UserAggregate | null>;
  
  /**
   * ユーザーIDでユーザー集約を検索
   * @param userId - ユーザーID
   * @returns ユーザー集約またはnull
   */
  findById(userId: string): Promise<UserAggregate | null>;
  
  /**
   * ユーザー集約を保存
   * @param userAggregate - 保存するユーザー集約
   * @returns 保存されたユーザー集約
   */
  save(userAggregate: UserAggregate): Promise<UserAggregate>;
  
  /**
   * ユーザーを論理削除
   * @param userId - 削除するユーザーID
   */
  delete(userId: string): Promise<void>;
}

/**
 * ドメインイベントバス抽象インターフェース
 * イベント駆動アーキテクチャの抽象化
 */
export interface IDomainEventBus {
  /**
   * ドメインイベントを発行
   * @param event - 発行するドメインイベント
   */
  publish(event: DomainEvent): Promise<void>;
  
  /**
   * ドメインイベントの購読
   * @param eventName - イベント名
   * @param handler - イベントハンドラー
   */
  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: (event: T) => Promise<void>
  ): void;
  
  /**
   * 購読解除
   * @param eventName - イベント名
   * @param handler - 解除するハンドラー
   */
  unsubscribe<T extends DomainEvent>(
    eventName: string,
    handler: (event: T) => Promise<void>
  ): void;
}

// ========================
// Domain Layer - ドメインイベント
// ========================

/**
 * ドメインイベント基底クラス
 */
export abstract class DomainEvent {
  /** イベント名（具象クラスで定義） */
  abstract readonly eventName: string;
  /** イベント発生日時 */
  readonly occurredOn: Date = new Date();
  /** 集約ID */
  readonly aggregateId: string;
  /** イベントID（一意識別子） */
  readonly eventId: string;
  
  constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
    this.eventId = `${this.constructor.name}_${Date.now()}_${Math.random()}`;
  }
}

/**
 * ユーザーログインイベント
 */
export class UserLoggedInEvent extends DomainEvent {
  readonly eventName = 'USER_LOGGED_IN';
  
  constructor(
    aggregateId: string,
    public readonly user: User,
    public readonly session: AuthSession,
    public readonly loginMethod: AuthProvider,
    public readonly ipAddress?: string,
    public readonly userAgent?: string
  ) {
    super(aggregateId);
  }
}

/**
 * ユーザーログアウトイベント
 */
export class UserLoggedOutEvent extends DomainEvent {
  readonly eventName = 'USER_LOGGED_OUT';
  
  constructor(
    aggregateId: string,
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly logoutReason: 'MANUAL' | 'SESSION_EXPIRED' | 'FORCE_LOGOUT' = 'MANUAL'
  ) {
    super(aggregateId);
  }
}

/**
 * セッションリフレッシュイベント
 */
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

/**
 * ユーザー作成イベント（JIT Provisioning）
 */
export class UserCreatedEvent extends DomainEvent {
  readonly eventName = 'USER_CREATED';
  
  constructor(
    aggregateId: string,
    public readonly user: User,
    public readonly authProvider: AuthProvider
  ) {
    super(aggregateId);
  }
}

// ========================
// Domain Layer - 集約ルート
// ========================

/**
 * ユーザー集約ルート
 * セッション管理とユーザー状態の整合性を保証
 */
export interface UserAggregate {
  /** ユーザーエンティティ（読み取り専用） */
  readonly user: User;
  /** アクティブなセッション一覧 */
  readonly activeSessions: ReadonlyArray<AuthSession>;
  /** 現在のセッション数 */
  readonly sessionCount: number;
  /** ドメインイベント一覧 */
  readonly domainEvents: ReadonlyArray<DomainEvent>;
  
  /**
   * 新しいセッションで認証
   * ビジネスルール：同時セッション数制限を適用
   * @param session - 新しい認証セッション
   * @param maxSessions - 最大セッション数（デフォルト：5）
   * @throws MaxSessionsExceededError - 最大セッション数超過の場合
   */
  authenticateWithSession(session: AuthSession, maxSessions?: number): void;
  
  /**
   * セッションを無効化
   * @param sessionId - 無効化するセッションID
   * @throws SessionNotFoundError - セッションが見つからない場合
   */
  invalidateSession(sessionId: string): void;
  
  /**
   * 期限切れセッションのクリーンアップ
   * @returns クリーンアップしたセッション数
   */
  cleanupExpiredSessions(): number;
  
  /**
   * ユーザープロフィール更新
   * @param updateData - 更新データ
   */
  updateProfile(updateData: Partial<Pick<User, 'name' | 'avatarUrl'>>): void;
  
  /**
   * アカウント無効化
   */
  deactivateAccount(): void;
  
  /**
   * ドメインイベント取得（発行後クリア）
   * @returns ドメインイベント配列
   */
  getAndClearDomainEvents(): DomainEvent[];
}

// ========================
// Domain Layer - ドメインエラー
// ========================

/**
 * 認証ドメインエラー基底クラス
 */
export abstract class AuthDomainError extends Error {
  abstract readonly errorCode: string;
  readonly timestamp: Date = new Date();
  
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * 無効なトークンエラー
 */
export class InvalidTokenError extends AuthDomainError {
  readonly errorCode = 'AUTH_INVALID_TOKEN';
  
  constructor(tokenType: 'access' | 'refresh', cause?: Error) {
    super(`Invalid ${tokenType} token provided`, cause);
  }
}

/**
 * セッション期限切れエラー
 */
export class SessionExpiredError extends AuthDomainError {
  readonly errorCode = 'AUTH_SESSION_EXPIRED';
  
  constructor(sessionId: string) {
    super(`Session ${sessionId} has expired`);
  }
}

/**
 * セッション未発見エラー
 */
export class SessionNotFoundError extends AuthDomainError {
  readonly errorCode = 'AUTH_SESSION_NOT_FOUND';
  
  constructor(sessionId: string) {
    super(`Session ${sessionId} not found`);
  }
}

/**
 * 最大セッション数超過エラー
 */
export class MaxSessionsExceededError extends AuthDomainError {
  readonly errorCode = 'AUTH_MAX_SESSIONS_EXCEEDED';
  
  constructor(maxSessions: number) {
    super(`Maximum number of sessions (${maxSessions}) exceeded`);
  }
}

/**
 * ユーザー未発見エラー
 */
export class UserNotFoundError extends AuthDomainError {
  readonly errorCode = 'USER_NOT_FOUND';
  
  constructor(identifier: string, identifierType: 'id' | 'authProviderId' | 'email') {
    super(`User not found with ${identifierType}: ${identifier}`);
  }
}

/**
 * アカウント無効化エラー
 */
export class AccountDeactivatedError extends AuthDomainError {
  readonly errorCode = 'ACCOUNT_DEACTIVATED';
  
  constructor(userId: string) {
    super(`Account ${userId} is deactivated`);
  }
}

// ========================
// Application Layer - ユースケース結果
// ========================

/**
 * ユースケース実行結果基底クラス
 */
export abstract class UseCaseResult<T = void> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: Error
  ) {}
  
  static success<T>(data?: T): UseCaseResult<T> {
    return new (class extends UseCaseResult<T> {})(true, data);
  }
  
  static failure<T>(error: Error): UseCaseResult<T> {
    return new (class extends UseCaseResult<T> {})(false, undefined, error);
  }
}

/**
 * 認証ユースケース結果
 */
export class AuthenticateUserResult extends UseCaseResult<User> {}

/**
 * セッションリフレッシュ結果
 */
export class RefreshSessionResult extends UseCaseResult<AuthSession> {}

// ========================
// Presentation Layer - ミドルウェア・コンテキスト型定義
// ========================

/**
 * 認証済みユーザーコンテキスト
 * Honoのコンテキストに設定されるユーザー情報
 */
export interface AuthenticatedUser {
  /** アプリケーションユーザーID */
  id: string;
  /** 認証プロバイダーユーザーID */
  authProviderUserId: string;
  /** メールアドレス */
  email: string;
  /** ユーザー名 */
  name: string;
  /** JWT ペイロード（元データ） */
  jwtPayload: SupabaseJwtPayload;
}

/**
 * 認証ミドルウェアオプション
 */
export interface AuthMiddlewareOptions {
  /** 必須認証フラグ */
  required: boolean;
  /** 許可するロール */
  allowedRoles?: string[];
  /** スキップするパス */
  skipPaths?: string[];
}

// ========================
// Redux状態管理型定義
// ========================

/**
 * 認証Redux状態
 */
export interface AuthReduxState {
  /** 認証状態 */
  state: AuthState;
  /** ユーザー情報 */
  user: User | null;
  /** セッション情報 */
  session: AuthSession | null;
  /** 初期化完了フラグ */
  initialized: boolean;
  /** ローディング状態 */
  loading: boolean;
  /** エラー情報 */
  error: AuthError | null;
}

/**
 * 認証Reduxアクション
 */
export type AuthAction =
  | { type: 'AUTH_INIT_START' }
  | { type: 'AUTH_INIT_SUCCESS'; payload: { user: User; session: AuthSession } }
  | { type: 'AUTH_INIT_FAILURE'; payload: { error: AuthError } }
  | { type: 'AUTH_LOGIN_START' }
  | { type: 'AUTH_LOGIN_SUCCESS'; payload: { user: User; session: AuthSession } }
  | { type: 'AUTH_LOGIN_FAILURE'; payload: { error: AuthError } }
  | { type: 'AUTH_LOGOUT_START' }
  | { type: 'AUTH_LOGOUT_SUCCESS' }
  | { type: 'AUTH_LOGOUT_FAILURE'; payload: { error: AuthError } }
  | { type: 'AUTH_TOKEN_REFRESH_START' }
  | { type: 'AUTH_TOKEN_REFRESH_SUCCESS'; payload: { session: AuthSession } }
  | { type: 'AUTH_TOKEN_REFRESH_FAILURE'; payload: { error: AuthError } }
  | { type: 'AUTH_CLEAR_ERROR' };

// ========================
// バリデーション・ユーティリティ型定義
// ========================

/**
 * 型ガード：ユーザーが認証済みかチェック
 */
export const isAuthenticated = (user: User | null): user is User => {
  return user !== null && user.id.length > 0;
};

/**
 * 型ガード：セッションが有効かチェック
 */
export const isValidSession = (session: AuthSession | null): session is AuthSession => {
  return session !== null && session.expiresAt > Date.now();
};

/**
 * 型ガード：認証エラーかチェック
 */
export const isAuthError = (error: unknown): error is AuthError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    'timestamp' in error
  );
};

// ========================
// 設定・環境変数型定義
// ========================

/**
 * Supabase設定
 */
export interface SupabaseConfig {
  /** Supabase プロジェクトURL */
  url: string;
  /** 匿名キー */
  anonKey: string;
  /** JWTシークレット (バックエンドのみ) */
  jwtSecret?: string;
}

/**
 * アプリケーション設定
 */
export interface AppConfig {
  /** Supabase設定 */
  supabase: SupabaseConfig;
  /** APIベースURL */
  apiBaseUrl: string;
  /** 認証設定 */
  auth: {
    /** セッション有効期限 (秒) */
    sessionDuration: number;
    /** 自動リフレッシュ閾値 (秒) */
    refreshThreshold: number;
    /** リトライ回数 */
    maxRetries: number;
  };
}

// ========================
// 型の合成・拡張
// ========================

/**
 * 認証が必要なAPIエンドポイントの共通レスポンス型
 */
export type AuthenticatedApiResponse<T = unknown> = ApiResponse<T> & {
  user: User;
};

/**
 * ページコンポーネントのprops（認証情報含む）
 */
export interface AuthPageProps {
  user: User | null;
  session: AuthSession | null;
  loading: boolean;
}

/**
 * 保護されたページコンポーネントのprops
 */
export interface ProtectedPageProps extends Omit<AuthPageProps, 'user'> {
  user: User; // 必須（認証済み）
}
/**
 * MVP Google認証システム TypeScript型定義
 * 
 * 作成日: 2025-08-12
 * 更新日: 2025-08-12
 * 
 * フロントエンド・バックエンド・共有スキーマで使用する型定義
 * DDD + クリーンアーキテクチャの層構造に対応
 */

// =============================================================================
// Domain Layer - エンティティ・値オブジェクト
// =============================================================================

/**
 * ユーザーエンティティ
 * ドメインの中核となるユーザー表現
 */
export interface User {
  /** ユーザー固有ID（UUID v4） */
  id: string;
  /** 外部プロバイダーでのユーザーID（Google Sub Claim等） */
  externalId: string;
  /** 認証プロバイダー種別 */
  provider: AuthProvider;
  /** メールアドレス（必須） */
  email: string;
  /** 表示名 */
  name: string;
  /** プロフィール画像URL（オプション） */
  avatarUrl?: string;
  /** アカウント作成日時 */
  createdAt: Date;
  /** 最終更新日時 */
  updatedAt: Date;
  /** 最終ログイン日時 */
  lastLoginAt?: Date;
}

/**
 * 認証プロバイダー種別
 * 将来的な拡張を考慮したenum
 */
export type AuthProvider = 
  | 'google'
  | 'apple'
  | 'microsoft'
  | 'github'
  | 'facebook'
  | 'line';

/**
 * ユーザー作成時の値オブジェクト
 * JITプロビジョニング時に使用
 */
export interface CreateUserInput {
  externalId: string;
  provider: AuthProvider;
  email: string;
  name: string;
  avatarUrl?: string;
}

/**
 * ユーザー更新時の値オブジェクト
 */
export interface UpdateUserInput {
  name?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
}

// =============================================================================
// Application Layer - Use Case入出力・DTOs
// =============================================================================

/**
 * 認証UseCase入力
 */
export interface AuthenticateUserUseCaseInput {
  /** JWTトークン */
  jwt: string;
}

/**
 * 認証UseCase出力
 */
export interface AuthenticateUserUseCaseOutput {
  /** 認証済みユーザー情報 */
  user: User;
  /** 新規作成ユーザーかどうか */
  isNewUser: boolean;
}

/**
 * ユーザープロファイル取得UseCase入力
 */
export interface GetUserProfileUseCaseInput {
  /** ユーザーID */
  userId: string;
}

/**
 * ユーザープロファイル取得UseCase出力
 */
export interface GetUserProfileUseCaseOutput {
  /** ユーザー情報 */
  user: User;
}

// =============================================================================
// Infrastructure Layer - 外部サービス連携
// =============================================================================

/**
 * JWT検証結果
 * Supabase AuthからのJWT検証レスポンス
 */
export interface JwtVerificationResult {
  /** 検証成功フラグ */
  valid: boolean;
  /** JWTペイロード */
  payload?: JwtPayload;
  /** エラー情報 */
  error?: string;
}

/**
 * JWTペイロード
 * Supabase Auth JWTに含まれる情報
 */
export interface JwtPayload {
  /** Subject（外部プロバイダーでのユーザーID） */
  sub: string;
  /** メールアドレス */
  email: string;
  /** プロバイダー種別 */
  app_metadata: {
    provider: string;
    providers: string[];
  };
  /** ユーザーメタデータ */
  user_metadata: {
    name: string;
    avatar_url?: string;
    email: string;
    full_name: string;
  };
  /** 発行者 */
  iss: string;
  /** 発行日時 */
  iat: number;
  /** 有効期限 */
  exp: number;
}

/**
 * 外部プロバイダーからのユーザー情報
 * Google OAuthやその他プロバイダーからの情報を正規化
 */
export interface ExternalUserInfo {
  id: string;
  provider: AuthProvider;
  email: string;
  name: string;
  avatarUrl?: string;
}

// =============================================================================
// Presentation Layer - HTTP API入出力
// =============================================================================

/**
 * API共通レスポンス形式
 */
export interface ApiResponse<T> {
  /** 成功フラグ */
  success: boolean;
  /** レスポンスデータ */
  data?: T;
  /** エラー情報 */
  error?: ApiError;
}

/**
 * APIエラー情報
 */
export interface ApiError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ（ユーザー向け） */
  message: string;
  /** 詳細エラー情報（開発者向け） */
  details?: string;
}

/**
 * 認証が必要なAPIリクエストヘッダー
 */
export interface AuthenticatedRequest {
  headers: {
    authorization: `Bearer ${string}`;
  };
}

// =============================================================================
// API エンドポイント固有の型定義
// =============================================================================

/**
 * GET /api/user/profile レスポンス
 */
export interface GetUserProfileResponse extends ApiResponse<User> {}

/**
 * POST /api/auth/verify リクエスト
 */
export interface VerifyTokenRequest {
  token: string;
}

/**
 * POST /api/auth/verify レスポンス
 */
export interface VerifyTokenResponse extends ApiResponse<{
  user: User;
  isNewUser: boolean;
}> {}

// =============================================================================
// フロントエンド状態管理用の型定義
// =============================================================================

/**
 * 認証状態
 */
export interface AuthState {
  /** ログイン状態 */
  isAuthenticated: boolean;
  /** ユーザー情報（ログイン時のみ） */
  user: User | null;
  /** 認証処理中フラグ */
  isLoading: boolean;
  /** エラー情報 */
  error: string | null;
}

/**
 * 認証アクション種別
 */
export type AuthAction = 
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; isNewUser: boolean } }
  | { type: 'AUTH_FAILURE'; payload: { error: string } }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_RESET_ERROR' };

// =============================================================================
// 設定・環境変数用の型定義
// =============================================================================

/**
 * フロントエンド環境変数
 */
export interface FrontendConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
}

/**
 * バックエンド環境変数
 */
export interface BackendConfig {
  supabaseJwtSecret: string;
  databaseUrl: string;
  dbTablePrefix: string;
  port: number;
  environment: 'development' | 'production' | 'test';
}

// =============================================================================
// エラー型定義
// =============================================================================

/**
 * ドメインエラー基底クラス
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * 認証エラー
 */
export class AuthenticationError extends DomainError {
  readonly code = 'AUTHENTICATION_ERROR';
}

/**
 * JWT検証エラー
 */
export class JwtValidationError extends DomainError {
  readonly code = 'JWT_VALIDATION_ERROR';
}

/**
 * ユーザー不存在エラー
 */
export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND';
}

/**
 * 不正なプロバイダーエラー
 */
export class InvalidProviderError extends DomainError {
  readonly code = 'INVALID_PROVIDER';
}

// =============================================================================
// Repository インターフェース（Domain層）
// =============================================================================

/**
 * ユーザーリポジトリインターフェース
 * Domain層でのデータ永続化抽象化
 */
export interface IUserRepository {
  /**
   * 外部IDでユーザーを検索
   */
  findByExternalId(externalId: string, provider: AuthProvider): Promise<User | null>;
  
  /**
   * ユーザーIDでユーザーを検索
   */
  findById(id: string): Promise<User | null>;
  
  /**
   * メールアドレスでユーザーを検索
   */
  findByEmail(email: string): Promise<User | null>;
  
  /**
   * 新規ユーザー作成
   */
  create(input: CreateUserInput): Promise<User>;
  
  /**
   * ユーザー情報更新
   */
  update(id: string, input: UpdateUserInput): Promise<User>;
  
  /**
   * ユーザー削除
   */
  delete(id: string): Promise<void>;
}

/**
 * 認証プロバイダーインターフェース
 * 外部認証サービスとの連携抽象化
 */
export interface IAuthProvider {
  /**
   * JWTトークン検証
   */
  verifyToken(token: string): Promise<JwtVerificationResult>;
  
  /**
   * 外部ユーザー情報取得
   */
  getExternalUserInfo(payload: JwtPayload): Promise<ExternalUserInfo>;
}

// =============================================================================
// Service インターフェース（Domain層）
// =============================================================================

/**
 * 認証ドメインサービスインターフェース
 */
export interface IAuthenticationDomainService {
  /**
   * JITプロビジョニング実行
   */
  createUserFromExternalInfo(externalInfo: ExternalUserInfo): Promise<User>;
  
  /**
   * ユーザー認証・取得
   */
  authenticateUser(externalInfo: ExternalUserInfo): Promise<{
    user: User;
    isNewUser: boolean;
  }>;
}

// =============================================================================
// Use Case インターフェース（Application層）
// =============================================================================

/**
 * ユーザー認証UseCase
 */
export interface IAuthenticateUserUseCase {
  execute(input: AuthenticateUserUseCaseInput): Promise<AuthenticateUserUseCaseOutput>;
}

/**
 * ユーザープロファイル取得UseCase
 */
export interface IGetUserProfileUseCase {
  execute(input: GetUserProfileUseCaseInput): Promise<GetUserProfileUseCaseOutput>;
}
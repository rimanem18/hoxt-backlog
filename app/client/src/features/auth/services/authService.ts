/**
 * 認証サービスの抽象化層。
 * Factory PatternとStrategy Patternで複数の認証プロバイダーを統一管理する。
 */

import { AuthProviderInterface, AuthResult, SessionInfo } from './providers/authProviderInterface';
import { GoogleAuthProvider } from './providers/googleAuthProvider';
import { User } from '@/packages/shared-schemas/src/auth';

/**
 * 認証サービス設定の型定義
 */
interface AuthServiceConfig {
  /** デフォルトプロバイダー名 */
  defaultProvider: string;
  /** 利用可能プロバイダーのリスト */
  availableProviders: string[];
  /** 認証後のリダイレクトURL */
  redirectTo?: string;
}

/**
 * プロバイダー切り替え結果の型定義
 */
interface ProviderSwitchResult {
  /** 切り替え成功フラグ */
  success: boolean;
  /** 切り替え前のプロバイダー名 */
  previousProvider: string;
  /** 切り替え後のプロバイダー名 */
  currentProvider: string;
  /** エラー情報 */
  error?: string;
}

/**
 * 認証プロバイダーの抽象化層。
 * Factory PatternとStrategy Patternで柔軟な認証システムを実現する。
 *
 * @example
 * ```typescript
 * const authService = new AuthService({ defaultProvider: 'google' });
 * const result = await authService.signIn();
 * ```
 */
export class AuthService {
  private providers: Map<string, AuthProviderInterface> = new Map();
  private currentProvider: AuthProviderInterface;
  private config: AuthServiceConfig;

  /**
   * AuthServiceを初期化する
   * @param config - 認証サービス設定またはプロバイダーインスタンス
   */
  constructor(config?: Partial<AuthServiceConfig> | AuthProviderInterface) {
    // テスト用にプロバイダーを直接渡せるように対応
    if (config && typeof config === 'object' && 'signIn' in config) {
      // プロバイダーインスタンスが渡された場合
      const provider = config as AuthProviderInterface;
      this.config = {
        defaultProvider: 'test',
        availableProviders: ['test'],
        redirectTo: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      };
      this.providers.set('test', provider);
      this.currentProvider = provider;
      return;
    }

    // 合理的なデフォルト値を設定
    this.config = {
      defaultProvider: 'google',
      availableProviders: ['google'],
      redirectTo: process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
      ...(config as Partial<AuthServiceConfig>)
    };

    // 利用可能なプロバイダーを登録
    this.initializeProviders();

    // 初期プロバイダーを設定
    const defaultProvider = this.providers.get(this.config.defaultProvider);
    if (!defaultProvider) {
      throw new Error(`Default provider '${this.config.defaultProvider}' not found`);
    }
    this.currentProvider = defaultProvider;
  }

  /**
   * 利用可能な認証プロバイダーを登録する
   * 新しいプロバイダーの追加が容易な設計。
   */
  private initializeProviders(): void {
    // Google OAuth実装を登録
    if (this.config.availableProviders.includes('google')) {
      this.providers.set('google', new GoogleAuthProvider());
    }

    // 将来のApple・Microsoft等の追加予定地点
    // if (this.config.availableProviders.includes('apple')) {
    //   this.providers.set('apple', new AppleAuthProvider());
    // }
    
    // if (this.config.availableProviders.includes('microsoft')) {
    //   this.providers.set('microsoft', new MicrosoftAuthProvider());
    // }
  }

  /**
   * 認証フローを開始する
   * @param provider - 使用するプロバイダー名（未指定時は現在のプロバイダー）
   * @param options - 認証オプション
   * @returns 認証結果
   */
  async signIn(provider?: string, options?: { redirectTo?: string }): Promise<AuthResult> {
    try {
      // 指定があれば一時的にプロバイダーを切り替え
      const targetProvider = provider ? 
        this.providers.get(provider) || this.currentProvider : 
        this.currentProvider;

      if (!targetProvider) {
        return {
          success: false,
          error: `Provider '${provider}' not found`,
          provider: provider || 'unknown'
        };
      }

      // プロバイダー非依存の認証を開始
      return await targetProvider.signIn({
        redirectTo: options?.redirectTo || this.config.redirectTo
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        provider: provider || this.currentProvider.getProviderName()
      };
    }
  }

  /**
   * ログアウトを実行する
   * @returns ログアウト結果
   */
  async signOut(): Promise<AuthResult> {
    try {
      return await this.currentProvider.signOut();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
        provider: this.currentProvider.getProviderName()
      };
    }
  }

  /**
   * ユーザー情報を取得する
   * @returns ユーザー情報
   */
  async getUser(): Promise<{ user: User | null }> {
    try {
      return await this.currentProvider.getUser();
    } catch (error) {
      console.error('Get user error:', error);
      return { user: null };
    }
  }

  /**
   * セッション情報を取得する
   * @returns セッション情報
   */
  async getSession(): Promise<SessionInfo | null> {
    try {
      return await this.currentProvider.getSession();
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * 現在のセッション情報を取得する（セッション復元用）
   * @returns 現在のセッション情報
   */
  async getCurrentSession(): Promise<SessionInfo | null> {
    return this.getSession();
  }

  /**
   * 認証プロバイダーを切り替える
   * @param providerName - 切り替え先プロバイダー名
   * @returns プロバイダー切り替え結果
   */
  switchProvider(providerName: string): ProviderSwitchResult {
    const previousProvider = this.currentProvider.getProviderName();
    const newProvider = this.providers.get(providerName);

    if (!newProvider) {
      return {
        success: false,
        previousProvider,
        currentProvider: previousProvider,
        error: `Provider '${providerName}' not found`
      };
    }

    this.currentProvider = newProvider;

    return {
      success: true,
      previousProvider,
      currentProvider: providerName
    };
  }

  /**
   * 利用可能な認証プロバイダーのリストを取得する
   * @returns 利用可能プロバイダー名のリスト
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 現在のプロバイダー名を取得する
   * @returns 現在のプロバイダー名
   */
  getCurrentProviderName(): string {
    return this.currentProvider.getProviderName();
  }

  /**
   * 新しい認証プロバイダーを登録する
   * プラグイン的なプロバイダー追加を支援する。
   * @param name - プロバイダー名
   * @param provider - プロバイダー実装インスタンス
   * @returns 登録成功フラグ
   */
  registerProvider(name: string, provider: AuthProviderInterface): boolean {
    try {
      this.providers.set(name, provider);
      
      // 利用可能プロバイダーリストに追加
      if (!this.config.availableProviders.includes(name)) {
        this.config.availableProviders.push(name);
      }

      return true;
    } catch (error) {
      console.error(`Failed to register provider '${name}':`, error);
      return false;
    }
  }

  /**
   * 現在の認証サービス設定を取得する
   * @returns 現在の設定情報（変更から保護されたコピー）
   */
  getConfig(): AuthServiceConfig {
    return { ...this.config };
  }

  /**
   * 認証サービス設定を更新する
   * @param newConfig - 新しい設定情報
   * @returns 設定更新成功フラグ
   */
  updateConfig(newConfig: Partial<AuthServiceConfig>): boolean {
    try {
      this.config = { ...this.config, ...newConfig };
      
      // 設定変更に応じて利用可能プロバイダーを更新
      if (newConfig.availableProviders) {
        this.initializeProviders();
      }
      
      // 必要に応じてプロバイダーを切り替え
      if (newConfig.defaultProvider && 
          this.providers.has(newConfig.defaultProvider)) {
        this.switchProvider(newConfig.defaultProvider);
      }

      return true;
    } catch (error) {
      console.error('Failed to update config:', error);
      return false;
    }
  }
}
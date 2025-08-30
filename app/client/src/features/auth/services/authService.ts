/**
 * 【機能概要】: 認証サービスの抽象化層・統一API・プロバイダー管理機能
 * 【実装方針】: authProviderInterface.test.ts のテストケースを通すために必要な機能を実装
 * 【テスト対応】: プロバイダー抽象化層・統一認証API・依存性注入・Factory Pattern適用
 * 🟡 信頼性レベル: TASK-301要件のプロバイダー抽象化設計から妥当に推測した実装
 */

import { AuthProviderInterface, AuthResult, SessionInfo } from './providers/authProviderInterface';
import { GoogleAuthProvider } from './providers/googleAuthProvider';
import { User } from '@/packages/shared-schemas/src/auth';

/**
 * 認証サービス設定の型定義
 * 【型定義】: AuthService初期化時の設定パラメータ
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
 * 【型定義】: プロバイダー変更処理の結果情報
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
 * 【AuthServiceクラス】: 認証プロバイダーの抽象化層・統一API・プロバイダー管理機能の実装
 * 【設計方針】: Factory Pattern・Strategy Pattern・依存性注入による柔軟な認証システム
 * 【実装内容】: プロバイダー動的切り替え・統一認証API・設定管理・エラーハンドリング
 * 【テスト要件対応】: authProviderInterface.test.ts のAuthService抽象化層テスト
 * 🟡 信頼性レベル: プロバイダー非依存設計要件から妥当に推測した実装
 */
export class AuthService {
  private providers: Map<string, AuthProviderInterface> = new Map();
  private currentProvider: AuthProviderInterface;
  private config: AuthServiceConfig;

  /**
   * AuthServiceのコンストラクタ
   * 【初期化】: プロバイダー登録・デフォルトプロバイダー設定・設定管理
   * @param config - 認証サービス設定またはプロバイダーインスタンス（オプション）
   */
  constructor(config?: Partial<AuthServiceConfig> | AuthProviderInterface) {
    // 【プロバイダー直接設定対応】: テスト用にプロバイダーを直接渡せるように対応
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

    // 【デフォルト設定】: 合理的なデフォルト値を設定
    this.config = {
      defaultProvider: 'google',
      availableProviders: ['google'],
      redirectTo: process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
      ...(config as Partial<AuthServiceConfig>)
    };

    // 【プロバイダー初期化】: 利用可能なプロバイダーを登録
    this.initializeProviders();

    // 【デフォルトプロバイダー設定】: 初期プロバイダーの設定
    const defaultProvider = this.providers.get(this.config.defaultProvider);
    if (!defaultProvider) {
      throw new Error(`Default provider '${this.config.defaultProvider}' not found`);
    }
    this.currentProvider = defaultProvider;
  }

  /**
   * 【プロバイダー初期化】: 利用可能な認証プロバイダーの登録
   * 【実装内容】: Google・Apple等のプロバイダーインスタンス生成と登録
   * 【拡張性】: 新しいプロバイダーの追加が容易な設計
   * 🟡 信頼性レベル: プロバイダー非依存設計から妥当に推測
   */
  private initializeProviders(): void {
    // 【Googleプロバイダー登録】: Google OAuth実装の登録
    if (this.config.availableProviders.includes('google')) {
      this.providers.set('google', new GoogleAuthProvider());
    }

    // 【将来のプロバイダー拡張】: Apple・Microsoft等の追加予定地点
    // if (this.config.availableProviders.includes('apple')) {
    //   this.providers.set('apple', new AppleAuthProvider());
    // }
    
    // if (this.config.availableProviders.includes('microsoft')) {
    //   this.providers.set('microsoft', new MicrosoftAuthProvider());
    // }
  }

  /**
   * 【統一認証開始】: 現在のプロバイダーでの認証開始
   * 【実装内容】: プロバイダー非依存の統一認証API
   * 【テスト要件対応】: AuthService抽象化層機能の確認テスト
   * 🟡 信頼性レベル: テストケースから妥当に推測した実装
   * @param provider - 使用するプロバイダー名（オプション、未指定時は現在のプロバイダー）
   * @param options - 認証オプション
   * @returns {Promise<AuthResult>} - 認証結果
   */
  async signIn(provider?: string, options?: { redirectTo?: string }): Promise<AuthResult> {
    try {
      // 【プロバイダー切り替え】: 指定があれば一時的にプロバイダーを切り替え
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

      // 【統一認証実行】: プロバイダー非依存の認証開始
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
   * 【統一ログアウト】: 現在のプロバイダーでのログアウト
   * 【実装内容】: プロバイダー非依存の統一ログアウトAPI
   * @returns {Promise<AuthResult>} - ログアウト結果
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
   * 【統一ユーザー取得】: 現在のプロバイダーでのユーザー情報取得
   * 【実装内容】: プロバイダー非依存の統一ユーザー情報取得API
   * 【テスト要件対応】: getUserメソッドのテスト
   * 🟡 信頼性レベル: テストケースから妥当に推測した実装
   * @returns {Promise<{ user: User | null }>} - ユーザー情報
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
   * 【統一セッション取得】: 現在のプロバイダーでのセッション情報取得
   * 【実装内容】: プロバイダー非依存の統一セッション取得API
   * @returns {Promise<SessionInfo | null>} - セッション情報
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
   * 【現在のセッション取得】: セッション復元テスト用の統一API
   * 【実装内容】: セッション復元機能でのセッション取得を統一化
   * 【テスト要件対応】: sessionRestore.test.ts での getCurrentSession メソッド
   * 🟡 信頼性レベル: セッション復元テストケースから推測した実装
   * @returns {Promise<SessionInfo | null>} - 現在のセッション情報
   */
  async getCurrentSession(): Promise<SessionInfo | null> {
    return this.getSession();
  }

  /**
   * 【プロバイダー切り替え】: 認証プロバイダーの動的切り替え
   * 【実装内容】: 実行時のプロバイダー切り替え・状態管理・エラーハンドリング
   * 【拡張機能】: ユーザーがプロバイダーを選択可能にする機能
   * 🟡 信頼性レベル: プロバイダー選択可能な設計から推測した拡張機能
   * @param providerName - 切り替え先プロバイダー名
   * @returns {ProviderSwitchResult} - プロバイダー切り替え結果
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
   * 【利用可能プロバイダー取得】: 現在利用可能な認証プロバイダーのリストを取得
   * 【実装内容】: 登録済みプロバイダーの名称リスト返却
   * @returns {string[]} - 利用可能プロバイダー名のリスト
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 【現在のプロバイダー名取得】: アクティブなプロバイダーの識別名を取得
   * 【実装内容】: 現在使用中のプロバイダー名を返却
   * @returns {string} - 現在のプロバイダー名
   */
  getCurrentProviderName(): string {
    return this.currentProvider.getProviderName();
  }

  /**
   * 【プロバイダー登録】: 新しい認証プロバイダーの動的登録
   * 【実装内容】: 実行時の新規プロバイダー追加機能
   * 【拡張性】: プラグイン的なプロバイダー追加を支援
   * 🟡 信頼性レベル: 開放閉鎖の原則から推測した拡張機能
   * @param name - プロバイダー名
   * @param provider - プロバイダー実装インスタンス
   * @returns {boolean} - 登録成功フラグ
   */
  registerProvider(name: string, provider: AuthProviderInterface): boolean {
    try {
      this.providers.set(name, provider);
      
      // 【設定更新】: 利用可能プロバイダーリストに追加
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
   * 【設定取得】: 現在の認証サービス設定を取得
   * 【実装内容】: 設定情報のコピーを返却（変更から保護）
   * @returns {AuthServiceConfig} - 現在の設定情報
   */
  getConfig(): AuthServiceConfig {
    return { ...this.config };
  }

  /**
   * 【設定更新】: 認証サービス設定の動的更新
   * 【実装内容】: 実行時の設定変更・プロバイダー再初期化
   * @param newConfig - 新しい設定情報
   * @returns {boolean} - 設定更新成功フラグ
   */
  updateConfig(newConfig: Partial<AuthServiceConfig>): boolean {
    try {
      this.config = { ...this.config, ...newConfig };
      
      // 【プロバイダー再初期化】: 設定変更に応じて利用可能プロバイダーを更新
      if (newConfig.availableProviders) {
        this.initializeProviders();
      }
      
      // 【デフォルトプロバイダー変更】: 必要に応じてプロバイダーを切り替え
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
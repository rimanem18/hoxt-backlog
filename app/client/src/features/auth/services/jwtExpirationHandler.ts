/**
 * JWT期限切れハンドリングと自動ログアウト機能。
 * JWTトークンの期限監視と期限切れ時の自動ログアウトを提供する。
 */

/**
 * JWT期限切れ処理結果の型定義
 */
interface ExpirationResult {
  /** 期限切れ判定結果 */
  isExpired: boolean;
  /** ログアウト処理実行フラグ */
  logoutExecuted: boolean;
  /** ユーザー向け通知メッセージ */
  userNotification: string;
  /** 残り有効時間（秒）*/
  remainingTime?: number;
}

/**
 * JWT検証結果の型定義
 */
interface JWTValidationResult {
  /** トークン有効性 */
  isValid: boolean;
  /** 期限切れ判定 */
  isExpired: boolean;
  /** 有効期限（Unix時刻） */
  expiresAt?: number;
  /** エラー情報 */
  error?: string;
}

/**
 * JWTトークンの期限管理と自動ログアウト処理を担う。
 * JWTの期限切れ検出、Redux連携ログアウト、セキュアな状態クリアを行う。
 */
export class JWTExpirationHandler {
  private store?: any; // Redux store（オプション）
  private expirationWarningCallback?: (remainingTime: number) => void;

  /**
   * JWTExpirationHandlerを初期化する
   * @param store - Redux store（オプション）
   */
  constructor(store?: any) {
    this.store = store;
  }

  /**
   * JWTトークンの期限切れを検出し、必要に応じて自動ログアウトを実行する
   * @param token - 検証対象のJWTトークン
   * @returns 期限切れ処理結果
   */
  handleTokenExpiration(token: string): ExpirationResult {
    try {
      // JWTトークンの有効性と期限を検証
      const validation = this.validateJWT(token);
      
      if (validation.isExpired) {
        // 期限切れ時の自動ログアウトを実行
        const logoutResult = this.executeLogout();
        
        return {
          isExpired: true,
          logoutExecuted: logoutResult,
          userNotification: 'セッションの有効期限が切れました。再度ログインしてください。',
          remainingTime: 0
        };
      }
      
      // 正常なトークン状態（期限内）
      return {
        isExpired: false,
        logoutExecuted: false,
        userNotification: '',
        remainingTime: validation.expiresAt ? 
          Math.max(0, Math.floor((validation.expiresAt * 1000 - Date.now()) / 1000)) : undefined
      };
    } catch (error) {
      // JWT解析エラー時は不正トークンとして強制ログアウト
      return {
        isExpired: true,
        logoutExecuted: this.executeLogout(),
        userNotification: '認証情報に問題があります。再度ログインしてください。',
        remainingTime: 0
      };
    }
  }

  /**
   * JWTトークンの構造解析と期限確認を行う
   * @param token - 検証対象のJWTトークン
   * @returns JWT検証結果
   */
  private validateJWT(token: string): JWTValidationResult {
    try {
      // JWTのheader.payload.signatureの3部構成を確認
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Invalid JWT format'
        };
      }

      // Base64URL形式のペイロードをデコードしてJSON解析
      // base64urlをbase64に変換
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      // Base64パディングを追加
      const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const payload = JSON.parse(
        typeof Buffer !== 'undefined' 
          ? Buffer.from(paddedBase64, 'base64').toString()
          : atob(paddedBase64)
      );

      // expクレームの存在確認と期限切れ判定
      if (!payload.exp) {
        return {
          isValid: false,
          isExpired: false,
          error: 'JWT missing exp claim'
        };
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp <= currentTime;

      return {
        isValid: !isExpired,
        isExpired: isExpired,
        expiresAt: payload.exp
      };
    } catch (error) {
      return {
        isValid: false,
        isExpired: false,
        error: error instanceof Error ? error.message : 'JWT parsing error'
      };
    }
  }

  /**
   * Redux状態クリアとセッション情報削除を実行する
   * @returns ログアウト処理成功フラグ
   */
  private executeLogout(): boolean {
    try {
      if (this.store) {
        // Reduxにauth/logoutアクションをdispatch
        this.store.dispatch({
          type: 'auth/logout'
        });
      }

      // 保存済み認証情報をローカルストレージから削除
      this.clearStoredTokens();
      
      return true;
    } catch (error) {
      console.error('ログアウト処理エラー:', error);
      return false;
    }
  }

  /**
   * localStorageとsessionStorageから認証情報を削除する
   */
  private clearStoredTokens(): void {
    try {
      // 永続化された認証情報をlocalStorageから削除
      const authKeys = [
        'supabase.auth.token',
        'sb-access-token',
        'sb-refresh-token',
        'auth-session'
      ];

      authKeys.forEach(key => {
        // ブラウザ環境でのみストレージにアクセス
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('トークンクリアエラー:', error);
    }
  }

  /**
   * 期限切れ前の警告コールバックを設定する
   * @param callback - 警告時に実行するコールバック関数
   */
  setExpirationWarningCallback(callback: (remainingTime: number) => void): void {
    this.expirationWarningCallback = callback;
  }

  /**
   * JWTトークンの期限切れを定期監視する
   * @param token - 監視対象のJWTトークン
   * @param warningThreshold - 警告を出すまでの残り時間（秒）
   * @returns 監視タイマーID
   */
  startExpirationMonitoring(token: string, warningThreshold: number = 300): NodeJS.Timeout {
    const monitoringInterval = setInterval(() => {
      const result = this.handleTokenExpiration(token);
      
      if (result.isExpired) {
        clearInterval(monitoringInterval);
      } else if (result.remainingTime && result.remainingTime <= warningThreshold) {
        // 閾値を下回った場合の警告実行
        if (this.expirationWarningCallback) {
          this.expirationWarningCallback(result.remainingTime);
        }
      }
    }, 60000); // 1分間隔

    return monitoringInterval;
  }

  /**
   * JWTトークンの有効期限を人間可読形式で取得する
   * @param token - 対象JWTトークン
   * @returns 有効期限の文字列表現
   */
  getExpirationTime(token: string): string | null {
    try {
      const validation = this.validateJWT(token);
      
      if (validation.expiresAt) {
        return new Date(validation.expiresAt * 1000).toLocaleString('ja-JP');
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}
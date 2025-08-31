/**
 * 【機能概要】: JWT期限切れハンドリングと自動ログアウト機能を提供するサービスクラス
 * 【実装方針】: errorHandling.test.ts のテストケースを通すために必要な機能を実装
 * 【テスト対応】: JWT期限切れ検出・自動ログアウト・Redux状態クリア・ユーザー通知
 * 🟡 信頼性レベル: JWT期限切れ境界値テストケースとセキュリティベストプラクティスから推測
 */

/**
 * JWT期限切れ処理結果の型定義
 * 【型定義】: JWT期限切れ検出・処理の結果情報
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
 * 【型定義】: JWTトークンの検証結果情報
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
 * 【JWTExpirationHandlerクラス】: JWT期限管理・自動ログアウト・セキュリティ制御機能の実装
 * 【実装内容】: JWT期限切れ検出・Redux連携ログアウト・セキュアな状態クリア
 * 【テスト要件対応】: errorHandling.test.ts のJWT期限切れ関連テストケースに対応
 * 🟡 信頼性レベル: テストケースとセキュリティ要件から妥当に推測した実装
 */
export class JWTExpirationHandler {
  private store?: any; // Redux store（オプション）
  private expirationWarningCallback?: (remainingTime: number) => void;

  /**
   * JWTExpirationHandlerのコンストラクタ
   * 【初期化】: Redux連携とコールバック関数の設定
   * @param store - Redux store（オプション）
   */
  constructor(store?: any) {
    this.store = store;
  }

  /**
   * 【JWT期限切れ処理】: JWT期限切れ検出と自動ログアウト実行
   * 【実装内容】: JWT解析・期限切れ判定・Redux状態クリア・ユーザー通知
   * 【テスト要件対応】: "JWT期限切れ時の自動ログアウト処理" テストケース
   * 🟡 信頼性レベル: テストケースから妥当に推測した実装
   * @param token - 検証対象のJWTトークン
   * @returns {ExpirationResult} - 期限切れ処理結果
   */
  handleTokenExpiration(token: string): ExpirationResult {
    try {
      // 【JWT検証】: トークンの有効性と期限を確認
      const validation = this.validateJWT(token);
      
      if (validation.isExpired) {
        // 【自動ログアウト実行】: 期限切れ時のログアウト処理
        const logoutResult = this.executeLogout();
        
        return {
          isExpired: true,
          logoutExecuted: logoutResult,
          userNotification: 'セッションの有効期限が切れました。再度ログインしてください。',
          remainingTime: 0
        };
      }
      
      // 【期限内】: 正常なトークン状態
      return {
        isExpired: false,
        logoutExecuted: false,
        userNotification: '',
        remainingTime: validation.expiresAt ? 
          Math.max(0, Math.floor((validation.expiresAt * 1000 - Date.now()) / 1000)) : undefined
      };
    } catch (error) {
      // 【JWT解析エラー】: 不正なトークンとして扱い強制ログアウト
      return {
        isExpired: true,
        logoutExecuted: this.executeLogout(),
        userNotification: '認証情報に問題があります。再度ログインしてください。',
        remainingTime: 0
      };
    }
  }

  /**
   * 【JWT検証機能】: JWTトークンの構造解析と期限確認
   * 【実装内容】: Base64デコード・JSON解析・期限切れ判定
   * 【セキュリティ】: 署名検証は省略（サーバーサイドで実施済み前提）
   * 🟢 信頼性レベル: JWT標準仕様（RFC 7519）に基づく実装
   * @param token - 検証対象のJWTトークン
   * @returns {JWTValidationResult} - JWT検証結果
   */
  private validateJWT(token: string): JWTValidationResult {
    try {
      // 【JWT構造確認】: header.payload.signature の3部構成確認
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          isValid: false,
          isExpired: false,
          error: 'Invalid JWT format'
        };
      }

      // 【ペイロード解析】: Base64デコードとJSON解析
      // base64url形式をbase64に変換してデコード
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      // パディングを追加
      const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const payload = JSON.parse(
        typeof Buffer !== 'undefined' 
          ? Buffer.from(paddedBase64, 'base64').toString()
          : atob(paddedBase64)
      );

      // 【有効期限確認】: exp クレームの存在と期限切れ判定
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
   * 【ログアウト実行】: Redux状態クリアとセッション情報削除
   * 【実装内容】: authLogoutアクションのdispatch実行
   * 【テスト要件対応】: Redux store への logout アクション送信確認
   * 🟡 信頼性レベル: テストケースから妥当に推測した実装
   * @returns {boolean} - ログアウト処理成功フラグ
   */
  private executeLogout(): boolean {
    try {
      if (this.store) {
        // 【Redux状態クリア】: auth/logoutアクションをdispatch
        this.store.dispatch({
          type: 'auth/logout'
        });
      }

      // 【ローカルストレージクリア】: 保存済み認証情報の削除
      this.clearStoredTokens();
      
      return true;
    } catch (error) {
      console.error('ログアウト処理エラー:', error);
      return false;
    }
  }

  /**
   * 【保存トークンクリア】: localStorage/sessionStorageの認証情報削除
   * 【実装内容】: 各種ストレージからの認証関連データ削除
   * 【セキュリティ】: 確実なトークン削除でセッション漏洩を防止
   * 🟡 信頼性レベル: セキュリティベストプラクティスから推測
   */
  private clearStoredTokens(): void {
    try {
      // 【ローカルストレージクリア】: 永続化された認証情報削除
      const authKeys = [
        'supabase.auth.token',
        'sb-access-token',
        'sb-refresh-token',
        'auth-session'
      ];

      authKeys.forEach(key => {
        // 【ブラウザ環境チェック】: localStorage/sessionStorageが利用可能な場合のみ実行
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
   * 【期限切れ警告設定】: 期限切れ前の警告コールバック設定
   * 【実装内容】: 期限切れ警告のコールバック関数登録
   * 【UX向上】: ユーザーへの事前警告による体験改善
   * 🟡 信頼性レベル: UX向上の一般的なパターンから推測
   * @param callback - 警告時に実行するコールバック関数
   */
  setExpirationWarningCallback(callback: (remainingTime: number) => void): void {
    this.expirationWarningCallback = callback;
  }

  /**
   * 【期限監視開始】: JWT期限切れの定期監視開始
   * 【実装内容】: setIntervalによる定期的な期限確認
   * 【監視間隔】: 1分間隔での期限確認（パフォーマンス配慮）
   * 🟡 信頼性レベル: 定期監視の一般的なパターンから推測
   * @param token - 監視対象のJWTトークン
   * @param warningThreshold - 警告を出すまでの残り時間（秒）
   * @returns {NodeJS.Timeout} - 監視タイマーID
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
   * 【期限切れ時刻計算】: JWT有効期限の人間可読形式変換
   * 【実装内容】: Unix時刻から日時文字列への変換
   * 【表示用】: ユーザー向け期限表示のための変換
   * 🟡 信頼性レベル: 表示処理の一般的なパターン
   * @param token - 対象JWTトークン
   * @returns {string | null} - 有効期限の文字列表現
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
/**
 * 【機能概要】: 認証エラーハンドリングを提供するサービスクラス
 * 【実装方針】: errorHandling.test.ts のテストケースを通すために必要な機能を実装
 * 【テスト対応】: Google認証キャンセル・ユーザーフレンドリーなエラーメッセージ処理
 * 🟢 信頼性レベル: EDGE-101（Google認証キャンセル処理）要件に基づく実装
 */

/**
 * 認証キャンセルエラーの型定義
 * 【型定義】: Google認証ポップアップでキャンセルした際のエラー情報
 */
interface AuthCancelledError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
  /** 認証プロバイダー */
  provider: string;
}

/**
 * 認証エラーハンドリング結果の型定義
 * 【型定義】: エラー処理の結果情報とユーザー向け情報
 */
interface AuthErrorHandleResult {
  /** エラーメッセージを表示するかどうか */
  shouldShowError: boolean;
  /** ユーザー向けメッセージ */
  userMessage: string;
  /** 再試行可能かどうか */
  canRetry: boolean;
  /** エラーの重要度 */
  severity?: 'info' | 'warning' | 'error';
}

/**
 * 【AuthErrorHandlerクラス】: 認証エラーの分類・処理・ユーザー通知機能の実装
 * 【実装内容】: エラー種別の判定・ユーザーフレンドリーなメッセージ変換・リトライ可能性判定
 * 【テスト要件対応】: errorHandling.test.ts の認証キャンセル関連テストケースに対応
 * 🟢 信頼性レベル: EDGE-101要件とテスト仕様から直接実装
 */
export class AuthErrorHandler {

  /**
   * 【認証キャンセルエラー処理】: ユーザーが認証をキャンセルした場合の処理
   * 【実装内容】: キャンセルを正常な操作として扱い、エラー状態にしない処理
   * 【テスト要件対応】: "Google認証キャンセル時のエラー処理" テストケース
   * 🟢 信頼性レベル: EDGE-101（認証キャンセル処理）要件から直接実装
   * @param error - 認証キャンセルエラー情報
   * @returns {AuthErrorHandleResult} - エラーハンドリング結果
   */
  handleAuthCancellation(error: AuthCancelledError): AuthErrorHandleResult {
    // 【キャンセル処理方針】: キャンセルは正常な操作として扱う
    // 【ユーザビリティ重視】: エラーではなく情報メッセージとして表示
    return {
      shouldShowError: false, // エラーメッセージは表示しない
      userMessage: '認証をキャンセルしました。',
      canRetry: true, // キャンセル後の再認証は可能
      severity: 'info' // 情報レベルの通知
    };
  }

  /**
   * 【汎用認証エラー処理】: 様々な認証エラーを分類して適切に処理
   * 【実装内容】: エラーコードに応じた分類とユーザー向けメッセージの生成
   * 【設計方針】: 拡張可能なエラー分類システムによる一元管理
   * 🟡 信頼性レベル: 一般的なOAuth認証エラーパターンから妥当に推測
   * @param error - 認証エラー情報
   * @returns {AuthErrorHandleResult} - エラーハンドリング結果
   */
  handleAuthError(error: any): AuthErrorHandleResult {
    // エラーコードに基づいたエラー分類
    switch (error.code) {
      case 'auth_cancelled':
        return this.handleAuthCancellation(error);
      
      case 'popup_blocked':
        return {
          shouldShowError: true,
          userMessage: 'ポップアップがブロックされました。ブラウザの設定を確認してください。',
          canRetry: true,
          severity: 'warning'
        };
      
      case 'network_error':
        return {
          shouldShowError: true,
          userMessage: 'インターネット接続を確認してください。',
          canRetry: true,
          severity: 'error'
        };
      
      case 'invalid_credentials':
        return {
          shouldShowError: true,
          userMessage: '認証情報が正しくありません。',
          canRetry: true,
          severity: 'error'
        };
      
      default:
        return {
          shouldShowError: true,
          userMessage: '認証に失敗しました。しばらく待ってから再度お試しください。',
          canRetry: true,
          severity: 'error'
        };
    }
  }

  /**
   * 【エラーメッセージ国際化】: エラーメッセージの多言語対応
   * 【実装内容】: 言語設定に応じたエラーメッセージの変換
   * 【将来拡張】: i18n対応の準備実装
   * 🟡 信頼性レベル: 国際化要件から妥当に推測（現在は日本語のみ）
   * @param errorCode - エラーコード
   * @param locale - 言語設定（デフォルト: 'ja'）
   * @returns {string} - ローカライズされたエラーメッセージ
   */
  getLocalizedErrorMessage(errorCode: string, locale: string = 'ja'): string {
    const messages: Record<string, Record<string, string>> = {
      ja: {
        'auth_cancelled': '認証をキャンセルしました。',
        'popup_blocked': 'ポップアップがブロックされました。ブラウザの設定を確認してください。',
        'network_error': 'インターネット接続を確認してください。',
        'invalid_credentials': '認証情報が正しくありません。',
        'default': '認証に失敗しました。しばらく待ってから再度お試しください。'
      },
      en: {
        'auth_cancelled': 'Authentication was cancelled.',
        'popup_blocked': 'Popup was blocked. Please check your browser settings.',
        'network_error': 'Please check your internet connection.',
        'invalid_credentials': 'Invalid credentials.',
        'default': 'Authentication failed. Please try again later.'
      }
    };

    return messages[locale]?.[errorCode] || messages[locale]?.['default'] || messages['ja']['default'];
  }

  /**
   * 【エラーログ記録】: 認証エラーの詳細ログを記録
   * 【実装内容】: デバッグ・監視用のエラー情報記録機能
   * 【セキュリティ配慮】: 機密情報を除外したログ記録
   * 🟡 信頼性レベル: ログ記録の一般的なベストプラクティスから推測
   * @param error - エラー情報
   * @param context - エラー発生コンテキスト
   */
  logAuthError(error: any, context: string): void {
    // 【セキュリティ考慮】: 機密情報（トークン等）を除外してログ記録
    const sanitizedError = {
      code: error.code,
      message: error.message,
      provider: error.provider,
      timestamp: new Date().toISOString(),
      context: context
    };

    // 開発環境では詳細ログ、本番環境では最小限のログ
    if (process.env.NODE_ENV === 'development') {
      console.error('認証エラー詳細:', sanitizedError);
    } else {
      console.error('認証エラー:', sanitizedError.code);
    }
  }
}
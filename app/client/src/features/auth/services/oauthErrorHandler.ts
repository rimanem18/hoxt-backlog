/**
 * OAuth認証エラー統合ハンドリングサービス
 * 
 * authServiceとUI側で重複していたエラー分類ロジックを一元化。
 * エラーメッセージのサニタイズや機密情報保護機能を含む。
 * 
 * @example
 * ```typescript
 * const errorDetail = OAuthErrorHandler.analyzeError(error);
 * console.log(errorDetail.type, errorDetail.userMessage);
 * ```
 */

import { type OAuthErrorType } from '@/features/auth/store/oauthErrorSlice';

/**
 * OAuth認証エラー詳細情報の型定義
 */
export interface OAuthErrorDetail {
  /** エラータイプ分類 */
  type: OAuthErrorType;
  /** サニタイズ済みユーザー表示メッセージ */
  userMessage: string;
  /** 開発者向けデバッグ情報（開発環境のみ） */
  debugInfo?: string;
  /** エラー重要度レベル */
  severity: 'info' | 'warning' | 'error';
  /** 再試行可能かどうか */
  retryable: boolean;
  /** 相関ID */
  correlationId: string;
}

/**
 * エラーパターン検出用の設定
 * 
 * 正規表現の事前コンパイルによる高速化
 */
const ERROR_PATTERNS: Record<OAuthErrorType, RegExp[]> = {
  cancelled: [
    /キャンセル/i,
    /cancelled/i,
    /access_denied/i,
    /user.*denied/i,
    /authorization.*cancelled/i,
  ],
  connection: [
    /接続/i,
    /ネットワーク/i,
    /connection/i,
    /network/i,
    /timeout/i,
    /fetch.*failed/i,
    /network.*error/i,
    /connection.*refused/i,
  ],
  config: [
    /設定/i,
    /config/i,
    /invalid_client/i,
    /unauthorized_client/i,
    /invalid.*configuration/i,
    /oauth.*setup/i,
    /client.*credentials/i,
  ],
  unknown: [],
};

/**
 * エラータイプ別のデフォルト設定
 */
const ERROR_TYPE_CONFIGS: Record<OAuthErrorType, {
  defaultMessage: string;
  severity: 'info' | 'warning' | 'error';
  retryable: boolean;
}> = {
  cancelled: {
    defaultMessage: 'Googleログインがキャンセルされました。',
    severity: 'info',
    retryable: true,
  },
  connection: {
    defaultMessage: 'Googleとの接続に問題が発生しました。ネットワーク接続を確認してください。',
    severity: 'error',
    retryable: true,
  },
  config: {
    defaultMessage: 'Google OAuth設定に問題があります。',
    severity: 'warning',
    retryable: false,
  },
  unknown: {
    defaultMessage: '認証処理中にエラーが発生しました。',
    severity: 'error',
    retryable: true,
  },
};

/**
 * 安全な相関ID生成
 * 
 * ユーザー情報・セッション情報を含まない安全な識別子を生成
 */
const generateCorrelationId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `oauth_err_${timestamp}_${random}`;
};

/**
 * エラーメッセージの安全なサニタイズ
 * 
 * XSS対策として危険な文字列パターンを除去し、
 * 機密情報漏洩を防止する。
 */
const sanitizeErrorMessage = (message: string): string => {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // DoS攻撃対策として異常に長いメッセージを制限
  const maxLength = 500;
  if (message.length > maxLength) {
    return message.substring(0, maxLength) + '...';
  }

  // HTMLタグとスクリプトの除去
  return message
    .replace(/<[^>]*>/g, '') // HTMLタグ除去
    .replace(/javascript:/gi, '') // javascript:プロトコル除去
    .replace(/on\w+\s*=/gi, '') // イベントハンドラー除去
    .replace(/[<>'"]/g, '') // 危険な引用符・括弧の除去
    .trim();
};

/**
 * エラーメッセージからタイプを効率的に検出
 * 
 * 早期終了による処理速度向上
 */
const detectErrorType = (errorMessage: string): OAuthErrorType => {
  const normalizedMessage = errorMessage.toLowerCase();

  // 最も一般的なエラーから順番にチェック
  for (const [type, patterns] of Object.entries(ERROR_PATTERNS) as Array<[OAuthErrorType, RegExp[]]>) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedMessage)) {
        return type;
      }
    }
  }

  return 'unknown';
};

/**
 * OAuth認証エラーハンドリングサービス
 * 
 * OAuth認証エラー処理のみに特化し、重複するロジックを一元化。
 */
export class OAuthErrorHandler {
  /**
   * OAuth認証エラーを分析して詳細情報を生成
   * 
   * @param error - 分析するErrorオブジェクトまたは文字列
   * @returns エラーの詳細情報
   */
  static analyzeError(error: Error | string): OAuthErrorDetail {
    const errorMessage = error instanceof Error ? error.message : error;
    const sanitizedMessage = sanitizeErrorMessage(errorMessage);
    const correlationId = generateCorrelationId();

    // パターンマッチングによるエラータイプ検出
    const detectedType = detectErrorType(sanitizedMessage);
    const config = ERROR_TYPE_CONFIGS[detectedType];

    // 統一されたエラー詳細オブジェクトの生成
    const errorDetail: OAuthErrorDetail = {
      type: detectedType,
      userMessage: config.defaultMessage,
      severity: config.severity,
      retryable: config.retryable,
      correlationId,
    };

    // 開発環境でのデバッグ情報付加
    if (process.env.NODE_ENV === 'development') {
      errorDetail.debugInfo = sanitizedMessage;
      console.log(`OAuth Error Analysis [${correlationId}]:`, {
        originalMessage: sanitizedMessage,
        detectedType,
        severity: config.severity,
        retryable: config.retryable,
      });
    }

    return errorDetail;
  }

  /**
   * エラータイプの直接判定
   * 
   * @param error - 判定するErrorオブジェクトまたは文字列
   * @returns エラータイプ
   */
  static getErrorType(error: Error | string): OAuthErrorType {
    const errorMessage = error instanceof Error ? error.message : error;
    return detectErrorType(sanitizeErrorMessage(errorMessage));
  }

  /**
   * エラーが再試行可能かどうかの判定
   * 
   * @param error - 判定するErrorオブジェクトまたは文字列
   * @returns 再試行可能かどうか
   */
  static isRetryable(error: Error | string): boolean {
    const errorType = this.getErrorType(error);
    return ERROR_TYPE_CONFIGS[errorType].retryable;
  }

  /**
   * エラーの重要度取得
   * 
   * @param error - 判定するErrorオブジェクトまたは文字列
   * @returns 重要度レベル
   */
  static getSeverity(error: Error | string): 'info' | 'warning' | 'error' {
    const errorType = this.getErrorType(error);
    return ERROR_TYPE_CONFIGS[errorType].severity;
  }

  /**
   * カスタムエラーパターンの追加
   * 
   * @param type - エラータイプ
   * @param pattern - 追加する正規表現パターン
   */
  static addCustomPattern(type: OAuthErrorType, pattern: RegExp): void {
    if (process.env.NODE_ENV === 'development') {
      // 開発環境でのカスタムパターン追加をサポート
      const patterns = ERROR_PATTERNS[type];
      if (patterns && !patterns.some((p: RegExp) => p.source === pattern.source)) {
        patterns.push(pattern);
        console.log(`Custom OAuth error pattern added for ${type}:`, pattern.source);
      }
    }
  }
}

/**
 * 統合されたエラーハンドリングのファクトリー関数
 * 
 * 既存コードとの互換性を保ちながら新機能を提供。
 * 
 * @param error - 分析するErrorオブジェクトまたは文字列
 * @returns エラーの詳細情報
 */
export const handleOAuthError = (error: Error | string): OAuthErrorDetail => {
  return OAuthErrorHandler.analyzeError(error);
};


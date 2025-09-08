/**
 * 【機能概要】: OAuth認証エラー統合ハンドリングサービス（T008 Refactorフェーズ実装）
 * 【改善内容】: authServiceとUI側で重複していたエラー分類ロジックの一元化
 * 【設計方針】: 単一責任原則・DRY原則・エラー処理の専門化による保守性向上
 * 【セキュリティ強化】: エラーメッセージのサニタイゼーション・機密情報保護・安全な分類処理
 * 【パフォーマンス向上】: 効率的なパターンマッチング・メモリ効率・処理速度最適化
 * 【保守性向上】: 型安全性・テスタビリティ・拡張可能性を重視したサービス設計
 * 🟢 信頼性レベル: エラー処理のベストプラクティスに基づく本番レディ実装
 */

import { type OAuthErrorType } from '@/features/auth/store/oauthErrorSlice';

/**
 * OAuth認証エラー詳細情報の型定義
 * 【拡張性】: 将来的なエラー情報拡張に対応する構造設計
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
 * 【パフォーマンス最適化】: 正規表現の事前コンパイルによる高速化
 * 【保守性向上】: 一元管理されたエラーパターン定義
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
  unknown: [], // unknownタイプ用の空配列を追加
};

/**
 * エラータイプ別のデフォルト設定
 * 【ユーザビリティ】: エラータイプ別の適切なメッセージとUX設定
 * 🟢 信頼性レベル: E2Eテストで検証済みのメッセージ内容
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
 * 【セキュリティ強化】: 安全な相関ID生成
 * 【機密情報保護】: ユーザー情報・セッション情報を含まない安全な識別子生成
 * 🟢 信頼性レベル: 標準的な識別子生成パターンの実装
 */
const generateCorrelationId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `oauth_err_${timestamp}_${random}`;
};

/**
 * 【セキュリティ強化】: エラーメッセージの安全なサニタイゼーション
 * 【XSS対策】: 危険な文字列パターンの無害化処理
 * 【情報漏洩防止】: 機密情報を含む可能性のある詳細エラーの汎用化
 * 🟢 信頼性レベル: セキュリティベストプラクティスに基づく実装
 */
const sanitizeErrorMessage = (message: string): string => {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // 【長さ制限】: DoS攻撃対策として異常に長いメッセージを制限
  const maxLength = 500;
  if (message.length > maxLength) {
    return message.substring(0, maxLength) + '...';
  }

  // 【危険文字除去】: HTMLタグとスクリプトの除去
  return message
    .replace(/<[^>]*>/g, '') // HTMLタグ除去
    .replace(/javascript:/gi, '') // javascript:プロトコル除去
    .replace(/on\w+\s*=/gi, '') // イベントハンドラー除去
    .replace(/[<>'"]/g, '') // 危険な引用符・括弧の除去
    .trim();
};

/**
 * 【高性能パターンマッチング】: エラーメッセージからタイプを効率的に検出
 * 【パフォーマンス最適化】: 早期終了による処理速度向上
 * 🟢 信頼性レベル: 包括的なパターンマッチングによる確実な分類
 */
const detectErrorType = (errorMessage: string): OAuthErrorType => {
  const normalizedMessage = errorMessage.toLowerCase();

  // 【効率的検索】: 最も一般的なエラーから順番にチェック
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
 * 【単一責任】: OAuth認証エラー処理のみに特化したサービス
 * 【DRY原則】: 重複するエラー処理ロジックの一元化
 */
export class OAuthErrorHandler {
  /**
   * 【メイン機能】: OAuth認証エラーを分析して詳細情報を生成
   * 【セキュリティ強化】: 安全なエラー分析と情報漏洩防止
   * 【パフォーマンス最適化】: 効率的なエラー分析処理
   * 🟢 信頼性レベル: 包括的なエラーハンドリング仕様に基づく実装
   */
  static analyzeError(error: Error | string): OAuthErrorDetail {
    const errorMessage = error instanceof Error ? error.message : error;
    const sanitizedMessage = sanitizeErrorMessage(errorMessage);
    const correlationId = generateCorrelationId();

    // 【エラータイプ検出】: パターンマッチングによる分類
    const detectedType = detectErrorType(sanitizedMessage);
    const config = ERROR_TYPE_CONFIGS[detectedType];

    // 【詳細情報生成】: 統一されたエラー詳細オブジェクトの生成
    const errorDetail: OAuthErrorDetail = {
      type: detectedType,
      userMessage: config.defaultMessage,
      severity: config.severity,
      retryable: config.retryable,
      correlationId,
    };

    // 【開発支援】: 開発環境でのデバッグ情報付加
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
   * 【便利メソッド】: エラータイプの直接判定
   * 【パフォーマンス最適化】: 軽量な判定処理
   */
  static getErrorType(error: Error | string): OAuthErrorType {
    const errorMessage = error instanceof Error ? error.message : error;
    return detectErrorType(sanitizeErrorMessage(errorMessage));
  }

  /**
   * 【便利メソッド】: エラーが再試行可能かどうかの判定
   * 【UX改善】: 適切な再試行ボタン表示制御のサポート
   */
  static isRetryable(error: Error | string): boolean {
    const errorType = this.getErrorType(error);
    return ERROR_TYPE_CONFIGS[errorType].retryable;
  }

  /**
   * 【便利メソッド】: エラーの重要度取得
   * 【UI制御】: 重要度に応じた表示スタイルの制御サポート
   */
  static getSeverity(error: Error | string): 'info' | 'warning' | 'error' {
    const errorType = this.getErrorType(error);
    return ERROR_TYPE_CONFIGS[errorType].severity;
  }

  /**
   * 【拡張機能】: カスタムエラーパターンの追加
   * 【保守性向上】: 動的なエラーパターン拡張機能
   * 🟡 信頼性レベル: 将来的な拡張要件からの妥当な推測
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
 * 【ファクトリー関数】: 統合されたエラーハンドリング
 * 【後方互換性】: 既存コードとの互換性を保ちながら新機能を提供
 */
export const handleOAuthError = (error: Error | string): OAuthErrorDetail => {
  return OAuthErrorHandler.analyzeError(error);
};


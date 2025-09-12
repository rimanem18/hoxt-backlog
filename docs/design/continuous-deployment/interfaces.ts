/**
 * 継続的デプロイメントシステム TypeScript型定義
 * 
 * 作成日: 2025年09月12日
 * 最終更新: 2025年09月12日
 */

// ========================================
// GitHub Actions関連型定義
// ========================================

/**
 * GitHub Actions実行コンテキスト
 */
export interface GitHubContext {
  /** 実行トリガーイベント名 */
  event_name: 'push' | 'pull_request' | 'workflow_dispatch';
  /** リポジトリ情報 */
  repository: string;
  /** 実行者情報 */
  actor: string;
  /** ブランチ/タグ参照 */
  ref: string;
  /** コミットSHA */
  sha: string;
  /** PR番号（PR時のみ） */
  pull_request_number?: number;
}

/**
 * デプロイメント実行結果
 */
export interface DeploymentResult {
  /** 実行ステップ名 */
  step: DeploymentStep;
  /** 実行結果 */
  status: 'success' | 'failure' | 'skipped';
  /** 実行開始時刻 */
  started_at: string;
  /** 実行終了時刻 */
  completed_at?: string;
  /** 実行時間（秒） */
  duration?: number;
  /** エラーメッセージ */
  error_message?: string;
  /** 出力ログ */
  logs?: string[];
}

/**
 * デプロイメントステップ定義
 */
export type DeploymentStep = 
  | 'terraform_plan'
  | 'terraform_apply'
  | 'supabase_migration' 
  | 'lambda_deploy'
  | 'cloudflare_deploy'
  | 'health_check';

// ========================================
// Terraform関連型定義  
// ========================================

/**
 * Terraform実行設定
 */
export interface TerraformConfig {
  /** Terraformバージョン */
  version: string;
  /** 作業ディレクトリ */
  working_directory: string;
  /** 変数ファイルパス */
  var_files: string[];
  /** 実行環境 */
  environment: 'production' | 'preview';
}

/**
 * Terraform Plan結果
 */
export interface TerraformPlanResult {
  /** 作成されるリソース数 */
  resources_to_add: number;
  /** 変更されるリソース数 */
  resources_to_change: number;
  /** 削除されるリソース数 */
  resources_to_destroy: number;
  /** 破壊的変更があるかどうか */
  has_destructive_changes: boolean;
  /** Plan出力詳細 */
  plan_output: string;
}

/**
 * Terraformリソース状態
 */
export interface TerraformResource {
  /** リソースアドレス */
  address: string;
  /** リソースタイプ */
  type: string;
  /** リソース名 */
  name: string;
  /** プロバイダー */
  provider: string;
  /** アクション種別 */
  action: 'create' | 'update' | 'delete' | 'no-op';
}

// ========================================
// AWS Lambda関連型定義
// ========================================

/**
 * Lambda関数設定
 */
export interface LambdaFunctionConfig {
  /** 関数名 */
  function_name: string;
  /** ランタイム */
  runtime: 'nodejs18.x' | 'nodejs20.x';
  /** ハンドラー（Hono Lambda adapterでは 'index.handler' 固定） */
  handler: 'index.handler';
  /** メモリサイズ（MB） */
  memory_size: number;
  /** タイムアウト（秒） */
  timeout: number;
  /** 環境変数 */
  environment_variables: Record<string, string>;
  /** Honoビルド設定 */
  build_config: {
    /** Lambda用ビルドコマンド */
    lambda_build_command: string;
    /** 出力ファイル名 */
    output_file: string;
    /** エントリポイントファイル */
    entry_point: string;
  };
}

/**
 * Lambdaデプロイ結果
 */
export interface LambdaDeployResult {
  /** 関数ARN */
  function_arn: string;
  /** 関数バージョン */
  version: string;
  /** エイリアス名 */
  alias?: string;
  /** デプロイパッケージサイズ */
  package_size: number;
  /** 最終更新時刻 */
  last_modified: string;
}

// ========================================
// CloudFlare Pages関連型定義
// ========================================

/**
 * CloudFlare Pages設定
 */
export interface CloudFlarePagesConfig {
  /** プロジェクト名 */
  project_name: string;
  /** 本番ドメイン */
  production_domain: string;
  /** プレビュードメイン */
  preview_domain?: string;
  /** ビルドコマンド */
  build_command: string;
  /** 出力ディレクトリ */
  output_directory: string;
  /** 環境変数 */
  environment_variables: Record<string, string>;
}

/**
 * CloudFlare Pagesデプロイ結果
 */
export interface CloudFlarePagesDeployResult {
  /** デプロイID */
  deployment_id: string;
  /** デプロイURL */
  url: string;
  /** 環境種別 */
  environment: 'production' | 'preview';
  /** デプロイ状態 */
  status: 'success' | 'failure' | 'in_progress';
  /** 作成時刻 */
  created_on: string;
}

// ========================================
// Supabase関連型定義
// ========================================

/**
 * Supabaseプロジェクト設定
 */
export interface SupabaseConfig {
  /** プロジェクトID */
  project_id: string;
  /** プロジェクトURL */
  url: string;
  /** サービスロールキー */
  service_role_key: string;
  /** データベースURL */
  database_url: string;
  /** テーブルプレフィックス */
  table_prefix: string;
  /** preview環境用テーブルプレフィックス */
  preview_table_prefix?: string;
}

/**
 * Supabaseマイグレーション結果
 */
export interface SupabaseMigrationResult {
  /** マイグレーション名 */
  name: string;
  /** バージョン */
  version: string;
  /** 実行状態 */
  status: 'applied' | 'failed' | 'pending';
  /** 実行時刻 */
  applied_at?: string;
  /** エラー詳細 */
  error?: string;
  /** 環境（本番/プレビュー） */
  environment: 'production' | 'preview';
  /** テーブルプレフィックス */
  table_prefix: string;
}

// ========================================
// 監査・ログ関連型定義
// ========================================

/**
 * デプロイメント監査ログ
 */
export interface DeploymentAuditLog {
  /** 実行ID */
  execution_id: string;
  /** 実行者 */
  actor: string;
  /** 実行時刻 */
  timestamp: string;
  /** 対象環境 */
  environment: 'production' | 'preview';
  /** デプロイ対象サービス */
  services: DeploymentService[];
  /** 実行結果 */
  status: 'success' | 'failure' | 'partial';
  /** 実行時間 */
  duration: number;
  /** エラー詳細 */
  errors?: string[];
}

/**
 * デプロイ対象サービス
 */
export type DeploymentService = 
  | 'infrastructure'
  | 'database' 
  | 'backend'
  | 'frontend';

/**
 * セキュリティスキャン結果
 */
export interface SecurityScanResult {
  /** スキャン種別 */
  scan_type: 'secret_scanning' | 'sast' | 'dependency_check';
  /** スキャン結果 */
  status: 'pass' | 'fail' | 'warning';
  /** 検出された問題 */
  findings: SecurityFinding[];
  /** スキャン実行時刻 */
  scanned_at: string;
}

/**
 * セキュリティ検出事項
 */
export interface SecurityFinding {
  /** 問題の重要度 */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** 問題種別 */
  type: string;
  /** ファイルパス */
  file_path: string;
  /** 行番号 */
  line_number?: number;
  /** 説明 */
  description: string;
  /** 修正方法 */
  remediation?: string;
}

// ========================================
// 環境・設定関連型定義
// ========================================

/**
 * 環境別設定
 */
export interface EnvironmentConfig {
  /** 環境名 */
  name: 'production' | 'preview';
  /** テーブルプレフィックス（preview時は _dev が付与） */
  table_prefix: string;
  /** AWS設定 */
  aws: {
    region: string;
    account_id: string;
    role_arn: string;
  };
  /** CloudFlare設定 */
  cloudflare: CloudFlarePagesConfig;
  /** Supabase設定 */
  supabase: SupabaseConfig;
  /** Lambda設定 */
  lambda: LambdaFunctionConfig;
}

/**
 * GitHub OIDC認証設定
 */
export interface GitHubOIDCConfig {
  /** AWS Role ARN */
  aws_role_arn: string;
  /** OIDC Subject条件 */
  subject_conditions: string[];
  /** 許可するアクション */
  allowed_actions: string[];
  /** セッション時間（秒） */
  session_duration: number;
}

/**
 * エラーハンドリング設定
 */
export interface ErrorHandlingConfig {
  /** 最大再試行回数 */
  max_retries: number;
  /** 初期待機時間（秒） */
  initial_backoff: number;
  /** 最大待機時間（秒） */
  max_backoff: number;
  /** タイムアウト時間（秒） */
  timeout: number;
  /** 重要エラーでの停止フラグ */
  fail_fast: boolean;
}

// ========================================
// API応答型定義
// ========================================

/**
 * 標準API応答
 */
export interface ApiResponse<T = unknown> {
  /** 成功フラグ */
  success: boolean;
  /** 応答データ */
  data?: T;
  /** エラー情報 */
  error?: {
    /** エラーコード */
    code: string;
    /** エラーメッセージ */
    message: string;
    /** 詳細情報 */
    details?: unknown;
  };
  /** 実行時刻 */
  timestamp: string;
}

/**
 * ヘルスチェック応答
 */
export interface HealthCheckResponse {
  /** サービス名 */
  service: string;
  /** ステータス */
  status: 'healthy' | 'unhealthy' | 'degraded';
  /** チェック時刻 */
  checked_at: string;
  /** 応答時間（ミリ秒） */
  response_time: number;
  /** 詳細情報 */
  details?: Record<string, unknown>;
}
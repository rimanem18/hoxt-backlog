/**
 * 継続的デプロイメントシステム TypeScript型定義
 * 
 * 作成日: 2025年09月12日
 * 最終更新: 2025年09月23日
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
  | 'database_migration'
  | 'lambda_deploy'
  | 'lambda_alias_management'
  | 'cloudflare_deploy'
  | 'shared_schemas_install'
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
  runtime: 'nodejs22.x';
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
  /** Function URL */
  function_url: string;
  /** デプロイパッケージサイズ */
  package_size: number;
  /** 最終更新時刻 */
  last_modified: string;
}

/**
 * Lambda エイリアス管理設定
 */
export interface LambdaAliasConfig {
  /** エイリアス名 */
  alias_name: 'stable' | '$LATEST';
  /** 対象バージョン */
  function_version: string;
  /** 説明 */
  description?: string;
  /** 冪等性チェック */
  idempotent: boolean;
}

/**
 * JWKS認証設定
 */
export interface JWKSAuthConfig {
  /** JWKS使用フラグ */
  use_jwks_verifier: boolean;
  /** JWKS検証有効化 */
  enable_jwks_verification: boolean;
  /** HS256フォールバック許可 */
  enable_hs256_fallback: boolean;
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
// PostgreSQL/drizzle-kit関連型定義
// ========================================

/**
 * PostgreSQLスキーマ設定
 *
 * スキーマ分離戦略による環境分離を実現:
 * - Production: app_projectname
 * - Preview: app_projectname_preview
 */
export interface PostgreSQLSchemaConfig {
  /** データベースURL */
  database_url: string;
  /** ベーススキーマ名（環境接尾辞なし） */
  base_schema: string;
  /** 実際に使用するスキーマ名（preview時は base_schema + '_preview'） */
  schema_name: string;
  /** 環境種別 */
  environment: 'production' | 'preview';
  /** RLS有効化 */
  enable_rls: boolean;
}

/**
 * drizzle-kit設定
 */
export interface DrizzleKitConfig {
  /** スキーマファイルパス */
  schema_files: string[];
  /** マイグレーションディレクトリ */
  migrations_directory: string;
  /** データベース接続方式 */
  connection_type: 'direct_url';
  /** Forward-onlyマイグレーション */
  forward_only: boolean;
}

/**
 * マイグレーション実行結果
 */
export interface MigrationResult {
  /** 実行方式 */
  method: 'push' | 'generate';
  /** 実行結果 */
  status: 'success' | 'failure';
  /** 適用されたマイグレーション数 */
  applied_migrations: number;
  /** エラーメッセージ */
  error_message?: string;
  /** 実行時間（秒） */
  duration: number;
}

// ========================================
// Monorepo/shared-schemas関連型定義
// ========================================

/**
 * shared-schemas依存関係設定
 */
export interface SharedSchemasConfig {
  /** パッケージパス */
  package_path: string;
  /** 依存するワークスペース */
  dependent_workspaces: string[];
  /** ビルド前依存関係インストール必須 */
  require_install_before_build: boolean;
}

/**
 * 依存関係インストール結果
 */
export interface DependencyInstallResult {
  /** インストール対象パッケージ */
  package_name: string;
  /** インストール結果 */
  status: 'success' | 'failure';
  /** インストール時間（秒） */
  duration: number;
  /** エラーメッセージ */
  error_message?: string;
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
  /** スキーマ名 */
  schema_name: string;
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
 *
 * Secrets統合戦略：
 * - Repository Secrets に集約し Environment Secrets は廃止
 * - 設定項目を60%削減、更新時の修正箇所を1箇所に統一
 * - OIDC Trust Policy で環境別アクセス制御を実現
 *
 * CORS設定：
 * - access_allow_origin: 許可するオリジン（Production/Preview で異なる）
 * - access_allow_methods: 許可するHTTPメソッド
 * - access_allow_headers: 許可するリクエストヘッダー
 *
 * スキーマ分離戦略：
 * - Production: base_schema (例: app_projectname)
 * - Preview: base_schema + '_preview' (例: app_projectname_preview)
 */
export interface EnvironmentConfig {
  /** 環境名 */
  name: 'production' | 'preview';
  /** ベーススキーマ名（環境接尾辞なし） */
  base_schema: string;
  /** 実際に使用するスキーマ名（preview時は base_schema + '_preview'） */
  schema_name: string;
  /** AWS設定 */
  aws: {
    region: string;
    account_id: string;
    role_arn: string;
  };
  /** CloudFlare設定（単一プロジェクト管理による構成最小化） */
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

// ========================================
// 監視・通知関連型定義（将来拡張用）
// ========================================

/**
 * 監視モジュール設定
 *
 * Terraform monitoring モジュールで使用される設定
 * 現在は将来の拡張に備えた型定義
 */
export interface MonitoringConfig {
  /** プロジェクト名 */
  project_name: string;
  /** 監視対象Lambda関数名リスト */
  lambda_function_names: string[];
  /** CloudWatch アラーム設定 */
  cloudwatch_alarms?: {
    /** エラー率閾値（%） */
    error_rate_threshold: number;
    /** 応答時間閾値（ms） */
    response_time_threshold: number;
    /** 評価期間（分） */
    evaluation_periods: number;
  };
  /** Discord 通知設定 */
  discord_notification?: {
    /** Webhook URL（Secret管理） */
    webhook_url_secret_name: string;
    /** 通知レベル */
    notification_level: 'all' | 'errors_only' | 'critical_only';
  };
}

/**
 * Discord通知ペイロード
 */
export interface DiscordNotificationPayload {
  /** 埋め込みメッセージ */
  embeds: Array<{
    /** タイトル */
    title: string;
    /** 色（10進数） */
    color: number;
    /** フィールド */
    fields: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    /** タイムスタンプ */
    timestamp: string;
  }>;
}
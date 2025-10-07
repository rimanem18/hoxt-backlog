ここよりも下に記載

---

# Production Lambda HTTPエラー監視実装プラン（HOXBL-31）

**作成日**: 2025-10-06 JST
**背景**: Lambda監視のギャップ発見（HTTP 4xx/5xx未監視）
**参照**: /rimane:polythink による多角的検証結果

## 🔍 問題の発見経緯

Lambda Function URLに404リクエストを送信してアラートテストを実施したところ、CloudWatch Alarms（SNS Email通知）が発火しませんでした。

**調査結果**:
- HTTP 404は Lambda実行成功として扱われ、`AWS/Lambda::Errors` メトリクスにカウントされない
- 現在の監視構成は**インフラエラー**（タイムアウト、メモリ不足等）のみをカバー
- **アプリケーションエラー**（HTTP 4xx/5xx）が完全に盲点

**多角的検証（Gemini MCP、o3 MCP、Codex MCP）の結論**:
- ✅ 404エラー除外は一般的（クライアント側の問題が多い）
- ❌ **5xxエラーの見逃しは本番環境では致命的**（即座に監視必須）
- 推奨: Embedded Metric Format (EMF) によるカスタムメトリクス

---

## 📋 実装スコープ

### 優先度別タスク

| 優先度 | タスク | 実装期間 | 影響範囲 |
|-------|-------|---------|---------|
| **🔴 P0（最優先）** | HOXBL-31-1: 5xxエラー監視 | 2-3時間 | 本番障害検知 |
| **🟠 P1（早期）** | HOXBL-31-2: 4xxエラー監視 | 1-2時間 | 異常トラフィック検知 |
| **🟡 P2（中期）** | HOXBL-31-3: MonitoringService抽象化 | 3-4時間 | アーキテクチャ整合性 |

**合計推定工数**: 6-9時間

---

## 🔴 HOXBL-31-1-TDD: EMFミドルウェア実装（P0-TDD）

**目的**: HTTPステータスコードを捕捉し、EMF形式でCloudWatch Logsに出力

**実装方式**: TDD（Red-Green-Refactor）

**推定工数**: 1-1.5時間

**Codex MCPレビュー済み**: ミドルウェア配置順序、セキュリティ、EMF仕様準拠を確認済み

### 実装スコープ

- ファイル: `app/server/src/presentation/http/middleware/emfMetricsMiddleware.ts`

### テストケース（Red）

1. **5xxエラー時に5xxErrorsメトリクスを出力する**
2. **2xx成功時はエラーメトリクスを出力しない**
3. **EMFペイロード構造がCloudWatch仕様に準拠している**（スナップショットテスト）
   - `_aws.CloudWatchMetrics` フィールド検証
   - Namespace, Dimensions, Metrics配列の構造
   - Timestamp, Unit=`Count`, Value numeric
4. **環境変数METRICS_NAMESPACEが反映される**
5. **METRICS_NAMESPACE未設定時にデフォルト値を使用する**

### 実装要件（Green）

- `try/finally` でエラー発生時もメトリクス出力を保証
- `console.log(JSON.stringify(emfPayload))` のみ出力（センシティブデータ除外）
- 環境変数ガード: `process.env.METRICS_NAMESPACE || 'Application/Monitoring'`
- **重要**: ミドルウェア配置は **errorHandlerMiddlewareの後**（最終的なステータスコードを捕捉）

### 実装コード例

```typescript
/**
 * Embedded Metric Format (EMF) によるHTTPメトリクス記録ミドルウェア
 *
 * CloudWatch Logsに構造化ログを出力し、自動的にカスタムメトリクスを生成する。
 * 5xxエラーをメトリクス化する（P0スコープ）。
 *
 * セキュリティ考慮:
 * - リクエストボディ/ヘッダーは記録しない（メトリクスペイロードのみ）
 */
import { createMiddleware } from 'hono/factory';

/**
 * EMFミドルウェア
 * 全HTTPリクエストのレスポンス情報をCloudWatch Metricsに記録する
 */
export const emfMetricsMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();

  try {
    // 下流ミドルウェア・ハンドラーを実行
    await next();
  } finally {
    // エラー発生時もメトリクス出力を保証
    const statusCode = c.res.status;
    const latency = Date.now() - start;

    // Embedded Metric Format仕様に準拠したペイロード
    const emfPayload = {
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: process.env.METRICS_NAMESPACE || 'Application/Monitoring',
            Dimensions: [['Environment']],
            Metrics: [
              { Name: 'Latency', Unit: 'Milliseconds' },
              ...(statusCode >= 500 ? [{ Name: '5xxErrors', Unit: 'Count' }] : []),
            ],
          },
        ],
      },
      Environment: process.env.NODE_ENV || 'unknown',
      StatusCode: statusCode,
      Path: c.req.path,
      Method: c.req.method,
      Latency: latency,
      ...(statusCode >= 500 && { '5xxErrors': 1 }),
    };

    // CloudWatch Logsへ出力（自動的にメトリクス化される）
    console.log(JSON.stringify(emfPayload));
  }
});
```

### チェックリスト

- [ ] Red: テストケース作成
- [ ] Green: 最小実装
- [ ] Refactor: コード品質向上
- [ ] 型チェック: `docker compose exec server bunx tsc --noEmit`
- [ ] Lint: `docker compose exec server bun run fix`
- [ ] テスト: `docker compose exec server bun test`

---

## 🔴 HOXBL-31-1-DIRECT: インフラ統合・設定更新（P0-DIRECT）

**目的**: EMFミドルウェアの統合とCloudWatch Alarms設定

**実装方式**: DIRECT（テスト不要な設定変更）

**推定工数**: 1-1.5時間

### 1. entrypoints統合

- [ ] `app/server/src/entrypoints/index.ts` 修正
  - **重要**: emfMetricsMiddlewareは **errorHandlerMiddlewareの後** に登録

```typescript
import { Hono } from 'hono';
import { errorHandlerMiddleware } from '@/presentation/http/middleware';
import corsMiddleware from '@/presentation/http/middleware/corsMiddleware';
import { emfMetricsMiddleware } from '@/presentation/http/middleware/emfMetricsMiddleware';
import { auth, greet, health, user } from '@/presentation/http/routes';

const createServer = (): Hono => {
  const app = new Hono();

  // 【CORS】: 最初に配置
  app.use('/api/*', corsMiddleware);

  // 【エラーハンドリング】: エラーをキャッチして統一レスポンス
  app.use('/api/*', errorHandlerMiddleware);

  // 【メトリクス記録】: 最終的なステータスコードを記録（エラーハンドリング後）
  app.use('/api/*', emfMetricsMiddleware);

  // API ルートをマウント
  app.route('/api', greet);
  app.route('/api', health);
  app.route('/api', auth);
  app.route('/api', user);

  return app;
};

const app = createServer();

export default app;
```

### 2. Docker Compose設定

- [ ] `compose.yaml` のiacコンテナに環境変数追加（90行目付近）

```yaml
services:
  iac:
    environment:
      # ... 既存の環境変数
      - TF_VAR_metrics_namespace=${METRICS_NAMESPACE}
```

### 3. Terraform実装

#### 3-1. モジュール変数定義
- [ ] `terraform/modules/monitoring/variables.tf` に変数追加

```hcl
variable "metrics_namespace" {
  description = "Metrics namespace for application monitoring"
  type        = string
  default     = "Application/Monitoring"
}
```

#### 3-2. アラーム追加
- [ ] `terraform/modules/monitoring/main.tf` に5xxErrorsアラーム追加

```hcl
# 5xxエラー監視アラーム
resource "aws_cloudwatch_metric_alarm" "lambda_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-lambda-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5xxErrors"
  namespace           = var.metrics_namespace
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "This metric monitors lambda 5xx errors (server-side errors)"
  treat_missing_data  = "notBreaching"

  # SNS通知設定（既存Topicを使用）
  alarm_actions = try([one(aws_sns_topic.lambda_alerts[*].arn)], [])
  ok_actions    = try([one(aws_sns_topic.lambda_alerts[*].arn)], [])

  dimensions = {
    Environment = var.environment
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-5xx-errors-alarm"
  })
}
```

#### 3-3. app層変数定義
- [ ] `terraform/app/variables.tf` に変数追加

```hcl
variable "metrics_namespace" {
  description = "Metrics namespace for application monitoring (platform-agnostic)"
  type        = string
  default     = "Application/Monitoring"
}
```

#### 3-4. モジュール呼び出し修正
- [ ] `terraform/app/main.tf:76` の `module "monitoring_production"` に追加

```hcl
module "monitoring_production" {
  source = "../modules/monitoring"

  project_name         = local.project_name
  environment          = "production"
  lambda_function_name = local.lambda_production_function_name
  metrics_namespace    = var.metrics_namespace  # 追加
  alarm_emails         = length(var.ops_email) > 0 ? [var.ops_email] : []

  tags = merge(
    local.common_tags,
    {
      Component = "Monitoring"
      Scope     = "Production"
    }
  )
}
```

### 4. GitHub Actions Variables設定（手動）

**⚠️ 重要**: デプロイ前に以下の環境変数を設定してください。

#### 設定が必要な変数

- **変数名**: `ENVIRONMENT`
- **値**:
  - 本番環境: `production`
  - プレビュー環境: `preview`

#### 設定理由

EMFミドルウェアが`Environment`ディメンションに使用します。
- `NODE_ENV`はesbuildビルド時に静的に埋め込まれるため使用不可
- `ENVIRONMENT`は実行時環境変数として動的に読み込まれる
- CloudWatch Alarmの`Environment=production`フィルタと整合させるため必須

#### 設定手順

1. GitHubリポジトリの**Settings** > **Secrets and variables** > **Actions**に移動
2. **Variables**タブを選択
3. **New repository variable**をクリック
4. 以下を入力：
   - Name: `ENVIRONMENT`
   - Value: `production`（本番環境の場合）
5. **Add variable**をクリック

#### 設定タイミング

- **本番デプロイ前**: 必ず設定
- **プレビューデプロイ**: オプション（未設定時は`unknown`になり、アラームは発火しない）

### 5. 設計文書更新

- [ ] `docs/design/continuous-deployment/architecture.md`
  - 監視セクション更新（インフラエラー vs アプリケーションエラー）
  - EMF実装方式追記

- [ ] `docs/tasks/continuous-deployment-tasks.md`
  - TASK-702実装詳細にEMFミドルウェア追加

### 6. 最終検証

- [ ] 型チェック: `docker compose exec server bunx tsc --noEmit`
- [ ] Lint: `docker compose exec server bun run fix`
- [ ] Terraform Plan: `make iac-plan-save`
- [ ] Plan出力で5xxErrorsアラームが追加されることを確認

### 7. Git Commit

- [ ] `feat: Production Lambda 5xxエラー監視追加（Codexレビュー反映） HOXBL-31`

---

## 🟠 HOXBL-31-2: 4xxエラートレンド監視（P1）

**目的**: 異常なトラフィックパターン（攻撃、不正リクエスト）を検知

### 実装スコープ

1. **EMFミドルウェア拡張**
   - `4xxErrors` メトリクス追加

2. **Terraform アラーム追加**
   - `4xxErrors` カスタムメトリクスアラーム（閾値: 100エラー/分）

---

### 実装コード

#### emfMetricsMiddleware.ts の拡張

```typescript
// Metrics配列に4xxErrors追加
Metrics: [
  { Name: 'Latency', Unit: 'Milliseconds' },
  ...(statusCode >= 500 ? [{ Name: '5xxErrors', Unit: 'Count' }] : []),
  ...(statusCode >= 400 && statusCode < 500 ? [{ Name: '4xxErrors', Unit: 'Count' }] : []),
],

// ペイロードに4xxErrors追加
...(statusCode >= 500 && { '5xxErrors': 1 }),
...(statusCode >= 400 && statusCode < 500 && { '4xxErrors': 1 }),
```

---

#### Terraform: 4xxErrorsアラーム追加

```hcl
# terraform/modules/monitoring/main.tf

# 4xxエラー監視アラーム（異常トラフィック検知）
resource "aws_cloudwatch_metric_alarm" "lambda_4xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-lambda-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4xxErrors"
  namespace           = var.metrics_namespace
  period              = 60
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "This metric monitors lambda 4xx errors (abnormal traffic pattern)"
  treat_missing_data  = "notBreaching"

  alarm_actions = try([one(aws_sns_topic.lambda_alerts[*].arn)], [])
  ok_actions    = try([one(aws_sns_topic.lambda_alerts[*].arn)], [])

  dimensions = {
    Environment = var.environment
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-4xx-errors-alarm"
  })
}
```

---

### チェックリスト

- [ ] `emfMetricsMiddleware.ts` に4xxErrors追加
- [ ] `terraform/modules/monitoring/main.tf` に4xxErrorsアラーム追加
- [ ] `make iac-plan-save` で動作確認
- [ ] 型チェック: `docker compose exec server bunx tsc --noEmit`
- [ ] Git commit: `feat: Production Lambda 4xxエラートレンド監視追加 HOXBL-31`

---

## 🟡 HOXBL-31-3: MonitoringService抽象化（P2）

**目的**: DDD/Clean Architecture準拠のアーキテクチャ整合性確保

### アーキテクチャ設計

```
┌─────────────────────────────────────────────┐
│ Presentation Layer (HTTP Middleware)       │
│  - metricsMiddleware(monitoring)            │
│    └─ depends on ─┐                         │
└───────────────────┼─────────────────────────┘
                    │ インターフェース依存
┌───────────────────▼─────────────────────────┐
│ Shared Layer (Interface)                   │
│  - MonitoringService (interface)            │
│    - recordHttpStatus()                     │
│    - recordException()                      │
└───────────────────┬─────────────────────────┘
                    │ 実装
┌───────────────────▼─────────────────────────┐
│ Infrastructure Layer (Implementation)       │
│  - CloudWatchMonitoringService              │
│    - EMF形式でCloudWatch Logsに出力         │
└─────────────────────────────────────────────┘
```

**DDD/Clean Architecture原則の適用**:
- **Shared層**: 監視の抽象概念を定義（技術的詳細に非依存）
- **Infrastructure層**: CloudWatch固有の実装（将来Datadog等に交換可能）
- **Presentation層**: インターフェースに依存（具象クラスに非依存）

---

### 実装スコープ

1. **MonitoringService インターフェース**（Shared層）
   - ファイル: `app/server/src/shared/monitoring/MonitoringService.ts`

2. **CloudWatchMonitoringService 実装**（Infrastructure層）
   - ファイル: `app/server/src/infrastructure/monitoring/CloudWatchMonitoringService.ts`
   - EMF形式でCloudWatch Logsに出力

3. **metricsMiddleware リファクタリング**（Presentation層）
   - ファイル: `app/server/src/presentation/http/middleware/metricsMiddleware.ts`
   - MonitoringService依存に変更

4. **依存性注入**（entrypoints）
   - ファイル: `app/server/src/entrypoints/index.ts`
   - CloudWatchMonitoringServiceをインスタンス化

---

### 実装コード

#### MonitoringService.ts（Shared層）

```typescript
/**
 * 監視サービスの抽象インターフェース
 *
 * DDD/Clean Architecture原則に従い、監視の抽象概念をShared層で定義する。
 * 具体的な監視基盤（CloudWatch、Datadog等）はInfrastructure層で実装。
 */

/**
 * HTTPステータスメトリクス
 */
export interface HttpStatusMetrics {
  /** HTTPステータスコード */
  status: number;
  /** リクエストパス */
  path: string;
  /** HTTPメソッド */
  method: string;
  /** レイテンシ（ミリ秒） */
  latency: number;
  /** リクエストID（オプション） */
  requestId?: string;
}

/**
 * 監視サービスインターフェース
 *
 * アプリケーション全体の監視機能を抽象化する。
 * Infrastructure層で具体的な監視基盤（CloudWatch等）を実装する。
 */
export interface MonitoringService {
  /**
   * HTTPリクエストのステータスメトリクスを記録
   * @param metrics - HTTPステータスメトリクス
   */
  recordHttpStatus(metrics: HttpStatusMetrics): void;

  /**
   * 例外発生を記録
   * @param error - 発生した例外
   * @param context - 追加のコンテキスト情報
   */
  recordException(error: Error, context?: Record<string, unknown>): void;
}
```

---

#### CloudWatchMonitoringService.ts（Infrastructure層）

```typescript
/**
 * CloudWatch Embedded Metric Format (EMF) による監視サービス実装
 *
 * MonitoringServiceインターフェースの具体実装。
 * CloudWatch Logsに構造化ログを出力し、自動的にカスタムメトリクスを生成する。
 */
import type {
  MonitoringService,
  HttpStatusMetrics,
} from '@/shared/monitoring/MonitoringService';

/**
 * CloudWatch監視サービス
 *
 * Embedded Metric Format (EMF) を使用してCloudWatch Logsに出力する。
 * CloudWatchが自動的にログからメトリクスを抽出し、カスタムメトリクスを作成する。
 */
export class CloudWatchMonitoringService implements MonitoringService {
  /**
   * HTTPリクエストのステータスメトリクスを記録
   *
   * EMF形式でCloudWatch Logsに出力し、以下のメトリクスを生成：
   * - Latency: レイテンシ（ミリ秒）
   * - 5xxErrors: サーバーエラー数
   * - 4xxErrors: クライアントエラー数
   */
  recordHttpStatus(metrics: HttpStatusMetrics): void {
    const { status, path, method, latency, requestId } = metrics;

    // Embedded Metric Format仕様に準拠したペイロード
    const emfPayload = {
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: process.env.METRICS_NAMESPACE || 'Application/Monitoring',
            Dimensions: [['Environment']],
            Metrics: [
              { Name: 'Latency', Unit: 'Milliseconds' },
              ...(status >= 500
                ? [{ Name: '5xxErrors', Unit: 'Count' }]
                : []),
              ...(status >= 400 && status < 500
                ? [{ Name: '4xxErrors', Unit: 'Count' }]
                : []),
            ],
          },
        ],
      },
      Environment: process.env.NODE_ENV || 'unknown',
      StatusCode: status,
      Path: path,
      Method: method,
      Latency: latency,
      ...(requestId && { RequestId: requestId }),
      ...(status >= 500 && { '5xxErrors': 1 }),
      ...(status >= 400 && status < 500 && { '4xxErrors': 1 }),
    };

    // CloudWatch Logsへ出力（自動的にメトリクス化される）
    console.log(JSON.stringify(emfPayload));
  }

  /**
   * 例外発生を記録
   *
   * エラーログとして構造化情報をCloudWatch Logsに出力する。
   */
  recordException(error: Error, context?: Record<string, unknown>): void {
    console.error('Exception occurred', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  }
}
```

---

#### metricsMiddleware.ts（Presentation層リファクタリング）

```typescript
/**
 * HTTPメトリクス記録ミドルウェア
 *
 * 全HTTPリクエストのレスポンス情報をMonitoringServiceに記録する。
 * MonitoringServiceの具象実装（CloudWatch等）には依存しない。
 */
import { createMiddleware } from 'hono/factory';
import type { MonitoringService } from '@/shared/monitoring/MonitoringService';

/**
 * メトリクスミドルウェア
 *
 * 依存性注入パターンを使用し、MonitoringServiceインターフェースに依存する。
 * 具体的な監視基盤（CloudWatch、Datadog等）は実行時に注入される。
 *
 * @param monitoring - 監視サービスインスタンス
 */
export const metricsMiddleware = (monitoring: MonitoringService) =>
  createMiddleware(async (c, next) => {
    const start = Date.now();

    // 下流ミドルウェア・ハンドラーを実行
    await next();

    // HTTPステータスメトリクスを記録
    monitoring.recordHttpStatus({
      status: c.res.status,
      path: c.req.path,
      method: c.req.method,
      latency: Date.now() - start,
      requestId: c.req.header('x-request-id'),
    });
  });
```

---

#### entrypoints/index.ts（依存性注入）

```typescript
import { Hono } from 'hono';
import { errorHandlerMiddleware } from '@/presentation/http/middleware';
import corsMiddleware from '@/presentation/http/middleware/corsMiddleware';
import { metricsMiddleware } from '@/presentation/http/middleware/metricsMiddleware';
import { CloudWatchMonitoringService } from '@/infrastructure/monitoring/CloudWatchMonitoringService';
import { auth, greet, health, user } from '@/presentation/http/routes';

/**
 * Hono アプリケーションサーバーを作成する
 *
 * DDD/Clean Architecture原則に従い、依存性注入パターンを使用。
 * 監視サービスの具象実装（CloudWatchMonitoringService）をここで注入する。
 */
const createServer = (): Hono => {
  const app = new Hono();

  // 依存性注入: CloudWatch監視サービスをインスタンス化
  const monitoring = new CloudWatchMonitoringService();

  // CORSミドルウェア（最初に適用）
  app.use('/api/*', corsMiddleware);

  // メトリクス記録ミドルウェア（監視サービスを注入）
  app.use('/api/*', metricsMiddleware(monitoring));

  // エラーハンドリングミドルウェア
  app.use('/api/*', errorHandlerMiddleware);

  // APIルートをマウント
  app.route('/api', greet);
  app.route('/api', health);
  app.route('/api', auth);
  app.route('/api', user);

  return app;
};

const app = createServer();

export default app;
```

---

### チェックリスト

#### インターフェース設計（Shared層）
- [ ] `app/server/src/shared/monitoring/MonitoringService.ts` 作成
- [ ] HttpStatusMetrics型定義
- [ ] MonitoringServiceインターフェース定義

#### 実装（Infrastructure層）
- [ ] `app/server/src/infrastructure/monitoring/CloudWatchMonitoringService.ts` 作成
- [ ] recordHttpStatus() 実装（EMF形式）
- [ ] recordException() 実装

#### ミドルウェアリファクタリング（Presentation層）
- [ ] `app/server/src/presentation/http/middleware/metricsMiddleware.ts` 作成
- [ ] MonitoringService依存に変更
- [ ] `emfMetricsMiddleware.ts` を削除（metricsMiddlewareに統合）

#### 依存性注入（entrypoints）
- [ ] `app/server/src/entrypoints/index.ts` 修正
- [ ] CloudWatchMonitoringServiceインスタンス化
- [ ] metricsMiddleware(monitoring) で注入

#### テスト & 検証
- [ ] 型チェック: `docker compose exec server bunx tsc --noEmit`
- [ ] Lint: `docker compose exec server bun run fix`
- [ ] `make iac-plan-save` で既存Terraform設定に影響ないことを確認
- [ ] ローカルで動作確認

#### Git Commit
- [ ] `refactor: MonitoringService抽象化でDDD/Clean Architecture準拠 HOXBL-31`

---

## 📅 実装スケジュール

### Week 1: P0（最優先）
- **Day 1-2**: HOXBL-31-1 実装（5xxエラー監視）
  - EMFミドルウェア実装
  - Terraform設定追加
  - 設計文書更新
  - デプロイ & 動作確認

### Week 2: P1（早期）
- **Day 3**: HOXBL-31-2 実装（4xxエラー監視）
  - ミドルウェア拡張
  - Terraform設定追加
  - デプロイ & 動作確認

### Week 3-4: P2（中期）
- **Day 4-7**: HOXBL-31-3 実装（MonitoringService抽象化）
  - MonitoringServiceインターフェース設計
  - CloudWatchMonitoringService実装
  - metricsMiddlewareリファクタリング
  - 依存性注入統合
  - テスト & 検証

---

## 📚 参考資料

### AWS公式ドキュメント
- [Embedded Metric Format Specification](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html)
- [CloudWatch Alarms Best Practices](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Best_Practice_Recommended_Alarms_AWS_Services.html)
- [Lambda Monitoring Metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html)

### アーキテクチャ原則
- Google SRE Book: Golden Signals (latency, traffic, errors, saturation)
- AWS Well-Architected Framework: Operational Excellence Pillar
- Eric Evans: Domain-Driven Design - Infrastructure Layer

---

## 🔧 環境変数化のTODO（プロジェクト固有名称の除去）

### 背景
プロジェクト固有の名称をコードやドキュメントから除去し、環境変数で管理する。
DDD/Clean Architecture の依存性逆転の原則（DIP）に基づき、環境変数名も監視基盤（CloudWatch等）に依存しない抽象的な名前を使用する。

### 必要な対応（実装ガイダンス）

#### 1. 環境変数定義
- [x] `.env.example` に `METRICS_NAMESPACE` を追加（完了）
  ```bash
  # メトリクス名前空間（監視基盤に依存しない抽象概念）
  METRICS_NAMESPACE=Application/Monitoring
  ```

#### 2. Docker Compose設定
- [x] `compose.yaml` の server サービスに環境変数を追加（完了）
  ```yaml
  services:
    server:
      environment:
        - METRICS_NAMESPACE=${METRICS_NAMESPACE}
  ```

#### 3. Terraform変数定義
- [ ] `terraform/app/variables.tf` に変数追加
  ```hcl
  variable "metrics_namespace" {
    description = "Metrics namespace for application monitoring (platform-agnostic)"
    type        = string
    default     = "Application/Monitoring"
  }
  ```

- [ ] `terraform/modules/monitoring/variables.tf` に変数追加
  ```hcl
  variable "metrics_namespace" {
    description = "Metrics namespace for application monitoring"
    type        = string
  }
  ```

- [ ] `terraform/app/main.tf` で monitoring モジュールに渡す
  ```hcl
  module "monitoring_production" {
    source            = "../modules/monitoring"
    metrics_namespace = var.metrics_namespace
    # ... 他のパラメータ
  }
  ```

- [ ] Makefile または GitHub Actions ワークフローで環境変数を渡す
  ```makefile
  # Makefile 例
  iac-plan-save:
  	export TF_VAR_metrics_namespace=${METRICS_NAMESPACE} && \
  	docker compose exec iac terraform plan -out=tfplan
  ```

  ```yaml
  # GitHub Actions 例
  env:
    TF_VAR_metrics_namespace: ${{ secrets.METRICS_NAMESPACE }}
  ```

#### 4. 実装時の注意
- [ ] TypeScriptコードで `process.env.METRICS_NAMESPACE` を使用
- [ ] デフォルト値は `'Application/Monitoring'` など汎用的な名前にする
- [ ] Terraform で `var.metrics_namespace` を使用
- [ ] 環境変数名は監視基盤（CloudWatch、Datadog等）に依存しない抽象的な名前にする

### DDD/Clean Architecture 原則の適用
- **抽象化レベルの一貫性**: 環境変数も MonitoringService と同じ抽象レベルで命名
- **Infrastructure 層の責務**: CloudWatch 固有の詳細（EMF の Namespace フィールド等）は CloudWatchMonitoringService が解釈
- **交換可能性の保証**: `METRICS_NAMESPACE` は監視基盤に依存しないため、将来 Datadog に切り替えても環境変数は変更不要

---

**更新履歴**:
- 2025-10-06: 初版作成（Lambda HTTPエラー監視実装プラン）
- 2025-10-06: 環境変数化TODOセクション追加（プロジェクト固有名称の除去）

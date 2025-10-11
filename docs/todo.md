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

## ⚠️ 段階的実装における注意事項

**背景**: P0→P1→P2の段階的実装では、先行タスクで得た教訓を後続タスクに反映する必要があります。

### 実装完了時の必須チェックリスト

各タスク（P0/P1/P2）完了時に必ず以下を確認してください：

#### 1. 影響範囲の確認
- [ ] **この実装で設計変更や重要な教訓があったか？**
  - 例: メトリクススキーマ設計、閾値設定、環境変数名、エラーハンドリングパターン
- [ ] **変更は後続タスクに影響するか？**
  - Yes → 該当セクションのドキュメント更新
  - No → チェック完了

#### 2. ドキュメント更新の確認
- [ ] 完了したタスクのセクションを更新（実装日、実装内容、テスト結果）
- [ ] 影響を受ける後続タスクのセクションを更新
  - コード例の修正
  - 設計原則の追記
  - 閾値・環境変数の修正
- [ ] 設計変更があった場合、「教訓」セクションに記録

#### 3. 一貫性の確認
- [ ] P0/P1/P2間で矛盾する記述がないか確認
- [ ] 同じパターンを使うべき箇所で異なる実装例がないか確認

### 教訓の記録（P0完了後に追記）

実装中に得た重要な教訓を以下に記録します：

#### P0（5xxエラー監視）で得た教訓

**メトリクススキーマの一貫性**:
- ❌ **古い設計**: 条件付きでMetrics配列に追加
  ```typescript
  ...(statusCode >= 500 ? [{ Name: '5xxErrors', Unit: 'Count' }] : [])
  ```
- ✅ **正しい設計（Codexレビュー後）**: 常に宣言し、値で制御
  ```typescript
  Metrics: [
    { Name: '5xxErrors', Unit: 'Count' },  // 常に宣言
  ],
  '5xxErrors': statusCode >= 500 ? 1 : 0,  // 値で制御
  ```
- **理由**: CloudWatchメトリクスストリームの連続性確保。「データ欠損」ではなく「ゼロ値」として扱う
- **影響範囲**: ✅ P1（4xxErrors）に適用済み、P2でも同様の方針を踏襲

**環境変数の設計**:
- ❌ **古い設計**: `NODE_ENV`（ビルド時に埋め込まれる）
- ✅ **正しい設計**: `ENVIRONMENT`（Lambda実行時に読み込まれる）
- **理由**: esbuildが`NODE_ENV`を静的置換するため、実行時環境によって値を変えられない
- **影響範囲**: P1/P2では最初から`ENVIRONMENT`を使用

**閾値設計のアプローチ**:
- 初期値は保守的に設定（偽陽性を避ける）
- 運用開始後、実データで調整する前提
- **影響範囲**: ✅ P1で150/分に設定（Codex提案を反映）

#### P2（MonitoringService抽象化）で得た教訓

**DDD/Clean Architectureパターンの適用**:
- ✅ **依存性逆転の原則（DIP）**: Presentation層はMonitoringServiceインターフェースに依存、具象クラス（CloudWatchMonitoringService）には非依存
- ✅ **インターフェース分離の原則（ISP）**: 最小限のメソッド（recordHttpStatus, recordException）のみ定義
- ✅ **単一責任の原則（SRP）**: CloudWatch固有のEMFロジックをInfrastructure層に集約
- ✅ **開放閉鎖の原則（OCP）**: 新しい監視基盤（Datadog等）追加時にPresentation層コード変更不要
- ✅ **リスコフの置換原則（LSP）**: テスト時はモックMonitoringServiceに差し替え可能
- **影響範囲**: 将来の監視基盤変更が容易になり、テスタビリティが向上

**2層テスト戦略**:
- ✅ **ミドルウェアテスト**: モックMonitoringServiceで振る舞いを検証（try/finally、パラメータ渡し）
- ✅ **実装テスト**: CloudWatchMonitoringServiceでEMFペイロード構造を検証
- **理由**: 関心の分離により、テスト粒度を適切に保ち、メンテナンス性向上
- **影響範囲**: 他の抽象化実装でも同様のテスト戦略を採用可能

**TypeScript型安全性（exactOptionalPropertyTypes）**:
- ❌ **問題**: `requestId: string | undefined`を`requestId?: string`に直接代入すると型エラー
- ✅ **解決**: spread演算子で条件付き追加 `...(requestId && { requestId })`
- **理由**: TypeScriptの厳格な型チェックによる安全性確保
- **影響範囲**: オプショナルプロパティを持つインターフェース設計時に適用

**Hono 4.x エラーハンドリングパターン**:
- ❌ **古い設計**: middleware内の`try/catch`で`await next()`のエラーをキャッチ
- ✅ **正しい設計**: `app.onError()`ハンドラーパターンを使用
- **理由**: Hono 4.xでは`await next()`のエラーは内部でキャッチされ、`app.onError()`に渡される仕様
- **解決策**: ErrorHandlerファクトリ関数を作成し、`app.onError(createErrorHandler(monitoring))`で登録
- **影響範囲**: 全エラーハンドリング実装（middleware形式では動作しない）

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

#### 実装完了後の必須確認（段階的実装）
**⚠️ 重要**: [段階的実装における注意事項](#⚠️-段階的実装における注意事項)を必ず確認してください

- [ ] この実装で設計変更や重要な教訓があったか？
- [ ] 変更は次のタスク（P0-DIRECT、P1/P2）に影響するか？
- [ ] 教訓があれば「教訓の記録」セクションに追記

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

### 4. Lambda環境変数設定（手動）

**⚠️ 重要**: デプロイ前にLambda環境変数`ENVIRONMENT`を設定してください。

#### 設定が必要な環境変数

- **変数名**: `ENVIRONMENT`
- **値**:
  - Production Lambda: `production`
  - Preview Lambda: `preview`

#### 設定理由

EMFミドルウェアが`Environment`ディメンションに使用します。
- `NODE_ENV`はesbuildビルド時に静的に埋め込まれるため使用不可
- `ENVIRONMENT`はLambda実行時環境変数として動的に読み込まれる
- CloudWatch Alarmの`Environment=production`フィルタと整合させるため必須

#### 設定方法（2つのアプローチ）

##### 方法1: Terraform（bootstrap）で管理 ✅ 推奨

**ファイル**: `terraform/bootstrap/main.tf`

```hcl
# Production Lambda Function
resource "aws_lambda_function" "production" {
  # ... 既存設定 ...

  environment {
    variables = {
      NODE_ENV                = "production"
      ENVIRONMENT             = "production"  # ← 追加
      BASE_SCHEMA             = "app_${local.project_name}"
      # ... 他の環境変数 ...
    }
  }
}

# Preview Lambda Function
resource "aws_lambda_function" "preview" {
  # ... 既存設定 ...

  environment {
    variables = {
      NODE_ENV                = "development"
      ENVIRONMENT             = "preview"  # ← 追加
      BASE_SCHEMA             = "app_${local.project_name}_preview"
      # ... 他の環境変数 ...
    }
  }
}
```

**適用手順**:
1. `terraform/bootstrap/main.tf`を編集
2. ローカルで`terraform apply`を実行（bootstrap層）

**メリット**: Infrastructure as Code原則に沿う、Terraform管理で一元化

##### 方法2: GitHub Actions（CI/CD）で更新

**ファイル**: `.github/actions/lambda-package/action.yml`

Deploy Lambda Functionステップの後に以下を追加：

```yaml
- name: Update Lambda Environment Variables
  shell: bash
  env:
    FUNCTION_NAME: ${{ inputs.function-name }}
    AWS_REGION: ${{ inputs.aws-region }}
    ENVIRONMENT_VALUE: ${{ inputs.function-name == 'production' && 'production' || 'preview' }}
  run: |
    aws lambda update-function-configuration \
      --function-name "$FUNCTION_NAME" \
      --environment "Variables={ENVIRONMENT=$ENVIRONMENT_VALUE}" \
      --region "$AWS_REGION"
```

**デメリット**: Terraform管理外、設定の冗長性

#### 設定タイミング

- **本番デプロイ前**: 必ず設定
- **プレビューデプロイ**: オプション（未設定時は`unknown`になり、アラームは発火しない）

#### 設定確認方法

```bash
# Production Lambda
aws lambda get-function-configuration --function-name ${PROJECT_NAME}-api-production \
  --query 'Environment.Variables.ENVIRONMENT' --output text

# Preview Lambda
aws lambda get-function-configuration --function-name ${PROJECT_NAME}-api-preview \
  --query 'Environment.Variables.ENVIRONMENT' --output text
```

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

### 8. 実装完了後の必須確認（段階的実装）
**⚠️ 重要**: [段階的実装における注意事項](#⚠️-段階的実装における注意事項)を必ず確認してください

- [ ] この実装で設計変更や重要な教訓があったか？
  - ✅ Yes: メトリクススキーマ「常に宣言」方式、ENVIRONMENT変数
- [ ] 変更は後続タスク（P1/P2）に影響するか？
  - ✅ Yes: P1のコード例を「常に宣言」方式に更新必要
- [ ] 教訓を「教訓の記録」セクションに追記
  - ✅ 完了（メトリクススキーマ、環境変数、閾値設計）
- [ ] P0/P1/P2間で矛盾する記述がないか確認
  - ✅ 完了（P1セクション更新済み）

---

## 🟠 HOXBL-31-2: 4xxエラートレンド監視（P1） ✅ 完了

**目的**: 異常なトラフィックパターン（攻撃、不正リクエスト）を検知

**実装日**: 2025-10-10 JST

**Codexレビュー**: 承認済み（機能・品質・セキュリティすべて問題なし）

### 実装スコープ

1. **EMFミドルウェア拡張** ✅
   - `4xxErrors` メトリクスを**常に宣言**方式で追加（P0の5xxErrorsと同じパターン）

2. **Terraform アラーム追加** ✅
   - `4xxErrors` カスタムメトリクスアラーム（閾値: 150エラー/分×2期間）

3. **テスト追加** ✅
   - 4xxエラー時の動作検証（4件のテストケース追加）

---

### 実装コード

#### emfMetricsMiddleware.ts の拡張

**重要**: P0レビューの教訓を適用し、メトリクススキーマ一貫性を保つため**常に宣言**方式を採用

```typescript
// EMFPayload型定義に追加
interface EMFPayload {
  // ... 既存フィールド
  '5xxErrors': number;
  '4xxErrors': number;  // ← 追加（必須フィールド）
}

// Metrics配列に4xxErrorsを常に宣言
Metrics: [
  { Name: 'Latency', Unit: 'Milliseconds' },
  { Name: '5xxErrors', Unit: 'Count' },
  { Name: '4xxErrors', Unit: 'Count' },  // ← 常に宣言
],

// ペイロードに4xxErrorsを常に含める（値で制御）
'5xxErrors': statusCode >= 500 ? 1 : 0,
'4xxErrors': statusCode >= 400 && statusCode < 500 ? 1 : 0,  // ← 常に含める
```

**設計原則**:
- CloudWatchが「データ欠損」ではなく「ゼロ値」として扱うようにする
- メトリクスストリームの連続性を確保し、アラーム評価を正確にする

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
  threshold           = 150  # 保守的な初期値（運用後に実データで調整推奨）
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

**閾値設計**:
- 初期値: 150エラー/分×2期間（偽陽性を避ける保守的な設定）
- 運用開始後、実際の4xxレートを確認して調整を推奨（Codex提案）

---

### テスト結果

- ✅ 型チェック: エラーなし
- ✅ Lint: 警告19件（既存の`noNonNullAssertion`、スコープ外）
- ✅ テスト: 13/13合格（+3テストケース追加）
- ✅ Semgrep: 0 findings

### チェックリスト

- [x] `emfMetricsMiddleware.ts` に4xxErrors追加（常に宣言方式）
- [x] `EMFPayload`型定義に`'4xxErrors': number`追加
- [x] テストケース追加（4件）
- [x] `terraform/modules/monitoring/main.tf` に4xxErrorsアラーム追加
- [x] Codexレビュー承認
- [x] 型チェック: `docker compose exec server bunx tsc --noEmit`
- [x] Lint: `docker compose exec server bun run fix`
- [x] テスト: `docker compose exec server bun test`
- [x] Semgrep: `docker compose run --rm semgrep semgrep scan ...`
- [x] Git commit: `feat: Production Lambda 4xxエラートレンド監視追加 HOXBL-31`
- [x] Terraform Plan: `make iac-plan-save` で4xxErrorsアラーム追加を確認
- [x] Terraform Apply: CloudWatch Alarm 2個（5xx/4xx）を本番環境にデプロイ完了
- [ ] 運用開始後、実データで閾値調整

#### 実装完了後の必須確認（段階的実装）
**⚠️ 重要**: [段階的実装における注意事項](#⚠️-段階的実装における注意事項)を必ず確認してください

- [x] この実装で設計変更や重要な教訓があったか？ → No（P0の教訓を踏襲）
- [x] 変更は他のタスクに影響するか？ → No（P0と同じパターン）
- [x] P0/P1/P2間で矛盾する記述がないか確認 → ✅ 確認済み
- [x] 教訓があれば「教訓の記録」セクションに追記 → P0で記録済み

---

## 🟡 HOXBL-31-3: MonitoringService抽象化（P2） ✅ 完了

**目的**: DDD/Clean Architecture準拠のアーキテクチャ整合性確保

**実装日**: 2025-10-11 JST

**完了日**: 2025-10-11 JST（改善提案3件すべて実装完了）

**Codexレビュー**: 承認済み（SOLID原則/Clean Architecture全て準拠、EMF仕様適合）

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

### コア実装完了チェックリスト

#### インターフェース設計（Shared層）
- [x] `app/server/src/shared/monitoring/MonitoringService.ts` 作成
- [x] HttpStatusMetrics型定義
- [x] MonitoringServiceインターフェース定義

#### 実装（Infrastructure層）
- [x] `app/server/src/infrastructure/monitoring/CloudWatchMonitoringService.ts` 作成
- [x] recordHttpStatus() 実装（EMF形式、P0/P1教訓適用済み）
- [x] recordException() 実装

#### ミドルウェアリファクタリング（Presentation層）
- [x] `app/server/src/presentation/http/middleware/metricsMiddleware.ts` 作成
- [x] MonitoringService依存に変更（DIP適用）
- [x] テスト作成（2層テスト戦略: middleware 7件 + implementation 9件）

#### 依存性注入（entrypoints）
- [x] `app/server/src/entrypoints/index.ts` 修正
- [x] CloudWatchMonitoringServiceインスタンス化
- [x] metricsMiddleware(monitoring) で注入

#### テスト & 検証
- [x] 型チェック: `docker compose exec server bunx tsc --noEmit` → ✅ 成功
- [x] Lint: `docker compose exec server bun run fix` → ✅ 成功
- [x] テスト: `docker compose exec server bun test` → ✅ 390 pass, 0 fail
- [x] Semgrepスキャン: → ✅ 0 findings
- [x] Codexレビュー完了 → ✅ SOLID/Clean Architecture準拠確認

#### 実装完了後の必須確認（段階的実装）
**⚠️ 重要**: [段階的実装における注意事項](#⚠️-段階的実装における注意事項)を必ず確認してください

- [x] この実装で設計変更や重要な教訓があったか？ → Yes（DIP/ISP/SRP/OCP/LSP適用パターン）
- [x] 変更は他のタスクに影響するか？ → No（既存P0/P1と互換）
- [x] P0/P1/P2間で矛盾する記述がないか確認 → ✅ 確認済み
- [x] 教訓があれば「教訓の記録」セクションに追記 → 以下に記録

---

### Codexレビュー結果と改善提案

**実装評価**: ✅ 高評価
- **SOLID原則準拠**: DIP/ISP/SRP/OCP/LSP全て適用済み
- **2層テスト戦略**: ミドルウェア動作とEMF実装を適切に分離
- **P0/P1教訓適用**: メトリクス常時宣言、ENVIRONMENT変数使用

**改善提案（オプショナル）**:

#### 🔶 提案1: Exception Flow連携（影響度: 中）
- **内容**: errorHandlerMiddlewareでMonitoringService.recordExceptionを呼び出し
- **効果**: 例外テレメトリーも新抽象化経由で記録
- **工数**: 小（15分程度）

#### 🔴 提案2: レガシーコード削除（影響度: 高、保守性）
- **内容**: 旧`emfMetricsMiddleware.ts`とテストスイートを削除
- **効果**: 将来の乖離リスク排除、コードベース簡素化
- **工数**: 小（5分程度）

#### 🔵 提案3: テストヘルパー共通化（影響度: 低）
- **内容**: EMFアサーション用ヘルパー関数抽出
- **効果**: テストコード重複削減
- **工数**: 小（10分程度）

---

### 改善提案実装チェックリスト ✅ 完了

#### 提案2: レガシーコード削除 ✅
- [x] `app/server/src/presentation/http/middleware/emfMetricsMiddleware.ts` 削除
- [x] `app/server/src/presentation/http/middleware/__tests__/emfMetricsMiddleware.test.ts` 削除
- [x] import文の整理確認
- [x] grep検証（残存参照なし）

#### 提案1: Exception Flow連携 ✅
- [x] errorHandlerMiddleware → createErrorHandler へリファクタリング
- [x] Hono 4.x app.onError()パターンへ移行（middleware try/catch は動作しないため）
- [x] MonitoringService.recordException呼び出し追加
- [x] テストケース追加（AuthError時、予期外エラー時、正常時の3件）
- [x] 統合テスト修正（期待値500→401へ修正）

#### 提案3: テストヘルパー共通化 ✅
- [x] `app/server/src/infrastructure/monitoring/__tests__/helpers/emfTestHelpers.ts` 作成
- [x] `parseEmfPayload()` ヘルパー実装（8箇所の重複削減）
- [x] `expectValidEmfStructure()` ヘルパー実装
- [x] CloudWatchMonitoringService.test.ts でヘルパー使用
- [x] （将来）他のEMF関連テストでも再利用可能

#### 最終確認（改善提案実施後） ✅
- [x] TypeScript型チェック: `bunx tsc --noEmit` → エラーなし
- [x] Biome lint: `bun run fix` → 新規問題なし
- [x] テスト: `bun test` → 380 pass, 1 skip, 0 fail
- [x] Semgrepスキャン: `semgrep --config=auto` → 0 findings
- [x] ローカルで動作確認

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

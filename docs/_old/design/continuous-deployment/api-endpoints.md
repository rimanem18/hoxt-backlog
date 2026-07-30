# デプロイメントAPI仕様

作成日: 2025年09月12日
最終更新: 2025年09月23日

## API概要

継続的デプロイメントシステムで使用される各種API仕様。GitHub Actions、AWS、CloudFlare、Supabaseとの連携に必要なエンドポイント・認証・データ形式を定義する。

### 技術スタックバージョン要件
- **Terraform**: 1.6以上
- **Node.js**: 22以上
- **Hono**: 4以上
- **Next.js**: 15以上
- **GitHub Actions**: 最新版推奨

### CloudFlare Pages Direct Upload 採用理由
- **Terraform統合**: GitHub統合を使用せず、Terraformによる完全な構成管理を実現
- **デプロイタイミング制御**: GitHub Actionsから明示的にデプロイタイミングを制御
- **構成同期保証**: Production と Preview の設定を Terraform で一元管理
- **個人開発最適化**: 最小構成で運用負荷を軽減

## GitHub API

### リポジトリ情報取得
```http
GET /repos/{owner}/{repo}
Authorization: Bearer {github_token}
```

**レスポンス例:**
```json
{
  "id": 123456789,
  "name": "hoxt-backlog",
  "full_name": "rimane/hoxt-backlog",
  "default_branch": "main",
  "pushed_at": "2025-09-12T10:30:00Z"
}
```

### PR情報取得
```http
GET /repos/{owner}/{repo}/pulls/{pull_number}
Authorization: Bearer {github_token}
```

**レスポンス例:**
```json
{
  "number": 42,
  "state": "open",
  "head": {
    "ref": "feature/new-auth",
    "sha": "abc123def456"
  },
  "base": {
    "ref": "main",
    "sha": "def456abc789"
  }
}
```

### コミット状態更新
```http
POST /repos/{owner}/{repo}/statuses/{sha}
Authorization: Bearer {github_token}
Content-Type: application/json

{
  "state": "pending|success|error|failure",
  "target_url": "https://github.com/rimane/hoxt-backlog/actions/runs/123",
  "description": "Deployment in progress",
  "context": "continuous-deployment"
}
```

## AWS Lambda API

### 関数コード更新
```http
PUT /2015-03-31/functions/{function_name}/code
Authorization: AWS4-HMAC-SHA256 ...
Content-Type: application/zip

{binary_zip_data}
```

**レスポンス例:**
```json
{
  "FunctionName": "hoxt-backlog-api-production",
  "FunctionArn": "arn:aws:lambda:ap-northeast-1:123456789012:function:hoxt-backlog-api-production",
  "Runtime": "nodejs22.x",
  "Version": "42",
  "LastModified": "2025-09-12T10:30:00.000+0000",
  "CodeSha256": "abc123def456...",
  "CodeSize": 1024000
}
```

### エイリアス更新
```http
PUT /2015-03-31/functions/{function_name}/aliases/{name}
Authorization: AWS4-HMAC-SHA256 ...
Content-Type: application/json

{
  "FunctionVersion": "42",
  "Description": "Stable version deployment"
}
```

**レスポンス例:**
```json
{
  "AliasArn": "arn:aws:lambda:ap-northeast-1:123456789012:function:hoxt-backlog-api-production:stable",
  "Name": "stable",
  "FunctionVersion": "42",
  "Description": "Stable version deployment"
}
```

### 関数実行（Hono Lambda adapter）
```http
POST /2015-03-31/functions/{function_name}/invocations
Authorization: AWS4-HMAC-SHA256 ...
Content-Type: application/json

{
  "version": "2.0",
  "routeKey": "GET /health",
  "rawPath": "/health",
  "rawQueryString": "",
  "headers": {
    "accept": "application/json"
  },
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/health",
      "protocol": "HTTP/1.1"
    }
  },
  "body": null,
  "isBase64Encoded": false
}
```

**レスポンス例（Hono Lambda adapter）:**
```json
{
  "statusCode": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": "{\"message\":\"API is healthy\"}",
  "isBase64Encoded": false
}
```

## AWS API Gateway API

### ステージ情報取得
```http
GET /v2/apis/{api_id}/stages/{stage_name}
Authorization: AWS4-HMAC-SHA256 ...
```

**レスポンス例:**
```json
{
  "StageName": "$default",
  "ApiId": "abc123def456",
  "DeploymentId": "def456",
  "LastUpdatedDate": "2025-09-12T10:30:00Z",
  "Tags": {
    "Environment": "production",
    "Project": "hoxt-backlog"
  }
}
```

## CloudFlare Pages API

### プロジェクト情報取得
```http
GET /client/v4/accounts/{account_id}/pages/projects/{project_name}
Authorization: Bearer {cloudflare_token}
```

**レスポンス例:**
```json
{
  "result": {
    "name": "hoxt-backlog-production",
    "subdomain": "hoxt-backlog-production.pages.dev",
    "domains": ["hoxt-backlog.com"],
    "created_on": "2025-09-12T10:00:00Z",
    "production_branch": "main"
  },
  "success": true
}
```

### デプロイメント作成
```http
POST /client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments
Authorization: Bearer {cloudflare_token}
Content-Type: multipart/form-data

--boundary123
Content-Disposition: form-data; name="manifest"

{"index.html": "abc123def456..."}
--boundary123
Content-Disposition: form-data; name="index.html"; filename="index.html"

<!DOCTYPE html>...
--boundary123--
```

**レスポンス例:**
```json
{
  "result": {
    "id": "def456abc789",
    "url": "https://def456abc789.hoxt-backlog-production.pages.dev",
    "environment": "production",
    "created_on": "2025-09-12T10:30:00Z",
    "stage": "build",
    "latest_stage": {
      "name": "build",
      "status": "success",
      "ended_on": "2025-09-12T10:31:00Z"
    }
  },
  "success": true
}
```

### デプロイメント状態確認
```http
GET /client/v4/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}
Authorization: Bearer {cloudflare_token}
```

**レスポンス例:**
```json
{
  "result": {
    "id": "def456abc789",
    "short_id": "def456ab",
    "status": "success",
    "stage": "deploy",
    "url": "https://def456abc789.hoxt-backlog-production.pages.dev",
    "created_on": "2025-09-12T10:30:00Z",
    "modified_on": "2025-09-12T10:32:00Z"
  },
  "success": true
}
```

## Supabase Management API

### プロジェクト情報取得
```http
GET /v1/projects/{project_id}
Authorization: Bearer {supabase_token}
```

**レスポンス例:**
```json
{
  "id": "abcdefghijklmnop",
  "name": "hoxt-backlog-production",
  "organization_id": "org_123456",
  "region": "ap-northeast-1",
  "created_at": "2025-09-01T00:00:00.000Z",
  "database": {
    "host": "db.abcdefghijklmnop.supabase.co",
    "version": "15.1"
  }
}
```

### マイグレーション実行
```http
POST /v1/projects/{project_id}/database/migrations
Authorization: Bearer {supabase_token}
Content-Type: application/json

{
  "name": "20250912_add_user_table",
  "sql": "CREATE TABLE users (id UUID PRIMARY KEY, name TEXT NOT NULL);"
}
```

**レスポンス例:**
```json
{
  "name": "20250912_add_user_table",
  "version": "20250912103000",
  "status": "applied",
  "applied_at": "2025-09-12T10:30:00.000Z"
}
```

### スキーマ管理（Preview環境）
PostgreSQLスキーマによる環境分離を実現。

#### Preview環境スキーマ作成
```sql
-- Production: app_projectname (BASE_SCHEMA = app_projectname)
-- Preview: app_projectname_preview (BASE_SCHEMA = app_projectname_preview)
CREATE SCHEMA IF NOT EXISTS ${BASE_SCHEMA};
GRANT USAGE ON SCHEMA ${BASE_SCHEMA} TO PUBLIC;
GRANT CREATE ON SCHEMA ${BASE_SCHEMA} TO PUBLIC;

-- テーブルはスキーマ内に作成
CREATE TABLE IF NOT EXISTS ${BASE_SCHEMA}.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Preview環境スキーマ削除
```sql
-- PR終了時のcleanup (BASE_SCHEMA = app_projectname_preview)
-- CASCADE により全テーブル・ビュー・関数が一括削除される
DROP SCHEMA IF EXISTS ${BASE_SCHEMA} CASCADE;
```

## Terraform Cloud API (State Management)

### ワークスペース状態取得
```http
GET /api/v2/workspaces/{workspace_id}/current-state-version
Authorization: Bearer {terraform_token}
```

**レスポンス例:**
```json
{
  "data": {
    "id": "sv-123456",
    "type": "state-versions",
    "attributes": {
      "created-at": "2025-09-12T10:30:00Z",
      "serial": 42,
      "terraform-version": "1.6.0"
    },
    "relationships": {
      "workspace": {
        "data": {
          "id": "ws-abcdef123456",
          "type": "workspaces"
        }
      }
    }
  }
}
```

## カスタムヘルスチェックAPI（Hono実装）

### 全体ヘルスチェック
```http
GET /health
```

**Honoハンドラー例:**
```typescript
// app/server/src/lambda.ts
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

const app = new Hono();

app.get('/health', async (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: "healthy",
        response_time: 45
      },
      lambda: {
        status: "healthy", 
        response_time: 120
      },
      auth: {
        status: "healthy",
        jwks_endpoint: process.env.SUPABASE_URL + "/rest/v1/auth/jwks",
        verification_method: "JWKS"
      }
    },
    deployment: {
      version: process.env.APP_VERSION || "unknown",
      commit: process.env.GIT_COMMIT || "unknown",
      deployed_at: process.env.DEPLOYED_AT || new Date().toISOString()
    }
  });
});

export const handler = handle(app);
```

**レスポンス例:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-12T10:30:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "response_time": 45
    },
    "lambda": {
      "status": "healthy", 
      "response_time": 120
    },
    "auth": {
      "status": "healthy",
      "jwks_endpoint": "https://your-project.supabase.co/rest/v1/auth/jwks",
      "verification_method": "JWKS"
    }
  },
  "deployment": {
    "version": "1.2.3",
    "commit": "abc123def456",
    "deployed_at": "2025-09-12T10:00:00Z"
  }
```

### サービス別ヘルスチェック
```http
GET /health/{service}
```

**レスポンス例:**
```json
{
  "service": "lambda",
  "status": "healthy",
  "checked_at": "2025-09-12T10:30:00Z",
  "response_time": 120,
  "details": {
    "function_name": "hoxt-backlog-api-production",
    "version": "42",
    "memory_utilization": 45.2,
    "duration_p99": 1200
  }
}
```

## Webhookエンドポイント

### GitHub Webhook（PR作成・更新）
```http
POST /webhooks/github/pull-request
Content-Type: application/json
X-GitHub-Event: pull_request
X-GitHub-Delivery: 12345678-1234-1234-1234-123456789012
X-Hub-Signature-256: sha256=...

{
  "action": "opened|synchronize|closed",
  "number": 42,
  "pull_request": {
    "id": 123456789,
    "head": {
      "ref": "feature/new-auth",
      "sha": "abc123def456"
    },
    "base": {
      "ref": "main"
    }
  },
  "repository": {
    "name": "hoxt-backlog",
    "full_name": "rimane/hoxt-backlog"
  }
}
```

### CloudFlare Pages Webhook（デプロイ完了）
```http
POST /webhooks/cloudflare/deployment
Content-Type: application/json
X-Cloudflare-Event: pages:deployment:success

{
  "id": "def456abc789",
  "environment": "production",
  "url": "https://hoxt-backlog.com",
  "status": "success",
  "created_on": "2025-09-12T10:30:00Z",
  "project_name": "hoxt-backlog-production"
}
```

## 認証・エラーレスポンス

### GitHub OIDC Token取得
```http
GET {ACTIONS_ID_TOKEN_REQUEST_URL}?audience=sts.amazonaws.com
Authorization: Bearer {ACTIONS_ID_TOKEN_REQUEST_TOKEN}
```

**レスポンス例:**
```json
{
  "value": "<JWT_TOKEN_REDACTED>.",
  "count": 1
}
```

### AWS STS AssumeRoleWithWebIdentity
```http
POST /
Content-Type: application/x-amz-json-1.1
X-Amz-Target: AWSSecurityTokenServiceV20110615.AssumeRoleWithWebIdentity

{
  "RoleArn": "arn:aws:iam::123456789012:role/GitHubActions-Production",
  "RoleSessionName": "GitHubActions-Deploy",
  "WebIdentityToken": "<JWT_TOKEN_REDACTED>.",
  "DurationSeconds": 3600
}
```

### 標準エラーレスポンス
```json
{
  "error": {
    "code": "DEPLOYMENT_FAILED",
    "message": "Lambda function update failed",
    "details": {
      "function_name": "hoxt-backlog-api-production",
      "error_code": "InvalidParameterValueException",
      "timestamp": "2025-09-12T10:30:00Z"
    }
  },
  "success": false,
  "timestamp": "2025-09-12T10:30:00Z"
}
```

## レート制限・制約

### GitHub API
- 認証済みリクエスト: 5000/時間
- GraphQL API: 5000ポイント/時間

### AWS API
- Lambda UpdateFunctionCode: 10/秒
- API Gateway: 500/秒（デフォルト）

### CloudFlare API
- Pages API: 1200/分
- DNS API: 100/分

### Supabase Management API
- プロジェクト操作: 60/分
- データベース操作: 300/分

## セキュリティスキャンAPI

### TruffleHog Secret Scanning
```yaml
# GitHub Actions 使用例
- name: Run TruffleHog
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: main
    head: HEAD
```

**検出対象**:
- AWS Access Keys
- API Tokens
- Private Keys
- Certificates
- Database Credentials

### Semgrep SAST Scanning
```yaml
# GitHub Actions 使用例
- name: Run Semgrep
  uses: returntocorp/semgrep-action@v1
  with:
    config: p/security-audit p/javascript
```

**スキャンルール**:
- `p/security-audit`: 一般的なセキュリティ問題
- `p/javascript`: JavaScript/TypeScript 固有の脆弱性

## Discord Webhook API

### デプロイ成功通知
```http
POST https://discord.com/api/webhooks/{webhook_id}/{webhook_token}
Content-Type: application/json

{
  "embeds": [{
    "title": "🚀 Production Deployment Completed Successfully!",
    "color": 65280,
    "fields": [
      {"name": "Commit", "value": "abc123def456", "inline": true},
      {"name": "Branch", "value": "main", "inline": true},
      {"name": "Actor", "value": "username", "inline": true},
      {"name": "Components Deployed", "value": "✅ Infrastructure\n✅ Database\n✅ Backend\n✅ Frontend", "inline": false}
    ],
    "timestamp": "2025-09-12T10:30:00.000Z"
  }]
}
```

### デプロイ失敗通知
```http
POST https://discord.com/api/webhooks/{webhook_id}/{webhook_token}
Content-Type: application/json

{
  "embeds": [{
    "title": "❌ Production Deployment Failed!",
    "color": 16711680,
    "fields": [
      {"name": "Commit", "value": "abc123def456", "inline": true},
      {"name": "Branch", "value": "main", "inline": true},
      {"name": "Actor", "value": "username", "inline": true},
      {"name": "Action", "value": "Check job logs for details", "inline": false}
    ],
    "timestamp": "2025-09-12T10:30:00.000Z"
  }]
}
```

## 監視・ログ形式

### デプロイメントログ
```json
{
  "timestamp": "2025-09-12T10:30:00Z",
  "level": "INFO",
  "message": "Deployment step completed",
  "context": {
    "step": "lambda_deploy",
    "duration": 45.2,
    "status": "success",
    "actor": "github-actions",
    "repository": "rimane/hoxt-backlog",
    "commit": "abc123def456"
  }
}
```

### エラーログ
```json
{
  "timestamp": "2025-09-12T10:30:00Z",
  "level": "ERROR", 
  "message": "Deployment step failed",
  "context": {
    "step": "terraform_apply",
    "error_code": "RESOURCE_CONFLICT",
    "error_details": "Resource already exists",
    "actor": "github-actions",
    "repository": "rimane/hoxt-backlog"
  }
}
```

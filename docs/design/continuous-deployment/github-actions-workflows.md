# GitHub Actions ワークフロー設計

作成日: 2025年09月12日
最終更新: 2025年09月23日


## ワークフロー概要

継続的デプロイメントシステムのGitHub Actionsワークフロー設計：
- **CI** → PR時の品質検証（client-test, server-test, e2e-test）
- **mainマージ** → Production環境自動更新（Terraform + Lambda Function URL + CloudFlare Pages）

### 既存ワークフロー構成
- `ci.yml`: PR時の品質検証ワークフロー（並行実行による高速化）
- `deploy.yml`: Production環境への継続的デプロイ
- `client-test.yml`: Next.jsフロントエンドテスト
- `server-test.yml`: Honoバックエンドテスト  
- `e2e-test.yml`: Playwright E2Eテスト

### セキュリティ制限
- **Fork制限**: Repository secrets保護による最小権限制御
- **環境別認証**: GitHub OIDC統合ロールによるシークレットレス認証

## メインデプロイワークフロー（Production）

### ファイルパス
`.github/workflows/deploy.yml`

### 基本設定

```yaml
name: Production Deployment

on:
  push:
    branches:
      - main    # REQ-104準拠: mainマージでproduction更新
  workflow_dispatch: {}  # 手動実行オプション

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

env:
  AWS_REGION: ap-northeast-1
  TERRAFORM_VERSION: 1.6.0
  NODE_VERSION: 22  # 実装ではNode.js 22使用
```

### ジョブ構成

#### 1. Terraform Infrastructure
```yaml
terraform:
  name: Deploy Infrastructure
  runs-on: ubuntu-latest
  permissions:
    id-token: write
    contents: read
  environment: production
  outputs:
    has_destructive_changes: ${{ steps.plan.outputs.has_destructive_changes }}
  
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ vars.AWS_ROLE_ARN }}  # 統合ロール使用
        role-session-name: GitHubActions-Production-Terraform
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: ${{ env.TERRAFORM_VERSION }}
    
    - name: Terraform Init
      working-directory: ./terraform/app
      run: |
        terraform init \
          -backend-config="bucket=${{ vars.TERRAFORM_STATE_BUCKET }}" \
          -backend-config="key=app/terraform.tfstate" \
          -backend-config="region=${{ env.AWS_REGION }}" \
          -backend-config="dynamodb_table=${{ vars.TERRAFORM_LOCKS_TABLE }}"
    
    - name: Terraform Plan
      id: plan
      working-directory: ./terraform/app
      env:
        TF_VAR_repository_name: ${{ github.repository }}
        TF_VAR_supabase_url: ${{ vars.NEXT_PUBLIC_SUPABASE_URL }}
        TF_VAR_base_schema: app_${{ vars.PROJECT_NAME }}
        TF_VAR_project_name: ${{ vars.PROJECT_NAME }}
        TF_VAR_aws_region: ${{ vars.AWS_REGION }}
        TF_VAR_domain_name: ${{ vars.DOMAIN_NAME }}
        TF_VAR_database_url: ${{ secrets.DATABASE_URL }}
        TF_VAR_cloudflare_account_id: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
        TF_VAR_cloudflare_zone_id: ${{ vars.CLOUDFLARE_ZONE_ID }}
        TF_VAR_cloudflare_api_token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      run: |
        terraform plan -detailed-exitcode -out=tfplan
        
        # Check for destructive changes
        if terraform show -json tfplan | jq -e '.resource_changes[]? | select(.change.actions[] | contains("delete"))' > /dev/null; then
          echo "has_destructive_changes=true" >> $GITHUB_OUTPUT
        else
          echo "has_destructive_changes=false" >> $GITHUB_OUTPUT
        fi
    
    - name: Log destructive changes (if detected)
      if: steps.plan.outputs.has_destructive_changes == 'true'
      working-directory: ./terraform/app
      run: |
        echo "⚠️ Destructive changes detected in Terraform plan"
        echo "Changes will be applied automatically for individual development"
        terraform show -json tfplan | jq '.resource_changes[] | select(.change.actions[] | contains("delete"))'
    
    - name: Terraform Apply
      working-directory: ./terraform/app
      env:
        TF_VAR_repository_name: ${{ github.repository }}
        TF_VAR_supabase_url: ${{ vars.NEXT_PUBLIC_SUPABASE_URL }}
        TF_VAR_base_schema: app_${{ vars.PROJECT_NAME }}
        TF_VAR_project_name: ${{ vars.PROJECT_NAME }}
        TF_VAR_aws_region: ${{ vars.AWS_REGION }}
        TF_VAR_domain_name: ${{ vars.DOMAIN_NAME }}
        TF_VAR_database_url: ${{ secrets.DATABASE_URL }}
        TF_VAR_cloudflare_account_id: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
        TF_VAR_cloudflare_zone_id: ${{ vars.CLOUDFLARE_ZONE_ID }}
        TF_VAR_cloudflare_api_token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      run: terraform apply -auto-approve tfplan
```

#### 2. Database Migration (drizzle-kit)
```yaml
database:
  name: Database Migration (drizzle-kit)
  runs-on: ubuntu-latest
  needs: terraform
  environment: production
  
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      working-directory: ./app/server
      run: bun install

    - name: Run database migration
      working-directory: ./app/server
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL_MIGRATE }}
      run: bun run db:push
      timeout-minutes: 10
```

#### 3. Backend Deploy
```yaml
backend:
  name: Deploy Backend
  runs-on: ubuntu-latest
  needs: [terraform, database]
  environment: production
  permissions:
    id-token: write
    contents: read
  
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      working-directory: ./app/server
      run: bun install --frozen-lockfile
    
    - name: Build for Lambda
      working-directory: ./app/server
      env:
        ACCESS_ALLOW_ORIGIN: ${{ needs.terraform.outputs.access_allow_origin_production }}
        ACCESS_ALLOW_METHODS: ${{ vars.ACCESS_ALLOW_METHODS }}
        ACCESS_ALLOW_HEADERS: ${{ vars.ACCESS_ALLOW_HEADERS }}
        # JWKS検証設定（本番環境）
        USE_JWKS_VERIFIER: 'true'
        ENABLE_JWKS_VERIFICATION: 'true'
        ENABLE_HS256_FALLBACK: 'false'
      run: bun run build:lambda
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ vars.AWS_ROLE_ARN }}
        role-session-name: GitHubActions-Production-Lambda
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Package Lambda
      working-directory: ./app/server
      run: |
        # bun run build:lambda で生成されたindex.jsとnode_modulesをzip化
        mkdir -p lambda-dist
        cp dist/lambda.js lambda-dist/
        cp package.json lambda-dist/
        cd lambda-dist && bun install --production
        zip -r ../lambda-deployment.zip . -x "*.map" "*.test.*" "*.dev.*"
    
    - name: Deploy Lambda
      run: |
        # Update function code (suppress output to prevent secret exposure)
        aws lambda update-function-code \
          --function-name ${{ needs.terraform.outputs.lambda_function_name_production }} \
          --zip-file fileb://app/server/lambda-deployment.zip \
          --output text > /dev/null

        echo "✅ Function code updated successfully"

        # Wait for function update to complete before publishing version
        echo "Waiting for function update to complete..."
        aws lambda wait function-updated \
          --function-name ${{ needs.terraform.outputs.lambda_function_name_production }}

        # Publish new version and promote to stable alias
        VERSION=$(aws lambda publish-version --function-name ${{ needs.terraform.outputs.lambda_function_name_production }} --query 'Version' --output text)
        echo "PROMOTED_VERSION=$VERSION" >> $GITHUB_OUTPUT
        echo "Published Lambda version: $VERSION"

        # Update stable alias to point to new version
        aws lambda update-alias \
          --function-name ${{ needs.terraform.outputs.lambda_function_name_production }} \
          --name stable \
          --function-version $VERSION \
          --output text > /dev/null

        echo "Successfully promoted Lambda version $VERSION to production stable alias"
```

#### 4. Frontend Deploy
```yaml
frontend:
  name: Deploy Frontend
  runs-on: ubuntu-latest
  needs: [backend]
  environment: production
  
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      working-directory: ./app/client
      run: bun install --frozen-lockfile
    
    - name: Build
      working-directory: ./app/client
      env:
        NEXT_PUBLIC_API_BASE_URL: ${{ needs.terraform.outputs.next_public_api_base_url_production }}
        NEXT_PUBLIC_SITE_URL: ${{ needs.terraform.outputs.next_public_site_url_production }}
        NEXT_PUBLIC_TRUSTED_DOMAINS: ${{ needs.terraform.outputs.next_public_trusted_domains_production }}
        NEXT_PUBLIC_SUPABASE_URL: ${{ vars.NEXT_PUBLIC_SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ vars.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      run: bun run build
    
    - name: Deploy to CloudFlare Pages
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
        projectName: ${{ vars.PROJECT_NAME }}
        directory: ./app/client/out
        gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

## CIワークフロー（品質検証）

### ファイルパス
`.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  # CI最適化設定
  ACTIONS_RUNNER_DEBUG: false
  ACTIONS_STEP_DEBUG: false

jobs:
  # Client (Next.js) のユニットテスト
  client-test:
    name: Client Unit Tests
    uses: ./.github/workflows/client-test.yml
    with:
      working-directory: ./app/client

  # Server (Hono) のユニット/結合テスト
  server-test:
    name: Server Unit Tests
    uses: ./.github/workflows/server-test.yml
    with:
      working-directory: ./app/server

  # E2E (Playwright) テスト
  e2e-test:
    name: E2E Tests
    uses: ./.github/workflows/e2e-test.yml
```

## プレビュー環境ワークフロー

### ファイルパス
`.github/workflows/preview.yml`

```yaml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize]  # REQ-101準拠: PR作成・更新でpreview反映
  pull_request_target:
    types: [closed]               # プレビュー環境クリーンアップ

concurrency:
  group: preview-${{ github.event.number }}
  cancel-in-progress: true

jobs:
  deploy-preview:
    if: github.event.action != 'closed' && github.event.pull_request.head.repo.full_name == github.repository  # NFR-005準拠: Fork制限
    name: Deploy Preview Environment
    runs-on: ubuntu-latest
    environment: preview
    permissions:
      id-token: write
      contents: read
      pull-requests: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Environment Variables
        run: |
          echo "PR_NUMBER=${{ github.event.number }}" >> $GITHUB_ENV
          echo "PREVIEW_SUBDOMAIN=pr-${{ github.event.number }}" >> $GITHUB_ENV
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}  # 統合ロール使用
          role-session-name: GitHubActions-Preview-Infrastructure
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update Lambda for Preview
        run: |
          cd app/server
          bun install --frozen-lockfile
          bun run build:lambda
          
          # Package Lambda for preview
          mkdir -p lambda-dist
          cp dist/lambda.js lambda-dist/
          cp package.json lambda-dist/
          cd lambda-dist && bun install --production
          zip -r ../lambda-deployment.zip . -x "*.map" "*.test.*" "*.dev.*"
          
          # Update Lambda function code to $LATEST (Preview環境)
          aws lambda update-function-code \
            --function-name ${{ vars.LAMBDA_FUNCTION_NAME }} \
            --zip-file fileb://lambda-deployment.zip
          
          # Update environment variables for preview
          aws lambda update-function-configuration \
            --function-name ${{ vars.LAMBDA_FUNCTION_NAME }} \
            --environment "Variables={BASE_SCHEMA=${{ vars.PROJECT_NAME }}_preview,NODE_ENV=development,SUPABASE_URL=${{ vars.SUPABASE_URL }}}"
      
      - name: Set Schema for Preview
        run: |
          echo "BASE_SCHEMA=${{ vars.PROJECT_NAME }}_preview" >> $GITHUB_ENV
      
      - name: Deploy drizzle-kit Preview Migration
        working-directory: ./app/server
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}  # app_role使用（Preview環境）
          SUPABASE_URL: ${{ vars.SUPABASE_URL }}
          TABLE_PREFIX: ${{ env.TABLE_PREFIX }}
        run: |
          bun install
          bun run db:generate
          bun run db:push  # Preview環境は push で即座反映
      
      
      - name: Deploy CloudFlare Preview
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ${{ vars.CLOUDFLARE_PROJECT_NAME }}
          directory: ./app/client/out
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const previewUrl = `https://${process.env.PREVIEW_SUBDOMAIN}.${{ vars.CLOUDFLARE_DOMAIN }}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview environment deployed!\n\n**Preview URL:** ${previewUrl}\n\n**Lambda:** $LATEST (real-time updates)\n\n**Database:** PostgreSQL tables with prefix \`${{ env.TABLE_PREFIX }}_*\``
            });

  cleanup-preview:
    if: github.event.action == 'closed'
    name: Cleanup Preview Environment  
    runs-on: ubuntu-latest
    environment: preview
    
    steps:
      - name: Set Table Prefix for Cleanup
        run: |
          echo "BASE_SCHEMA=${{ vars.PROJECT_NAME }}_preview" >> $GITHUB_ENV
      
      - name: Cleanup Supabase Preview Tables
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ vars.SUPABASE_PROJECT_ID }}
          TABLE_PREFIX: ${{ env.TABLE_PREFIX }}
        run: |
          cd app/server
          # Drop all tables with dev prefix
          supabase db reset --project-ref $SUPABASE_PROJECT_ID --db-url "postgresql://..." \
            --sql "DROP TABLE IF EXISTS ${TABLE_PREFIX}_users CASCADE; DROP TABLE IF EXISTS ${TABLE_PREFIX}_projects CASCADE;"
      
      - name: Delete CloudFlare Preview
        run: |
          curl -X DELETE \
            "https://api.cloudflare.com/client/v4/accounts/${{ vars.CLOUDFLARE_ACCOUNT_ID }}/pages/projects/${{ vars.CLOUDFLARE_PROJECT_NAME }}/deployments/pr-${{ github.event.number }}" \
            -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}"
```

## セキュリティスキャンワークフロー

### ファイルパス
`.github/workflows/security.yml`

```yaml
name: Security Scanning

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  secret-scan:
    name: Secret Scanning
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Run TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
  
  sast:
    name: Static Analysis
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/security-audit p/javascript
```

## 環境変数・シークレット設定

### 🔧 共通設定統合方式（推奨）

管理負荷軽減のため、共通設定は統合し、必要最小限のみ環境別分離：

#### Repository Variables（共通）
```yaml
PROJECT_NAME: your-project
PRODUCTION_DOMAIN: your-domain.com
PROJECT_NAME: myproject
SUPABASE_PROJECT_ID: abcdefghijklmnop
```

#### Repository Secrets（統合設計）
```yaml
# 共通Secrets（PROD/PREVIEW共通）
CLOUDFLARE_API_TOKEN: your-api-token
CLOUDFLARE_ACCOUNT_ID: your-account-id
SUPABASE_ACCESS_TOKEN: sbp_xxxxxxxxxxxxx

# 統合OIDC認証（ブランチ制限付き）
AWS_ROLE_ARN: arn:aws:iam::123456789012:role/your-project-github-actions
# 注記: mainブランチ・PRのみアクセス許可、feature/develop等ブランチ無効化
```

#### 📈 管理負荷軽減効果
- **設定項目**: 10個 → 4個（60%削減）
- **重複管理**: なし（完全統合による効率化）
- **運用効率**: 更新時1箇所のみ修正で済む
- **セキュリティ**: ブランチ制限により意図しないアクセスを完全ブロック

## 環境変数・シークレット設定（従来参考）

### GitHub Environment: production
```yaml
Variables:
  AWS_ROLE_ARN: arn:aws:iam::123456789012:role/your-project-github-actions-unified  # 統合ロール
  TERRAFORM_STATE_BUCKET: your-terraform-state-bucket
  TERRAFORM_APPROVERS: admin1,admin2
  LAMBDA_FUNCTION_NAME: your-project-api  # 統合関数名
  SUPABASE_PROJECT_ID: abcdefghijklmnop
  PROJECT_NAME: myproject  # プロジェクト名（スキーマベース）
  CLOUDFLARE_ACCOUNT_ID: your-account-id
  CLOUDFLARE_PROJECT_NAME: your-project-production
  CLOUDFLARE_DOMAIN: your-domain.com
  API_URL: https://api.your-domain.com

Secrets:
  SUPABASE_ACCESS_TOKEN: sbp_xxxxxxxxxxxxx
  CLOUDFLARE_API_TOKEN: your-api-token
```

### GitHub Environment: preview
```yaml  
Variables:
  AWS_ROLE_ARN: arn:aws:iam::123456789012:role/your-project-github-actions-unified  # 統合ロール（同一）
  LAMBDA_FUNCTION_NAME: your-project-api  # 統合関数名（同一）
  SUPABASE_PROJECT_ID: abcdefghijklmnop  # Same as production
  PROJECT_NAME: myproject  # プロジェクト名（スキーマベース）（runtime時に_dev付与）
  CLOUDFLARE_ACCOUNT_ID: your-account-id  
  CLOUDFLARE_PROJECT_NAME: your-project-production  # 統合プロジェクト使用
  CLOUDFLARE_DOMAIN: preview.your-domain.com

Secrets:
  SUPABASE_ACCESS_TOKEN: sbp_preview_token
  CLOUDFLARE_API_TOKEN: your-preview-token
```

## エラーハンドリング設定

### 再試行戦略
```yaml
- name: Deploy with Retry
  uses: nick-fields/retry@v2
  with:
    timeout_minutes: 10
    max_attempts: 3
    retry_wait_seconds: 30
    command: |
      # Your deployment command here
```

### 通知設定
```yaml
notify-success:
  name: Notify Deployment Success
  runs-on: ubuntu-latest
  needs: [terraform, database, backend, frontend]
  if: success()

  steps:
    - name: Send Discord notification (Success)
      env:
        DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
      run: |
        curl -H "Content-Type: application/json" \
             -d '{
               "embeds": [{
                 "title": "🚀 Production Deployment Completed Successfully!",
                 "color": 65280,
                 "fields": [
                   {"name": "Commit", "value": "${{ github.sha }}", "inline": true},
                   {"name": "Branch", "value": "${{ github.ref_name }}", "inline": true},
                   {"name": "Actor", "value": "${{ github.actor }}", "inline": true},
                   {"name": "Repository", "value": "${{ github.repository }}", "inline": false},
                   {"name": "Components Deployed", "value": "✅ Infrastructure (Terraform)\n✅ Database (drizzle-kit)\n✅ Backend (AWS Lambda)\n✅ Frontend (CloudFlare Pages)", "inline": false}
                 ],
                 "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
               }]
             }' \
             "$DISCORD_WEBHOOK_URL"

notify-failure:
  name: Notify Deployment Failure
  runs-on: ubuntu-latest
  needs: [terraform, database, backend, frontend]
  if: failure()

  steps:
    - name: Send Discord notification (Failure)
      env:
        DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
      run: |
        curl -H "Content-Type: application/json" \
             -d '{
               "embeds": [{
                 "title": "❌ Production Deployment Failed!",
                 "color": 16711680,
                 "fields": [
                   {"name": "Commit", "value": "${{ github.sha }}", "inline": true},
                   {"name": "Branch", "value": "${{ github.ref_name }}", "inline": true},
                   {"name": "Actor", "value": "${{ github.actor }}", "inline": true},
                   {"name": "Repository", "value": "${{ github.repository }}", "inline": false},
                   {"name": "Action", "value": "Please check the [job logs](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}) for details and retry the deployment.", "inline": false}
                 ],
                 "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
               }]
             }' \
             "$DISCORD_WEBHOOK_URL"
```

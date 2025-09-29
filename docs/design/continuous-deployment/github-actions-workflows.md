# GitHub Actions ワークフロー設計

作成日: 2025年09月12日
最終更新: 2025年09月16日


## ワークフロー概要

継続的デプロイメントシステムのGitHub Actionsワークフロー設計：
- **PR作成・更新** → Preview環境自動反映（Lambda $LATEST + CloudFlare Preview）
- **mainマージ** → Production環境自動更新（Lambda stable alias昇格 + CloudFlare Production）

### セキュリティ制限
- **Fork制限（NFR-005）**: Fork リポジトリからのPRではPreview環境を生成・更新しない
- **Repository Secrets**: 共通設定統合 + 必要最小限の環境別分離による管理負荷軽減

## メインデプロイワークフロー（Production）

### ファイルパス
`.github/workflows/deploy.yml`

### 基本設定

```yaml
name: Production Deployment

on:
  push:
    branches: [main]    # REQ-104準拠: mainマージでproduction更新
  workflow_dispatch: {}  # REQ-102準拠: 強制適用オプション削除

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

env:
  AWS_REGION: ap-northeast-1
  TERRAFORM_VERSION: 1.6.0
  NODE_VERSION: 20
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
      working-directory: ./terraform
      run: |
        terraform init \
          -backend-config="bucket=${{ vars.TERRAFORM_STATE_BUCKET }}" \
          -backend-config="key=unified/terraform.tfstate" \
          -backend-config="region=${{ env.AWS_REGION }}"
    
    - name: Terraform Plan
      id: plan
      working-directory: ./terraform
      run: |
        terraform plan -detailed-exitcode -out=tfplan
        
        # Check for destructive changes
        if terraform show -json tfplan | jq -e '.resource_changes[]? | select(.change.actions[] | contains("delete"))' > /dev/null; then
          echo "has_destructive_changes=true" >> $GITHUB_OUTPUT
        else
          echo "has_destructive_changes=false" >> $GITHUB_OUTPUT
        fi
    
    - name: Wait for approval (if destructive)
      if: steps.plan.outputs.has_destructive_changes == 'true'  # REQ-102準拠: 承認フロー必須
      uses: trstringer/manual-approval@v1
      with:
        secret: ${{ secrets.GITHUB_TOKEN }}
        approvers: ${{ vars.TERRAFORM_APPROVERS }}
        minimum-approvals: 1
        issue-title: "Terraform Destructive Changes Detected"
        issue-body: |
          Terraform plan contains destructive changes. Review the plan and approve if safe to proceed.
          
          **Workflow:** ${{ github.workflow }}
          **Run:** ${{ github.run_id }}
          **Actor:** ${{ github.actor }}
    
    - name: Terraform Apply
      working-directory: ./terraform
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
    
    - name: Generate migration files
      working-directory: ./app/server  
      run: bun run db:generate
    
    - name: Run database migration
      working-directory: ./app/server
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL_MIGRATE }}  # migrate_role使用
      run: bun run db:migrate
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
      run: bun run build:lambda
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ vars.AWS_ROLE_ARN }}  # 統合ロール使用
        role-session-name: GitHubActions-Production-Lambda
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Package Lambda
      working-directory: ./app/server
      run: |
        # bun run build:lambda で生成されたindex.jsとnode_modulesをzip化
        mkdir -p lambda-dist
        cp dist/index.js lambda-dist/
        cp package.json lambda-dist/
        cd lambda-dist && bun install --production
        zip -r ../lambda-deployment.zip . -x "*.map" "*.test.*" "*.dev.*"
    
    - name: Deploy Lambda
      run: |
        aws lambda update-function-code \
          --function-name ${{ vars.LAMBDA_FUNCTION_NAME }} \
          --zip-file fileb://app/server/lambda-deployment.zip
        
        # Publish new version and promote to stable alias
        VERSION=$(aws lambda publish-version --function-name ${{ vars.LAMBDA_FUNCTION_NAME }} --query 'Version' --output text)
        echo "PROMOTED_VERSION=$VERSION" >> $GITHUB_OUTPUT
        echo "Published Lambda version: $VERSION"
        
        # Update stable alias to point to new version
        aws lambda update-alias \
          --function-name ${{ vars.LAMBDA_FUNCTION_NAME }} \
          --name stable \
          --function-version $VERSION
        
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
        NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}
      run: bun run build
    
    - name: Deploy to CloudFlare Pages
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ vars.CLOUDFLARE_ACCOUNT_ID }}
        projectName: ${{ vars.CLOUDFLARE_PROJECT_NAME }}
        directory: ./app/client/out
        gitHubToken: ${{ secrets.GITHUB_TOKEN }}
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
          cp dist/index.js lambda-dist/
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
            --environment "Variables={BASE_SCHEMA=${{ vars.PROJECT_NAME }}_preview,NODE_ENV=development}"
      
      - name: Set Schema for Preview
        run: |
          echo "BASE_SCHEMA=${{ vars.PROJECT_NAME }}_preview" >> $GITHUB_ENV
      
      - name: Deploy drizzle-kit Preview Migration
        working-directory: ./app/server
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}  # app_role使用（Preview環境）
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
- name: Notify on Failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
    text: |
      🚨 Deployment failed!
      Repository: ${{ github.repository }}
      Actor: ${{ github.actor }}
      Workflow: ${{ github.workflow }}
```

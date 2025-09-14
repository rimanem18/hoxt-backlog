# GitHub Actions ワークフロー設計

作成日: 2025年09月12日
最終更新: 2025年09月12日

## ワークフロー概要

継続的デプロイメントシステムのGitHub Actionsワークフロー設計：
- **PR作成・更新** → Preview環境自動反映（Lambda $LATEST + CloudFlare Preview）
- **mainマージ** → Production環境自動更新（Lambda stable alias昇格 + CloudFlare Production）

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
        role-to-assume: ${{ vars.AWS_ROLE_ARN }}
        role-session-name: GitHubActions-Terraform
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v3
      with:
        terraform_version: ${{ env.TERRAFORM_VERSION }}
    
    - name: Terraform Init
      working-directory: ./terraform/environments/production
      run: |
        terraform init \
          -backend-config="bucket=${{ vars.TERRAFORM_STATE_BUCKET }}" \
          -backend-config="key=production/terraform.tfstate" \
          -backend-config="region=${{ env.AWS_REGION }}"
    
    - name: Terraform Plan
      id: plan
      working-directory: ./terraform/environments/production
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
      working-directory: ./terraform/environments/production
      run: terraform apply -auto-approve tfplan
```

#### 2. Database Migration
```yaml
database:
  name: Database Migration  
  runs-on: ubuntu-latest
  needs: terraform
  environment: production
  
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Setup Supabase CLI
      uses: supabase/setup-cli@v1
    
    - name: Run Migrations
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        SUPABASE_PROJECT_ID: ${{ vars.SUPABASE_PROJECT_ID }}
      run: |
        cd app/server
        supabase db push --project-ref $SUPABASE_PROJECT_ID
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
        role-to-assume: ${{ vars.AWS_ROLE_ARN }}
        role-session-name: GitHubActions-Lambda
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
        
        # Publish new version for promotion (REQ-104準拠: mainマージでproduction更新)
        VERSION=$(aws lambda publish-version --function-name ${{ vars.LAMBDA_FUNCTION_NAME }} --query 'Version' --output text)
        echo "PROMOTED_VERSION=$VERSION" >> $GITHUB_OUTPUT
        echo "Published Lambda version: $VERSION"
        
      - name: Promote to Production
        working-directory: ./terraform/environments/production
        env:
          TF_VAR_promoted_version: ${{ steps.lambda-deploy.outputs.PROMOTED_VERSION }}
        run: |
          terraform plan -var="promoted_version=$TF_VAR_promoted_version" -out=tfplan-promote
          terraform apply -auto-approve tfplan-promote
          echo "Successfully promoted Lambda version $TF_VAR_promoted_version to production stable alias"
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
    if: github.event.action != 'closed'
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
      
      - name: Deploy Preview Infrastructure
        working-directory: ./terraform/environments/preview
        run: |
          terraform init \
            -backend-config="bucket=${{ vars.TERRAFORM_STATE_BUCKET }}" \
            -backend-config="key=preview/terraform.tfstate" \
            -backend-config="region=${{ env.AWS_REGION }}"
          
          terraform plan -out=tfplan
          terraform apply -auto-approve tfplan
      
      - name: Set Table Prefix for Preview
        run: |
          echo "TABLE_PREFIX=${{ vars.BASE_TABLE_PREFIX }}_dev" >> $GITHUB_ENV
      
      - name: Deploy Supabase Preview Migration
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ vars.SUPABASE_PROJECT_ID }}
          TABLE_PREFIX: ${{ env.TABLE_PREFIX }}
        run: |
          cd app/server
          supabase db push --project-ref $SUPABASE_PROJECT_ID
      
      - name: Build and Deploy Lambda Version
        env:
          TABLE_PREFIX: ${{ env.TABLE_PREFIX }}
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
          
          # Update Lambda function code to $LATEST (REQ-101準拠: PR更新でpreview反映)
          aws lambda update-function-code \
            --function-name ${{ vars.LAMBDA_FUNCTION_NAME }} \
            --zip-file fileb://lambda-deployment.zip
          
          aws lambda update-function-configuration \
            --function-name ${{ vars.LAMBDA_FUNCTION_NAME }} \
            --environment "Variables={TABLE_PREFIX=${TABLE_PREFIX},NODE_ENV=development}"
          
          # Preview environment uses $LATEST directly (no versioning needed)
      
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
              body: `🚀 Preview environment deployed!\n\n**Preview URL:** ${previewUrl}\n\n**Lambda:** $LATEST (real-time updates)\n\n**Database:** Supabase tables with prefix \`${{ env.TABLE_PREFIX }}_*\``
            });

  cleanup-preview:
    if: github.event.action == 'closed'
    name: Cleanup Preview Environment  
    runs-on: ubuntu-latest
    environment: preview
    
    steps:
      - name: Set Table Prefix for Cleanup
        run: |
          echo "TABLE_PREFIX=${{ vars.BASE_TABLE_PREFIX }}_dev" >> $GITHUB_ENV
      
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

### GitHub Environment: production
```yaml
Variables:
  AWS_ROLE_ARN: arn:aws:iam::123456789012:role/GitHubActions-Production
  TERRAFORM_STATE_BUCKET: your-terraform-state-bucket
  TERRAFORM_APPROVERS: admin1,admin2
  LAMBDA_FUNCTION_NAME: your-project-api  # 単一関数名（環境なし）  
  SUPABASE_PROJECT_ID: abcdefghijklmnop
  BASE_TABLE_PREFIX: prefix  # ベーステーブルプレフィックス
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
  AWS_ROLE_ARN: arn:aws:iam::123456789012:role/GitHubActions-Preview
  LAMBDA_FUNCTION_NAME: your-project-api  # 単一関数名（環境なし）  # REQ-101準拠: 単一関数+$LATEST使用
  SUPABASE_PROJECT_ID: abcdefghijklmnop  # Same as production
  BASE_TABLE_PREFIX: prefix  # ベーステーブルプレフィックス（runtime時に_dev付与）
  CLOUDFLARE_ACCOUNT_ID: your-account-id  
  CLOUDFLARE_PROJECT_NAME: your-project-production  # REQ-101準拠: 単一プロジェクト使用
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

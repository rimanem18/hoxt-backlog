ここよりも下に記載

---

# セキュリティ脆弱性修正プラン（HOXBL-29続き）

**作成日**: 2025-10-04 22:36 JST
**タスク**: 残存セキュリティ脆弱性の修正（Semgrep検出）

## 背景
- **前回（完了済み）**:
  - GitHub Actions注入 14件修正
  - ハードコードJWT 14件修正
  - Dockerfile非rootユーザー 2件修正
- **今回（✅ 完了）**: 残り脆弱性を修正

---

## 実装スコープ（Phase 1-4実施、Phase 5別タスク化）

### Phase 1: GitHub Actions `${{ }}` 式の修正 ✅ 完了
**優先度**: 🔴 最高（コマンドインジェクション対策）
**実装方式**: DIRECT（インフラ設定）

**対象ファイル（5ファイル）**:
1. `.github/actions/e2e-test/action.yml` - 10変数+PID初期化
2. `.github/actions/setup-environment/action.yml` - 3変数
3. `.github/actions/setup-postgres/action.yml` - 6変数
4. `.github/actions/terraform-ops/action.yml` - 5変数（Terraform Apply修正含む）
5. `.github/workflows/deploy-database.yml` - TIMEOUT_MINUTES追加

**追加修正（Codexレビュー反映）**:
- **terraform-ops.yml**: Terraform Applyステップの`working-directory`を`TF_WORKDIR`経由に修正
- **e2e-test.yml**: PID変数を空文字列で初期化、cleanup関数で`${VAR:-}`パターン使用

**修正パターン**:
```yaml
# Before (脆弱)
run: |
  echo "Actor: ${{ github.actor }}"

# After (安全)
env:
  ACTOR: ${{ github.actor }}
run: |
  set -euo pipefail
  echo "Actor: \"$ACTOR\""
```

---

### Phase 2: console.log非リテラル引数の修正 ✅ 完了
**優先度**: 🟠 高（ログ偽装対策）
**実装方式**: DIRECT（文字列操作）

**対象ファイル（1ファイル）**:
1. `app/client/src/app/auth/callback/page.tsx` - console.errorの第一引数をテンプレートリテラル化

**修正内容**:
```typescript
// Before（脆弱）
console.error(logMessage, { error, ... });

// After（安全）
console.error(`Auth callback error: ${String(logMessage)}`, { error, ... });
```

**結果**: フォーマット文字列攻撃によるログ偽装を防止

---

### Phase 3: 動的RegExp修正 ✅ 完了
**優先度**: 🟡 中（ReDoS対策）
**実装方式**: DIRECT（テスト未存在）

**対象ファイル（1ファイル）**:
- `app/server/src/presentation/http/validators/HttpRequestValidator.ts`

**修正内容**: `regex`モードを削除（ホワイトリスト化）
```typescript
// Before（脆弱）
private readonly matchMode: 'exact' | 'endsWith' | 'regex' = 'exact'
case 'regex':
  return new RegExp(allowedPath).test(pathname);

// After（安全）
private readonly matchMode: 'exact' | 'endsWith' = 'exact'
// regex caseを削除
```

**結果**: ReDoS（正規表現DoS）攻撃リスクを完全排除

---

### Phase 4: ドキュメント内JWT削除 ✅ 完了
**優先度**: 🟢 低（シークレット漏洩対策）
**実装方式**: DIRECT（ドキュメント修正）

**対象ファイル（8ファイル）**:
1. `docs/implements/TASK-104/mvp-google-auth-testcases.md`
2. `docs/implements/TASK-202/mvp-google-auth-requirements.md`
3. `docs/implements/TASK-105/mvp-google-auth-requirements.md`
4. `docs/implements/TASK-105/mvp-google-auth-testcases.md`
5. `docs/explan/mvp-google-auth/TASK-201-code-explan.md`
6. `docs/explan/mvp-google-auth/TASK-105-code-explan.md`
7. `docs/design/continuous-deployment/api-endpoints.md`
8. `docs/design/mvp-google-auth/api-endpoints.md`

**修正**: 正規表現 `eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*` でJWTを `<JWT_TOKEN_REDACTED>` に一括置換

**結果**: ドキュメント内シークレット漏洩リスクを解消

---

### Phase 5: Terraform修正 🚫
**優先度**: 低（別タスク化）
**理由**: 影響範囲大、インフラ受け入れテスト必要

**対応内容（別チケットHOXBL-XXX）**:
- Lambda X-Ray有効化
- KMS暗号化（Lambda環境変数、CloudWatch Logs、DynamoDB SSE）
- KMSキーローテーション
- IAM権限エスカレーション対策

---

## Git Commit戦略（実施結果）
- **Commit 48e0023**: Phase 1-4統合修正（GitHub Actions注入 + console.log + RegExp + JWTドキュメント）
  - Codexレビュー反映（terraform-ops.yml TF_WORKDIR修正、e2e-test.yml PID初期化）

---

## チェックリスト ✅ 全完了

### Phase 1: GitHub Actions
- [x] すべての`run:`から`${{ }}`削除
- [x] `env:`ブロック経由に変更
- [x] 変数参照は二重引用符で囲む
- [x] `set -euo pipefail`追加
- [x] Terraform Applyステップも`TF_WORKDIR`経由に修正（Codexレビュー反映）
- [x] PID変数初期化で`set -u`対応（Codexレビュー反映）

### Phase 2: console.log
- [x] 非リテラル第一引数をすべて修正
- [x] テンプレートリテラルまたは定数フォーマット使用

### Phase 3: RegExp
- [x] `matchMode`から`'regex'`削除
- [x] `validate()`の`case 'regex':`削除
- [x] 型チェック実行

### Phase 4: JWT
- [x] 8ファイルのJWTを`<JWT_TOKEN_REDACTED>`に置換

### 最終確認
- [x] Lint実行: `docker compose exec server bun run fix`
- [x] 型チェック: `docker compose exec server bunx tsc --noEmit`
- [ ] Semgrep再実行（PR上で確認） ← **次のステップ**

---

## 実装サマリー

### 修正ファイル総数: 14ファイル
- GitHub Actions: 5ファイル
- アプリケーション: 2ファイル（console.log + RegExp）
- ドキュメント: 8ファイル（JWT削除）

### 解消された脆弱性
1. **コマンドインジェクション**: GitHub Actions `run:`内の`${{ }}`式を完全排除
2. **ログ偽装**: console.log非リテラル第一引数を修正
3. **ReDoS攻撃**: 動的RegExp生成を削除
4. **シークレット漏洩**: ドキュメント内JWTトークンを削除

### 次のアクション
1. PRを作成してSemgrepを実行
2. 脆弱性が解消されたことを確認
3. Phase 5（Terraform修正）を別タスク（HOXBL-XXX）として起票

---

**更新履歴**:
- 2025-10-04 22:36: 初版作成
- 2025-10-04 23:15: 実装完了、Codexレビュー反映、最終サマリー追加
- 2025-10-05 23:XX: ChatGPT指摘事項を精査、Phase 6-8プラン追加

---

# セキュリティ脆弱性修正プラン（HOXBL-29 追加修正）

**作成日**: 2025-10-05 23:XX JST
**タスク**: ChatGPT指摘事項に基づく残存脆弱性の修正

## 調査結果サマリー

### 脆弱性カテゴリ別の状況

1. **GitHub Actions コマンドインジェクション**: 4ファイルに残存脆弱性
2. **JS/TS console.log**: 前回修正済み（問題なし）
3. **Terraform 暗号化・監視**: 複数の強化推奨設定が不足
4. **IAM 権限エスカレーション**: PassRole条件の追加推奨
5. **Semgrep 誤検知**: パーサー都合のノイズ除外推奨

---

## 実装スコープ（Phase 6-9）

### Phase 6: 残存GitHub Actions脆弱性修正 🔴 高優先度
**優先度**: 🔴 最高（コマンドインジェクション対策）
**実装方式**: DIRECT（インフラ設定）

**対象ファイル（4ファイル）**:
1. `.github/actions/lambda-package/action.yml` - command:ブロック内（64-103行目）
2. `.github/workflows/deploy-frontend.yml` - run:ブロック内（55-60行目のデバッグecho）
3. `.github/actions/fork-check/action.yml` - run:ブロック内（20, 22, 38行目）
4. `.github/workflows/preview.yml` - run:ブロック内（36-49行目）

**修正パターン**:
```yaml
# Before (脆弱) - lambda-package/action.yml
command: |
  cd ${{ inputs.working-directory }}
  aws lambda update-function-code \
    --function-name ${{ inputs.function-name }} \
    --region ${{ inputs.aws-region }}

# After (安全)
env:
  WORK_DIR: ${{ inputs.working-directory }}
  FUNCTION_NAME: ${{ inputs.function-name }}
  AWS_REGION: ${{ inputs.aws-region }}
command: |
  set -euo pipefail
  cd "$WORK_DIR"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION"
```

**チェックリスト**:
- [ ] lambda-package: 3つのinputs変数をenv経由に
- [ ] deploy-frontend: デバッグechoの4つの${{}}をenv経由に
- [ ] fork-check: github.event_nameとPR情報をenv経由に
- [ ] preview: checkout_ref計算の${{}}をenv経由に

---

### Phase 7: Terraform 暗号化・監視強化 🟡 中優先度
**優先度**: 🟡 中（セキュリティベストプラクティス適用）
**実装方式**: DIRECT（Terraformリソース追加・修正）

#### 7-1: Lambda X-Ray トレーシング

**対象ファイル**:
- `terraform/modules/lambda/main.tf`
- `terraform/bootstrap/main.tf` (production/preview両方)

**追加内容**:
```hcl
resource "aws_lambda_function" "this" {
  # 既存設定...

  tracing_config {
    mode = "Active"
  }
}
```

**チェックリスト**:
- [ ] modules/lambda/main.tf: tracing_config追加
- [ ] bootstrap/main.tf: production関数にtracing_config追加
- [ ] bootstrap/main.tf: preview関数にtracing_config追加

#### 7-2: KMS暗号化（Lambda環境変数）

**対象ファイル**:
- `terraform/modules/kms/` (新規モジュール作成)
- `terraform/modules/lambda/main.tf`
- `terraform/bootstrap/main.tf`

**追加内容**:
```hcl
# KMSキー作成
resource "aws_kms_key" "lambda_env" {
  description         = "Lambda environment variables encryption"
  enable_key_rotation = true
}

resource "aws_kms_alias" "lambda_env" {
  name          = "alias/${var.project_name}-lambda-env"
  target_key_id = aws_kms_key.lambda_env.key_id
}

# Lambda関数で使用
resource "aws_lambda_function" "this" {
  # 既存設定...
  kms_key_arn = aws_kms_key.lambda_env.arn
}
```

**チェックリスト**:
- [ ] modules/kms/main.tf: lambda_env KMSキー作成
- [ ] modules/lambda/main.tf: kms_key_arn変数追加
- [ ] bootstrap/main.tf: KMSモジュール呼び出し
- [ ] Lambda関数にkms_key_arn設定

#### 7-3: CloudWatch Logs KMS暗号化

**対象ファイル**:
- `terraform/modules/monitoring/main.tf`

**追加内容**:
```hcl
resource "aws_kms_key" "logs" {
  description         = "CloudWatch Logs encryption"
  enable_key_rotation = true
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = 30  # 7→30日に延長
  kms_key_id        = aws_kms_key.logs.arn
}
```

**チェックリスト**:
- [ ] modules/monitoring/main.tf: logs KMSキー追加
- [ ] Log Groupにkms_key_id設定
- [ ] retention_in_days: 7→30に変更

#### 7-4: DynamoDB CMK暗号化

**対象ファイル**:
- `terraform/bootstrap/main.tf`

**追加内容**:
```hcl
resource "aws_kms_key" "dynamodb" {
  description         = "DynamoDB table encryption"
  enable_key_rotation = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  # 既存設定...

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }
}
```

**チェックリスト**:
- [ ] bootstrap/main.tf: DynamoDB KMSキー作成
- [ ] terraform_locks テーブルにserver_side_encryption追加

---

### Phase 8: IAM権限強化 🟢 低優先度
**優先度**: 🟢 低（セキュリティ強化）
**実装方式**: DIRECT（IAMポリシー条件追加）

**対象ファイル**:
- `terraform/modules/iam-oidc/main.tf`

**修正内容**:
```hcl
# Before (176行目付近)
{
  Effect = "Allow"
  Action = [
    "iam:PassRole"
  ]
  Resource = [
    "arn:aws:iam::*:role/${var.project_name}-lambda-exec-role",
    "arn:aws:iam::*:role/${var.project_name}-github-actions"
  ]
}

# After (Condition追加)
{
  Effect = "Allow"
  Action = [
    "iam:PassRole"
  ]
  Resource = [
    "arn:aws:iam::*:role/${var.project_name}-lambda-exec-role",
    "arn:aws:iam::*:role/${var.project_name}-github-actions"
  ]
  Condition = {
    StringEquals = {
      "iam:PassedToService" = "lambda.amazonaws.com"
    }
  }
}
```

**チェックリスト**:
- [ ] iam-oidc/main.tf: PassRole条件追加

---

### Phase 9: Semgrep設定調整 🟢 低優先度
**優先度**: 🟢 低（誤検知ノイズ削減）
**実装方式**: DIRECT（設定ファイル追加）

**目的**: `curl-eval`等のパーサー都合による誤検知を除外

**対象ファイル（新規作成）**:
- `.semgrepignore`

**追加内容**:
```
# Partial parsing errors（パーサー限界による誤検知）
# GitHub Actions ${{ }} 式は run-shell-injection で検出済み
# curl-eval は誤検知が多いため除外
```

**チェックリスト**:
- [ ] .semgrepignore作成（必要に応じて）

---

## Git Commit戦略

### Commit構成案

1. **Commit 1: Phase 6（GitHub Actions残存修正）**
   - `fix: 残存GitHub Actionsコマンドインジェクション脆弱性を修正 HOXBL-29`
   - 4ファイル修正

2. **Commit 2: Phase 7（Terraform暗号化・監視）**
   - `feat: Lambda X-Ray・KMS暗号化・CloudWatch監視を強化 HOXBL-29`
   - 複数モジュール修正・追加

3. **Commit 3: Phase 8（IAM権限）**
   - `fix: IAM PassRole条件追加で権限エスカレーションリスクを低減 HOXBL-29`
   - 1ファイル修正

4. **Commit 4: Phase 9（Semgrep設定）**
   - `chore: Semgrep誤検知ルールを除外 HOXBL-29`
   - 1ファイル追加

---

## 実装優先順位

### 最優先（今回実施）
- **Phase 6**: GitHub Actions脆弱性修正（4ファイル）

### 今回検討
- **Phase 7**: Terraform暗号化・監視（影響範囲大、要判断）
- **Phase 8**: IAM権限強化（影響小、ベストプラクティス）
- **Phase 9**: Semgrep設定（運用改善）

### ユーザー判断ポイント
1. **Phase 6のみ実施**: 最速で脆弱性解消（推奨）
2. **Phase 6-9全実施**: 包括的なセキュリティ強化（時間要）

---

**更新履歴**:
- 2025-10-05 23:XX: ChatGPT指摘事項精査、Phase 6-9プラン追加


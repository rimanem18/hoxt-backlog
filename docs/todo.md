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


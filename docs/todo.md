# TODO: TASK-503 AWS Lambda基盤構築 完了に向けて

**作成日**: 2025年09月15日  
**更新日**: 2025年09月15日  
**対象タスク**: TASK-503 AWS Lambda基盤構築

## 現在の状況

✅ **完了済み**
- API Gateway v2 HTTP API設定（環境別ステージ分離）
- Lambda実行ロール・ポリシー設定
- Lambdaエイリアス（stable）設定
- $LATEST + alias戦略による環境管理
- Preview/Production環境別Lambda統合設定
- ヘルスチェックエンドポイント実装（`/api/health`）
- Hono Lambda adapter対応関数作成（`lambda.ts`）
- **Makefileの自動化統合**（ビルド→コピー→Terraform実行の完全自動化）
- **実ビルド成果物統合設定**（terraform/modules/lambda/main.tf）

❌ **未完了**
- 実際のデプロイ実行とテスト

## やるべきこと

### 1. 最終デプロイ実行

```bash
# 統合デプロイ実行（ビルド→コピー→計画→確認）
make iac-plan-save

# 計画確認後、適用実行
make iac-apply
```

### 2. 動作確認とテスト

```bash
# 1. API Gateway ステージ別ヘルスチェック
curl -X GET https://<api-gateway-url>/preview/health
curl -X GET https://<api-gateway-url>/production/health

# 2. Lambda $LATEST/stable alias動作確認
# Preview環境 → $LATEST
# Production環境 → stable alias

# 3. CORS動作確認
curl -X OPTIONS https://<api-gateway-url>/preview/health \
  -H "Origin: https://your-frontend-domain.com" \
  -H "Access-Control-Request-Method: GET"
```

### 3. エラーハンドリング確認

**確認ポイント**: `app/server/src/presentation/http/middleware/errorHandlerMiddleware.ts`

エラーハンドリングミドルウェアの動作確認:

```bash
# 存在しないエンドポイントへのリクエスト
curl -X GET https://<api-gateway-url>/preview/nonexistent

# レスポンス形式の確認（統一されたエラー形式か）
```

## 完了条件チェックリスト

- [ ] `make iac-plan-save`実行完了
- [ ] `make iac-apply`実行完了  
- [ ] API Gateway Preview/Productionステージ動作確認
- [ ] Lambda $LATEST/stable alias分離動作確認
- [ ] ヘルスチェック正常レスポンス（両ステージ）
- [ ] CORS設定適用確認
- [ ] エラーレスポンス統一確認

## 進捗状況

**全体進捗**: 約90%完了  
**残り作業**: デプロイ実行とテストのみ

## 次のステップ

TASK-503完了後:
1. TASK-504: CloudFlare Pages設定
2. TASK-505: Supabaseマイグレーション設定

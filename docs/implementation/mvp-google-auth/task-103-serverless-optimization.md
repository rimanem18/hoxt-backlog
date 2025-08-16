# TASK-103補完: サーバーレス環境向けDatabase Connection最適化

作成日: 2025-08-16
タスクタイプ: 技術改善・最適化

## 概要

TASK-103で実装したPostgreSQLリポジトリのDatabase Connectionクラスを、Supabase Transaction Poolerとサーバーレス環境に最適化した。

## 背景

Geminiでの技術分析により、以下の課題が発見された：

1. **接続プール設定がサーバーレス非対応**: max: 20接続は、スケールアウト時に接続数枯渇リスクあり
2. **アイドルタイムアウトが長すぎる**: 30秒は短時間実行のサーバーレスには不適切
3. **プロセス終了の最適化不足**: Lambda等での適切な終了制御が未実装

## 実装変更内容

### 接続プール設定の最適化

```typescript
// 変更前
this.pool = new Pool({
  connectionString: config.url,
  max: 20, // サーバーレス環境では多すぎる
  idleTimeoutMillis: 30000, // 長すぎる
  connectionTimeoutMillis: 2000,
});

// 変更後
this.pool = new Pool({
  connectionString: config.url,
  max: 2, // サーバーレス環境に最適化
  idleTimeoutMillis: 5000, // 短時間実行に合わせて短縮
  connectionTimeoutMillis: 2000,
  allowExitOnIdle: true, // Lambda等での適切な終了制御
});
```

### エラーハンドリングの強化

```typescript
// 変更前
this.pool.on('error', (err) => {
  console.error('PostgreSQLプールエラー:', err);
});

// 変更後
this.pool.on('error', (err, client) => {
  console.error('PostgreSQLプールエラー:', err);
  process.exit(-1); // サーバーレス環境では異常時にプロセス終了が必要
});
```

### 初期化処理の改善

```typescript
// 変更前（戻り値なし）
private static initializePool(): void {
  if (!this.pool) {
    // 初期化処理
  }
}

// 変更後（戻り値追加でより堅牢に）
private static initializePool(): Pool {
  if (this.pool) {
    return this.pool;
  }
  // 初期化処理
  return this.pool;
}
```

## 技術的根拠

### サーバーレス環境での接続数制限

- **1リクエスト = 1インスタンス = 1-2接続**が基本
- 100インスタンス同時実行時：
  - 変更前: 最大2000接続（100 × 20）→ 接続数枯渇リスク
  - 変更後: 最大200接続（100 × 2）→ 管理可能な範囲

### Transaction Poolerとの相性

- **Supabase Transaction Pooler**: サーバーサイドで接続を効率的に管理
- **pg.Pool**: クライアントサイドで接続要求を管理
- 2段構成により、TCP接続オーバーヘッド削減と接続数制御を両立

### 将来のサーバーレス展開対応

- **AWS Lambda**: イベント駆動、短時間実行
- **Cloudflare Workers**: エッジ環境、軽量実行
- **Google Cloud Run**: コンテナベース、自動スケール
- **Vercel Functions**: Next.js統合、フロントエンド連携

## 設定値の詳細

| パラメータ | 変更前 | 変更後 | 理由 |
|-----------|-------|-------|------|
| `max` | 20 | 2 | サーバーレスの単発実行に最適化 |
| `idleTimeoutMillis` | 30000 | 5000 | 短時間実行モデルに合わせて短縮 |
| `allowExitOnIdle` | 未設定 | true | Lambda等での適切なプロセス終了 |
| エラー時の動作 | ログ出力のみ | プロセス終了 | 障害の連鎖防止 |

## 影響範囲

### 変更されたファイル
- `app/server/src/infrastructure/database/DatabaseConnection.ts`

### 更新されたドキュメント
- `docs/design/mvp-google-auth/architecture.md`
- `docs/implementation/mvp-google-auth/task-103-serverless-optimization.md`（新規作成）

### テスト対象
- 既存のDatabaseConnectionクラステストは引き続き有効
- 接続プール設定の単体テスト（設定値の確認）
- 統合テスト（Transaction Poolerとの連携確認）

## 品質保証

### 型チェック

```bash
docker compose exec server bunx tsc --noEmit
```

### 実行時動作確認

```bash
# データベース接続テスト
docker compose exec server bun test -- --grep "DatabaseConnection"

# ヘルスチェック確認
curl http://localhost:3001/api/health
```

## 今後の監視ポイント

### パフォーマンス監視
- 接続時間の測定（目標: 2秒以内）
- 接続プール使用率の監視
- Transaction Poolerの接続状況確認

### エラー監視
- 接続エラーの頻度
- プロセス終了の発生状況
- Supabase側の接続制限到達状況

## 完了確認

- [x] 接続プール設定をサーバーレス環境に最適化
- [x] Transaction Poolerとの適合性を確保
- [x] エラーハンドリングを強化
- [x] ドキュメントを更新
- [x] 既存機能との互換性を維持

この最適化により、現在の実装がSupabase Transaction Poolerと将来のサーバーレス環境で安全かつ効率的に動作することが保証される。
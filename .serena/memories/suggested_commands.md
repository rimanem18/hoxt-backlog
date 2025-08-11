# 開発用コマンド一覧

## Docker環境管理

### 基本操作
```bash
# コンテナをビルド
make build

# コンテナを起動
make up

# コンテナを停止・削除
make down

# コンテナを再起動
make restart

# コンテナ状況確認
make ps

# ログ確認
make logs
```

### コンテナ内アクセス
```bash
# サーバーコンテナに入る
make server
# または
docker compose exec server ash

# クライアントコンテナに入る  
make client
# または
docker compose exec client ash
```

## 開発サーバー起動

### フロントエンド（client）
```bash
docker compose exec client bun run dev
```

### バックエンド（server）
```bash
docker compose exec server bun run dev
```

## コード品質管理

### 全体フォーマット
```bash
make fmt
```

### 個別フォーマット・リント
```bash
# クライアント
docker compose exec client bun run fix
docker compose exec client bun run check
docker compose exec client bun run typecheck

# サーバー
docker compose exec server bun run fix  
docker compose exec server bun run check
docker compose exec server bun run typecheck
```

## テスト実行
```bash
# クライアント
docker compose exec client bun test

# サーバー
docker compose exec server bun test
```

## Git関連
```bash
# アメンドコミット
make amend
```

## 環境URL
- **フロントエンド**: http://localhost:${CLIENT_PORT}
- **バックエンド**: http://localhost:${SERVER_PORT}
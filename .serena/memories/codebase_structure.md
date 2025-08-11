# コードベース構造

## ディレクトリ構成

```
hoxt-backlog/
├── app/
│   ├── client/                    # Next.jsアプリケーション
│   │   ├── src/
│   │   │   ├── app/              # App Router
│   │   │   └── features/         # feature-based構成
│   │   │       └── hello-world/
│   │   ├── package.json
│   │   ├── biome.json
│   │   └── tsconfig.json
│   └── server/                    # Hono APIアプリケーション
│       ├── src/
│       │   ├── domain/           # ドメイン層
│       │   ├── application/      # アプリケーション層
│       │   ├── presentation/     # プレゼンテーション層
│       │   │   └── http/
│       │   │       ├── server/
│       │   │       ├── routes/
│       │   │       └── middleware/
│       │   └── shared/           # 共通ユーティリティ
│       ├── package.json
│       ├── biome.json
│       └── tsconfig.json
├── docker/                       # Dockerfile群
├── compose.yaml                  # Docker Compose設定
├── Makefile                     # 開発用コマンド
├── CLAUDE.md                    # プロジェクト指針
└── README.md
```

## サーバーサイドアーキテクチャ（DDD + クリーンアーキテクチャ）

### 層構造
1. **domain/**: エンティティ、値オブジェクト、ドメインサービス
2. **application/**: ユースケース、アプリケーションサービス
3. **presentation/http/**: HTTPエンドポイント、ミドルウェア
4. **shared/**: 各層で使用される共通ユーティリティ

### 現在の実装例（greet機能）
- `domain/greet/GreetEntity.ts`: ドメインエンティティ
- `application/greet/GreetUseCase.ts`: ユースケース
- `presentation/http/routes/greetRoutes.ts`: HTTPルート
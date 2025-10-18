## Hoxt-backlog

ドメイン駆動設計とクリーンアーキテクチャです。Backlog、BacklogItem、Task の3つの集約構造を目指します。  
まずは ToDo アプリを作り、その後、バックログ管理アプリに成長させる予定です。

### コンテナ
- Docker v28.1
- Docker Compose v2.35

### ライブラリ・フレームワーク

| カテゴリ | 名前 | バージョン | 用途 |
|---------|------|-----------|------|
| **ランタイム** | Bun | 1.2 | JavaScript/TypeScript ランタイム・パッケージマネージャー |
| **フロントエンド** | Next.js | 15.4 | React フレームワーク |
| | TanStack Query | 5.84 | データフェッチ・キャッシュ管理 |
| | Tailwind CSS | 4 | CSS フレームワーク |
| **バックエンド** | Hono | 4.9 | 軽量 Web フレームワーク |
| | Drizzle ORM | 0.44 | TypeScript ORM |
| | Supabase | 2.44 | 認証・データベースサービス |
| **スキーマ** | Zod | 4.0 | TypeScript スキーマ検証 |
| | drizzle-zod | 0.8 | Drizzle と Zod の統合 |
| | @hono/zod-openapi | 1.1 | Hono + Zod + OpenAPI 統合 |
| | openapi-fetch | 0.15 | 型安全な API クライアント |
| | openapi-typescript | 7.10 | OpenAPI から TypeScript 型定義生成 |
| **開発ツール** | TypeScript | 5 | 型安全性 |
| | Biome | 2.1 | リンター・フォーマッター |
| | uuid | 11.1 | UUID 生成 |

### 技術選定理由

クラスメソッド社の AI駆動開発支援フレームワーク [tsumiki](https://github.com/classmethod/tsumiki) を前提とした AI 駆動開発と、ドメイン駆動設計 + クリーンアーキテクチャを中核に据えた開発。

- 開発効率を重視して Bun を採用。
  - 本番環境は安定性を最優先に Node.js で運用した。
  - CI では E2E を Playwright 公式コンテナを使って Node で回すことで、Bun 開発環境と本番環境の差異を事前に検知できるようにした。この戦略で、開発体験と本番安定性の両立を実現。
- コード自動生成を前提にしたためシンプルなユーティリティフレームワークである Tailwind CSS を優先。
- fetch API 準拠・軽量・高速で、AWS Lambda や Cloudflare Workers へそのままデプロイ可能、どちらにも公式対応している Hono を選択。
- バックエンドとフロントエンドともに TypeScript を採用、Zod ライブラリを導入し、API 通信処理記述の開発体験向上を実現。スキーマ駆動開発と型安全性をもとに、AI に伝わりやすいコードを目指すことで、開発効率を向上。
- Prisma より薄い抽象で DDD の分離を阻害しにくく、Zod とも親和性の高い Drizzle を採用。
- 運用コスト削減だけでなく、Auth と RLS を統合しアプリ側の認可処理を最小化できるため Supabase を選んだ。

### 所感や感想

Claude Code の output-style に Learning（学習モード）が実装されたタイミングが重なったのもあり、全体的に良い経験になった。  

#### よかったところ

AI にコードを書かせることで「新しいことを学ぶきっかけが失われるのではないか？」という懸念があったが、むしろ知らないことを知ることができるいいきっかけが生まれた。 とくに実装の説明をおこなわせるカスタムスラッシュコマンドを作成したことで、知らなかった技術を深く知ることができた。 semgrep や Single Source of Truth というキーワードを得ることができ、学びの幅が広がった。  
仕様がコードレベルで固まりやすいドメイン駆動設計に対して、Tsumiki の仕様駆動 + AI 駆動が非常にマッチしているのが身を持って感じることができた。コーディング中の Claude Code の脱線はほとんどなかった。  
gh コマンドで Claude Code からプルリクを作成できるカスタムスラッシュコマンドを作って diff の確認まで任せたことでテンプレートに則ったプルリクをシームレスに出すことができた。  

#### 大変だったところ

PostgreSQL の RLS の理解は難しかったが、DB 側で認可を強制できる仕組みは強力で、セキュリティ設計の勉強にもなった。  
一ファイルに対して数千行を超える長大なテストファイルを生成されてしまったのは大変だった。今まで大規模な開発に取り組んでこなかった自分にとって、ファイルの分割の対応は苦戦を強いられた。テストファイルの分割について調査している間に、SUT パターンを知ることができ、それを取り入れて対応できた。   
Terraform を使ったのは初めてで、とくにロールの取り扱いに苦戦した。作成・削除といった強めの権限が必要になるため、ポリシーのリソースの制限などのセキュリティのベストプラクティスを模索した。結果、ロールが何も紐つけられていない IAM ユーザを作成してアクセスキーを発行し、このプロジェクトでのみ利用するリソースのプレフィックスがついた操作ができるロールを引き受けることで、セキュリティリスクの最小化を目指した。しかし、それでもロールの作成などの権限がついてしまうとリスクがついてくると考えたため、作成は手動でおこない、 terraform に import して更新していく形に落ち着いた。  
Cloudflare Pages のトークンの権限についても同様で、DNS が編集できる権限はリスクが高すぎると考えたため、プロジェクトの作成や DNS 設定は手動でおこない、他の部分を更新できるトークンにとどめた。  

### 起動方法

コンテナをビルド
```sh
make build
```

コンテナを起動
```sh
make up
```

サーバーからフェッチした文字列で、鮮やかな Hello World が表示されます。

<img width="1143" height="346" alt="image" src="https://github.com/user-attachments/assets/65dd41c0-4ca7-4558-ae87-197347bda2c8" />

コンテナを終了
```sh
make down
```

## 完了した機能

### TASK-901: 型安全性強化・API契約強化 - 環境構築

- **実装日**: 2025-10-15
- **概要**: スキーマ駆動開発のための基盤構築
- **設定内容**:
  - @hono/zod-openapi による OpenAPI 3.1 仕様自動生成
  - openapi-fetch による型安全な API クライアント
  - openapi-typescript による TypeScript 型定義自動生成
  - Docker Compose バインドマウント設定（限定的・読み取り専用）
- **動作確認**:
  - OpenAPI 仕様生成: `docker compose exec server bun run generate:openapi`
  - 型定義生成: `docker compose exec client bun run generate:types`（実装フェーズで使用）

#### スキーマ駆動開発フロー

```
Drizzle ORM Schema (schema.ts)
  ↓ drizzle-zod
Zod Schemas (shared-schemas/)
  ↓ @hono/zod-openapi
OpenAPI 3.1 Spec (docs/api/openapi.yaml)
  ↓ openapi-typescript
TypeScript Types (client/src/types/api/generated.ts)
```

#### 型安全性の保証

- **コンパイル時**: TypeScript 型チェック
- **実行時**: Zod バリデーション
- **ドキュメント**: OpenAPI 仕様から自動生成

詳細は `docs/implements/TASK-901/setup-report.md` および `docs/implements/TASK-901/verify-report.md` を参照してください。

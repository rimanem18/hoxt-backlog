# プロジェクト概要

このプロジェクトは、Docker コンテナによって、バックエンドとフロントエンドがわかれています。

バックエンドは server サービスとして提供されており、フロントエンドは client サービスとして提供されています。

また、Zod スキーマをバックエンドとフロントエンドでシェアし、スキーマ駆動開発をしています。

## ディレクトリ構成

- **`app/client/`**: client コンテナにバインド（Next.js アプリケーション）
  - feature-based ディレクトリ
  - WORKDIR: /home/bun/app/client
- **`app/server/`**: server コンテナにバインド（Hono API アプリケーション）
  - DDD + クリーンアーキテクチャ
  - WORKDIR: /home/bun/app/server
- **`app/packages/shared-shemas/`**: client と server でシェアされるスキーマ
- **`docker/`**: Dockerfile とコンテナ設定
- **`compose.yml`**: Docker Compose 設定ファイル
- sub agents に依頼する際は、以下を必ず伝えてください
  - docker compose exec コマンドの活用は重要
  - コンテナの WORKDIR

## アーキテクチャ概要

- **SSG + API 構成**: フロントエンド（Next.js）とバックエンド（Hono API）の完全分離
- **コンテナベース**: Docker Compose によるコンテナ環境での開発
- **DDD + クリーンアーキテクチャ**: ドメインごとに関心を分離

# フロントエンド開発ガイドライン

## 技術スタック

- **フロントエンド**: Next.js 15 + TypeScript 5
  - **パッケージ管理**: Bun
  - **テスト**: Bun 標準
  - **フォーマット**: Biome + TypeScript
  - **型チェック**: TypeScript + Zod 実行時検証（server 側とスキーマシェア）
  - **レンダリング**: SSG ビルド前提
  - **TypeScript**: 全面採用による型安全性確保
  - **スタイリング**: Tailwind CSS（ユーティリティファースト）
  - **状態管理**: Redux

## コマンド操作

フロントエンド関連のコマンドは client コンテナ内で実行してください：

```bash
# example
docker compose exec client bun run dev
```

E2E テストの実行は e2e コンテナで実施してください
```bash
# example
docker compose exec e2e npx playwright test
```

## コード品質・フォーマット

以下を考慮し、コードの品質を保ってください：

- **必須**: テスト駆動開発
  - 実装を更新したらテストコードも更新
  - テストコードに記載するテストケース名は日本語で記載
- **必須**: テストは Bun 標準を使用する
- **必須**: ファイルの末尾には改行を入れて空行を作る
- **必須**: `docker compose exec client bunx tsc --noEmit` による型チェック
- **必須**: `docker compose exec client bun test` による自動テスト
- **推奨**: 1 行あたりの文字数は 80 字以内になるように改行
- **推奨**: `const` の使用
- **非推奨**: テストでのモックの乱用
  - 特に実装との乖離を生むような過度なスタブは避け、E2E または統合テストとのバランスを考慮
- **非推奨**: `let` の使用
  - ただし、再代入が明確に必要な場面（ループ変数や一時的な状態）の使用可
- **非推奨**: `data-testid` の使用
- **禁止**: `@ts-ignore` ディレクティブの使用
  - `@ts-expect-error` ディレクティブで代用
- **禁止**: `any` 型の使用
  - ただし、型が取得不能な外部ライブラリや JSON パースなどの場合に限り、理由コメントを添えて明示的に使用可
- **禁止**: `var` の使用
- **禁止**: テストの `.skip`
  - 意図的な未実装は TODO コメントで
- **禁止**: `JSX.Element` 型の返却
  - `React.ReactNode` 型で代用
- **禁止**: `fireEvent` の使用
  - `userEvent` で代用

# バックエンド開発ガイドライン

## 技術スタック

- **バックエンド**: Hono 4 API + PostgreSQL
  - **認証**: Supabase
  - **パッケージ管理**: Bun
  - **本番環境ランタイム**: Node.js 22.x
  - **テスト**: Bun 標準
  - **フォーマット**: Biome + TypeScript
  - **型チェック**: TypeScript + Zod 実行時検証（client 側とスキーマシェア）
  - **TypeScript**: 全面採用による型安全性確保

## コマンド操作

バックエンド関連のコマンドは server コンテナ内で実行してください：

```bash
# example
docker compose exec server bun run dev
```

## コード品質・フォーマット

以下を考慮し、コードの品質を保ってください：

- **必須**: テスト駆動開発
  - 実装を更新したらテストコードも更新
  - テストコードに記載するテストケース名は日本語で記載
- **必須**: テストは Bun 標準を使用する
- **必須**: ファイルの末尾には改行を入れて空行を作る
- **必須**: `docker compose exec client bunx tsc --noEmit` による型チェック
- **必須**: `docker compose exec client bun test` による自動テスト
- **必須**: 同一層の import には相対パスを使用し、他の層からの import には `@/...` を使った絶対パス import を使う
- **必須**: ドメインエラーは `errors` ディレクトリ、値オブジェクトは `valueobjects` ディレクトリに配置する。エンティティは `index` と同じディレクトリに配置する
- **推奨**: 1 行あたりの文字数は 80 字以内になるように改行
- **推奨**: `const` の使用
- **非推奨**: テストでのモックの乱用
  - 特に実装との乖離を生むような過度なスタブは避け、E2E または統合テストとのバランスを考慮
- **非推奨**: `let` の使用
  - ただし、再代入が明確に必要な場面（ループ変数や一時的な状態）の使用可
- **非推奨**: `data-testid` の使用
- **禁止**: `@ts-ignore` ディレクティブの使用
  - `@ts-expect-error` ディレクティブで代用
- **禁止**: `any` 型の使用
  - ただし、型が取得不能な外部ライブラリや JSON パースなどの場合に限り、理由コメントを添えて明示的に使用可
- **禁止**: `var` の使用
- **禁止**: テストの `.skip`
  - 意図的な未実装は TODO コメントで

# IaC

インフラは Terraform によって構築されます。

terraform コマンドは、iac コンテナの中で実行してください。

```bash
# example
make iac
make iac-init
make iac-plan-save
```

aws コマンドも iac コンテナの中で利用できます。

```bash
# example
docker compose exec iac -c 'source ../scripts/create-session.sh && aws ...'
```


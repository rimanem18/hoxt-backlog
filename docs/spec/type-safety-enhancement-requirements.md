# 型安全性強化・API契約強化 要件定義書

## 概要

OpenAPI 3.1、Zod、Drizzle Zodを活用して、フロントエンド・バックエンド間の型安全性を強化し、スキーマ駆動開発によるAPI契約の信頼性を向上させる。データベーススキーマ（Drizzle ORM）を単一の信頼できる情報源（Single Source of Truth）として、API型定義・バリデーション・ドキュメント生成を自動化し、型の不整合を防ぐ。

**作成日**: 2025-10-12
**更新日**: 2025-10-12

## ユーザストーリー

### ストーリー1: スキーマ駆動開発による開発効率向上

- **である** バックエンド開発者 **として**
- **私は** データベーススキーマを変更するだけで、API型定義・バリデーション・ドキュメントが自動更新される **ようにしたい**
- **そうすることで** 手動での型定義の重複記述を避け、開発効率を大幅に向上できる

### ストーリー2: API契約の明示化による連携品質向上

- **である** フロントエンド開発者 **として**
- **私は** OpenAPI仕様書から自動生成されたTypeScript型定義を使用して、バックエンドAPIと安全に連携 **したい**
- **そうすることで** APIレスポンスの型不一致によるランタイムエラーを防ぎ、開発時に型エラーとして検出できる

### ストーリー3: 実行時バリデーションによる信頼性向上

- **である** バックエンド開発者 **として**
- **私は** リクエスト・レスポンスの型を実行時にZodで検証 **したい**
- **そうすることで** 不正なデータがシステムに混入することを防ぎ、型安全性を実行時まで保証できる

### ストーリー4: APIドキュメントの自動生成

- **である** API利用者 **として**
- **私は** 常に最新のOpenAPI仕様書を参照して、エンドポイント・リクエスト・レスポンス形式を確認 **したい**
- **そうすることで** ドキュメントとコードの乖離を防ぎ、正確なAPI仕様を把握できる

## 機能要件（EARS記法）

### 通常要件

- REQ-001: システムはDrizzle ORMのデータベーススキーマを単一の信頼できる情報源として使用しなければならない
- REQ-002: システムはDrizzle Zodを使用してデータベーススキーマからZodスキーマを自動生成しなければならない
- REQ-003: システムは生成されたZodスキーマをAPI型定義の基礎として使用しなければならない
- REQ-004: システムはZodスキーマからOpenAPI 3.1仕様を生成しなければならない
- REQ-005: システムはOpenAPI仕様書からTypeScript型定義を自動生成しなければならない
- REQ-006: システムはバックエンドAPIのリクエスト・レスポンスをZodで実行時検証しなければならない
- REQ-007: システムはフロントエンドで自動生成されたTypeScript型を使用してAPIクライアントを型安全に実装しなければならない

### 条件付き要件

- REQ-101: データベーススキーマが変更された場合、システムは自動的にZodスキーマを再生成しなければならない
- REQ-102: Zodスキーマが変更された場合、システムは自動的にOpenAPI仕様を再生成しなければならない
- REQ-103: OpenAPI仕様が変更された場合、システムは自動的にTypeScript型定義を再生成しなければならない
- REQ-104: APIリクエストがZodバリデーションに失敗した場合、システムは詳細なエラーメッセージと共に400 Bad Requestを返却しなければならない
- REQ-105: APIレスポンスがZodバリデーションに失敗した場合、システムは500 Internal Server Errorをログに記録し、安全なエラーレスポンスを返却しなければならない

### 状態要件

- REQ-201: 開発環境にある場合、システムはOpenAPI仕様書をSwagger UIで提供しなければならない
- REQ-202: 本番環境にある場合、システムはOpenAPI仕様書のアクセスを制限してもよい

### オプション要件

- REQ-301: システムはZod-to-OpenAPIライブラリを使用してOpenAPI生成を効率化してもよい
- REQ-302: システムはopenapi-typescript-codegen等のツールでフロントエンドAPIクライアントコードを自動生成してもよい
- REQ-303: システムはAPI仕様書のバージョニング機能を提供してもよい

### 制約要件

- REQ-401: システムはDrizzle ORMのスキーマ定義を`app/server/src/infrastructure/database/schema.ts`に配置しなければならない
- REQ-402: システムはDBスキーマ（Drizzle Zod）を`app/server/src/schemas/`配下に配置し、APIコントラクトスキーマを`app/packages/shared-schemas/`配下に配置しなければならない
- REQ-403: システムはOpenAPI仕様を`docs/api/openapi.yaml`または`docs/api/openapi.json`として出力しなければならない
- REQ-404: システムはフロントエンドの型定義を`app/client/src/types/api/`配下に自動生成しなければならない
- REQ-405: システムは既存のDDD + クリーンアーキテクチャ構造を維持しながら型安全性を強化しなければならない
- REQ-406: システムはTypeScript 5.x系の型システムを活用しなければならない
- REQ-407: システムはBunパッケージマネージャーとの互換性を維持しなければならない

## 非機能要件

### パフォーマンス

- NFR-001: Zodバリデーションによるレスポンスタイムへの影響を開発環境で測定し、著しい劣化がないことを確認しなければならない
- NFR-002: 型定義の自動生成プロセスは合理的な時間内（開発体験を損なわない範囲）で完了しなければならない

### 保守性・開発効率

- NFR-101: データベーススキーマの変更から型定義の反映まで、手動介入なしに自動化されなければならない
- NFR-102: 型の不整合はTypeScriptコンパイル時に検出されなければならない
- NFR-103: バリデーションエラーメッセージは開発者が原因を特定しやすい形式でなければならない
- NFR-104: 自動生成されたコードはGit管理対象として、差分レビューが可能でなければならない

### 拡張性

- NFR-201: 新しいエンドポイント追加時、Drizzleスキーマの追加だけでAPI型定義が自動生成されなければならない
- NFR-202: 認証プロバイダー追加時、既存のスキーマ駆動開発フローが継続して使用できなければならない

### セキュリティ

- NFR-301: Zodバリデーションは型安全性だけでなく、XSS・SQLインジェクション対策の一環として機能しなければならない
- NFR-302: OpenAPI仕様書に機密情報（DB接続文字列、API Secret等）を含めてはならない
- NFR-303: 実行時バリデーション失敗時、内部エラー詳細をクライアントに露出してはならない

### ドキュメント品質

- NFR-401: OpenAPI仕様書はすべてのエンドポイント・パラメータ・レスポンス形式を網羅しなければならない
- NFR-402: 各スキーマフィールドには日本語の説明コメントが記載されなければならない
- NFR-403: API仕様書はSwagger UIで視覚的に確認可能でなければならない

## Edgeケース

### エラー処理

- EDGE-001: Zodバリデーション失敗時は、フィールド名・期待値・実際の値を含むエラーレスポンスを返却する
- EDGE-002: 型定義自動生成失敗時は、ビルドプロセスを停止し、詳細なエラーメッセージを表示する
- EDGE-003: OpenAPI仕様が不正な場合は、バリデーションエラーを出力し、修正を促す
- EDGE-004: Drizzle ZodとDrizzle ORMのバージョン不整合時は、起動時にエラーを検出する

### 特殊状況

- EDGE-201: Drizzleスキーマとshared-schemas内のZodスキーマが不整合な場合、CI/CDパイプラインでエラーを検出する（技術実装要件「CI/CDパイプライン統合」およびタスクTASK-1202参照）

## 受け入れ基準

### 機能テスト

- [ ] Drizzleスキーマからdrizzle-zodでZodスキーマを自動生成できる
- [ ] ZodスキーマからOpenAPI 3.1仕様を生成できる
- [ ] OpenAPI仕様からTypeScript型定義を自動生成できる
- [ ] バックエンドAPIリクエストがZodで実行時検証される
- [ ] バックエンドAPIレスポンスがZodで実行時検証される
- [ ] フロントエンドで自動生成された型を使用してAPIクライアントを実装できる
- [ ] データベーススキーマ変更時、bun runコマンドで全型定義が再生成される
- [ ] Zodバリデーションエラーが適切なHTTPステータスコードと共に返却される

### 非機能テスト

- [ ] Zodバリデーションによるレスポンスタイムへの影響が著しくない
- [ ] 型定義自動生成が合理的な時間内に完了する
- [ ] TypeScriptコンパイル時に型の不整合が検出される
- [ ] Swagger UIでOpenAPI仕様書が正常に表示される
- [ ] バリデーションエラーメッセージが開発者に分かりやすい

### ドキュメント品質テスト

- [ ] OpenAPI仕様書がすべてのエンドポイントを網羅している
- [ ] 各スキーマフィールドに日本語説明が記載されている
- [ ] API仕様書とコードが一致している（手動確認）

### セキュリティテスト

- [ ] OpenAPI仕様書に機密情報が含まれていない
- [ ] 実行時バリデーション失敗時、内部エラー詳細がクライアントに露出しない
- [ ] XSS・SQLインジェクション対策としてZodバリデーションが機能する

## 技術実装要件

### バックエンド（Hono API）

- **Drizzle Zod統合**:
  - `drizzle-zod`パッケージを使用してDrizzleスキーマからZodスキーマを自動生成
  - `app/server/src/schemas/`にDBスキーマを出力（server専用）
  - `app/packages/shared-schemas/`にAPIコントラクトスキーマを定義（server/client共有）

- **Zod-to-OpenAPI統合**:
  - `@asteasolutions/zod-to-openapi`または`@hono/zod-openapi`を使用
  - ZodスキーマからOpenAPI 3.1仕様を生成
  - `docs/api/openapi.yaml`に出力

- **実行時バリデーション**:
  - Honoミドルウェアでリクエストバリデーションを実装
  - レスポンス送信前にZodバリデーションを実行（開発環境）
  - バリデーションエラー時の詳細なエラーレスポンス生成

- **Swagger UI統合**:
  - 開発環境で`/api/docs`エンドポイントにSwagger UIを提供
  - 本番環境ではアクセス制限または無効化

### フロントエンド（Next.js）

- **OpenAPI型定義生成**:
  - `openapi-typescript`または`openapi-typescript-codegen`を使用
  - OpenAPI仕様からTypeScript型定義を自動生成
  - `app/client/src/types/api/`に出力

- **APIクライアント実装**:
  - 自動生成された型を使用してfetch/axios等のAPIクライアントを型安全に実装
  - React Queryと統合してキャッシュ・再検証を実装

### バックエンドスキーマ（server/src/schemas）

- **DBスキーマ定義**:
  - Drizzle Zodで生成されたDBスキーマ（server専用）
  - データベース読み取り・書き込み型定義（selectUserSchema, insertUserSchema）
  - Repository層での型安全性保証

### 共通パッケージ（shared-schemas）

- **APIコントラクトスキーマ定義**:
  - API契約用のリクエスト・レスポンススキーマ（server/client共有）
  - OpenAPI仕様生成の基礎スキーマ
  - 共通バリデーションルール（email、UUID等）

### ビルド・開発ワークフロー

- **型定義自動生成スクリプト**:
  ```bash
  # バックエンド
  docker compose exec server bun run generate:schemas
  docker compose exec server bun run generate:openapi

  # フロントエンド
  docker compose exec client bun run generate:types
  ```

- **CI/CDパイプライン統合**:
  - PRマージ前に型定義が最新かチェック
  - 型定義の差分をレビュー可能にする

## 依存関係

### 追加パッケージ

- **バックエンド**:
  - `drizzle-zod`: ^0.8.3（既存）
  - `@hono/zod-openapi`: 最新安定版（新規）
  - `@asteasolutions/zod-to-openapi`: 最新安定版（代替案）
  - `swagger-ui-dist`: 最新安定版（新規）

- **フロントエンド**:
  - `openapi-typescript`: 最新安定版（新規）
  - `openapi-fetch`: 最新安定版（新規・オプション）

### 既存依存関係

- Drizzle ORM: 0.44.4
- Zod: 4.0.17
- TypeScript: 5.9.2
- Hono: 4.9.0
- Next.js: 15.4.6

## 実装フェーズ

### Phase 1: Drizzle Zod統合（基礎構築）

1. Drizzleスキーマから`createSelectSchema`・`createInsertSchema`を使用してZodスキーマ生成
2. `app/packages/shared-schemas/users.ts`のTODOを解消
3. サーバー・クライアント両方でZodスキーマをimport可能にする
4. 既存の手動Zodスキーマ定義を段階的に置き換え

### Phase 2: OpenAPI仕様生成（API契約明示化）

1. `@hono/zod-openapi`を導入してHonoルート定義をOpenAPI対応化
2. 既存のHonoルート（`authRoutes.ts`、`userRoutes.ts`等）をOpenAPIルートに移行
3. OpenAPI仕様を`docs/api/openapi.yaml`に出力
4. Swagger UIを`/api/docs`エンドポイントで提供

### Phase 3: TypeScript型定義自動生成（フロントエンド型安全化）

1. `openapi-typescript`を使用してOpenAPI仕様からTypeScript型定義生成
2. `app/client/src/types/api/`に自動生成ファイルを配置
3. React QueryフックでAPIクライアントを型安全に実装
4. 既存のAPI呼び出しを段階的に移行

### Phase 4: 実行時バリデーション強化（信頼性向上）

1. Honoミドルウェアでリクエスト・レスポンスのZodバリデーション実装
2. バリデーションエラーの詳細なエラーメッセージ生成
3. 開発環境でレスポンスバリデーションを有効化
4. 本番環境での最小限のバリデーション戦略を決定

### Phase 5: 自動化・CI/CD統合（運用効率化）

1. 型定義自動生成スクリプトをpackage.jsonに追加
2. Git pre-commitフックで型定義の最新性チェック
3. GitHub ActionsでOpenAPI仕様書の差分レビュー
4. ドキュメント生成の自動化

## スキーマ駆動開発フロー（全体像）

```
1. データベーススキーマ変更（Drizzle ORM）
   ↓
2. Drizzle Zodで自動生成（createSelectSchema/createInsertSchema）
   ↓
3. API契約スキーマ定義（Zod - shared-schemas）
   ↓
4. OpenAPI仕様生成（@hono/zod-openapi）
   ↓
5. TypeScript型定義生成（openapi-typescript）
   ↓
6. フロントエンド・バックエンドで型安全なAPI連携
```

**Single Source of Truth**: Drizzle ORMのデータベーススキーマ
**型安全性の保証**: コンパイル時（TypeScript） + 実行時（Zod）

## 既存システムとの統合

### DDD + クリーンアーキテクチャとの整合性

- **Domain層**: エンティティ・値オブジェクトの型定義にZodスキーマを使用
- **Application層**: Use Case入出力の型定義にZodスキーマを使用
- **Infrastructure層**: Drizzle ORMスキーマからRepository型を生成
- **Presentation層**: HonoルートでOpenAPI定義とZodバリデーション統合

### 既存の認証フローとの統合

- 認証レスポンス（`AuthResponse`）をOpenAPIで定義
- JWT検証ミドルウェアとZodバリデーションを組み合わせ
- ユーザープロフィール取得APIの型定義を自動生成

## 今回のスコープ外（将来拡張）

以下は今回の要件定義では対象外とし、将来的な拡張として考慮する：

- GraphQL/gRPC対応
- モックサーバー自動生成（Prism等）
- Postman/Insomnia用コレクション生成
- API契約テスト自動化（Pact等）
- スキーマレジストリ導入
- バージョニング戦略（v1/v2等）
- API変更検知・Breaking Change警告
- 複数言語のAPI仕様書生成

## 参考資料

- [Drizzle Zod公式ドキュメント](https://orm.drizzle.team/docs/zod)
- [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [OpenAPI TypeScript](https://openapi-ts.dev)
- [OpenAPI TypeScript - GitHub](https://github.com/openapi-ts/openapi-typescript)
- [Zod to OpenAPI](https://github.com/asteasolutions/zod-to-openapi)

## 更新履歴

- 2025-10-12: 初版作成（OpenAPI・Zod・Drizzle Zod統合要件定義）

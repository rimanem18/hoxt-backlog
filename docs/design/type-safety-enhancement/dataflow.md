# データフロー図

**作成日**: 2025-10-12
**更新日**: 2025-10-12

## スキーマ駆動開発の全体フロー

```mermaid
flowchart TD
    A["データベーススキーマ変更<br/>Drizzle ORM schema.ts"] --> B["drizzle-zod<br/>createSelectSchema/createInsertSchema"]
    B --> C["Zodスキーマ生成<br/>shared-schemas/"]
    C --> D["@hono/zod-openapi<br/>OpenAPI 3.1仕様生成"]
    C --> E["バックエンド<br/>Zodバリデーション"]
    D --> F["openapi-typescript<br/>TypeScript型定義生成"]
    F --> G["フロントエンド<br/>型安全なAPIクライアント"]
    E --> H["API Request/Response<br/>実行時検証"]
    G --> H
    H --> I["型安全なAPI連携<br/>コンパイル時 + 実行時"]

    style A fill:#e1f5ff,stroke:#01579b
    style C fill:#fff9c4,stroke:#f57f17
    style D fill:#f3e5f5,stroke:#4a148c
    style F fill:#e8f5e9,stroke:#1b5e20
    style I fill:#ffebee,stroke:#b71c1c
```

## ユーザーインタラクションフロー（認証済みユーザー取得の例）

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Client as Next.js Client<br/>(React Query)
    participant API as Hono API<br/>(OpenAPI Route)
    participant Zod as Zodバリデーション<br/>(Middleware)
    participant UC as Use Case<br/>(Application層)
    participant Repo as Repository<br/>(Infrastructure層)
    participant DB as PostgreSQL<br/>(Supabase)

    User->>Client: ユーザー情報取得リクエスト

    rect rgb(230, 245, 255)
        Note over Client: TypeScript型安全性チェック<br/>（コンパイル時）
        Client->>Client: openapi-typescriptで生成された型を使用
    end

    Client->>API: GET /users/{id}<br/>(JWT Token付き)

    rect rgb(255, 243, 224)
        Note over API,Zod: リクエストバリデーション<br/>（実行時）
        API->>Zod: Zodスキーマでパラメータ検証
        Zod-->>API: バリデーション成功
    end

    API->>UC: execute({ userId: id })
    UC->>Repo: findById(id)

    Repo->>DB: SELECT * FROM users<br/>WHERE id = $1
    DB-->>Repo: User Record

    rect rgb(255, 249, 196)
        Note over Repo: Zodバリデーション<br/>（DBレスポンス検証）
        Repo->>Repo: selectUserSchema.parse(record)
    end

    Repo-->>UC: User Entity
    UC-->>API: GetUserOutput

    rect rgb(255, 235, 238)
        Note over API,Zod: レスポンスバリデーション<br/>（開発環境のみ）
        API->>Zod: getUserResponseSchema.parse(output)
        Zod-->>API: バリデーション成功
    end

    API-->>Client: 200 OK<br/>{ success: true, data: User }

    rect rgb(232, 245, 233)
        Note over Client: TypeScript型推論<br/>（型安全なレスポンス）
        Client->>Client: data.data.email // 完全に型安全
    end

    Client-->>User: ユーザー情報表示
```

## 型定義自動生成フロー

```mermaid
flowchart LR
    A["開発者: スキーマ変更<br/>schema.ts"] --> B["bun run generate:schemas"]
    B --> C["Drizzle Zod実行<br/>createSelectSchema/createInsertSchema"]
    C --> D["Zodスキーマ生成<br/>shared-schemas/users.ts"]
    D --> E["bun run generate:openapi"]
    E --> F["@hono/zod-openapi実行<br/>Honoルート解析"]
    F --> G["OpenAPI 3.1仕様出力<br/>docs/api/openapi.yaml"]
    G --> H["bun run generate:types"]
    H --> I["openapi-typescript実行<br/>型定義生成"]
    I --> J["TypeScript型定義出力<br/>types/api/generated.ts"]
    J --> K["Git Commit<br/>差分レビュー"]

    style A fill:#e1f5ff
    style D fill:#fff9c4
    style G fill:#f3e5f5
    style J fill:#e8f5e9
    style K fill:#ffebee
```

## エラーハンドリングフロー

```mermaid
flowchart TD
    A["API Request"] --> B{"JWKS検証"}
    B -->|"失敗"| C["401 Unauthorized<br/>認証エラー"]
    B -->|"成功"| D{"Zodリクエストバリデーション"}
    D -->|"失敗"| E["400 Bad Request<br/>詳細エラーメッセージ"]
    D -->|"成功"| F["Use Case実行"]
    F --> G{"ビジネスロジックエラー"}
    G -->|"エラー"| H["適切なHTTPステータス<br/>404/403/422等"]
    G -->|"成功"| I{"Zodレスポンスバリデーション<br/>開発環境のみ"}
    I -->|"失敗"| J["500 Internal Server Error<br/>ログ記録"]
    I -->|"成功"| K["200 OK<br/>型安全なレスポンス"]

    style C fill:#ffcdd2
    style E fill:#ffcdd2
    style H fill:#ffe0b2
    style J fill:#ffcdd2
    style K fill:#c8e6c9
```

## データ処理フロー（新規ユーザー登録の例）

```mermaid
sequenceDiagram
    participant Client as Next.js Client
    participant API as Hono API
    participant Zod as Zodバリデーション
    participant UC as CreateUserUseCase
    participant Repo as UserRepository
    participant DB as PostgreSQL

    Client->>API: POST /auth/register<br/>{ email, name, provider, externalId }

    API->>Zod: insertUserSchema.parse(body)
    alt バリデーション失敗
        Zod-->>API: ZodError
        API-->>Client: 400 Bad Request<br/>{ error: { code: "VALIDATION_ERROR", ... } }
    else バリデーション成功
        Zod-->>API: Validated Data

        API->>UC: execute(createUserInput)

        UC->>UC: ビジネスロジック検証<br/>（メール重複チェック等）

        alt ビジネスロジックエラー
            UC-->>API: DomainError
            API-->>Client: 422 Unprocessable Entity
        else 正常処理
            UC->>Repo: create(userData)

            Repo->>DB: INSERT INTO users<br/>VALUES (...)
            DB-->>Repo: User Record

            Repo->>Zod: selectUserSchema.parse(record)
            Zod-->>Repo: Validated User

            Repo-->>UC: User Entity
            UC-->>API: CreateUserOutput

            API->>Zod: createUserResponseSchema.parse(output)<br/>（開発環境のみ）
            Zod-->>API: Validated Response

            API-->>Client: 201 Created<br/>{ success: true, data: User }
        end
    end
```

## スキーマ同期フロー（CI/CD統合）

```mermaid
flowchart TD
    A["開発者: コミット"] --> B["GitHub Actions起動"]
    B --> C["チェックアウト"]
    C --> D["依存関係インストール<br/>bun install"]
    D --> E["型定義自動生成<br/>bun run generate:schemas<br/>bun run generate:openapi<br/>bun run generate:types"]
    E --> F{"生成ファイルに差分あり?"}
    F -->|"差分あり"| G["CIエラー<br/>型定義が古い"]
    F -->|"差分なし"| H["TypeScriptコンパイル<br/>tsc --noEmit"]
    H --> I{"型エラーあり?"}
    I -->|"あり"| J["CIエラー<br/>型の不整合"]
    I -->|"なし"| K["テスト実行<br/>bun test"]
    K --> L{"テスト失敗?"}
    L -->|"失敗"| M["CIエラー"]
    L -->|"成功"| N["CI成功<br/>マージ可能"]

    style G fill:#ffcdd2
    style J fill:#ffcdd2
    style M fill:#ffcdd2
    style N fill:#c8e6c9
```

## 認証フロー（Supabase Auth統合 - JWKS検証）

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Client as Next.js Client
    participant Supabase as Supabase Auth
    participant API as Hono API
    participant JWKS as JWKS Endpoint<br/>(Supabase)
    participant DB as PostgreSQL

    User->>Client: ログインボタンクリック<br/>（Google OAuth）
    Client->>Supabase: signInWithOAuth({ provider: 'google' })
    Supabase->>User: Google認証画面リダイレクト
    User->>Supabase: Google認証成功
    Supabase->>Client: コールバック<br/>JWT Token + User Info

    Client->>API: POST /auth/callback<br/>{ token, externalId, provider }

    rect rgb(255, 243, 224)
        Note over API,JWKS: JWKS検証プロセス<br/>（RS256/ES256非対称鍵）
        API->>API: JWTヘッダーから kid 取得
        API->>JWKS: GET /.well-known/jwks.json
        JWKS-->>API: 公開鍵セット（キャッシュ10分）
        API->>API: kid に対応する公開鍵で署名検証
    end

    alt JWKS検証失敗
        API-->>Client: 401 Unauthorized
    else JWKS検証成功
        API->>DB: SELECT * FROM users<br/>WHERE external_id = $1<br/>AND provider = $2

        alt ユーザー未登録
            DB-->>API: 0 rows
            API->>DB: INSERT INTO users<br/>（新規ユーザー作成）
            DB-->>API: New User Record
        else ユーザー登録済み
            DB-->>API: Existing User Record
            API->>DB: UPDATE users<br/>SET last_login_at = NOW()<br/>WHERE id = $1
        end

        API-->>Client: 200 OK<br/>{ success: true, data: User }
        Client->>Client: Redux Store更新<br/>認証状態保存
        Client-->>User: ホーム画面リダイレクト
    end
```

## OpenAPIドキュメント提供フロー（Swagger UI）

```mermaid
flowchart LR
    A["開発者"] --> B["http://localhost:3001/api/docs"]
    B --> C["Hono OpenAPI Route<br/>/api/docs"]
    C --> D["docs/api/openapi.yaml読み込み"]
    D --> E["Swagger UI HTML生成<br/>swagger-ui-dist"]
    E --> F["ブラウザ表示<br/>インタラクティブAPI仕様"]
    F --> G["Try it out機能<br/>APIテスト実行"]
    G --> H["実際のAPIエンドポイント<br/>リクエスト送信"]
    H --> I["レスポンス表示<br/>型安全性確認"]

    style B fill:#e1f5ff
    style D fill:#f3e5f5
    style F fill:#fff9c4
    style I fill:#e8f5e9
```

## データベーススキーママイグレーションフロー

```mermaid
flowchart TD
    A["開発者: スキーマ変更<br/>schema.ts"] --> B["drizzle-kit generate"]
    B --> C["マイグレーションSQL生成<br/>drizzle/migrations/"]
    C --> D{"マイグレーション確認"}
    D -->|"修正必要"| A
    D -->|"OK"| E["drizzle-kit push<br/>または drizzle-kit migrate"]
    E --> F["PostgreSQLスキーマ更新"]
    F --> G["bun run generate:schemas<br/>Zodスキーマ再生成"]
    G --> H["bun run generate:openapi<br/>OpenAPI仕様更新"]
    H --> I["bun run generate:types<br/>型定義更新"]
    I --> J["Git Commit<br/>スキーマ変更履歴記録"]

    style A fill:#e1f5ff
    style F fill:#f3e5f5
    style G fill:#fff9c4
    style I fill:#e8f5e9
    style J fill:#ffebee
```

## まとめ

これらのデータフローにより、以下が実現される：

1. **単一の信頼できる情報源**: Drizzle ORMスキーマから全型定義を自動生成
2. **二重の型安全性**: コンパイル時（TypeScript） + 実行時（Zod）
3. **自動ドキュメント生成**: OpenAPI仕様 → Swagger UI
4. **継続的な型整合性**: CI/CDパイプラインで差分検出
5. **効率的なエラーハンドリング**: 詳細なバリデーションエラーメッセージ

これにより、手動での型定義重複を排除し、型の不整合を防ぎ、開発効率とコード品質を向上させる。

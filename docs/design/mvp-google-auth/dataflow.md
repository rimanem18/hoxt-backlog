# データフロー図

作成日: 2025-08-12
更新日: 2025-08-12

## システム全体データフロー

### アーキテクチャ概要
```mermaid
C4Context
  title System Context - MVP Google認証システム

  Person(user, "ユーザー", "Google アカウントでログインするアプリケーション利用者")
  
  System(frontend, "フロントエンドアプリ", "Next.js + Supabase Auth\nGoogle認証・JWT取得・UI表示")
  System(backend, "バックエンドAPI", "Hono + PostgreSQL\nJWT検証・ユーザー管理・DDD")
  
  System_Ext(supabase, "Supabase Auth", "Google OAuth代理実行\nJWT発行・検証キー提供")
  System_Ext(google, "Google OAuth", "Googleアカウント認証\nユーザー情報提供")
  SystemDb_Ext(postgres, "PostgreSQL", "ユーザーデータ永続化\nJITプロビジョニング")

  Rel(user, frontend, "ブラウザアクセス", "HTTPS")
  Rel(frontend, supabase, "OAuth実行・JWT取得", "HTTPS/API")
  Rel(supabase, google, "認証代理実行", "HTTPS/OAuth2")
  Rel(frontend, backend, "JWT送信・API呼び出し", "HTTPS/REST")
  Rel(backend, postgres, "ユーザーデータCRUD", "PostgreSQL Protocol")
  Rel(backend, supabase, "JWT検証", "HTTPS/API")
```

## 認証フローシーケンス

### 初回ログインフロー（JITプロビジョニング）
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド<br/>(Next.js)
    participant S as Supabase Auth
    participant G as Google OAuth
    participant B as バックエンド<br/>(Hono API)
    participant D as PostgreSQL

    Note over U,D: 【初回ログインフロー】
    
    U->>F: 1. ページアクセス
    F->>U: 2. Googleログインボタン表示
    
    U->>F: 3. Googleログインボタンクリック
    F->>S: 4. signInWithOAuth({ provider: 'google' })
    S->>G: 5. OAuth認証リクエスト
    G->>U: 6. Google認証ページ表示
    
    U->>G: 7. Googleアカウント認証
    G->>S: 8. 認証コード返却
    S->>G: 9. アクセストークン・ユーザー情報取得
    G->>S: 10. ユーザー情報返却
    
    S->>F: 11. JWT + セッション情報返却
    F->>U: 12. ログイン完了・メインページへリダイレクト
    
    Note over F,D: 【ユーザー情報表示フロー】
    F->>B: 13. GET /api/user/profile<br/>Authorization: Bearer {JWT}
    
    Note over B: JWT検証・ユーザー取得・JIT実行
    B->>S: 14. JWT検証リクエスト
    S->>B: 15. JWT検証結果・ユーザー情報
    
    B->>D: 16. SELECT * FROM users WHERE external_id = ?
    D->>B: 17. ユーザー不存在
    
    Note over B: JIT プロビジョニング実行
    B->>D: 18. INSERT INTO users (external_id, email, name, ...)
    D->>B: 19. ユーザー作成完了
    
    B->>F: 20. ユーザー情報JSON返却
    F->>U: 21. ユーザー情報表示・ログアウトボタン表示
```

### 2回目以降のログインフロー
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド<br/>(Next.js)
    participant S as Supabase Auth
    participant G as Google OAuth
    participant B as バックエンド<br/>(Hono API)
    participant D as PostgreSQL

    Note over U,D: 【既存ユーザーログインフロー】
    
    U->>F: 1. ページアクセス
    Note over F: セッション復元確認
    F->>S: 2. getSession()
    S->>F: 3. 既存セッション・JWT返却
    
    F->>B: 4. GET /api/user/profile<br/>Authorization: Bearer {JWT}
    B->>S: 5. JWT検証
    S->>B: 6. JWT検証結果
    
    B->>D: 7. SELECT * FROM users WHERE external_id = ?
    D->>B: 8. 既存ユーザー情報返却
    
    B->>F: 9. ユーザー情報返却
    F->>U: 10. ユーザー情報表示（JIT処理スキップ）
```

### ログアウトフロー
```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド<br/>(Next.js)
    participant S as Supabase Auth

    U->>F: 1. ログアウトボタンクリック
    F->>S: 2. signOut()
    S->>F: 3. セッション削除完了
    F->>U: 4. ログインページ表示・認証状態リセット
    
    Note over U,F: バックエンドへの通知は不要<br/>(JWTの有効期限で自動無効化)
```

## DDD層間のデータフロー

### アプリケーション層での認証処理
```mermaid
flowchart TD
    A[AuthController] --> B[AuthenticateUserUseCase]
    B --> C{JWT検証}
    C -->|成功| D[UserAggregate取得・作成]
    C -->|失敗| E[認証エラー返却]
    
    D --> F{既存ユーザー？}
    F -->|存在| G[既存UserAggregate取得]
    F -->|不存在| H[JIT UserAggregate作成]
    
    G --> I[ユーザー情報返却]
    H --> J[新規ユーザー永続化]
    J --> I
    
    E --> K[401 Unauthorized]
    I --> L[200 OK + User Info]
```

### Domain層での集約管理
```mermaid
flowchart LR
    subgraph "Domain Layer"
        A[UserAggregate] --> B[User Entity]
        A --> C[AuthProvider Interface]
        A --> D[UserRepository Interface]
    end
    
    subgraph "Infrastructure Layer"
        E[SupabaseAuthProvider] -.->|implements| C
        F[PostgreSQLUserRepository] -.->|implements| D
    end
    
    subgraph "Application Layer"
        G[AuthenticateUserUseCase] --> A
        H[GetUserProfileUseCase] --> A
    end
```

## エラーフロー

### 認証エラーハンドリング
```mermaid
flowchart TD
    A[API リクエスト] --> B{JWT有効？}
    B -->|無効| C[401 Unauthorized]
    B -->|有効| D{ユーザー存在？}
    
    D -->|存在| E[正常処理継続]
    D -->|不存在| F{JIT許可？}
    
    F -->|許可| G[ユーザー作成]
    F -->|禁止| H[403 Forbidden]
    
    G --> I{作成成功？}
    I -->|成功| E
    I -->|失敗| J[500 Internal Server Error]
    
    C --> K[ログインページリダイレクト]
    H --> L[エラーメッセージ表示]
    J --> M[システムエラーメッセージ表示]
```

## データ永続化フロー

### ユーザー作成・更新パターン
```mermaid
flowchart TD
    A[UserAggregate.createFromOAuth] --> B{バリデーション}
    B -->|OK| C[User Entity生成]
    B -->|NG| D[ドメインエラー]
    
    C --> E[UserRepository.save]
    E --> F[PostgreSQL INSERT/UPDATE]
    F --> G{DB操作成功？}
    
    G -->|成功| H[永続化完了]
    G -->|失敗| I[インフラエラー]
    
    D --> J[400 Bad Request]
    I --> K[500 Internal Server Error]
    H --> L[ユーザー情報返却]
```

## パフォーマンス考慮事項

### 並列処理フロー
```mermaid
flowchart TD
    A[JWT検証開始] --> B[並列実行]
    
    subgraph "並列処理"
        C[JWT署名検証<br/>~100ms]
        D[ユーザー情報取得<br/>~200ms]
    end
    
    B --> C
    B --> D
    C --> E[結果マージ]
    D --> E
    E --> F{すべて成功？}
    
    F -->|成功| G[認証完了<br/>~300ms]
    F -->|失敗| H[エラー処理]
```

### データベースアクセスパターン
```mermaid
flowchart LR
    A[API Request] --> B[Connection Pool取得]
    B --> C[クエリ実行]
    C --> D{結果キャッシュ可能？}
    
    D -->|可能| E[メモリキャッシュ保存<br/>今回MVP対象外]
    D -->|不可| F[直接返却]
    
    E --> G[Connection Pool返却]
    F --> G
    G --> H[Response]
```
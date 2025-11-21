# TODOリストアプリ データフロー図

## 📄 ドキュメント情報

- **作成日**: 2025-11-06
- **要件名**: todo-app
- **バージョン**: 1.0.0
- **関連文書**:
  - [アーキテクチャ設計](./architecture.md)
  - [要件定義書](../../spec/todo-app-requirements.md)

## ユーザーインタラクションフロー

### 全体フロー

```mermaid
flowchart TD
    A["ユーザー<br/>(ブラウザ)"] --> B["認証<br/>(Supabase Auth)"]
    B -->|"JWT取得"| C["Next.js<br/>フロントエンド"]
    C -->|"API呼び出し<br/>(HTTPS + JWT)"| D["Hono API<br/>バックエンド"]
    D -->|"Drizzle ORM<br/>+ RLS"| E["PostgreSQL<br/>(app_test schema)"]
    E -->|"タスクデータ"| D
    D -->|"JSON<br/>(TaskDTO)"| C
    C -->|"UI表示"| A
```

🔵 *技術スタック、アーキテクチャ設計より*

### タスク作成フロー

```mermaid
flowchart TD
    Start["ユーザー:<br/>タイトル入力 + Enter"] --> Validate["クライアント:<br/>バリデーション"]
    Validate -->|"有効"| APICall["API呼び出し:<br/>POST /api/tasks"]
    Validate -->|"無効"| Error1["エラー表示:<br/>タイトルを入力してください"]
    APICall --> JWTVerify["バックエンド:<br/>JWT検証"]
    JWTVerify -->|"成功"| ZodValidate["バックエンド:<br/>Zodバリデーション"]
    JWTVerify -->|"失敗"| Error2["401エラー:<br/>認証が必要です"]
    ZodValidate -->|"成功"| UseCase["CreateTaskUseCase:<br/>execute"]
    ZodValidate -->|"失敗"| Error3["400エラー:<br/>バリデーションエラー"]
    UseCase --> Repo["PostgreSQLTaskRepository:<br/>save"]
    Repo --> DB["PostgreSQL:<br/>INSERT INTO tasks"]
    DB --> RLS["RLS:<br/>user_id自動付与"]
    RLS --> Response["201 Created:<br/>TaskDTO"]
    Response --> UpdateUI["フロントエンド:<br/>Redux/Query更新"]
    UpdateUI --> Display["UI:<br/>タスクが一覧に追加"]
```

🔵 *要件定義書 REQ-001、アーキテクチャ設計より*

### タスク一覧取得フロー(フィルタ・ソート)

```mermaid
flowchart TD
    Start["ユーザー:<br/>フィルタ選択"] --> Redux["フロントエンド:<br/>Redux状態更新"]
    Redux --> APICall["API呼び出し:<br/>GET /api/tasks?status=not_started,in_progress&sort=created_at_desc"]
    APICall --> JWTVerify["バックエンド:<br/>JWT検証"]
    JWTVerify -->|"成功"| UseCase["GetTasksUseCase:<br/>execute"]
    JWTVerify -->|"失敗"| Error["401エラー:<br/>認証が必要です"]
    UseCase --> Repo["PostgreSQLTaskRepository:<br/>findByUserId"]
    Repo --> Query["SQL:<br/>SELECT * FROM tasks<br/>WHERE user_id = ?<br/>AND status IN (?, ?)<br/>ORDER BY created_at DESC"]
    Query --> RLS["RLS:<br/>user_id自動フィルタ"]
    RLS --> Response["200 OK:<br/>TaskDTO[]"]
    Response --> UpdateUI["フロントエンド:<br/>TanStack Query更新"]
    UpdateUI --> Display["UI:<br/>フィルタされたタスク表示"]
```

🔵 *要件定義書 REQ-201, REQ-202, REQ-203、アーキテクチャ設計より*

### タスク更新フロー

```mermaid
flowchart TD
    Start["ユーザー:<br/>タスククリック"] --> Modal["モーダル:<br/>開く"]
    Modal --> Edit["ユーザー:<br/>タイトル・説明・優先度編集"]
    Edit --> Save["ユーザー:<br/>保存ボタンクリック"]
    Save --> Validate["クライアント:<br/>バリデーション"]
    Validate -->|"有効"| APICall["API呼び出し:<br/>PUT /api/tasks/:id"]
    Validate -->|"無効"| Error1["エラー表示:<br/>バリデーションエラー"]
    APICall --> JWTVerify["バックエンド:<br/>JWT検証"]
    JWTVerify -->|"成功"| ZodValidate["バックエンド:<br/>Zodバリデーション"]
    JWTVerify -->|"失敗"| Error2["401エラー:<br/>認証が必要です"]
    ZodValidate -->|"成功"| UseCase["UpdateTaskUseCase:<br/>execute"]
    ZodValidate -->|"失敗"| Error3["400エラー:<br/>バリデーションエラー"]
    UseCase --> Repo["PostgreSQLTaskRepository:<br/>update"]
    Repo --> DB["PostgreSQL:<br/>UPDATE tasks<br/>WHERE id = ? AND user_id = ?"]
    DB --> RLS["RLS:<br/>他ユーザーのタスクは更新不可"]
    RLS -->|"成功"| Response["200 OK:<br/>TaskDTO"]
    RLS -->|"0件更新"| Error4["404エラー:<br/>タスクが見つかりません"]
    Response --> UpdateUI["フロントエンド:<br/>Redux/Query更新"]
    UpdateUI --> CloseModal["モーダル:<br/>閉じる"]
    CloseModal --> Display["UI:<br/>タスクが更新される"]
```

🔵 *要件定義書 REQ-002、アーキテクチャ設計より*

### タスク削除フロー

```mermaid
flowchart TD
    Start["ユーザー:<br/>削除ボタンクリック"] --> Dialog["確認ダイアログ:<br/>表示"]
    Dialog -->|"キャンセル"| Cancel["キャンセル:<br/>何もしない"]
    Dialog -->|"削除"| APICall["API呼び出し:<br/>DELETE /api/tasks/:id"]
    APICall --> JWTVerify["バックエンド:<br/>JWT検証"]
    JWTVerify -->|"成功"| UseCase["DeleteTaskUseCase:<br/>execute"]
    JWTVerify -->|"失敗"| Error1["401エラー:<br/>認証が必要です"]
    UseCase --> Repo["PostgreSQLTaskRepository:<br/>delete"]
    Repo --> DB["PostgreSQL:<br/>DELETE FROM tasks<br/>WHERE id = ? AND user_id = ?"]
    DB --> RLS["RLS:<br/>他ユーザーのタスクは削除不可"]
    RLS -->|"成功"| Response["204 No Content"]
    RLS -->|"0件削除"| Error2["404エラー:<br/>タスクが見つかりません"]
    Response --> UpdateUI["フロントエンド:<br/>Redux/Query更新"]
    UpdateUI --> Display["UI:<br/>タスクが一覧から削除"]
```

🔵 *要件定義書 REQ-003、アーキテクチャ設計より*

### ステータス変更フロー

```mermaid
flowchart TD
    Start["ユーザー:<br/>ステータス選択<br/>(未着手→進行中)"] --> APICall["API呼び出し:<br/>PATCH /api/tasks/:id/status"]
    APICall --> JWTVerify["バックエンド:<br/>JWT検証"]
    JWTVerify -->|"成功"| ZodValidate["バックエンド:<br/>Zodバリデーション<br/>(not_started, in_progress, in_review, completed)"]
    JWTVerify -->|"失敗"| Error1["401エラー:<br/>認証が必要です"]
    ZodValidate -->|"成功"| UseCase["ChangeTaskStatusUseCase:<br/>execute"]
    ZodValidate -->|"失敗"| Error2["400エラー:<br/>不正なステータス値"]
    UseCase --> Repo["PostgreSQLTaskRepository:<br/>updateStatus"]
    Repo --> DB["PostgreSQL:<br/>UPDATE tasks<br/>SET status = ?<br/>WHERE id = ? AND user_id = ?"]
    DB --> Check["CHECK制約:<br/>status IN (not_started, in_progress, in_review, completed)"]
    Check -->|"成功"| RLS["RLS:<br/>他ユーザーのタスクは更新不可"]
    Check -->|"失敗"| Error3["500エラー:<br/>CHECK制約違反"]
    RLS -->|"成功"| Response["200 OK:<br/>TaskDTO"]
    RLS -->|"0件更新"| Error4["404エラー:<br/>タスクが見つかりません"]
    Response --> UpdateUI["フロントエンド:<br/>Redux/Query更新"]
    UpdateUI --> Display["UI:<br/>ステータスが視覚的に更新"]
```

🔵 *要件定義書 REQ-004、アーキテクチャ設計より*

## データ処理フロー

### スキーマ駆動開発フロー

```mermaid
flowchart LR
    A["データベーススキーマ変更<br/>Drizzle ORM schema.ts<br/>tasksテーブル追加"] --> B["Zodスキーマ生成<br/>bun run generate:schemas<br/>shared-schemas/tasks.ts"]
    B --> C["OpenAPI仕様生成<br/>bun run generate:openapi<br/>docs/api/openapi.yaml"]
    C --> D["TypeScript型定義生成<br/>bun run generate:types<br/>client/src/types/api/generated.ts"]
    D --> E["型チェック<br/>bun run typecheck"]
    E -->|"成功"| F["TDD開発開始"]
    E -->|"失敗"| A
```

🔵 *CLAUDE.md、技術スタック、要件定義書 REQ-405 より*

### セキュリティフロー(JWT + RLS)

```mermaid
flowchart TD
    subgraph "クライアント"
        A["Supabase Authで認証"] --> B["JWTトークン取得"]
    end

    subgraph "バックエンド"
        C["API呼び出し<br/>(Authorization: Bearer JWT)"] --> D["JWT検証<br/>(JWKS)"]
        D -->|"成功"| E["user_id抽出"]
        D -->|"失敗"| F["401 Unauthorized"]
        E --> G["RLS設定<br/>SET LOCAL app.current_user_id = user_id"]
    end

    subgraph "データベース"
        G --> H["RLS Policy適用<br/>WHERE user_id = current_setting"]
        H --> I["クエリ実行<br/>(自動的にuser_idフィルタ)"]
        I --> J["自分のタスクのみ<br/>取得/更新/削除"]
    end

    B --> C
```

🔵 *アーキテクチャ設計、要件定義書 REQ-402, REQ-403 より*

### エラーハンドリングフロー

```mermaid
flowchart TD
    Start["API呼び出し"] --> Try["try-catch<br/>ブロック"]
    Try -->|"成功"| Success["正常レスポンス"]
    Try -->|"例外発生"| Catch["例外をキャッチ"]
    Catch --> Check["エラー種別判定"]
    Check -->|"TaskNotFoundError"| Error404["404 Not Found<br/>タスクが見つかりません"]
    Check -->|"InvalidTaskDataError"| Error400["400 Bad Request<br/>バリデーションエラー"]
    Check -->|"UnauthorizedError"| Error401["401 Unauthorized<br/>認証が必要です"]
    Check -->|"ForbiddenError"| Error403["403 Forbidden<br/>アクセス権限がありません"]
    Check -->|"その他"| Error500["500 Internal Server Error<br/>サーバーエラー"]
    Error404 --> Log["エラーログ出力"]
    Error400 --> Log
    Error401 --> Log
    Error403 --> Log
    Error500 --> Log
    Log --> Response["エラーレスポンス<br/>(JSON形式)"]
    Response --> Client["クライアント:<br/>エラー表示"]
```

🔵 *要件定義書、CLAUDE.md より*

## 状態管理フロー

### フロントエンド状態管理

```mermaid
flowchart TD
    subgraph "Redux Toolkit(UIフィルタ・ソート状態)"
        A["taskSlice"] --> B["filters<br/>(priority, status)"]
        A --> C["sort<br/>(created_at, priority)"]
    end

    subgraph "TanStack React Query(サーバー状態)"
        D["useQuery:<br/>getTasks"] --> E["キャッシュ<br/>(30秒)"]
        F["useMutation:<br/>createTask"] --> G["キャッシュ無効化<br/>(invalidateQueries)"]
        H["useMutation:<br/>updateTask"] --> G
        I["useMutation:<br/>deleteTask"] --> G
    end

    subgraph "UI Components"
        J["TaskList"] --> A
        J --> D
        K["TaskFilter"] --> B
        L["TaskSort"] --> C
        M["TaskForm"] --> F
        N["TaskEditModal"] --> H
        O["TaskDeleteButton"] --> I
    end

    B --> D
    C --> D
    G --> E
```

🔵 *技術スタック、CLAUDE.md より*

### サーバー状態キャッシュフロー

```mermaid
flowchart TD
    A["ユーザー:<br/>タスク一覧表示"] --> B["TanStack Query:<br/>キャッシュチェック"]
    B -->|"キャッシュあり<br/>(30秒以内)"| C["キャッシュから表示"]
    B -->|"キャッシュなし<br/>または期限切れ"| D["API呼び出し:<br/>GET /api/tasks"]
    D --> E["レスポンス受信"]
    E --> F["キャッシュ更新"]
    F --> G["UI表示"]

    H["ユーザー:<br/>タスク作成"] --> I["API呼び出し:<br/>POST /api/tasks"]
    I --> J["キャッシュ無効化:<br/>invalidateQueries"]
    J --> K["キャッシュ再取得:<br/>GET /api/tasks"]
    K --> L["UI更新"]
```

🟡 *一般的なキャッシュ戦略*

## パフォーマンス最適化フロー

### タスク一覧のレンダリング最適化

```mermaid
flowchart TD
    A["タスク一覧取得<br/>(100件)"] --> B["TanStack Query:<br/>キャッシュ"]
    B --> C["Redux Selector:<br/>フィルタ適用"]
    C --> D["Redux Selector:<br/>ソート適用"]
    D --> E["React.memo:<br/>TaskItem"]
    E --> F["仮想スクロール<br/>(react-window)"]
    F --> G["可視領域のみ<br/>レンダリング"]
    G --> H["スムーズなスクロール<br/>(60fps)"]
```

🟡 *一般的なパフォーマンス最適化手法*

## バックエンド処理フロー(レイヤ間)

### タスク作成処理のレイヤ間フロー

```mermaid
flowchart TD
    subgraph "Presentation層"
        A["TaskController:<br/>POST /api/tasks"] --> B["Zodバリデーション"]
        B --> C["CreateTaskInput生成"]
    end

    subgraph "Application層"
        C --> D["CreateTaskUseCase:<br/>execute"]
        D --> E["CreateTaskInput検証"]
        E --> F["TaskEntity生成<br/>(Domain層)"]
    end

    subgraph "Domain層"
        F --> G["TaskEntity:<br/>ビジネスロジック検証"]
        G --> H["TaskTitle<br/>(値オブジェクト)"]
        G --> I["TaskPriority<br/>(値オブジェクト)"]
        G --> J["TaskStatus<br/>(値オブジェクト)"]
    end

    subgraph "Infrastructure層"
        H --> K["PostgreSQLTaskRepository:<br/>save"]
        I --> K
        J --> K
        K --> L["Drizzle ORM:<br/>INSERT"]
        L --> M["PostgreSQL:<br/>RLS適用"]
    end

    M --> N["TaskEntity返却"]
    N --> O["TaskDTO変換"]
    O --> P["201 Created"]
```

🔵 *アーキテクチャ設計、要件定義書 REQ-407 より*

## 参考資料

🔵 *既存資料*

- [アーキテクチャ設計](./architecture.md)
- [要件定義書](../../spec/todo-app-requirements.md)
- [技術スタック](../../tech-stack.md)

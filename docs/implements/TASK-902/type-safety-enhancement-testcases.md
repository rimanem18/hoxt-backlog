# TDDテストケース一覧: 認証エンドポイントのOpenAPI対応化

**作成日**: 2025-10-18
**タスクID**: TASK-902
**機能名**: 認証エンドポイントのOpenAPI対応化

---

## 開発言語・フレームワーク

### 🟢 信頼性レベル: 青信号（プロジェクトCLAUDE.mdとpackage.jsonに基づく）

- **プログラミング言語**: TypeScript 5.9.2
  - **言語選択の理由**: プロジェクト全体でTypeScriptを採用しており、型安全性を最大限活用できる
  - **テストに適した機能**: 型推論によるテストデータの型安全性、Zodスキーマの型定義活用

- **テストフレームワーク**: Bun標準テストランナー
  - **フレームワーク選択の理由**: プロジェクトCLAUDE.mdで「必須: テストはBun標準を使用する」と明記
  - **テスト実行環境**: Dockerコンテナ内（`docker compose exec server bun test`）

---

## テストケースの概要

### テストの分類構成

1. **単体テスト**: OpenAPIルート定義の検証（8ケース）
2. **統合テスト**: 認証コールバックAPIの全体フロー検証（7ケース）
3. **境界値テスト**: 入力値の境界条件検証（3ケース）

**合計**: 18テストケース

---

## 1. 正常系テストケース（基本的な動作）

### 1-1. OpenAPIルート定義の正常登録

**🟢 信頼性レベル: 青信号（@hono/zod-openapiの公式ドキュメントに基づく）**

- **テスト名**: OpenAPIルートが正常に登録される
  - **何をテストするか**: `app.openapi(createRoute(...))`でルートが正常に登録されること
  - **期待される動作**: ルート定義がHonoアプリに登録され、OpenAPI仕様に含まれる

- **入力値**:
  ```typescript
  createRoute({
    method: 'post',
    path: '/auth/callback',
    request: {
      body: {
        content: {
          'application/json': {
            schema: authCallbackRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: authCallbackResponseSchema,
          },
        },
        description: '認証成功',
      },
    },
  })
  ```
  - **入力データの意味**: OpenAPIルート定義オブジェクト。Zodスキーマを使用してリクエスト・レスポンスを定義

- **期待される結果**: ルート定義が正常に登録され、エラーが発生しない
  - **期待結果の理由**: @hono/zod-openapiの仕様に従った正しいルート定義であるため

- **テストの目的**: OpenAPIルート定義の基本的な動作確認
  - **確認ポイント**: createRouteの戻り値が正常にapp.openapiに渡されること

### 1-2. 新規ユーザー認証成功（avatarUrlあり）

**🟢 信頼性レベル: 青信号（要件定義書のシナリオ1に基づく）**

- **テスト名**: 新規ユーザーのGoogle認証が成功し、ユーザー情報が返却される
  - **何をテストするか**: 有効なリクエストボディで新規ユーザーが作成され、200レスポンスが返ること
  - **期待される動作**: AuthenticateUserUseCaseが呼ばれ、新規ユーザー情報がレスポンスされる

- **入力値**:
  ```json
  {
    "externalId": "google-1234567890",
    "provider": "google",
    "email": "newuser@example.com",
    "name": "New User",
    "avatarUrl": "https://lh3.googleusercontent.com/a/default-user"
  }
  ```
  - **入力データの意味**: Google認証後の典型的なユーザー情報。avatarUrlはGoogle提供のURL
  - **実際の発生シナリオ**: ユーザーがGoogleアカウントで初めてログインした場合

- **期待される結果**:
  ```json
  {
    "success": true,
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "externalId": "google-1234567890",
      "provider": "google",
      "email": "newuser@example.com",
      "name": "New User",
      "avatarUrl": "https://lh3.googleusercontent.com/a/default-user",
      "createdAt": "2025-10-18T10:00:00Z",
      "updatedAt": "2025-10-18T10:00:00Z",
      "lastLoginAt": "2025-10-18T10:00:00Z"
    }
  }
  ```
  - **期待結果の理由**: 新規ユーザーの場合、createdAt・updatedAt・lastLoginAtがすべて同じ時刻になる
  - **HTTPステータス**: 200 OK

- **テストの目的**: 新規ユーザー作成の正常フローを確認
  - **確認ポイント**:
    - Zodバリデーションが成功すること
    - AuthenticateUserUseCaseが正しい引数で呼ばれること
    - レスポンススキーマがauthCallbackResponseSchemaに一致すること
    - avatarUrlが正しく保存されること

### 1-3. 既存ユーザー認証成功（avatarUrlなし）

**🟢 信頼性レベル: 青信号（要件定義書のシナリオ2に基づく）**

- **テスト名**: 既存ユーザーのGitHub認証が成功し、lastLoginAtが更新される
  - **何をテストするか**: 既存ユーザーのログイン時にlastLoginAtのみが更新されること
  - **期待される動作**: AuthenticateUserUseCaseが既存ユーザーを検出し、lastLoginAtを更新

- **入力値**:
  ```json
  {
    "externalId": "github-existing-user",
    "provider": "github",
    "email": "existinguser@example.com",
    "name": "Existing User"
  }
  ```
  - **入力データの意味**: GitHubアカウントの認証情報。avatarUrlは省略（オプションのため）
  - **実際の発生シナリオ**: 以前登録したユーザーが再度ログインした場合

- **期待される結果**:
  ```json
  {
    "success": true,
    "data": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "externalId": "github-existing-user",
      "provider": "github",
      "email": "existinguser@example.com",
      "name": "Existing User",
      "avatarUrl": null,
      "createdAt": "2025-10-10T10:00:00Z",
      "updatedAt": "2025-10-18T10:00:00Z",
      "lastLoginAt": "2025-10-18T10:00:00Z"
    }
  }
  ```
  - **期待結果の理由**: createdAtは変更されず、lastLoginAtが最新の時刻に更新される
  - **HTTPステータス**: 200 OK

- **テストの目的**: 既存ユーザーのログインフローを確認
  - **確認ポイント**:
    - avatarUrlがnullでもバリデーションエラーにならないこと
    - lastLoginAtが更新されること
    - createdAtが変更されないこと

### 1-4. 全プロバイダー種別の認証成功

**🟢 信頼性レベル: 青信号（authProviderSchemaの定義に基づく）**

- **テスト名**: 6種類の全プロバイダーで認証が成功する
  - **何をテストするか**: google、apple、microsoft、github、facebook、lineの全プロバイダーで認証が成功すること
  - **期待される動作**: 各プロバイダーに対して200レスポンスが返される

- **入力値**: 各プロバイダーごとにテストケースを実行
  ```typescript
  ['google', 'apple', 'microsoft', 'github', 'facebook', 'line'].forEach(provider => {
    const requestBody = {
      externalId: `${provider}-user-id`,
      provider: provider,
      email: `user@${provider}.com`,
      name: `${provider} User`,
    };
    // テスト実行
  });
  ```
  - **入力データの意味**: 各プロバイダーの典型的な認証情報
  - **実際の発生シナリオ**: ユーザーが各プロバイダーのアカウントでログインした場合

- **期待される結果**: すべてのプロバイダーで200 OKレスポンスが返る
  - **期待結果の理由**: authProviderSchemaで定義された6つの値すべてが有効なため

- **テストの目的**: プロバイダー列挙型の網羅的な検証
  - **確認ポイント**: すべてのプロバイダーがZodバリデーションを通過すること

---

## 2. 異常系テストケース（エラーハンドリング）

### 2-1. メールアドレス形式が不正（EDGE-001）

**🟢 信頼性レベル: 青信号（要件定義書のEDGE-001に基づく）**

- **テスト名**: メールアドレス形式が不正な場合、400エラーが返る
  - **エラーケースの概要**: RFC 5321に準拠しないメールアドレスが送信された場合
  - **エラー処理の重要性**: 不正なメールアドレスでユーザーが登録されるのを防ぐ

- **入力値**:
  ```json
  {
    "externalId": "test-user-id",
    "provider": "google",
    "email": "invalid-email",
    "name": "Test User"
  }
  ```
  - **不正な理由**: `@`記号がなく、RFC 5321のメールアドレス形式に準拠していない
  - **実際の発生シナリオ**: クライアント側のバリデーションをバイパスした不正リクエスト

- **期待される結果**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "バリデーションエラー",
      "details": {
        "email": "有効なメールアドレス形式である必要があります"
      }
    }
  }
  ```
  - **エラーメッセージの内容**: フィールド名とエラー理由が明確
  - **システムの安全性**: 不正なデータがデータベースに保存されない
  - **HTTPステータス**: 400 Bad Request

- **テストの目的**: Zodバリデーションのメールアドレスチェック確認
  - **品質保証の観点**: データ整合性の維持、セキュリティ向上

### 2-2. externalIdが空文字列（EDGE-002）

**🟢 信頼性レベル: 青信号（要件定義書のEDGE-002に基づく）**

- **テスト名**: externalIdが空文字列の場合、400エラーが返る
  - **エラーケースの概要**: 外部プロバイダーIDが空の場合
  - **エラー処理の重要性**: ユーザーを一意に識別できなくなる重大な問題を防ぐ

- **入力値**:
  ```json
  {
    "externalId": "",
    "provider": "google",
    "email": "user@example.com",
    "name": "User"
  }
  ```
  - **不正な理由**: externalIdは最小1文字という制約に違反
  - **実際の発生シナリオ**: クライアント側のJavaScriptエラーで空文字列が送信された場合

- **期待される結果**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "バリデーションエラー",
      "details": {
        "externalId": "externalIdは1文字以上である必要があります"
      }
    }
  }
  ```
  - **エラーメッセージの内容**: 最小文字数制約違反を明示
  - **システムの安全性**: ユーザーの一意性が保たれる
  - **HTTPステータス**: 400 Bad Request

- **テストの目的**: 文字列長制約のバリデーション確認
  - **品質保証の観点**: データ整合性、ビジネスロジックの保護

### 2-3. providerが不正な値（EDGE-003）

**🟢 信頼性レベル: 青信号（要件定義書のEDGE-003に基づく）**

- **テスト名**: providerが列挙型に存在しない値の場合、400エラーが返る
  - **エラーケースの概要**: サポートされていないプロバイダー名が送信された場合
  - **エラー処理の重要性**: 未サポートのプロバイダーによる認証を防ぐ

- **入力値**:
  ```json
  {
    "externalId": "test-user-id",
    "provider": "twitter",
    "email": "user@example.com",
    "name": "User"
  }
  ```
  - **不正な理由**: "twitter"はauthProviderSchemaで定義されていない
  - **実際の発生シナリオ**: 古いクライアントから廃止されたプロバイダー名が送信された場合

- **期待される結果**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "バリデーションエラー",
      "details": {
        "provider": "無効なプロバイダー種別です"
      }
    }
  }
  ```
  - **エラーメッセージの内容**: サポートされていないプロバイダーであることを明示
  - **システムの安全性**: 未定義のプロバイダーによる不正アクセスを防ぐ
  - **HTTPステータス**: 400 Bad Request

- **テストの目的**: 列挙型バリデーションの確認
  - **品質保証の観点**: 型安全性の維持、API契約の厳格な遵守

### 2-4. avatarUrlが不正なURL形式（EDGE-004）

**🟢 信頼性レベル: 青信号（要件定義書のEDGE-004に基づく）**

- **テスト名**: avatarUrlがURL形式でない場合、400エラーが返る
  - **エラーケースの概要**: オプションフィールドのavatarUrlが不正な形式の場合
  - **エラー処理の重要性**: 画像表示エラーの原因となる不正URLの保存を防ぐ

- **入力値**:
  ```json
  {
    "externalId": "test-user-id",
    "provider": "google",
    "email": "user@example.com",
    "name": "User",
    "avatarUrl": "not-a-url"
  }
  ```
  - **不正な理由**: URLスキーム（http://、https://）がなく、URL形式に準拠していない
  - **実際の発生シナリオ**: クライアント側で画像パスを相対パスで誤って送信した場合

- **期待される結果**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "バリデーションエラー",
      "details": {
        "avatarUrl": "有効なURL形式である必要があります"
      }
    }
  }
  ```
  - **エラーメッセージの内容**: URL形式制約違反を明示
  - **システムの安全性**: 不正なURLによる画像表示エラーを防ぐ
  - **HTTPステータス**: 400 Bad Request

- **テストの目的**: オプションフィールドのURL形式バリデーション確認
  - **品質保証の観点**: データ品質の維持、フロントエンドエラーの防止

### 2-5. 必須フィールドの欠落（name省略）

**🟢 信頼性レベル: 青信号（Zodスキーマの必須フィールド定義に基づく）**

- **テスト名**: 必須フィールドnameが欠落している場合、400エラーが返る
  - **エラーケースの概要**: リクエストボディに必須フィールドが含まれていない場合
  - **エラー処理の重要性**: データ不足によるシステムエラーを防ぐ

- **入力値**:
  ```json
  {
    "externalId": "test-user-id",
    "provider": "google",
    "email": "user@example.com"
  }
  ```
  - **不正な理由**: nameフィールドが必須だが含まれていない
  - **実際の発生シナリオ**: クライアント側のバグでフィールドが送信されなかった場合

- **期待される結果**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "バリデーションエラー",
      "details": {
        "name": "Required"
      }
    }
  }
  ```
  - **エラーメッセージの内容**: 必須フィールドであることを明示
  - **システムの安全性**: 不完全なデータがデータベースに保存されない
  - **HTTPステータス**: 400 Bad Request

- **テストの目的**: 必須フィールドのバリデーション確認
  - **品質保証の観点**: データ整合性の強制、APIスキーマの遵守

### 2-6. データベース接続エラー（EDGE-005）

**🟢 信頼性レベル: 青信号（要件定義書のEDGE-005に基づく）**

- **テスト名**: データベース接続エラー時に500エラーが返る
  - **エラーケースの概要**: Infrastructure層でDBエラーが発生した場合
  - **エラー処理の重要性**: 内部エラー詳細を隠蔽し、セキュリティを維持する

- **入力値**: 有効なリクエストボディ（バリデーションは成功）
  ```json
  {
    "externalId": "test-user-id",
    "provider": "google",
    "email": "user@example.com",
    "name": "User"
  }
  ```
  - **不正な理由**: リクエスト自体は正常だが、DBが利用不可
  - **実際の発生シナリオ**: PostgreSQL接続プールが枯渇、ネットワーク障害等

- **期待される結果**:
  ```json
  {
    "success": false,
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "一時的にサービスが利用できません"
    }
  }
  ```
  - **エラーメッセージの内容**: 内部実装を露出しないユーザーフレンドリーなメッセージ
  - **システムの安全性**: スタックトレースやDB情報を隠蔽
  - **HTTPステータス**: 500 Internal Server Error

- **テストの目的**: Infrastructure層エラーのハンドリング確認
  - **品質保証の観点**: セキュリティ（NFR-303）、エラーログの記録

### 2-7. 複数フィールドのバリデーションエラー

**🟡 信頼性レベル: 黄信号（Zodのエラーハンドリング動作から推測）**

- **テスト名**: 複数フィールドが不正な場合、すべてのエラーが返る
  - **エラーケースの概要**: 複数のフィールドが同時にバリデーションエラーの場合
  - **エラー処理の重要性**: ユーザーが1回のリクエストですべてのエラーを認識できる

- **入力値**:
  ```json
  {
    "externalId": "",
    "provider": "twitter",
    "email": "invalid-email",
    "name": ""
  }
  ```
  - **不正な理由**: externalId、provider、email、nameすべてが制約違反
  - **実際の発生シナリオ**: フォームのバリデーションをバイパスして送信された場合

- **期待される結果**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "バリデーションエラー",
      "details": {
        "externalId": "externalIdは1文字以上である必要があります",
        "provider": "無効なプロバイダー種別です",
        "email": "有効なメールアドレス形式である必要があります",
        "name": "ユーザー名は1文字以上である必要があります"
      }
    }
  }
  ```
  - **エラーメッセージの内容**: すべてのフィールドエラーが明示される
  - **システムの安全性**: フィールド単位で詳細なエラー情報を提供
  - **HTTPステータス**: 400 Bad Request

- **テストの目的**: Zodの複数エラーハンドリング動作確認
  - **品質保証の観点**: UX向上（1回で全エラーを通知）、NFR-103の遵守

---

## 3. 境界値テストケース（最小値、最大値、null等）

### 3-1. externalIdの最小長（1文字）

**🟢 信頼性レベル: 青信号（Zodスキーマのmin(1)制約に基づく）**

- **テスト名**: externalIdが1文字の場合、バリデーションが成功する
  - **境界値の意味**: 最小文字数制約の境界値（1文字ちょうど）
  - **境界値での動作保証**: 1文字でも有効なexternalIdとして扱われること

- **入力値**:
  ```json
  {
    "externalId": "a",
    "provider": "google",
    "email": "user@example.com",
    "name": "User"
  }
  ```
  - **境界値選択の根拠**: `z.string().min(1)`の最小許容値
  - **実際の使用場面**: 短いIDを使用するプロバイダーが存在する可能性

- **期待される結果**: 200 OKレスポンスが返る
  - **境界での正確性**: 1文字のexternalIdが正常に保存される
  - **一貫した動作**: 2文字以上の場合と同じ動作をする

- **テストの目的**: 最小長制約の境界値確認
  - **堅牢性の確認**: 境界値でもシステムが正常動作する

### 3-2. nameの最小長（1文字）

**🟢 信頼性レベル: 青信号（Zodスキーマのmin(1)制約に基づく）**

- **テスト名**: nameが1文字の場合、バリデーションが成功する
  - **境界値の意味**: 最小文字数制約の境界値（1文字ちょうど）
  - **境界値での動作保証**: 1文字の名前でも有効なユーザーとして扱われること

- **入力値**:
  ```json
  {
    "externalId": "test-user-id",
    "provider": "google",
    "email": "user@example.com",
    "name": "A"
  }
  ```
  - **境界値選択の根拠**: `z.string().min(1)`の最小許容値
  - **実際の使用場面**: イニシャルのみで登録するユーザー

- **期待される結果**: 200 OKレスポンスが返る
  - **境界での正確性**: 1文字の名前が正常に保存される
  - **一貫した動作**: 2文字以上の場合と同じ動作をする

- **テストの目的**: 最小長制約の境界値確認
  - **堅牢性の確認**: 境界値でもシステムが正常動作する

### 3-3. avatarUrlのnull・undefined

**🟢 信頼性レベル: 青信号（Zodスキーマのoptional()定義に基づく）**

- **テスト名**: avatarUrlがnullまたはundefinedの場合、バリデーションが成功する
  - **境界値の意味**: オプションフィールドの省略パターン（null、undefined、省略）
  - **境界値での動作保証**: オプションフィールドが省略可能であること

- **入力値（パターン1: 省略）**:
  ```json
  {
    "externalId": "test-user-id",
    "provider": "google",
    "email": "user@example.com",
    "name": "User"
  }
  ```

- **入力値（パターン2: null）**:
  ```json
  {
    "externalId": "test-user-id",
    "provider": "google",
    "email": "user@example.com",
    "name": "User",
    "avatarUrl": null
  }
  ```
  - **境界値選択の根拠**: TypeScriptのoptional型（`string | null | undefined`）
  - **実際の使用場面**: プロバイダーがアバター画像を提供しない場合

- **期待される結果**: 200 OKレスポンスが返り、avatarUrlがnullで保存される
  - **境界での正確性**: null/undefinedが正しくハンドリングされる
  - **一貫した動作**: avatarUrlがある場合と同じフローで処理される

- **テストの目的**: オプションフィールドのnull/undefinedハンドリング確認
  - **堅牢性の確認**: オプションフィールドの全パターンで正常動作する

---

## テストケース実装時の日本語コメント指針

### 🟢 信頼性レベル: 青信号（プロジェクトCLAUDE.mdに基づく）

すべてのテストケースは以下のコメントパターンに従って実装してください：

### テストケース開始時のコメント

```typescript
// 【テスト目的】: このテストで何を確認するかを日本語で明記
// 【テスト内容】: 具体的にどのような処理をテストするかを説明
// 【期待される動作】: 正常に動作した場合の結果を説明
// 🟢 この内容の信頼性レベルを記載
```

### Given（準備フェーズ）のコメント

```typescript
// 【テストデータ準備】: なぜこのデータを用意するかの理由
// 【初期条件設定】: テスト実行前の状態を説明
// 【前提条件確認】: テスト実行に必要な前提条件を明記
```

### When（実行フェーズ）のコメント

```typescript
// 【実際の処理実行】: どの機能/メソッドを呼び出すかを説明
// 【処理内容】: 実行される処理の内容を日本語で説明
// 【実行タイミング】: なぜこのタイミングで実行するかを説明
```

### Then（検証フェーズ）のコメント

```typescript
// 【結果検証】: 何を検証するかを具体的に説明
// 【期待値確認】: 期待される結果とその理由を説明
// 【品質保証】: この検証がシステム品質にどう貢献するかを説明
```

### 各expectステートメントのコメント例

```typescript
// 【検証項目】: HTTPステータスコードが200であることを確認
// 🟢 要件定義書のシナリオ1に基づく
expect(response.status).toBe(200);

// 【検証項目】: レスポンスボディがauthCallbackResponseSchemaに一致することを確認
// 🟢 shared-schemas/auth.tsのスキーマ定義に基づく
expect(() => authCallbackResponseSchema.parse(responseData)).not.toThrow();

// 【検証項目】: バリデーションエラー時のエラーメッセージが詳細であることを確認
// 🟢 REQ-104（詳細エラーメッセージ返却）に基づく
expect(responseData.error.details.email).toBe('有効なメールアドレス形式である必要があります');
```

---

## テストファイル構成

### 🟢 信頼性レベル: 青信号（既存テストファイルの構成に基づく）

```
app/server/src/presentation/http/routes/__tests__/
├── authRoutes.openapi.test.ts         # OpenAPIルート定義の単体テスト（新規）
└── authRoutes.integration.test.ts     # 認証コールバックAPIの統合テスト（更新）
```

### テストファイルの責務

**authRoutes.openapi.test.ts（新規作成）**:
- OpenAPIルート定義の登録確認
- createRouteの引数検証
- Zodスキーマの統合確認
- OpenAPI仕様書への反映確認

**authRoutes.integration.test.ts（既存ファイル更新）**:
- 認証コールバックAPIの全体フローテスト
- リクエスト→バリデーション→UseCase→レスポンスの統合テスト
- エラーハンドリングの検証

---

## 品質判定

### ✅ 高品質

- **テストケース分類**: 正常系（4ケース）・異常系（7ケース）・境界値（3ケース）が網羅されている
- **期待値定義**: 各テストケースの期待値が明確（HTTPステータス、レスポンスボディ、エラーメッセージ）
- **技術選択**: TypeScript 5.9.2 + Bun標準テストランナーで確定（プロジェクトCLAUDE.mdに準拠）
- **実装可能性**: 既存のAuthController.test.tsを参考にして実装可能

### テストケースの網羅性

| 観点 | カバー状況 | 詳細 |
|------|------------|------|
| 正常系 | ✅ | 新規ユーザー、既存ユーザー、全プロバイダー |
| 異常系 | ✅ | バリデーションエラー（5パターン）、DBエラー、複数エラー |
| 境界値 | ✅ | 最小長（1文字）、オプションフィールド（null/undefined） |
| EARS要件 | ✅ | REQ-104（詳細エラー）、NFR-303（内部情報隠蔽）に対応 |
| エッジケース | ✅ | EDGE-001〜EDGE-005すべてをカバー |

---

## 次のステップ

**次のお勧めステップ**: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。

### Redフェーズで実施すること

1. **authRoutes.openapi.test.ts（新規作成）**:
   - OpenAPIルート定義の単体テスト実装
   - 初期状態ではテストが失敗（ルート未実装のため）

2. **authRoutes.integration.test.ts（更新）**:
   - 認証コールバックAPIの統合テスト追加
   - 18テストケースすべてを実装
   - 初期状態ではテストが失敗（OpenAPIルート未実装のため）

3. **テスト実行コマンド**:
   ```bash
   docker compose exec server bun test src/presentation/http/routes/__tests__/authRoutes.openapi.test.ts
   docker compose exec server bun test src/presentation/http/routes/__tests__/authRoutes.integration.test.ts
   ```

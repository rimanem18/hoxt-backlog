# Google認証システム アーキテクチャ設計

## システム概要

SupabaseのGoogle OAuth認証を基盤とした認証システムを実装する。フロントエンド（Next.js）とバックエンド（Hono API）の完全分離構成により、安全で快適な認証体験を提供する。

## アーキテクチャパターン

- **パターン**: SSG + API + OAuth 2.0 + Just-In-Time Provisioning
- **理由**: 
  - フロントエンドとバックエンドの責務を明確に分離
  - Supabaseの管理された認証基盤を活用することでセキュリティリスクを軽減
  - JITプロビジョニングにより初回ログイン時の自動ユーザー作成を実現

## 責任分散アーキテクチャ

### フロントエンド責務（Next.js）
- **UIの提供**: ログイン/ログアウト、ユーザープロファイル表示
- **OAuthフロー実行**: @supabase/ssrを使用したGoogle認証フロー
- **トークン管理**: JWT取得、Cookieへの自動保存、リフレッシュ
- **APIリクエスト**: AuthorizationヘッダーでのJWT送信

### バックエンド責務（Hono API）
- **APIエンドポイント保護**: 認証が必要なルートの保護
- **JWT検証（Authentication）**: フロントエンドからのJWT署名・有効期限検証
- **認可（Authorization）**: ユーザー権限に基づく操作制御
- **ユーザー同期**: Supabaseユーザーとアプリケーションユーザーの紐付け

## コンポーネント構成

### フロントエンド技術スタック
- **フレームワーク**: Next.js 15 (App Router)
- **認証ライブラリ**: @supabase/supabase-js, @supabase/ssr
- **状態管理**: Redux（認証状態管理）
- **スタイリング**: Tailwind CSS
- **型安全性**: TypeScript + Zod（サーバーとスキーマ共有）

### バックエンド技術スタック
- **フレームワーク**: Hono 4
- **認証方式**: JWT（SupabaseのHS256署名検証）
- **アーキテクチャ**: DDD + クリーンアーキテクチャ
- **ミドルウェア**: hono/jwt（認証検証）
- **ユーザー同期**: JIT Provisioning

### 認証基盤
- **プロバイダー**: Supabase Auth + Google OAuth 2.0
- **トークン形式**: JWT（JSON Web Token）
- **署名アルゴリズム**: HS256
- **セッション管理**: Secure Cookie（HttpOnly, SameSite）

## セキュリティ設計

### 通信セキュリティ
- **HTTPS強制**: すべての認証通信をHTTPS経由で実行
- **CSRF対策**: SameSite Cookieによる自動保護
- **XSS対策**: HttpOnly CookieによるJSアクセス防止

### トークン管理
- **保存方式**: Secure Cookie（Supabaseが自動管理）
- **有効期限**: デフォルト24時間（Supabase設定に準拠）
- **リフレッシュ**: 自動リフレッシュ機能（@supabase/ssr）
- **検証**: バックエンドでSupabase JWT Secretによる署名検証

### セッション保護
- **セッション固定攻撃対策**: Supabase標準保護機能
- **同時セッション制御**: 必要に応じて実装可能
- **ログアウト**: フロントエンドとSupabaseの両方でセッション破棄

## DDD + クリーンアーキテクチャマッピング

### Presentation層（HTTP）
```
presentation/http/
├── middleware/
│   ├── authMiddleware.ts            # JWT検証ミドルウェア
│   └── domainEventMiddleware.ts     # ドメインイベント発行
├── controllers/
│   ├── AuthController.ts           # 認証関連エンドポイント
│   └── UserController.ts           # ユーザー情報エンドポイント
├── routes/
│   └── authRoutes.ts               # 認証ルーティング
└── dto/
    ├── AuthRequestDto.ts           # 認証リクエストDTO
    └── UserResponseDto.ts          # ユーザーレスポンスDTO
```

### Application層（ユースケース）
```
application/
├── usecases/
│   ├── AuthenticateUserUseCase.ts   # ユーザー認証
│   ├── RefreshSessionUseCase.ts     # セッションリフレッシュ
│   ├── LogoutUserUseCase.ts         # ユーザーログアウト
│   ├── GetUserProfileUseCase.ts     # ユーザープロファイル取得
│   └── UpdateUserProfileUseCase.ts  # ユーザープロファイル更新
├── services/
│   ├── AuthApplicationService.ts    # 認証アプリケーションサービス
│   └── UserApplicationService.ts    # ユーザーアプリケーションサービス
└── events/
    ├── DomainEventHandler.ts        # ドメインイベントハンドラー
    └── AuthEventHandler.ts          # 認証イベント専用ハンドラー
```

### Domain層（エンティティ・ドメインサービス）
```
domain/
├── user/
│   ├── UserAggregate.ts            # ユーザー集約ルート
│   ├── User.ts                     # ユーザーエンティティ
│   ├── IUserRepository.ts          # ユーザーリポジトリIF
│   └── UserDomainService.ts        # ユーザードメインサービス
├── auth/
│   ├── AuthSession.ts              # 認証セッション値オブジェクト
│   ├── AuthProvider.ts             # 認証プロバイダー値オブジェクト
│   ├── IAuthProvider.ts            # 認証プロバイダーIF（依存性逆転）
│   ├── AuthDomainService.ts        # 認証ドメインサービス
│   └── AuthErrors.ts               # ドメイン固有エラー
├── shared/
│   ├── DomainEvent.ts              # ドメインイベント基底クラス
│   ├── IDomainEventBus.ts          # イベントバスIF
│   └── ValueObject.ts              # 値オブジェクト基底クラス
└── events/
    ├── UserLoggedInEvent.ts        # ログインイベント
    ├── UserLoggedOutEvent.ts       # ログアウトイベント
    └── SessionRefreshedEvent.ts    # セッションリフレッシュイベント
```

### Infrastructure層（外部システム連携）
```
infrastructure/
├── database/
│   ├── PostgresUserRepository.ts   # ユーザーリポジトリ実装
│   └── migrations/                 # DBマイグレーション
├── auth/
│   └── SupabaseAuthProvider.ts     # Supabase認証プロバイダー実装
├── events/
│   ├── InMemoryEventBus.ts         # インメモリイベントバス
│   └── RedisEventBus.ts            # Redis分散イベントバス
└── logging/
    └── AuditLogService.ts          # 監査ログサービス
```

## 環境変数設定

### フロントエンド（Next.js）
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### バックエンド（Hono）
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

## パフォーマンス要件への対応

### 認証フロー最適化（5秒以内）
- Supabaseの高速認証基盤活用
- リダイレクト最小化
- キャッシュ可能なリソースの活用

### 認証状態確認高速化（1秒以内）
- JWT検証のメモリキャッシュ
- 非同期ユーザー同期
- 効率的なDB インデックス

### UX阻害回避
- 認証チェックの非同期実行
- ローディング状態の適切な表示
- 楽観的UI更新

## 拡張性考慮

### 追加認証プロバイダー対応
- GitHub, Twitter等の追加が容易な設計
- 認証プロバイダーの抽象化

### マルチテナント対応
- 組織レベルの認証・認可への拡張可能性
- ロールベースアクセス制御（RBAC）への発展

### 監査ログ
- 認証イベントの記録機能
- セキュリティ監視への対応
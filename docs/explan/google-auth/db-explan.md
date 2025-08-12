# Google認証システム データベース設計解説

## このドキュメントについて

このドキュメントは、Google認証システムのデータベース設計について、**初学者でも理解できるように**詳しく解説したものです。データベース設計の基本から、実際のテーブル設計、データの流れ、ビジネスルールまでを網羅的に説明します。

## 1. システム全体像の理解

### 1.1 なぜデータベースが必要なのか？

Google認証システムでは、以下の理由でデータベースが必要です：

1. **ユーザー情報の永続化**: Googleから取得した情報をアプリケーションで管理
2. **独自機能の追加**: Googleにはないアプリケーション固有の設定やデータ
3. **監査ログの記録**: セキュリティ上重要な認証イベントの追跡
4. **パフォーマンス向上**: 頻繁にアクセスするデータのキャッシュ

### 1.2 データベース分離の理由

このシステムでは **2つのデータベース** を使用します：

- **Supabase データベース**: 認証機能専用（Googleとの連携、JWTトークン管理）
- **PostgreSQL データベース**: アプリケーション固有のデータ管理

**なぜ分離するのか？**
- **責任の明確化**: 認証はSupabase、ビジネスロジックはPostgreSQL
- **セキュリティ強化**: 認証データとアプリケーションデータを分離
- **拡張性向上**: それぞれ独立してスケールできる

## 2. テーブル設計の詳細解説

### 2.1 基本設計方針

#### Just-In-Time Provisioning（JIT）
- **意味**: 初回ログイン時に自動的にユーザーレコードを作成する仕組み
- **利点**: 事前登録不要、Googleアカウントがあれば即座に利用開始
- **実装**: 認証成功後、DBにユーザーが存在しなければ自動作成

#### 正規化設計
- **第1正規形**: 各フィールドは原子的な値
- **第3正規形**: 関数従属性を排除してデータ重複を回避
- **拡張性**: 新しい機能追加時もテーブル構造の大幅変更が不要

### 2.2 usersテーブル（メインテーブル）

```sql
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "auth_provider_user_id" TEXT UNIQUE NOT NULL,
    "auth_provider" TEXT NOT NULL DEFAULT 'google',
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ NULL
);
```

#### 各フィールドの役割と設計根拠

**主キー: id（UUID）**
- **なぜUUID？**: 
  - 分散システムでの一意性保証
  - セキュリティ（連続番号による推測攻撃の防止）
  - マイクロサービス間での一意性
- **auto_generate_v4()**: 挿入時に自動生成

**認証連携: auth_provider_user_id**
- **役割**: Supabase AuthのユーザーIDとの紐付けキー
- **なぜTEXT型？**: SupabaseのUUIDはハイフン付きの文字列形式
- **UNIQUE制約**: 同一Googleアカウントでの重複登録防止

**認証プロバイダー: auth_provider**
- **現在の値**: 'google'のみ
- **将来拡張**: GitHub, Twitter, Facebook等への対応準備
- **CHECK制約**: 無効な値の挿入防止

**基本情報フィールド**
- **email**: 
  - VARCHAR(255): RFC5321準拠の最大長
  - UNIQUE制約: 同一メールアドレスでの重複防止
  - 正規表現チェック: メール形式の検証
- **name**: 表示名（Googleプロフィールから取得）
- **avatar_url**: プロフィール画像URL（オプション）

**状態管理フィールド**
- **is_active**: アカウントの有効/無効状態
- **created_at/updated_at**: 作成・更新日時の記録
- **deleted_at**: ソフトデリート（物理削除せず論理削除）

#### ビジネスルールの実装

**制約によるデータ品質保証**
```sql
CONSTRAINT "users_email_check" CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
CONSTRAINT "users_name_check" CHECK (LENGTH(TRIM(name)) > 0)
```

### 2.3 auth_logsテーブル（監査ログ）

#### 設計目的
- **セキュリティ監視**: 不正アクセスの検知
- **トラブルシューティング**: 認証問題の原因調査
- **コンプライアンス**: 監査要件への対応

```sql
CREATE TABLE "auth_logs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "auth_provider" VARCHAR(50) NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "session_id" TEXT,
    "token_expires_at" TIMESTAMPTZ,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### ログイベントの種類
- **login**: ログイン成功
- **login_failed**: ログイン失敗
- **logout**: ユーザーによるログアウト
- **token_refresh**: トークンのリフレッシュ
- **session_expired**: セッション期限切れ
- **error**: その他のエラー

#### 重要な設計ポイント

**外部キー制約**
```sql
"user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL
```
- ユーザー削除時にログは保持（SET NULL）
- 監査証跡を残すためログは物理削除しない

**JSONB型の活用**
```sql
"metadata" JSONB DEFAULT '{}'
```
- 柔軟な追加情報格納
- インデックス作成可能
- JSONクエリ機能活用

### 2.4 user_preferencesテーブル（ユーザー設定）

#### 1:1の関係設計
```sql
CREATE TABLE "user_preferences" (
    "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    -- 設定項目...
);
```

**CASCADE削除**
- ユーザー削除時に設定も削除
- データ整合性の維持

#### 設定項目の分類
- **UI設定**: theme（テーマ）, language（言語）
- **通知設定**: email_notifications, push_notifications
- **プライバシー**: profile_visibility
- **拡張設定**: custom_settings（JSONB）

### 2.5 user_sessionsテーブル（セッション管理）

#### DDD（ドメイン駆動設計）対応
```sql
CREATE TABLE "user_sessions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "session_token_hash" TEXT UNIQUE NOT NULL,
    -- セッション管理項目...
);
```

**集約ルートとしてのユーザー**
- UserAggregateがセッション整合性を管理
- ビジネスルール（同時ログイン数制限等）の実装基盤

**セキュリティ考慮**
- **session_token_hash**: 元のトークンではなくハッシュ値を保存
- **expires_at**: セッション有効期限の明示的管理

### 2.6 domain_eventsテーブル（イベントソーシング）

#### イベント駆動アーキテクチャの実装
```sql
CREATE TABLE "domain_events" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "event_id" TEXT UNIQUE NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" VARCHAR(50) NOT NULL,
    "occurred_on" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "event_data" JSONB NOT NULL DEFAULT '{}',
    -- イベント処理関連...
);
```

#### サポートするイベント
- **USER_LOGGED_IN**: ログインイベント
- **USER_LOGGED_OUT**: ログアウトイベント
- **SESSION_REFRESHED**: セッションリフレッシュ
- **USER_CREATED**: ユーザー作成（JIT）
- **USER_PROFILE_UPDATED**: プロフィール更新

## 3. データの流れとライフサイクル

### 3.1 初回ログイン時のデータ作成フロー

```
1. ユーザーがGoogleログインをクリック
   ↓
2. Supabase AuthがGoogle OAuthフローを実行
   ↓
3. GoogleからユーザープロフィールとJWTを取得
   ↓
4. フロントエンドがJWT付きでAPI呼び出し
   ↓
5. バックエンドでJWT検証
   ↓
6. auth_provider_user_idでusersテーブル検索
   ↓
7. 【初回の場合】ユーザーレコードを自動作成（JIT Provisioning）
   ・usersテーブルにINSERT
   ・user_preferencesテーブルにデフォルト設定をINSERT（トリガー発動）
   ・domain_eventsテーブルにUSER_CREATEDイベント記録
   ・auth_logsテーブルにログイン成功ログ記録
   ↓
8. 認証済みユーザー情報を返却
```

### 3.2 通常ログイン時のデータ更新フロー

```
1. JWT検証後、既存ユーザーを特定
   ↓
2. 必要に応じてプロフィール情報を更新
   ・name、avatar_urlが変更されている場合
   ・updated_atフィールドが自動更新（トリガー）
   ↓
3. 新しいセッション情報を記録
   ・user_sessionsテーブルに新規セッション追加
   ・期限切れセッションのクリーンアップ
   ↓
4. イベント記録
   ・domain_eventsテーブルにUSER_LOGGED_INイベント
   ・auth_logsテーブルにログイン成功ログ
   ↓
5. ユーザー情報を返却
```

### 3.3 ログアウト時の処理フロー

```
1. ログアウトAPI呼び出し
   ↓
2. セッション無効化
   ・user_sessionsテーブルでis_active = falseに更新
   ・Supabase側でもセッション破棄
   ↓
3. イベント記録
   ・domain_eventsテーブルにUSER_LOGGED_OUTイベント
   ・auth_logsテーブルにログアウトログ
   ↓
4. フロントエンドでCookie削除・状態クリア
```

### 3.4 セッション管理のライフサイクル

#### 自動リフレッシュフロー
```
1. API呼び出し時にJWT期限をチェック
   ↓
2. 期限切れの場合、自動リフレッシュ実行
   ・Supabaseでトークンリフレッシュ
   ・user_sessionsテーブルで有効期限更新
   ↓
3. イベント記録
   ・domain_eventsテーブルにSESSION_REFRESHEDイベント
   ・auth_logsテーブルにtoken_refreshログ
```

#### 期限切れセッションのクリーンアップ
```sql
-- 定期実行される関数
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
BEGIN
    DELETE FROM "user_sessions" 
    WHERE "expires_at" < NOW() OR ("is_active" = false AND "updated_at" < NOW() - INTERVAL '7 days');
    -- 削除件数をログに記録
    INSERT INTO "auth_logs" ("event_type", "metadata")
    VALUES ('cleanup', jsonb_build_object('deleted_sessions', deleted_count));
END;
$$ language 'plpgsql';
```

## 4. インデックス戦略とパフォーマンス

### 4.1 クエリパターンに基づくインデックス設計

#### 高頻度クエリ用インデックス
```sql
-- 認証時のユーザー検索（最重要）
CREATE INDEX "idx_users_auth_provider_user_id" ON "users" ("auth_provider_user_id");

-- アクティブユーザー一覧（管理画面）
CREATE INDEX "idx_users_active" ON "users" ("is_active", "created_at") WHERE "deleted_at" IS NULL;

-- 認証ログの時系列検索
CREATE INDEX "idx_auth_logs_user_id_created_at" ON "auth_logs" ("user_id", "created_at" DESC);
```

#### 部分インデックスの活用
```sql
-- 削除されていないユーザーのみインデックス
CREATE INDEX "idx_users_email" ON "users" ("email") WHERE "deleted_at" IS NULL;

-- アクティブなセッションのみインデックス
CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions" ("expires_at") WHERE "is_active" = true;
```

### 4.2 パフォーマンス要件への対応

#### 認証チェック（1秒以内）
- `auth_provider_user_id`でのユーザー検索を高速化
- JWTペイロードから直接ユーザー情報を取得
- 必要時のみDBクエリ実行

#### 認証フロー（5秒以内）
- Supabaseの高速認証基盤活用
- 非同期ユーザー同期処理
- フロントエンドでの楽観的UI更新

## 5. セキュリティ設計

### 5.1 Row Level Security（RLS）

#### 基本ポリシー
```sql
-- ユーザーは自分のレコードのみアクセス可能
CREATE POLICY "users_select_own" ON "users"
    FOR SELECT USING (auth_provider_user_id = auth.uid()::text);

CREATE POLICY "users_update_own" ON "users"
    FOR UPDATE USING (auth_provider_user_id = auth.uid()::text);
```

#### 設定テーブルのRLS
```sql
-- ユーザー設定も同様に自分のもののみ
CREATE POLICY "user_preferences_all_own" ON "user_preferences"
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_provider_user_id = auth.uid()::text
        )
    );
```

### 5.2 データ保護

#### 機密情報の暗号化
```sql
-- セッショントークンはハッシュ化して保存
session_token_hash TEXT UNIQUE NOT NULL  -- 元の値は保存しない
```

#### 監査ログの保護
- auth_logsテーブルは INSERT のみ許可
- 改ざん防止のため物理削除は実装しない
- 定期的なバックアップとアーカイブ

## 6. ビジネスルールの実装

### 6.1 集約ルート（UserAggregate）によるビジネスルール

#### 同時セッション数制限
```typescript
class UserAggregateImpl implements UserAggregate {
  authenticateWithSession(session: AuthSession, maxSessions: number = 5): void {
    // 期限切れセッションを自動クリーンアップ
    this.cleanupExpiredSessions();
    
    // セッション数をチェック
    if (this.sessionCount >= maxSessions) {
      throw new MaxSessionsExceededError(maxSessions);
    }
    
    // 新しいセッションを追加
    this.addSession(session);
    
    // ログインイベントを発行
    this.addDomainEvent(new UserLoggedInEvent(this.user.id, this.user, session, 'google'));
  }
}
```

### 6.2 自動処理の実装

#### トリガー関数による自動処理
```sql
-- ユーザー作成時の設定レコード自動生成
CREATE OR REPLACE FUNCTION create_user_preferences_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "user_preferences" ("user_id") VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER "trigger_create_user_preferences"
    AFTER INSERT ON "users"
    FOR EACH ROW EXECUTE FUNCTION create_user_preferences_for_new_user();
```

## 7. 拡張性への配慮

### 7.1 将来の機能追加への対応

#### マルチプロバイダー対応
```sql
-- auth_providerフィールドで複数プロバイダー対応
CONSTRAINT "users_auth_provider_check" CHECK (auth_provider IN ('google'))
-- 将来: 'github', 'twitter', 'facebook' 等を追加
```

#### 役割ベースアクセス制御（RBAC）
```sql
-- 将来追加予定のテーブル構造
CREATE TABLE "roles" (
    "id" UUID PRIMARY KEY,
    "name" VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE "user_roles" (
    "user_id" UUID REFERENCES "users"("id"),
    "role_id" UUID REFERENCES "roles"("id"),
    PRIMARY KEY ("user_id", "role_id")
);
```

### 7.2 マイクロサービス対応

#### ドメインイベントによる疎結合
- domain_eventsテーブルがイベントバスの役割
- 他のマイクロサービスがイベントを購読
- 非同期処理による高いスケーラビリティ

## 8. 運用・メンテナンス

### 8.1 定期メンテナンス処理

#### 自動クリーンアップ
```sql
-- 期限切れセッション削除（日次実行）
SELECT cleanup_expired_sessions();

-- 古い認証ログ削除（月次実行）
SELECT cleanup_old_auth_logs(3);  -- 3ヶ月保持
```

### 8.2 監視・アラート

#### 重要な監視項目
- 認証失敗率の監視（auth_logsテーブル）
- セッション数の監視（user_sessionsテーブル）
- エラーイベントの監視（domain_eventsテーブル）

#### パフォーマンス監視
- 認証API レスポンス時間
- データベースクエリ実行時間
- 同時接続数

## 9. まとめ：実装時のポイント

### 9.1 必ず理解すべき重要概念

1. **JIT Provisioning**: 初回ログイン時の自動ユーザー作成
2. **集約ルート**: UserAggregateによるビジネスルール管理
3. **イベントソーシング**: ドメインイベントによる状態変更の記録
4. **Row Level Security**: データアクセス制御の実装

### 9.2 実装の優先順位

#### Phase 1（MVP）
- usersテーブルの実装
- auth_logsテーブルの実装
- 基本的なJIT Provisioning

#### Phase 2（拡張機能）
- user_preferencesテーブルの実装
- user_sessionsテーブルの実装
- セッション管理機能

#### Phase 3（高度な機能）
- domain_eventsテーブルの実装
- イベント駆動アーキテクチャの構築
- 高度な監査・分析機能

### 9.3 よくある落とし穴と対策

#### データ整合性
- **問題**: 認証プロバイダーとアプリDBの情報不整合
- **対策**: 定期的な同期処理とconflict resolution

#### パフォーマンス
- **問題**: 認証チェック時のDBアクセス遅延
- **対策**: 適切なインデックスとキャッシュ戦略

#### セキュリティ
- **問題**: SQLインジェクション、不正データアクセス
- **対策**: パラメータ化クエリ、RLSポリシー、入力値検証

このDB設計により、Google認証システムの**安全性**、**パフォーマンス**、**拡張性**を同時に実現できます。各テーブルの役割と関係を理解し、段階的に実装していくことが成功の鍵となります。
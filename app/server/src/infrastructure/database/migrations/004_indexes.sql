-- ================================================
-- 004_indexes.sql
-- Google認証システム インデックス作成とパフォーマンス最適化
-- ================================================
--
-- 作成日: 2025-08-12
-- 作成者: TASK002 データベースマイグレーション
-- 対象: 全テーブルのパフォーマンス最適化用インデックス
--

-- ================================================
-- users テーブルインデックス
-- ================================================

-- 認証プロバイダーユーザーIDでの高速検索（ログイン時）
CREATE INDEX "idx_users_auth_provider_user_id" ON "users" ("auth_provider_user_id");

-- アクティブユーザーのメール検索（削除されていないユーザーのみ対象）
CREATE INDEX "idx_users_email" ON "users" ("email") WHERE "deleted_at" IS NULL;

-- アクティブユーザーの作成日時検索（管理画面・レポート用）
CREATE INDEX "idx_users_active" ON "users" ("is_active", "created_at") WHERE "deleted_at" IS NULL;

-- 作成日時での並び替え（ユーザー一覧表示用）
CREATE INDEX "idx_users_created_at" ON "users" ("created_at");

-- ================================================
-- auth_logs テーブルインデックス
-- ================================================

-- ユーザー別認証ログの時系列検索（セキュリティ監視用）
CREATE INDEX "idx_auth_logs_user_id_created_at" ON "auth_logs" ("user_id", "created_at" DESC);

-- イベントタイプ別の時系列検索（異常検知用）
CREATE INDEX "idx_auth_logs_event_type_created_at" ON "auth_logs" ("event_type", "created_at" DESC);

-- IP アドレス別の時系列検索（不審なアクセス検知用）
CREATE INDEX "idx_auth_logs_ip_address" ON "auth_logs" ("ip_address", "created_at" DESC);

-- 認証ログの時系列検索（全体的な監視用）
CREATE INDEX "idx_auth_logs_created_at" ON "auth_logs" ("created_at" DESC);

-- ================================================
-- user_sessions テーブルインデックス
-- ================================================

-- ユーザー別アクティブセッション検索（セッション管理用）
CREATE INDEX "idx_user_sessions_user_active" ON "user_sessions" ("user_id", "is_active", "expires_at");

-- 期限切れセッション検索（クリーンアップ処理用）
CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions" ("expires_at") WHERE "is_active" = true;

-- 最終活動時間での並び替え（アクティビティ監視用）
CREATE INDEX "idx_user_sessions_last_activity" ON "user_sessions" ("last_activity_at" DESC);

-- セッショントークンハッシュでの高速検索（認証時）
CREATE INDEX "idx_user_sessions_token_hash" ON "user_sessions" ("session_token_hash");

-- 認証プロバイダー別セッション検索
CREATE INDEX "idx_user_sessions_auth_provider" ON "user_sessions" ("auth_provider", "created_at" DESC);

-- ================================================
-- domain_events テーブルインデックス
-- ================================================

-- 集約別イベント時系列検索（イベント再生用）
CREATE INDEX "idx_domain_events_aggregate" ON "domain_events" ("aggregate_id", "aggregate_type", "occurred_on" DESC);

-- イベント名別時系列検索（特定イベントの分析用）
CREATE INDEX "idx_domain_events_event_name" ON "domain_events" ("event_name", "occurred_on" DESC);

-- 未処理イベント検索（非同期処理用）
CREATE INDEX "idx_domain_events_unprocessed" ON "domain_events" ("processed_at", "occurred_on") WHERE "processed_at" IS NULL;

-- イベント発生日時での並び替え（全体的な監視用）
CREATE INDEX "idx_domain_events_occurred_on" ON "domain_events" ("occurred_on" DESC);

-- イベントIDでの一意検索（重複防止・参照用）
CREATE INDEX "idx_domain_events_event_id" ON "domain_events" ("event_id");

-- ================================================
-- aggregate_snapshots テーブルインデックス
-- ================================================

-- 集約別スナップショット検索（復元処理用）
CREATE INDEX "idx_aggregate_snapshots_aggregate" ON "aggregate_snapshots" ("aggregate_id", "aggregate_type");

-- スナップショット作成日時での並び替え（メンテナンス用）
CREATE INDEX "idx_aggregate_snapshots_created_at" ON "aggregate_snapshots" ("created_at" DESC);

-- インデックス作成完了メッセージ
SELECT 'パフォーマンス最適化用インデックスが正常に作成されました' AS status;

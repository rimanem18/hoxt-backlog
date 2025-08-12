-- ================================================
-- 003_aggregate_snapshots.sql
-- Google認証システム 集約スナップショットテーブル作成
-- ================================================
--
-- 作成日: 2025-08-12
-- 作成者: TASK002 データベースマイグレーション
-- 対象: aggregate_snapshots テーブル
--

-- ================================================
-- 集約スナップショットテーブル: aggregate_snapshots（オプション）
-- ================================================

/**
 * 集約スナップショットテーブル
 * パフォーマンス最適化のためのイベント再生キャッシュ
 *
 * 用途:
 * - 大量イベントがある集約の高速復元
 * - イベント履歴の圧縮
 * - パフォーマンス向上
 */
CREATE TABLE "aggregate_snapshots" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" VARCHAR(50) NOT NULL,
    "version" INTEGER NOT NULL,

    -- スナップショットデータ
    "snapshot_data" JSONB NOT NULL,
    "last_event_id" TEXT NOT NULL,

    -- システム項目
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 一意制約（集約ごとに最新スナップショット）
    UNIQUE("aggregate_id", "aggregate_type"),

    CONSTRAINT "aggregate_snapshots_version_check" CHECK (version > 0)
);

-- テーブル作成完了メッセージ
SELECT 'aggregate_snapshots テーブルが正常に作成されました' AS status;

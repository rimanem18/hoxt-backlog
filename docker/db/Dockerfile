# DBマイグレーション専用コンテナ
FROM supabase/postgres:17.4.1.073

# マイグレーション実行用のスクリプトを追加
COPY docker/db/scripts/ /usr/local/bin/

# スクリプトに実行権限を付与
RUN chmod +x /usr/local/bin/*.sh
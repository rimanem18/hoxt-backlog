# Cloudflare Workers デプロイ前の手動設定

フロントエンドは Cloudflare Workers（`@opennextjs/cloudflare`）へデプロイされる。
CI からのデプロイを実行する前に、以下を Cloudflare ダッシュボードで手動対応する必要がある。

## 1. API トークン権限の追加

`CLOUDFLARE_API_TOKEN` に **Workers Scripts:Edit** 権限を追加する。
未対応の場合、`wrangler deploy` が認可エラーで必ず失敗する。

DNS Edit 権限は付与しない（DNS 設定・カスタムドメイン紐付けは本手順で手動対応するため）。

## 2. Custom Domain の紐付け

- Production Worker（`<プロジェクト名>`）には `<ドメイン名>`
- Preview Worker（`<プロジェクト名>-preview`）には `preview.<ドメイン名>`

を、それぞれ Workers Custom Domain として手動で紐付ける。

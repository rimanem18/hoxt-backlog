# プロジェクト概要

## プロジェクトの目的
「Hoxt-backlog」は、ドメイン駆動設計（DDD）とクリーンアーキテクチャを採用したバックログ管理アプリケーションです。
- 段階的な成長: まずはToDoアプリとしてスタートし、その後バックログ管理アプリに発展
- 3つの主要集約: Backlog、BacklogItem、Task

## 技術スタック

### フロントエンド (client)
- **フレームワーク**: Next.js 16.0.7 + React 19.2.1
- **言語**: TypeScript 5.9.3
- **ランタイム**: Bun 1.2
- **スタイリング**: Tailwind CSS v4.1.17
- **状態管理**: 
  - Redux (@reduxjs/toolkit 2.11.0)
  - TanStack Query (@tanstack/react-query 5.90.12)
- **認証**: @supabase/supabase-js 2.86.2
- **API通信**: openapi-fetch 0.15.0
- **テスト**: 
  - Bun標準テスト
  - @testing-library/react 16.3.0
  - Playwright 1.57.0
  - jsdom 27.2.0
- **リンター/フォーマッター**: Biome 2.3.8

### バックエンド (server)
- **フレームワーク**: Hono 4.9.0
- **言語**: TypeScript
- **ランタイム**: Bun 1.2
- **アーキテクチャ**: DDD + クリーンアーキテクチャ
- **リンター/フォーマッター**: Biome 2.1.4

### インフラ
- **コンテナ**: Docker v28.1 + Docker Compose v2.35
- **開発環境**: Linux (Alpine)

## アーキテクチャパターン
- **SSG + API構成**: フロントエンドとバックエンドの完全分離
- **DDD + クリーンアーキテクチャ**: サーバーサイドでドメインごとに関心を分離
- **feature-based**: クライアントサイドでfeature単位でのディレクトリ構成
# 継続的デプロイメントシステム 設計文書

作成日: 2025年09月12日
最終更新: 2025年09月23日（現在実装に合わせて修正）


## 概要

GitHub Actions、Terraform、GitHub OIDC認証を活用した継続的デプロイメントシステムの技術設計文書。フロントエンド（CloudFlare Pages）、バックエンド（AWS Lambda Function URL）、データベース（drizzle-kit + PostgreSQL）の統合デプロイメントを自動化する。

## 設計文書構成

本設計文書は以下のファイルで構成されています：

### [architecture.md](./architecture.md)
- システム全体アーキテクチャ
- コンポーネント構成と技術選定理由
- セキュリティ設計とアクセス制御
- 環境戦略とエラーハンドリング

### [dataflow.md](./dataflow.md)
- Mermaid記法によるデータフロー図
- デプロイメント依存関係フロー
- エラーハンドリング・監査ログフロー
- GitHub OIDC認証フローの詳細

### [interfaces.ts](./interfaces.ts)
- TypeScript型定義一式
- GitHub Actions、AWS、CloudFlare、drizzle-kit関連型
- 監査ログ・セキュリティスキャン結果型
- API応答・設定管理型定義

### [github-actions-workflows.md](./github-actions-workflows.md)
- GitHub Actionsワークフロー設計
- メインデプロイ・プレビュー環境ワークフロー
- セキュリティスキャンワークフロー
- 環境変数・シークレット管理

### [terraform-infrastructure.md](./terraform-infrastructure.md)
- Terraform IaC設計
- AWS・CloudFlareリソース定義
- GitHub OIDC・IAMロール設計
- モジュール構成とstate管理

### [cloudflare-pages-environment-strategy.md](./cloudflare-pages-environment-strategy.md)
- CloudFlare Pages 環境分割戦略
- 1プロジェクト方式による実装設計
- ブランチベースデプロイメント設計
- Direct Upload実装とセキュリティ設計

### [deployment-api-specs.md](./deployment-api-specs.md)
- 各サービスAPI仕様
- 認証方式・エンドポイント定義
- レスポンス形式・エラーハンドリング
- Webhookエンドポイント仕様


## 主要設計ポイント

### セキュリティファースト
- 単一GitHub OIDC 統合ロールによる完全シークレットレス認証
- Repository-level Secrets + 環境別アクセス制御による最小権限制御（Production/Preview共通）
- Terraform state の S3+KMS 暗号化保存
- Secret Scanning による機密情報漏洩防止

### 運用効率
- インフラ変更の破壊的検出と承認フロー
- プレビュー環境の自動構築・削除（テーブルプレフィックス方式）
- 依存関係順序制御による安全なデプロイ
- 基本監査ログによる運用追跡

### コスト効率
- AWS Lambda Function URL による API Gateway回避でのコスト削減
- 環境別Lambda関数分離による明確な責任分離
- 単一IAMロール・ポリシーによる管理コスト削減
- PostgreSQLスキーマ分離による環境分離（production/preview schema）
- Preview環境でのリソース共有による運用コスト最適化

### 拡張性
- モジュラー設計による保守性確保
- 環境別設定の明確な分離
- エラー処理・再試行戦略の標準化
- 段階的機能追加に対応した設計

## 実装順序

1. **統合基盤整備**
   - Terraform state管理用 S3・DynamoDB 作成
   - 単一GitHub OIDC Provider・統合IAM Role 設定

2. **統合インフラ自動化**
   - 統合Terraform設定実装（単一state管理）
   - 環境別AWS Lambda Function URL 構築

3. **統合CI/CD パイプライン**
   - GitHub Actions ワークフロー実装（統一ロール使用）
   - デプロイ順序制御・エラーハンドリング

4. **監視・運用**
   - CloudWatch アラーム設定
   - ログ収集・監査機能実装

## 受け入れ基準対応

設計された各コンポーネントは、要件定義書に記載された以下の受け入れ基準を満たします：

- ✅ **統合基盤構築**: Terraform・単一GitHub OIDC・統合IAM設定
- ✅ **統合デプロイフロー**: main push・PR プレビュー・順序制御（Lambda完全分離・unified state）
- ✅ **品質保証**: 破壊的変更承認・マイグレーション・待機キュー
- ✅ **監査ログ**: 実行者・日時・対象記録・Secret Scanning
- ✅ **エラーハンドリング**: 再試行・タイムアウト・アラート機能
- ✅ **セキュリティ**: シークレットレス・暗号化・RLS設定（最小権限統合ロール）
- ✅ **環境分離**: Lambda完全分離 + CloudFlare Pages統合プロジェクト + PostgreSQLスキーマ分離方式

## 次ステップ

1. **技術検証**: 統合設計内容の実装可能性検証
2. **段階実装**: 統合基盤→CI/CD→監視の順で段階的実装
3. **テスト**: 各受け入れ基準に対する動作確認
4. **運用開始**: 統合環境での継続的デプロイメント開始

本統合設計文書により、コスト効率と学習効率を両立した継続的デプロイメントシステムの実装が可能になります。

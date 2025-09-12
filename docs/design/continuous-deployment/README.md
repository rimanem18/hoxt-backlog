# 継続的デプロイメントシステム 設計文書

作成日: 2025年09月12日
最終更新: 2025年09月12日

## 概要

GitHub Actions、Terraform、GitHub OIDC認証を活用した継続的デプロイメントシステムの技術設計文書。フロントエンド（CloudFlare Pages）、バックエンド（AWS Lambda）、データベース（Supabase）の統合デプロイメントを自動化する。

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
- GitHub Actions、AWS、CloudFlare、Supabase関連型
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

### [deployment-api-specs.md](./deployment-api-specs.md)
- 各サービスAPI仕様
- 認証方式・エンドポイント定義
- レスポンス形式・エラーハンドリング
- Webhookエンドポイント仕様

### [hono-lambda-config.md](./hono-lambda-config.md)
- Hono + Lambda adapter構成
- 開発・本番環境の実行方式
- ビルド・パッケージング・デプロイ設定
- パフォーマンス最適化

## 主要設計ポイント

### セキュリティファースト
- GitHub OIDC による完全シークレットレス認証
- AWS IAM 最小権限原則の厳格適用
- Terraform state の S3+KMS 暗号化保存
- Secret Scanning による機密情報漏洩防止

### 運用効率
- インフラ変更の破壊的検出と承認フロー
- プレビュー環境の自動構築・削除（テーブルプレフィックス方式）
- 依存関係順序制御による安全なデプロイ
- 基本監査ログによる運用追跡

### コスト効率
- Supabase無料版対応（ブランチ機能不使用）
- テーブルプレフィックス `${TABLE_PREFIX}_dev_*` による環境分離
- Preview環境でのリソース競合（複数PR共有）を許容

### 拡張性
- モジュラー設計による保守性確保
- 環境別設定の明確な分離
- エラー処理・再試行戦略の標準化
- 段階的機能追加に対応した設計

## 実装順序

1. **基盤整備**
   - Terraform state管理用 S3・DynamoDB 作成
   - GitHub OIDC Provider・IAM Role 設定

2. **インフラ自動化**
   - Terraform モジュール実装
   - AWS Lambda・API Gateway 構築

3. **CI/CD パイプライン**
   - GitHub Actions ワークフロー実装
   - デプロイ順序制御・エラーハンドリング

4. **監視・運用**
   - CloudWatch アラーム設定
   - ログ収集・監査機能実装

## 受け入れ基準対応

設計された各コンポーネントは、要件定義書に記載された以下の受け入れ基準を満たします：

- ✅ **基盤構築**: Terraform・GitHub OIDC・IAM設定
- ✅ **デプロイフロー**: main push・PR プレビュー・順序制御
- ✅ **品質保証**: 破壊的変更承認・マイグレーション・待機キュー
- ✅ **監査ログ**: 実行者・日時・対象記録・Secret Scanning
- ✅ **エラーハンドリング**: 再試行・タイムアウト・アラート機能
- ✅ **セキュリティ**: シークレットレス・暗号化・RLS設定
- ⚠️ **制約対応**: Supabase無料版制約によりブランチ機能は非対応（テーブルプレフィックスで代替）

## 次ステップ

1. **技術検証**: 設計内容の実装可能性検証
2. **段階実装**: 基盤→CI/CD→監視の順で段階的実装
3. **テスト**: 各受け入れ基準に対する動作確認
4. **運用開始**: 本番環境での継続的デプロイメント開始

本設計文書により、安全で効率的な継続的デプロイメントシステムの実装が可能になります。
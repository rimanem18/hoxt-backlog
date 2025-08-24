# TDD開発メモ: mvp-google-auth

## 概要

- 機能名: Google認証JWT検証API（AuthController）
- 開発開始: 2025-08-24 09:01:48 JST
- 現在のフェーズ: Red（失敗するテスト作成）

## 関連ファイル

- 要件定義: `docs/implements/TASK-201/mvp-google-auth-requirements.md`
- テストケース定義: `docs/implements/TASK-201/mvp-google-auth-testcases.md`
- 実装ファイル: `app/server/src/presentation/http/controllers/AuthController.ts`
- テストファイル: `app/server/src/presentation/http/controllers/__tests__/AuthController.test.ts`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-08-24 09:01:48 JST

### テストケース

**総テストケース数**: 14ケース
- **正常系**: 3ケース（JWT検証成功、JITプロビジョニング、既存ユーザー認証）
- **異常系**: 7ケース（不正JWT、期限切れJWT、バリデーションエラー等）
- **境界値**: 4ケース（HTTPメソッド、Content-Type、URLパス、長いトークン）

### テストコード

実装したテストケースの特徴：
- **信頼性レベル表示**: 各テストケースに🟢🟡🔴の信号で元資料との照合状況を明示
- **日本語コメント**: 全テストに詳細な日本語説明を付与
- **Given-When-Then**: 明確な構造でテスト設計
- **モック活用**: AuthenticateUserUseCaseとHonoContextの適切なモック化

### 期待される失敗

全14テストケースが以下の理由で失敗する予定：
```
Error: AuthController.verifyToken is not implemented yet
```

AuthController.tsは空実装（throw Error）のため、すべてのテストが実装エラーで失敗する状態。

### 次のフェーズへの要求事項

Greenフェーズで実装すべき内容：
1. **基本的なJWT検証処理**
   - リクエストボディからtoken取得
   - AuthenticateUserUseCaseの呼び出し
   - 成功時の200レスポンス返却

2. **エラーハンドリング**
   - AuthenticationError → 401レスポンス
   - ValidationError → 400レスポンス  
   - 一般的なError → 500レスポンス

3. **HTTP仕様準拠**
   - POSTメソッドのみ許可（405エラー）
   - application/jsonのみ許可（415エラー）
   - 不正URLパスの拒否（404エラー）

4. **バリデーション処理**
   - token必須チェック
   - 空文字token拒否
   - トークン長制限チェック

## Greenフェーズ（最小実装）

### 実装日時

[未実装]

### 実装方針

[Greenフェーズで記載予定]

### 実装コード

[Greenフェーズで記載予定]

### テスト結果

[Greenフェーズで記載予定]

### 課題・改善点

[Greenフェーズで記載予定]

## Refactorフェーズ（品質改善）

### リファクタ日時

[未実装]

### 改善内容

[Refactorフェーズで記載予定]

### セキュリティレビュー

[Refactorフェーズで記載予定]

### パフォーマンスレビュー

[Refactorフェーズで記載予定]

### 最終コード

[Refactorフェーズで記載予定]

### 品質評価

[Refactorフェーズで記載予定]
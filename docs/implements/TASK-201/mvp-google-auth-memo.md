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

2025-08-24 09:09:47 JST

### 実装方針

**最小実装の戦略**:
- **14個のテストケース完全対応**: Redフェーズで作成されたすべてのテストを通すことに専念
- **段階的検証処理**: HTTPメソッド → URLパス → Content-Type → JSON → バリデーション → UseCase呼び出しの順序で処理
- **適切なエラーハンドリング**: ドメインエラー（AuthenticationError, ValidationError）と一般的なエラーを区別して処理
- **インターフェース準拠**: IAuthenticateUserUseCaseの仕様に完全準拠（`{ jwt: token }`形式での呼び出し）

**実装した機能**:
1. **HTTPメソッド検証** - POST以外は405エラー 🟢
2. **URLパス検証** - 不正パスは404エラー 🟡
3. **Content-Type検証** - JSON以外は415エラー 🟡
4. **JSONパース処理** - パースエラーは400エラー 🟢
5. **バリデーション** - token必須・空文字・長さ制限チェック 🟢🟡🔴
6. **UseCase連携** - Application層のAuthenticateUserUseCaseとの正しい連携 🟢
7. **エラー分類処理** - AuthenticationError→401、ValidationError→400、その他→500 🟢🟡

### 実装コード

実装したAuthController.tsの主要な特徴：
- **102行の実装**: 全ての要件を最小限のコードで実現
- **詳細な日本語コメント**: 各処理ブロックに実装意図とテスト対応関係を明記
- **信頼性レベル表示**: 各実装に🟢🟡🔴で元資料との照合状況を記録
- **エラーファースト設計**: 早期リターンパターンでエラーケースを優先処理
- **try-catch構造**: 例外処理を適切に分類して対応

### テスト結果

**テスト実行コマンド**: `docker compose exec server bun test src/presentation/http/controllers/__tests__/AuthController.test.ts`

**最終結果**: ✅ **完全成功**
- **成功数**: 14/14 テストケース
- **失敗数**: 0/14 テストケース
- **実行時間**: 28.00ms
- **検証項目**: 28 expect() calls

**成功したテストケース分類**:
- **正常系**: 3/3 （JWT検証成功、JITプロビジョニング、既存ユーザー認証）
- **異常系**: 7/7 （不正JWT、期限切れJWT、各種バリデーションエラー、サービスエラー）
- **境界値**: 4/4 （HTTPメソッド、Content-Type、URLパス、長いトークン）

**修正が必要だった点**:
1. **UseCase呼び出し形式**: `execute(token)` → `execute({ jwt: token })` にインターフェースに合わせて修正
2. **テスト期待値**: すべてのテストケースでUseCaseの呼び出し形式を修正
3. **レスポンス形式**: `isNewUser`フィールドを必ず含むよう実装・テスト両方を調整

### 課題・改善点

**Refactorフェーズで改善すべき点**:
1. **HTTP検証の統合**: HTTPメソッド・URLパス・Content-Type検証を共通化できる可能性
2. **バリデーション処理の分離**: トークンバリデーションを専用クラス/関数に分割
3. **エラーメッセージの統一**: エラーレスポンス形式の標準化（ErrorResponse型の活用）
4. **ログ処理の改善**: console.errorをより適切なロガーに変更
5. **型定義の強化**: any型の削除とより厳密な型定義
6. **テスト品質**: モックの型安全性向上
7. **セキュリティ強化**: Content-Type検証の厳密化とセキュリティヘッダー追加

**現時点での技術的負債**:
- URLパス検証が単純すぎる（endsWith使用） 🟡
- トークン長制限が推測値（5000文字） 🔴
- エラーメッセージの国際化未対応
- パフォーマンス測定機能の未実装

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
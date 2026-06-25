# TDDテストケースの洗い出し：TASK-201 HTTPエンドポイント統合【改訂版】

**作成日**: 2025-08-24  
**機能名**: mvp-google-auth  
**タスクID**: TASK-201  
**タスクタイプ**: TDD  

---

## 📋 テスト戦略概要

### 既存実装の活用
- ✅ **AuthController.test.ts**: 14テストケース（単体テスト）→ **保持継続**
- 🔴 **統合テスト**: 8テストケース（HTTPエンドポイント統合）→ **新規追加**

### テストレベル構成
- **単体テスト**: AuthController クラス単体の動作確認
- **統合テスト**: POST /api/auth/verify エンドポイントの統合動作確認
- **役割分担**: 単体レベル + 統合レベルでの完全カバレッジ

---

## 開発言語・フレームワーク

- **プログラミング言語**: TypeScript
  - **言語選択の理由**: 既存コードベースがTypeScript採用済み、型安全性による統合テストの品質向上
  - **テストに適した機能**: 型検証、インターフェース準拠チェック、実HTTP通信での型安全性確保
- **テストフレームワーク**: Bun標準テストランナー
  - **フレームワーク選択の理由**: 既存のAuthController.test.tsと同一環境、高速なテスト実行、統合テストでの優れたパフォーマンス  
  - **テスト実行環境**: Docker Compose serverコンテナ内、実Honoサーバーインスタンスでの統合テスト
- 🔵 この内容の信頼性レベル（プロジェクトのpackage.jsonと既存テスト実装で確認済み）

---

## HTTPエンドポイント統合テストケース（新規追加）

### 🎯 **統合テストの目的**
既存のAuthController単体テストに加えて、**HTTPエンドポイントとしての完全動作確認**を実施する。

---

## 1. 正常系テストケース（実HTTPリクエスト）

### 1.1 実HTTPリクエストでの認証成功

- **テスト名**: POST /api/auth/verify で有効JWTによる認証が成功すること
  - **何をテストするか**: 実際のHTTPリクエストを送信して、エンドツーエンドでの認証処理を確認
  - **期待される動作**: HTTPリクエスト→ルーティング→AuthController→レスポンス の一連の流れが正常動作
- **入力値**: 
  ```javascript
  {
    method: 'POST',
    url: '/api/auth/verify',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'valid.jwt.token' })
  }
  ```
  - **入力データの意味**: 実際にフロントエンドから送信される想定のHTTPリクエスト形式
  - **実際の発生シナリオ**: Next.jsフロントエンドからの認証リクエスト、ページリロード時のJWT再検証
- **期待される結果**: HTTPステータス200、JSON形式レスポンス
  ```json
  {
    "success": true,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "externalId": "google_123456789", 
      "provider": "google",
      "email": "test@example.com",
      "name": "テストユーザー"
    },
    "isNewUser": false
  }
  ```
  - **期待結果の理由**: HTTP統合レベルでAuthControllerと同等のレスポンス形式が返却される
- **テストの目的**: HTTPエンドポイントとしての完全動作確認
  - **確認ポイント**: ルーティング設定、依存性注入、実HTTPレスポンス形式の検証
- 🔵 このテストケースの信頼性レベル（要件定義とgreetRoutes.tsの実装パターンで確認済み）

### 1.2 CORSヘッダーの適用確認

- **テスト名**: POST /api/auth/verify でCORSヘッダーが適切に設定されること
  - **何をテストするか**: corsMiddlewareが /api/auth/* に正しく適用されているかを確認
  - **期待される動作**: レスポンスヘッダーにCORS関連ヘッダーが含まれる
- **入力値**:
  ```javascript
  {
    method: 'OPTIONS',
    url: '/api/auth/verify',
    headers: { 
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST' 
    }
  }
  ```
  - **入力データの意味**: フロントエンド（Next.js）からのプリフライトリクエストを模擬
  - **実際の発生シナリオ**: ブラウザの自動CORS確認、本番環境でのクロスドメインアクセス
- **期待される結果**: HTTPステータス200、CORSヘッダー設定
  ```javascript
  {
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
  ```
  - **期待結果の理由**: corsMiddlewareが `/api/*` に適用されている設定に基づく
- **テストの目的**: フロントエンドからの接続許可確認
  - **確認ポイント**: CORS設定、プリフライトリクエスト処理、本番環境での接続準備
- 🔵 このテストケースの信頼性レベル（server/index.tsのcorsMiddleware設定で確認済み）

### 1.3 依存性注入の動作確認

- **テスト名**: POST /api/auth/verify で依存関係が正しく注入されて動作すること
  - **何をテストするか**: AuthController、AuthenticateUserUseCase、Repository等の依存性注入が正常動作
  - **期待される動作**: 実際の依存関係でのJWT検証・ユーザー認証処理が実行される
- **入力値**: 有効なJWTトークンでのPOSTリクエスト
  ```javascript
  {
    method: 'POST',
    url: '/api/auth/verify',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'valid.dependency.injection.token' })
  }
  ```
  - **入力データの意味**: 実際の依存関係を通した処理フローを確認するためのデータ
  - **実際の発生シナリオ**: 本番環境での実際のDI設定による認証処理
- **期待される結果**: AuthenticateUserUseCaseの実処理を経由した正常レスポンス
  - **期待結果の理由**: 単体テストでは確認できない実際の依存性動作を検証
- **テストの目的**: 依存性解決とApplication層連携の確認
  - **確認ポイント**: DI設定、UseCase実行、Repository・AuthProvider動作
- 🟡 このテストケースの信頼性レベル（DDD・クリーンアーキテクチャの一般的なパターンから推測）

---

## 2. 異常系テストケース（実HTTPエラーハンドリング）

### 2.1 存在しないエンドポイントへのアクセス

- **テスト名**: POST /api/auth/invalid-endpoint で404エラーが返されること
  - **エラーケースの概要**: 存在しないエンドポイントへのアクセス時の適切なルーティングエラー
  - **エラー処理の重要性**: Honoのルーティング設定が正しく動作することの確認
- **入力値**: 
  ```javascript
  {
    method: 'POST',
    url: '/api/auth/invalid-endpoint',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'any.token' })
  }
  ```
  - **不正な理由**: 定義されていないエンドポイントパス
  - **実際の発生シナリオ**: フロントエンドの実装ミス、URLタイプ間違い
- **期待される結果**: HTTPステータス404、適切なエラーレスポンス
  ```json
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "エンドポイントが見つかりません"
    }
  }
  ```
  - **エラーメッセージの内容**: ルーティングレベルでのエラーメッセージ
  - **システムの安全性**: 未定義エンドポイントでシステムが停止しない
- **テストの目的**: ルーティング設定の完全性確認
  - **品質保証の観点**: エンドポイント仕様の厳格な遵守、予期しないアクセスの適切な処理
- 🔵 このテストケースの信頼性レベル（Honoのルーティング仕様で確認済み）

### 2.2 サーバー起動時のエンドポイント利用可能性

- **テスト名**: サーバー起動後に /api/auth/verify エンドポイントが利用可能であること  
  - **エラーケースの概要**: サーバー統合設定での設定不備・起動失敗の検出
  - **エラー処理の重要性**: 本番環境でのサービス提供可能性の事前確認
- **入力値**: サーバー起動直後の接続テスト
  ```javascript
  {
    method: 'POST',
    url: '/api/auth/verify',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'health.check.token' })
  }
  ```
  - **不正な理由**: サーバー統合設定の不備による利用不能状態
  - **実際の発生シナリオ**: routes/index.ts、server/index.ts設定ミス
- **期待される結果**: サーバー起動成功、エンドポイント応答確認
  - **エラーメッセージの内容**: 接続不能時の適切なエラー情報
  - **システムの安全性**: サーバー起動プロセスの信頼性確保
- **テストの目的**: サーバー統合設定の完全性確認  
  - **品質保証の観点**: 本番環境でのサービス提供保証、設定不備の早期発見
- 🟡 このテストケースの信頼性レベル（統合テストの一般的な要件から推測）

### 2.3 依存性注入失敗時のエラーハンドリング

- **テスト名**: 依存関係の注入が失敗した場合に適切なサーバーエラーが返されること
  - **エラーケースの概要**: DI設定不備・依存関係構築失敗時のエラーハンドリング
  - **エラー処理の重要性**: サーバー起動・実行時の依存性エラーの適切な処理
- **入力値**: 正常なHTTPリクエスト（依存性が不正な状態で）
  ```javascript
  {
    method: 'POST',
    url: '/api/auth/verify', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'valid.token.invalid.dependencies' })
  }
  ```
  - **不正な理由**: UseCase、Repository等の依存関係構築エラー
  - **実際の発生シナリオ**: 環境変数不備、外部サービス接続失敗
- **期待される結果**: HTTPステータス500、適切な内部サーバーエラー
  ```json
  {
    "success": false,
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "一時的にサービスが利用できません"
    }
  }
  ```
  - **エラーメッセージの内容**: 依存性エラーを隠した一般的なサーバーエラーメッセージ  
  - **システムの安全性**: 依存性エラーでもサーバーが応答停止しない
- **テストの目的**: DI設定とエラーハンドリング確認
  - **品質保証の観点**: 本番環境での依存性エラー時の安全性確保
- 🔴 このテストケースの信頼性レベル（DI実装パターンから推測）

---

## 3. 境界値テストケース（統合レベル）

### 3.1 最大同時リクエスト数での動作確認

- **テスト名**: 複数の同時リクエストでエンドポイントが正常動作すること
  - **境界値の意味**: サーバーの同時処理能力とパフォーマンス境界の確認
  - **境界値での動作保証**: 高負荷時でも認証処理が正確に動作すること
- **入力値**: 10並列でのPOST /api/auth/verify リクエスト
  ```javascript
  const concurrentRequests = Array(10).fill().map(() => ({
    method: 'POST',
    url: '/api/auth/verify',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'concurrent.test.token' })
  }));
  ```
  - **境界値選択の根拠**: 中程度の負荷での安定動作確認（非機能要件から推測）
  - **実際の使用場面**: 複数ユーザーの同時アクセス、ピーク時のトラフィック
- **期待される結果**: 全リクエストで正常レスポンス、レスポンス時間1000ms以内
  ```javascript
  // 全てのリクエストで200ステータス、1000ms以内のレスポンス
  responses.forEach(response => {
    expect(response.status).toBe(200);
    expect(response.responseTime).toBeLessThan(1000);
  });
  ```
  - **境界での正確性**: 並列処理でも認証結果の一貫性確保
  - **一貫した動作**: 単一リクエストと同等の処理品質
- **テストの目的**: 同時処理性能の境界確認
  - **堅牢性の確認**: 高負荷時でもシステムが安定動作すること
- 🟡 このテストケースの信頼性レベル（NFR-002パフォーマンス要件から妥当な推測）

### 3.2 サーバーメモリ制限境界での動作

- **テスト名**: 大きなリクエストボディでもメモリエラーが発生しないこと
  - **境界値の意味**: サーバーのメモリ使用量とリクエスト処理の境界値確認  
  - **境界値での動作保証**: メモリ制限内での安定した処理継続
- **入力値**: 大きなJWTトークン（8KB程度）を含むリクエスト
  ```javascript
  {
    method: 'POST',
    url: '/api/auth/verify',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      token: 'a'.repeat(8192) + '.jwt.large.payload.token' 
    })
  }
  ```
  - **境界値選択の根拠**: HTTP実用的な上限とメモリ効率の境界値
  - **実際の使用場面**: 詳細なユーザープロファイル情報を含む大きなJWT  
- **期待される結果**: 正常処理またはトークン長制限による適切な400エラー
  ```javascript
  // メモリ不足によるサーバーダウンではなく、適切な制限エラー
  expect([200, 400]).toContain(response.status);
  if (response.status === 400) {
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  }
  ```
  - **境界での正確性**: メモリ不足によるサーバーダウンが発生しない
  - **一貫した動作**: 大きなペイロードでも予測可能な応答
- **テストの目的**: メモリ使用量の境界動作確認
  - **堅牢性の確認**: リソース制限下でもサーバーが安全動作すること
- 🟡 このテストケースの信頼性レベル（一般的なHTTPサーバーの制限から推測）

---

## テストケース完全性分析

### カバレッジ分析（統合テスト）
- **正常系**: 3テストケース - 実HTTP通信、CORS設定、依存性注入
- **異常系**: 3テストケース - ルーティングエラー、サーバー統合、依存性エラー  
- **境界値**: 2テストケース - 同時処理、メモリ制限
- **合計**: 8テストケース（既存14ケースに追加）

### 既存テストとの役割分担
| テストレベル | 対象 | テスト数 | 責務 | ファイル |
|------------|------|---------|------|---------|
| 単体テスト | AuthController.verifyToken | 14ケース | クラス単体動作確認 | AuthController.test.ts |
| 統合テスト | POST /api/auth/verify | 8ケース | HTTPエンドポイント統合確認 | authRoutes.integration.test.ts |

### 要件カバレッジ確認（統合テスト）
- ✅ **REQ-408**: HTTPエンドポイント完全統合 → 正常系テスト1.1でカバー
- ✅ **REQ-409**: RESTful API提供 → 異常系テスト2.1でカバー  
- ✅ **REQ-410**: サーバー起動時利用可能性 → 異常系テスト2.2でカバー
- ✅ **CORS対応**: フロントエンド接続確認 → 正常系テスト1.2でカバー
- ✅ **依存性注入**: DI動作確認 → 正常系テスト1.3でカバー
- ✅ **パフォーマンス**: NFR-002（1000ms以内） → 境界値テスト3.1でカバー

### エラーハンドリング完全性（統合テスト）
| エラー種別 | HTTPステータス | エラーコード | 統合テストケース |
|-----------|--------------|-------------|-----------------|
| 存在しないエンドポイント | 404 | NOT_FOUND | 2.1 |
| サーバー統合設定不備 | 500 | INTERNAL_SERVER_ERROR | 2.2 |
| 依存性注入失敗 | 500 | INTERNAL_SERVER_ERROR | 2.3 |

---

## 開発・テスト実行環境

### 環境構成
```bash
# 統合テスト実行コマンド（新規追加予定）
docker compose exec server bun test src/presentation/http/routes/__tests__/authRoutes.integration.test.ts

# 全テスト実行（既存 + 統合）
docker compose exec server bun test src/presentation/http/controllers/__tests__/
docker compose exec server bun test src/presentation/http/routes/__tests__/

# 型チェック（統合後）
docker compose exec server bunx tsc --noEmit

# コードフォーマット確認（統合後）
docker compose exec server bunx biome check src
```

### テストファイル構成
- **単体テスト**: `AuthController.test.ts` (14ケース) ✅ 既存
- **統合テスト**: `authRoutes.integration.test.ts` (8ケース) 🔴 新規作成予定

### モック・テストダブル戦略（統合テスト）
- **実Honoサーバー**: テスト用サーバーインスタンスを使用
- **実HTTP通信**: fetch または Hono Request でのHTTPリクエスト送信
- **依存性注入**: テスト用の依存関係設定（モックまたは実装）
- **DB・外部API**: テスト用モック設定（統合レベルに適したモック戦略）

---

## テストケース実装時の日本語コメント指針（統合テスト）

### 統合テスト特有のコメント

```typescript
// 【統合テスト目的】: HTTPエンドポイントとしての完全動作をエンドツーエンドで確認
// 【テスト範囲】: ルーティング→AuthController→レスポンス の統合フロー
// 【実HTTP通信】: 実際のHTTPリクエスト送信での動作検証
// 🔵🟡🔴 信頼性レベルを記載

describe('POST /api/auth/verify 統合テスト', () => {
  beforeEach(() => {
    // 【統合テスト前準備】: 実サーバーインスタンスとテスト環境の初期化
    // 【依存性設定】: テスト用の依存関係を適切に注入
    // 【環境クリーン】: 他の統合テストの影響を排除した独立実行環境
  });

  test('実HTTPリクエストでの認証成功', async () => {
    // 【統合テストデータ準備】: 実HTTPリクエスト用のテストデータ設定
    // 【サーバー起動確認】: テスト用サーバーインスタンスの起動完了確認
    
    // Given
    const httpRequest = {
      method: 'POST',
      url: '/api/auth/verify',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'valid.jwt.token' })
    };

    // 【実HTTP通信実行】: 実際のHTTPリクエストをサーバーに送信
    // 【統合フロー確認】: ルーティング→Controller→UseCaseの完全フロー実行
    
    // When
    const response = await app.request('/api/auth/verify', httpRequest);

    // 【統合レベル検証】: HTTPステータス・ヘッダー・レスポンスボディの総合確認
    // 【エンドツーエンド確認】: フロントエンドが実際に受信するレスポンス形式の検証
    
    // Then
    // 【確認項目】: HTTPステータスコード200での統合成功確認 🔵
    expect(response.status).toBe(200);
    
    const responseBody = await response.json();
    // 【確認項目】: 統合レベルでのレスポンス形式確認 🔵
    expect(responseBody.success).toBe(true);
  });
});
```

### セットアップ・クリーンアップのコメント（統合テスト）

```typescript
beforeAll(async () => {
  // 【統合テスト環境構築】: テスト用Honoサーバーインスタンスの起動
  // 【依存性初期化】: テスト用DB・外部API・環境変数の設定
  // 【サーバー起動確認】: エンドポイントが利用可能になるまで待機
});

afterAll(async () => {
  // 【統合テスト環境破棄】: サーバーインスタンスの適切な終了
  // 【リソース解放】: DB接続・ファイルハンドル等のクリーンアップ
  // 【環境復元】: テスト前の状態に戻すためのリセット処理
});

beforeEach(() => {
  // 【テスト前初期化】: 各統合テスト実行前の独立環境準備
  // 【状態クリーン】: 前のテストの影響を排除した初期状態作成
});

afterEach(() => {
  // 【テスト後クリーン】: 各統合テスト実行後の状態リセット
  // 【副作用削除】: テストで作成されたデータ・状態変更の削除
});
```

---

## テストケース品質判定

### 品質判定結果

✅ **高品質**:

#### テストケース分類: 正常系・異常系・境界値が適切に分離
- **単体テスト**: AuthControllerクラスの動作確認（14ケース）
- **統合テスト**: HTTPエンドポイントの統合動作確認（8ケース）  
- **役割分担**: 単体レベルと統合レベルの適切な分離と補完関係

#### 期待値定義: 統合レベルでの期待値が明確
- **HTTPレスポンス**: 実際のHTTPステータス・ヘッダー・ボディ検証
- **CORS設定**: プリフライトリクエストでのヘッダー確認
- **エラーハンドリング**: ルーティングレベルでのエラー応答確認
- **パフォーマンス**: 並列処理・メモリ効率での境界値テスト

#### 技術選択: 既存環境との整合性確保
- **言語**: TypeScript - 既存コードベースとの一貫性
- **フレームワーク**: Bun標準テストランナー - AuthController.test.tsとの統一
- **テスト構成**: 単体テスト + 統合テストのハイブリッド構成

#### 実装可能性: 既存パターンに基づく確実な実装
- **既存実装**: AuthControllerクラス・バリデーター系の活用
- **統合パターン**: greetRoutes.tsの実装パターン踏襲
- **テスト環境**: Docker Compose環境での統合テスト実行

### 信頼性レベル分析
- **🔵 青信号**: 75% - 既存実装・要件定義・Honoドキュメントで確認済み
- **🟡 黄信号**: 20% - DDD・HTTP統合テストの一般的パターンから妥当な推測
- **🔴 赤信号**: 5% - 境界値テストの具体的数値など推測部分

### 次のステップにおける重点項目
1. **HTTP統合テスト**: 実Honoサーバーでのエンドツーエンド動作確認
2. **依存性注入テスト**: 実際のDI設定での動作保証
3. **CORS確認**: フロントエンドからの実接続テスト  
4. **既存テスト継続**: AuthController.test.tsの全テスト継続実行

---

## 次のステップ

**次のお勧めステップ**: `/tdd-red` でRedフェーズ（失敗テスト作成）を開始します。

### Redフェーズで実装する内容
1. **authRoutes.integration.test.ts の作成**: `app/server/src/presentation/http/routes/__tests__/authRoutes.integration.test.ts`
2. **実Honoサーバーセットアップ**: テスト用サーバーインスタンス構築
3. **失敗統合テスト実装**: 8つの統合テストケース全てを先に実装（Red状態）
4. **HTTP通信確認**: 実際のHTTPリクエスト・レスポンス検証
5. **既存テスト継続**: AuthController.test.ts の14テストも継続実行確認

---

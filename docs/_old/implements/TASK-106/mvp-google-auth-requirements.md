# TDD要件定義・機能仕様の整理

**【機能名】**: mvp-google-auth (TASK-106: ユーザープロフィール取得UseCase)

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

🔵 **青信号**: 設計文書から詳細仕様を抽出

- **何をする機能か**: 認証済みユーザーのプロフィール情報を取得するApplication層のUseCase
- **どのような問題を解決するか**: フロントエンドがユーザーの詳細情報（名前、メールアドレス、プロフィール画像等）を表示するためのAPI基盤を提供
- **想定されるユーザー**: Google OAuth認証済みのアプリケーションユーザー
- **システム内での位置づけ**: DDD + クリーンアーキテクチャのApplication層に位置し、Presentation層からの要求を受けてDomain層・Infrastructure層を協調させる
- **参照したEARS要件**: [REQ-005]
- **参照した設計文書**: [architecture.md - Application層の責務定義]

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

🔵 **青信号**: interfaces.ts から型定義を完全抽出

### 入力パラメータ
```typescript
interface GetUserProfileUseCaseInput {
  userId: string; // UUID形式、必須、認証済みユーザーID
}
```

### 出力値
```typescript
interface GetUserProfileUseCaseOutput {
  user: User; // ユーザーエンティティ（Domain層）
}

interface User {
  id: string;           // UUID
  email: string;        // メールアドレス
  name: string;         // 表示名
  profileImageUrl?: string; // プロフィール画像URL（オプション）
  createdAt: Date;      // 作成日時
  updatedAt: Date;      // 更新日時
}
```

### 入出力の関係性
- 入力のuserIdに対応するユーザー情報を出力として返却
- データフロー: UserId → UserRepository.findById → User Entity

- **参照したEARS要件**: [REQ-005]
- **参照した設計文書**: [interfaces.ts - IGetUserProfileUseCase]

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

🔵 **青信号**: 設計文書・要件定義から非機能要件を抽出

### パフォーマンス要件
- **レスポンス時間**: 500ms以内（NFR-002より、認証チェックは1秒以内完了）
- **スループット**: 同期処理による単一リクエスト処理

### セキュリティ要件
- **認証必須**: 有効なuserIdの事前認証が前提
- **認可チェック**: 要求者のuserIdと取得対象のuserIdが一致する必要

### アーキテクチャ制約
- **依存性逆転の原則**: UserRepositoryインターフェースに依存、具象実装には非依存
- **SOLID原則**: 単一責任（ユーザー情報取得のみ）、開放閉鎖（拡張可能）

### データベース制約
- **トランザクション**: 読み取り専用、ACIDのI（分離レベル）を考慮
- **インデックス**: users(id)にプライマリキーインデックス存在

### API制約
- **HTTPステータス**: 200（成功）、404（ユーザー未存在）、500（サーバーエラー）
- **エラーハンドリング**: UserNotFoundError のドメインエラー処理

- **参照したEARS要件**: [NFR-002, REQ-005]
- **参照した設計文書**: [architecture.md, database-schema.sql, api-endpoints.md]

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

🔵 **青信号**: dataflow.md から具体的フローを抽出

### 基本的な使用パターン
```typescript
// 正常系: 存在するユーザーの情報取得
const input = { userId: "12345678-1234-1234-1234-123456789012" };
const result = await getUserProfileUseCase.execute(input);
// result.user にユーザー情報が格納される
```

### データフロー
1. **入力検証**: userIdのUUID形式チェック
2. **リポジトリ呼び出し**: `UserRepository.findById(userId)` 実行
3. **存在確認**: ユーザーが見つからない場合は UserNotFoundError スロー
4. **結果返却**: User エンティティを含むOutputを返却

### エッジケース
- **EDGE-001**: 存在しないuserIdを指定 → UserNotFoundError
- **EDGE-002**: 無効なUUID形式のuserIdを指定 → ValidationError
- **EDGE-003**: データベース接続エラー → InfrastructureError

### エラーケース
```typescript
// 存在しないユーザーID
try {
  await useCase.execute({ userId: "nonexistent-id" });
} catch (error) {
  // UserNotFoundError がスローされる
}
```

- **参照したEARS要件**: [EDGE-001, EDGE-002, EDGE-003]
- **参照した設計文書**: [dataflow.md - ユーザープロフィール取得フロー]

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- **ストーリー名**: 「認証済みユーザーとして、自分のプロフィール情報を確認したい」

### 参照した機能要件
- **REQ-005**: バックエンドAPIは認証済みユーザーのプロフィール情報を返却しなければならない

### 参照した非機能要件
- **NFR-002**: 認証チェックは1秒以内に完了しなければならない

### 参照したEdgeケース
- **EDGE-001**: 存在しないユーザーIDでのアクセス
- **EDGE-002**: 不正なUUID形式での入力
- **EDGE-003**: データベース接続障害

### 参照した受け入れ基準
- **テスト項目**: 「存在するユーザーIDでプロフィール情報が取得できること」
- **テスト項目**: 「存在しないユーザーIDでUserNotFoundErrorがスローされること」
- **テスト項目**: 「レスポンス時間が500ms以内であること」

### 参照した設計文書
- **アーキテクチャ**: architecture.md - Application層Use Case実装ガイドライン
- **データフロー**: dataflow.md - ユーザープロフィール取得フロー図
- **型定義**: interfaces.ts - IGetUserProfileUseCase, GetUserProfileUseCaseInput/Output
- **データベース**: database-schema.sql - users テーブル定義
- **API仕様**: api-endpoints.md - GET /api/user/profile エンドポイント仕様

---

## 品質判定結果

✅ **高品質**: 
- 要件の曖昧さ: なし（設計文書から明確な仕様を抽出）
- 入出力定義: 完全（TypeScript型定義で厳密に定義）
- 制約条件: 明確（パフォーマンス・セキュリティ・アーキテクチャ制約を明文化）
- 実装可能性: 確実（依存関係実装済み、参考実装存在）

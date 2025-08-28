# TDD要件定義・機能仕様の整理

**【機能名】**: mvp-google-auth (Google認証のMVP実装)
**【タスクID】**: TASK-301
**【作成日】**: 2025-08-28
**【更新日】**: 2025-08-28

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

### 🟢 何をする機能か（ユーザストーリーから抽出）
- **Googleアカウントでのワンクリックログイン**: ユーザーがGoogleアカウントを使用してアプリケーションに簡単にログインできる機能
- **バックエンドAPIでのユーザー情報取得**: ログイン済みユーザーがバックエンドAPIから自分のプロフィール情報を取得し、画面に表示される機能  
- **ログアウト機能**: ログイン済みユーザーがセッションを終了できる機能

### 🟢 どのような問題を解決するか（So that から抽出）
- **面倒な会員登録の排除**: Google認証により、ユーザーは新規会員登録なしにアプリをすぐに使い始められる
- **フロントエンド・バックエンド連携の確認**: 認証情報がフロントエンドとバックエンド間で正常に連携されることを確認できる
- **セッション管理の安全性**: ユーザーが安心してログアウトし、セッションを確実に終了できる

### 🟢 想定されるユーザー（As a から抽出）
- **アプリケーション利用者**: Googleアカウントを持ち、面倒な会員登録を避けたい一般ユーザー
- **ログイン済みユーザー**: 認証状態でアプリケーションを利用し、フロントエンドとバックエンドの連携を確認したいユーザー

### 🟢 システム内での位置づけ（アーキテクチャ設計から抽出）
- **フロントエンド・バックエンド分離型アーキテクチャ**: Next.js（フロントエンド）とHono API（バックエンド）の完全分離構成
- **DDD + クリーンアーキテクチャ**: バックエンドにドメイン駆動設計と4層アーキテクチャを適用
- **認証・ユーザー管理ドメイン**: 境界づけられたコンテキスト（Authentication Context & User Management Context）として実装
- **外部サービス連携**: Supabase Auth・Google OAuth 2.0を活用した認証基盤

### 🟢 参照したEARS要件
- **ユーザストーリー1-3**: Googleアカウントログイン・バックエンドAPI連携・ログアウト
- **REQ-001〜006**: 通常要件（フロントエンドJWT取得・バックエンドJWT検証・DDDアーキテクチャ・JITプロビジョニング・プロフィール返却・ログアウト）

### 🟢 参照した設計文書
- **architecture.md**: Section "DDD層構造" - 4層アーキテクチャ詳細、"プロバイダー拡張戦略" - プロバイダー非依存設計

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

### 🟢 入力パラメータ（interfaces.ts から抽出）

#### JWT検証・ユーザー認証 (POST /api/auth/verify)
```typescript
// リクエスト型（VerifyTokenRequest）
{
  token: string; // Supabase Auth発行のJWT（必須）
}

// JWT内部構造（JwtPayload）
{
  sub: string;           // Subject（外部プロバイダーでのユーザーID）
  email: string;         // メールアドレス
  app_metadata: {
    provider: string;    // プロバイダー種別
    providers: string[]; // 利用可能プロバイダー配列
  };
  user_metadata: {
    name: string;        // 表示名
    avatar_url?: string; // プロフィール画像URL（オプション）
    email: string;       // メールアドレス（再掲）
    full_name: string;   // フルネーム
  };
  iss: string;           // 発行者
  iat: number;           // 発行日時（Unix時間）
  exp: number;           // 有効期限（Unix時間）
}
```

#### ユーザープロフィール取得 (GET /api/user/profile)
```typescript
// リクエストヘッダー（AuthenticatedRequest）
{
  headers: {
    authorization: `Bearer ${string}`; // JWT Bearer トークン（必須）
  }
}
```

### 🟢 出力値（interfaces.ts・api-endpoints.md から抽出）

#### JWT検証・ユーザー認証レスポンス
```typescript
// 成功時（VerifyTokenResponse）
{
  success: true;
  data: {
    user: {
      id: string;           // UUID v4（例: "550e8400-e29b-41d4-a716-446655440000"）
      externalId: string;   // 外部プロバイダーID（例: "google_123456789"）
      provider: AuthProvider; // 'google' | 'apple' | 'microsoft' | 'github' | 'facebook' | 'line'
      email: string;        // RFC 5321準拠（最大320文字）
      name: string;         // 表示名（最大255文字）
      avatarUrl?: string;   // プロフィール画像URL（オプション）
      createdAt: Date;      // アカウント作成日時（ISO 8601）
      updatedAt: Date;      // 最終更新日時（ISO 8601）
      lastLoginAt?: Date;   // 最終ログイン日時（ISO 8601、オプション）
    };
    isNewUser: boolean;     // JITプロビジョニング実行フラグ
  }
}

// エラー時（ApiError）
{
  success: false;
  error: {
    code: string;     // "INVALID_TOKEN" | "TOKEN_EXPIRED" | "PROVIDER_ERROR"
    message: string;  // ユーザー向けメッセージ
    details?: string; // 開発者向け詳細情報（オプション）
  }
}
```

#### ユーザープロフィール取得レスポンス
```typescript
// 成功時（GetUserProfileResponse）
{
  success: true;
  data: {
    id: string;
    externalId: string;
    provider: AuthProvider;
    email: string;
    name: string;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
  }
}
```

### 🟢 入出力の関係性・データフロー（dataflow.md から抽出）
1. **フロントエンド**: Google OAuth実行 → Supabase JWT取得
2. **バックエンド**: JWT検証 → ユーザー検索/作成 → プロフィール返却
3. **JITプロビジョニング**: 初回ログイン時に `external_id` + `provider` で未存在確認 → 自動ユーザー作成

### 🟢 参照したEARS要件
- **REQ-002**: バックエンドJWT検証・ユーザー認証
- **REQ-004**: JITプロビジョニングによるユーザー作成
- **REQ-005**: 認証済みユーザープロフィール情報返却

### 🟢 参照した設計文書
- **interfaces.ts**: 全Domain・Application・Infrastructure・Presentation層の型定義
- **api-endpoints.md**: "認証関連エンドポイント"・"ユーザー関連エンドポイント"
- **dataflow.md**: "認証フローシーケンス"・"DDD層間のデータフロー"

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

### 🟢 パフォーマンス要件（NFR-001〜003から抽出）
- **認証フロー完了時間**: 10秒以内（Google OAuth + JWT検証 + JIT処理含む）
- **JWT検証処理時間**: 1秒以内（バックエンドでの単体認証チェック）
- **JITプロビジョニング時間**: 2秒以内（新規ユーザー作成・DB保存完了まで）
- **個別APIレスポンス時間**: GET /api/user/profile 500ms以内、POST /api/auth/verify 1000ms以内

### 🟢 セキュリティ要件（NFR-101〜103から抽出）
- **HTTPS通信必須**: すべての認証通信でHTTPS使用（Supabaseが自動対応）
- **JWT保存方式**: Supabase管理のSecure Cookieに保存（HttpOnly・Secure・SameSite設定）
- **行レベルセキュリティ**: RLSでユーザーが自分自身の情報のみ取得可能
- **データ最小化**: 必要最小限のユーザー情報のみ保存・送信

### 🟢 互換性要件（REQ-401〜406 MUSTから抽出）
- **フロントエンド技術**: Supabase Auth JavaScript SDK必須使用
- **バックエンド技術**: Hono フレームワーク必須使用
- **認証仕様準拠**: Google OAuth 2.0仕様完全準拠
- **データベース**: PostgreSQL + Drizzle ORM + Transaction Pooler（サーバーレス最適化）

### 🟢 アーキテクチャ制約（REQ-407〜413から抽出）
- **DDD + クリーンアーキテクチャ**: 4層構造（Presentation・Application・Domain・Infrastructure）必須実装
- **プロバイダー非依存設計**: Domain層が特定認証プロバイダーに依存禁止
- **開放閉鎖の原則**: 新規プロバイダー追加時の既存コード変更最小化
- **ユーザーエンティティ制約**: プロバイダー固有情報の直接保持禁止
- **抽象化インターフェース**: 認証フロー抽象化の必須定義

### 🟢 データベース制約（database-schema.sql から抽出）
- **プライマリキー**: UUID v4使用
- **一意制約**: `(external_id, provider)` 複合一意制約
- **バリデーション制約**: email形式チェック・name空文字禁止・avatarUrl形式チェック
- **インデックス戦略**: `(external_id, provider)` 複合インデックス・email検索用インデックス
- **環境変数対応**: `DB_TABLE_PREFIX` による動的テーブル名接頭辞

### 🟢 API制約（api-endpoints.md から抽出）
- **認証ヘッダー**: `Authorization: Bearer {jwt_token}` 形式必須
- **レスポンス形式**: 統一JSON構造（`{success, data?, error?}`）
- **エラーコード**: 標準化されたコード体系（AUTHENTICATION_REQUIRED・INVALID_TOKEN等）
- **CORS設定**: Development localhost:3000・Production domain制限

### 🟢 参照したEARS要件
- **NFR-001〜003**: パフォーマンス非機能要件
- **NFR-101〜103**: セキュリティ非機能要件  
- **REQ-401〜413**: 技術・アーキテクチャ制約要件

### 🟢 参照した設計文書
- **architecture.md**: "DDD層構造"・"プロバイダー拡張戦略"・"パフォーマンス設計"
- **database-schema.sql**: "制約定義"・"インデックス戦略"・"RLS設定"
- **api-endpoints.md**: "API設計原則"・"セキュリティ考慮事項"

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

### 🟢 基本的な使用パターン（通常要件REQ-001〜006から抽出）

#### パターン1: 初回ログイン（JITプロビジョニング）
```
1. ユーザーがGoogleログインボタンをクリック
2. Supabase Auth経由でGoogle OAuth実行
3. Google認証成功後、JWT取得
4. バックエンドAPI（POST /api/auth/verify）でJWT送信
5. JWT検証→ユーザー不存在確認→JIT新規作成→レスポンス返却
6. フロントエンドでユーザー情報表示・ログアウトボタン表示
```

#### パターン2: 2回目以降ログイン（既存ユーザー）
```
1. ページアクセス時にSupabase自動セッション復元
2. 既存JWTでバックエンドAPI（GET /api/user/profile）呼び出し
3. JWT検証→既存ユーザー取得→lastLoginAt更新→レスポンス返却
4. JIT処理スキップで高速ログイン完了
```

#### パターン3: ログアウト
```
1. ユーザーがログアウトボタンをクリック
2. Supabase Auth signOut()実行
3. ローカルセッション・Cookie削除
4. 未認証状態に戻り、Googleログインボタン再表示
```

### 🟢 データフロー（dataflow.md から抽出）
- **認証データ経路**: Google OAuth → Supabase Auth → フロントエンド → バックエンドAPI → PostgreSQL
- **JWT ライフサイクル**: 発行（Supabase）→ 検証（バックエンド）→ 期限管理（自動無効化）
- **ユーザーエンティティ管理**: Domain層UserAggregate → Infrastructure層UserRepository → PostgreSQL永続化

### 🟢 エッジケース（EDGE-001〜202から抽出）

#### 認証エラーケース
- **EDGE-001**: Googleアカウントアクセス拒否 → "認証がキャンセルされました"表示
- **EDGE-002**: JWT検証失敗 → 401エラー・"認証トークンが無効です"
- **EDGE-003**: バックエンド通信エラー → "APIサーバーとの通信に失敗しました"
- **EDGE-004**: Supabaseサービス障害 → "認証サービスが一時的に利用できません"

#### 境界値ケース  
- **EDGE-101**: 長いユーザー名（50文字以上）→ 適切な省略表示・DBは255文字制限
- **EDGE-102**: アバター画像取得失敗 → デフォルト画像表示

#### 特殊状況ケース
- **EDGE-201**: ページリロード → Supabaseセッション復元で認証状態維持
- **EDGE-202**: 複数タブ同期 → MVPでは対象外（将来拡張予定）

### 🟢 エラーケース（dataflow.md エラーフロー から抽出）

#### JWT関連エラー
```
無効JWT → 401 Unauthorized → フロントエンドでログインページリダイレクト
期限切れJWT → TOKEN_EXPIRED → 自動再認証フロー
```

#### データベースエラー
```
JIT作成失敗 → 500 Internal Server Error → "システムエラー"表示
ユーザー不存在（通常発生しない）→ 404 Not Found → USER_NOT_FOUND
```

#### プロバイダーエラー
```
Supabase接続エラー → 502 Bad Gateway → PROVIDER_ERROR
Google OAuth障害 → 認証フロー中断 → エラーメッセージ表示
```

### 🟢 参照したEARS要件
- **EDGE-001〜004**: エラー処理Edgeケース
- **EDGE-101〜102**: 境界値Edgeケース  
- **EDGE-201〜202**: 特殊状況Edgeケース

### 🟢 参照した設計文書
- **dataflow.md**: "認証フローシーケンス"・"エラーフロー"・"DDD層間のデータフロー"

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- **ストーリー1**: Googleアカウントでログイン
- **ストーリー2**: バックエンドAPIでのユーザー情報取得  
- **ストーリー3**: ログアウト

### 参照した機能要件
- **通常要件**: REQ-001〜006（JWT取得・検証・DDD・JIT・プロフィール返却・ログアウト）
- **条件付き要件**: REQ-101〜105（認証状態別UI表示・フロー制御）
- **状態要件**: REQ-201〜202（ローディング・エラー表示）
- **制約要件**: REQ-401〜413（技術スタック・アーキテクチャ・プロバイダー非依存設計）

### 参照した非機能要件
- **パフォーマンス**: NFR-001〜003（認証フロー10秒・JWT検証1秒・JIT2秒）
- **セキュリティ**: NFR-101〜103（HTTPS・Secure Cookie・RLS）
- **ユーザビリティ**: NFR-201〜203（UI配置・日本語エラー・モバイル対応）  
- **開発効率・学習効果**: NFR-301〜304（4時間実装・層分離・外部依存最小化・ドメイン純粋性）

### 参照したEdgeケース
- **エラー処理**: EDGE-001〜004
- **境界値**: EDGE-101〜102
- **特殊状況**: EDGE-201〜202

### 参照した受け入れ基準
- **機能テスト**: Google認証フロー・JWT検証・プロフィール表示・ログアウト・状態維持
- **セキュリティテスト**: HTTPS通信・トークン保存
- **ユーザビリティテスト**: モバイル対応・エラーメッセージ・ローディング表示
- **DDD学習効果テスト**: 4時間実装・層分離・集約管理・依存性逆転

### 参照した設計文書
- **アーキテクチャ**: architecture.md（DDD層構造・プロバイダー拡張戦略・セキュリティアーキテクチャ・パフォーマンス設計）
- **データフロー**: dataflow.md（認証フローシーケンス・DDD層間データフロー・エラーフロー・並列処理フロー）  
- **型定義**: interfaces.ts（全4層の型定義・Use Case入出力・エラー型・リポジトリインターフェース）
- **データベース**: database-schema.sql（プロバイダー非依存設計・インデックス戦略・RLS設定・制約定義）
- **API仕様**: api-endpoints.md（RESTful設計・エンドポイント詳細・セキュリティ考慮事項・エラーハンドリング）

---

## 品質判定

### ✅ 高品質判定結果
- **要件の曖昧さ**: なし（EARS要件定義書で明確に定義済み）
- **入出力定義**: 完全（TypeScript型定義・API仕様で詳細化済み）  
- **制約条件**: 明確（非機能要件・アーキテクチャ制約・DB制約すべて定義済み）
- **実装可能性**: 確実（設計文書・データフロー・型定義すべて整備済み）

### 信頼性レベル評価
- **🟢 青信号**: 100% - すべての項目でEARS要件定義書・設計文書からの直接抽出
- **🟡 黄信号**: 0% - 妥当な推測項目なし
- **🔴 赤信号**: 0% - 未定義推測項目なし

---

## 次のステップ

**次のお勧めステップ**: `/tdd-testcases` でテストケースの洗い出しを行います。

---

## 更新履歴
- 2025-08-28: 初回作成（TASK-301）- EARS要件定義書・設計文書群からの要件整理完了
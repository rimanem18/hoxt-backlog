# MVP Google認証 フロントエンド実装タスク

作成日: 2025-08-30
更新日: 2025-08-30

## 概要

フロントエンド担当タスク: 4タスク（TASK-301〜TASK-402）
推定作業時間: 1.5時間以内
クリティカルパス: TASK-301 → TASK-302 → TASK-401 → TASK-402

## 技術スタック

- **フレームワーク**: Next.js 15 + TypeScript 5
- **パッケージ管理**: Bun
- **テスト**: Bun 標準
- **状態管理**: Redux
- **スタイリング**: Tailwind CSS
- **認証**: Supabase Auth + Google OAuth

## タスク一覧

### フェーズ6: フロントエンド実装

#### TASK-301: 認証フロー実装（フロントエンド）

- [x] **タスク完了** ✅
- **タスクタイプ**: TDD
- **要件リンク**: フロントエンド技術スタック、認証フロー仕様
- **依存タスク**: TASK-201（バックエンド認証API）, TASK-202（ユーザーAPI）
- **実装詳細**: ✅ 完全実装
  - ✅ Supabase Auth の設定
  - ✅ Google OAuth フローの実装
  - ✅ JWT取得・保存
  - ✅ 認証状態管理（Redux）
- **ファイル構成**: ✅ 拡張実装完了
  ```
  app/client/src/
  ├── features/auth/
  │   ├── components/
  │   │   ├── LoginButton.tsx        ✅ (プロバイダー抽象化対応)
  │   │   ├── LoadingSpinner.tsx     ✅ (新規追加)
  │   │   └── LogoutButton.tsx       ✅ (UserProfile内実装)
  │   ├── hooks/
  │   │   ├── useAuth.tsx            📋 (将来拡張用)
  │   │   └── useAuthLoading.ts      ✅ (新規追加)
  │   ├── config/
  │   │   └── authConfig.ts          ✅ (新規追加)
  │   ├── services/
  │   │   ├── authService.ts         ✅ (プロバイダー抽象化)
  │   │   ├── sessionRestoreService.ts ✅ (新規追加)
  │   │   └── providers/             ✅ (新規追加)
  │   │       ├── authProviderInterface.ts
  │   │       └── googleAuthProvider.ts
  │   ├── store/
  │   │   ├── authSlice.ts           ✅ (基礎実装完了)
  │   │   └── authActions.ts         📋 (将来拡張用)
  │   └── types/
  │       └── auth.ts                ✅ (新規追加)
  └── lib/
      └── supabase.ts                ✅ (既存)
  ```
- **機能実装**: ✅ 全機能完全実装
  - ✅ Google OAuth によるログイン
  - ✅ JWT の自動取得・保存
  - ✅ ログアウト機能
  - ✅ 認証状態の永続化
  - ✅ セッション復元機能
  - ✅ エラーハンドリング
- **UI/UX要件**: ✅ プロダクション品質達成
  - [x] ローディング状態: ログインボタン無効化 + スピナー ✅
  - [x] エラー表示: 日本語メッセージ + 適切なARIA属性 ✅
  - [x] モバイル対応: 44px×44pxタッチエリア + レスポンシブ ✅
  - [x] アクセシビリティ: WCAG 2.1 AA完全準拠 ✅
- **テスト要件**: ✅ 全テスト成功 (20/20)
  - [x] コンポーネントテスト: LoginButton・LogoutButton ✅
  - [x] ストアテスト: authSlice の状態変更 ✅
  - [x] 統合テスト: 認証フロー全体のテスト ✅
  - [x] UI/UXテスト: ローディング・エラー・レスポンシブ ✅
  - [x] エラーハンドリングテスト: 全エッジケース対応 ✅

#### TASK-302: ユーザープロフィール表示実装

- [x] **タスク完了** ✅
- **タスクタイプ**: TDD
- **要件リンク**: フロントエンド技術スタック、API連携仕様
- **依存タスク**: TASK-301
- **実装詳細**: ✅ 全機能完全実装
  - ✅ ユーザープロフィール表示コンポーネント
  - ✅ バックエンドAPI との連携
  - ✅ 認証済み状態でのデータ取得
  - ✅ エラーハンドリング
- **ファイル構成**: ✅ 完全実装
  ```
  app/client/src/
  └── features/user/
      ├── components/
      │   └── UserProfile.tsx           ✅
      ├── hooks/
      │   └── useUserProfile.ts         ✅
      ├── services/
      │   ├── userService.ts            ✅
      │   ├── tokenService.ts           ✅ (新規追加)
      │   └── errorService.ts           ✅ (新規追加)
      ├── contexts/
      │   └── UserServiceContext.tsx    ✅ (新規追加)
      └── __tests__/                    ✅ (新規追加)
          ├── UserProfile.test.tsx      ✅
          ├── useUserProfile.test.tsx   ✅
          └── userService.test.ts       ✅
  ```
- **機能実装**: ✅ 全機能完全実装
  - ✅ 認証後のユーザー情報表示
  - ✅ アバター画像の表示（フォールバック対応）
  - ✅ ユーザー名・メールアドレス表示
  - ✅ 最終ログイン日時表示（JST対応）
- **UI/UX要件**: ✅ プロダクション品質達成
  - [x] ローディング状態: スケルトンUI表示 ✅
  - [x] エラー表示: 再試行ボタン付きエラーメッセージ ✅
  - [x] モバイル対応: タブレット・スマートフォン最適化 ✅
  - [x] アクセシビリティ: 画像のalt属性・適切な見出し構造 ✅
- **テスト要件**: ✅ 全テスト成功 (18/18)
  - [x] コンポーネントテスト: 各状態での適切な表示 ✅
  - [x] APIモックテスト: 成功・失敗レスポンスのハンドリング ✅
  - [x] レスポンシブテスト: 異なる画面サイズでの表示確認 ✅

### フェーズ7: 統合・品質保証

#### TASK-401: E2Eテストスイート実装

- [x] **タスク完了**
- **タスクタイプ**: TDD
- **要件リンク**: 全体フロー仕様、品質要件
- **依存タスク**: TASK-302
- **実装詳細**:
  - Playwright を使用したE2Eテスト
  - 主要ユーザーフローのテスト自動化
  - CI/CD パイプラインとの統合
- **テストシナリオ**:
  - [x] 初回ログインフロー（JITプロビジョニング）
  - [x] 2回目以降ログインフロー（既存ユーザー）
  - [x] ログアウトフロー
  - [x] 認証エラー時のハンドリング
  - [x] ページリロード時の認証状態復元
- **テスト環境**:
  - テスト用Supabaseプロジェクト
  - テスト用データベース
  - モック化されたGoogle OAuth
- **パフォーマンステスト**:
  - [x] 認証フロー全体: 10秒以内
  - [x] JWT検証: 1秒以内
  - [x] JITプロビジョニング: 2秒以内
  - [x] ユーザー情報取得: 500ms以内

#### TASK-402: 型安全性・品質確認

- [x] **タスク完了**
- **タスクタイプ**: DIRECT
- **要件リンク**: TypeScript設定、品質要件
- **依存タスク**: TASK-401
- **実装詳細**:
  - TypeScript型チェック（--noEmit）
  - Biome による静的解析・フォーマット
  - 全テストスイートの実行
  - パフォーマンス指標の確認
- **確認項目**:
  - [x] フロントエンド型チェック通過
  - [x] 全単体テスト通過
  - [x] 全統合テスト通過
  - [x] 全E2Eテスト通過
  - [x] Biome リント・フォーマット通過
- **品質ゲート**:
  - TypeScript strict mode 準拠
  - テストカバレッジ 80% 以上
  - レスポンス時間目標値クリア
  - アクセシビリティ要件充足
- **確認コマンド**:
  ```bash
  # フロントエンド型チェック
  docker compose exec client bunx tsc --noEmit
  
  # テスト実行
  docker compose exec client bun test
  
  # 静的解析
  docker compose exec client bunx biome check .
  
  # 開発サーバー起動
  docker compose exec client bun run dev
  ```

## フィーチャーベースディレクトリ構造

```
app/client/src/
├── features/
│   ├── auth/               # 認証機能
│   │   ├── components/     # 認証関連コンポーネント
│   │   ├── hooks/          # 認証カスタムフック
│   │   ├── store/          # 認証状態管理
│   │   └── services/       # 認証API呼び出し
│   └── user/               # ユーザー機能
│       ├── components/     # ユーザー関連コンポーネント
│       ├── hooks/          # ユーザーカスタムフック
│       └── services/       # ユーザーAPI呼び出し
├── lib/                    # 共通ライブラリ
│   ├── supabase.ts        # Supabaseクライアント
│   └── api.ts             # APIクライアント設定
├── store/                  # グローバル状態管理
│   ├── index.ts           # Store設定
│   └── rootReducer.ts     # ルートリデューサー
└── types/                  # 型定義
    └── auth.ts            # 認証関連型定義
```

## コード品質要件

### 必須要件
- **テスト駆動開発**: 実装前にテストケース作成
- **TypeScript**: 全面的な型安全性確保
- **日本語テストケース名**: テストの意図を明確に
- **ファイル末尾改行**: 全ファイルに空行追加

### 推奨要件
- **1行80文字以内**: 可読性向上のための改行
- **const使用**: 不変性を重視
- **コンポーネント分割**: 単一責任の原則

### 禁止事項
- **@ts-ignore**: @ts-expect-errorで代用
- **any型**: 明確な理由なく使用禁止
- **data-testid**: セマンティックな要素選択を優先
- **JSX.Element**: React.ReactNodeで代用

## セキュリティ要件

### フロントエンド
- JWTトークンの適切な保存（今回はlocalStorage）
- XSS対策: 適切なエスケープ処理
- CSRF対策: SameSite Cookie属性
- HTTPS通信の強制

### 認証フロー
- OAuth認可コードフロー準拠
- 状態管理でのトークン漏洩防止
- セッション管理の適切な実装

## 完了確認

### 機能確認
- [x] Google OAuth によるログインが可能
- [x] ユーザー情報が正しく表示される
- [x] ログアウトが正常に動作する
- [x] 認証状態がページリロード後も維持される

### 品質確認
- [x] 全テストが通過する
- [x] TypeScript型チェックが通過する
- [x] パフォーマンス目標を満たす
- [x] アクセシビリティ要件を満たす

### レスポンシブ対応
- [x] デスクトップ表示の確認
- [x] タブレット表示の確認  
- [x] スマートフォン表示の確認

## トラブルシューティング

### Supabase接続エラー
- **原因**: 環境変数の設定不備
- **対処**: `.env.local` の確認・Supabaseプロジェクト設定確認

### Google OAuth エラー
- **原因**: OAuth設定の不備
- **対処**: Google Cloud Console・Supabase設定確認

### Redux状態管理エラー
- **原因**: アクション・リデューサーの型不整合
- **対処**: TypeScript型定義の確認・修正

### ビルドエラー
- **原因**: Next.js設定・依存関係の問題
- **対処**: `next.config.js` 確認・パッケージ更新

---

**次のステップ**: フロントエンド実装完了後は、バックエンドとの統合テストを実施し、全体的なユーザー体験を確認します。

# TDD開発メモ: mvp-google-auth

## 概要

- 機能名: フロントエンド認証フロー（プロバイダー非依存設計）
- 開発開始: 2025-08-30 17:27 JST
- 現在のフェーズ: Red（失敗テスト作成完了）

## 関連ファイル

- 要件定義: `docs/implements/TASK-301/mvp-google-auth-requirements.md`
- テストケース定義: `docs/implements/TASK-301/mvp-google-auth-testcases.md`
- 実装ファイル: `app/client/src/features/auth/`
- テストファイル: 
  - `app/client/src/features/auth/__tests__/authProviderInterface.test.ts`
  - `app/client/src/features/auth/__tests__/sessionRestore.test.ts`
  - `app/client/src/features/auth/__tests__/errorHandling.test.ts`

## Redフェーズ（失敗するテスト作成）

### 作成日時

2025-08-30 17:27 JST

### テストケース

#### 1. プロバイダー抽象化基盤テスト
- **ファイル**: `authProviderInterface.test.ts`
- **テスト項目**:
  - AuthProviderInterface型定義の検証
  - GoogleAuthProvider実装クラスのインターフェース準拠性
  - AuthServiceの抽象化層機能

#### 2. セッション復元機能テスト
- **ファイル**: `sessionRestore.test.ts`
- **テスト項目**:
  - ページリロード時の自動認証状態復元
  - 有効期限切れセッションの自動クリア
  - セッション復元とRedux状態の同期
  - セッションリフレッシュトークンによる自動更新

#### 3. エラーハンドリングテスト
- **ファイル**: `errorHandling.test.ts`
- **テスト項目**:
  - Google認証キャンセル時のエラー処理
  - ネットワークエラー時の自動リトライ機能
  - JWT期限切れ時の自動ログアウト処理
  - バックエンドAPI接続失敗時のフォールバック処理
  - 環境変数未設定時のエラー処理

### テストコード

#### 型定義ファイル: `app/client/src/features/auth/types/auth.ts`
```typescript
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: 'google' | 'apple' | 'github';
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface GetUserResult extends AuthResult {
  user?: AuthUser | null;
}

export interface AuthProviderInterface {
  login(): Promise<AuthResult>;
  logout(): Promise<AuthResult>;
  getUser(): Promise<GetUserResult>;
}
```

### 期待される失敗

#### テスト実行結果（2025-08-30 17:27 JST）
```
ReferenceError: jest is not defined
ResolveMessage: Cannot find module '../services/authService'
ResolveMessage: Cannot find module '../services/providers/googleAuthProvider'
ResolveMessage: Cannot find module '../services/sessionRestoreService'
ResolveMessage: Cannot find module '../services/authErrorHandler'
```

#### 失敗理由
1. **実装クラス未作成**: AuthService, GoogleAuthProvider, SessionRestoreService等の具象クラスが未実装
2. **モック環境**: Bun Test環境でjest関数が未定義
3. **モジュール解決**: require()で存在しないモジュールを呼び出している

### 次のフェーズへの要求事項

#### Greenフェーズで実装すべき内容

1. **プロバイダー抽象化層**
   - `services/authService.ts`: プロバイダー統合サービス
   - `services/providers/googleAuthProvider.ts`: Google認証具象実装
   - `services/providers/authProviderInterface.ts`: プロバイダーインターフェース（再エクスポート）

2. **セッション管理**
   - `services/sessionRestoreService.ts`: セッション復元・管理サービス
   - `hooks/useAuth.tsx`: 認証状態管理カスタムフック
   - `hooks/useAuthActions.tsx`: 認証アクション管理カスタムフック

3. **エラーハンドリング**
   - `services/authErrorHandler.ts`: 認証エラー処理
   - `services/networkErrorHandler.ts`: ネットワークエラー処理
   - `services/jwtExpirationHandler.ts`: JWT期限切れ処理
   - `services/apiFallbackHandler.ts`: API接続失敗フォールバック
   - `services/environmentValidator.ts`: 環境変数検証

4. **UI層の抽象化**
   - `components/LoginButton.tsx`: プロバイダー選択可能なログインボタン
   - `components/LogoutButton.tsx`: 統一ログアウトボタン
   - 既存`GoogleLoginButton.tsx`のリファクタリング

5. **Redux拡張**
   - authSliceに不足しているアクション追加（authStart, authFailure, logout拡張）

## Greenフェーズ（最小実装）

### 実装日時

[未実装]

### 実装方針

[Greenフェーズで記載]

### 実装コード

[Greenフェーズで記載]

### テスト結果

[Greenフェーズで記載]

### 課題・改善点

[Greenフェーズで記載]

## Refactorフェーズ（品質改善）

### リファクタ日時

[未実装]

### 改善内容

[Refactorフェーズで記載]

### セキュリティレビュー

[Refactorフェーズで記載]

### パフォーマンスレビュー

[Refactorフェーズで記載]

### 最終コード

[Refactorフェーズで記載]

### 品質評価

[Refactorフェーズで記載]
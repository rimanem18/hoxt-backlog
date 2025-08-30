# TDD要件定義・機能仕様：TASK-301 フロントエンド認証フロー

**作成日**: 2025-08-30  
**更新日**: 2025-08-30
**機能名**: mvp-google-auth (フロントエンド認証フロー)  
**タスクID**: TASK-301  
**ブランチ**: issue#21_frontend-auth-flow  
**タスクタイプ**: TDD  

- **ファイル構成**（プロバイダー非依存設計）:
  ```
  app/client/src/
  ├── features/auth/
  │   ├── components/
  │   │   ├── LoginButton.tsx          // 汎用ログインボタン（プロバイダー選択可能）
  │   │   ├── LogoutButton.tsx         // 汎用ログアウトボタン
  │   │   └── UserProfile.tsx          // ユーザープロフィール表示
  │   ├── hooks/
  │   │   ├── useAuth.tsx              // 認証状態管理カスタムフック
  │   │   └── useAuthActions.tsx       // 認証アクションカスタムフック
  │   ├── store/
  │   │   ├── authSlice.ts             // 認証状態管理
  │   │   └── authActions.ts           // 認証アクション群
  │   ├── services/
  │   │   ├── authService.ts           // 認証サービス抽象化層
  │   │   └── providers/
  │   │       ├── googleAuthProvider.ts    // Google認証実装
  │   │       ├── appleAuthProvider.ts     // 将来拡張用
  │   │       └── authProviderInterface.ts // プロバイダーインターフェース
  │   └── types/
  │       └── auth.ts                  // 認証関連型定義
  └── lib/
      └── supabase.ts                  // Supabase設定
  ```


**【信頼性レベル指示】**:
- 🟢 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない場合
- 🟡 **黄信号**: EARS要件定義書・設計文書から妥当な推測の場合  
- 🔴 **赤信号**: EARS要件定義書・設計文書にない推測の場合

## 事前準備完了

✅ **TDD関連ファイルの読み込み**・コンテキスト準備完了  
✅ **フロントエンド実装状況分析完了**  
- GoogleLoginButton.tsx - 基本的なGoogle OAuth実装済み
- UserProfile.tsx - ユーザー情報表示・ログアウト機能実装済み  
- authSlice.ts - Redux認証状態管理の基礎実装済み

---

## 1. 機能の概要（EARS要件定義書・設計文書ベース）

🟢 **青信号**: EARS要件定義書・設計文書から詳細仕様を参照して推測なしで抽出

- **何をする機能か**: Next.js + Supabase Auth + Redux を使用したプロバイダー非依存認証フローの完全実装。現在はGoogle OAuthを主体とし、将来的な複数認証プロバイダー対応を見据えた拡張可能な統合フロントエンド認証システム
- **どのような問題を解決するか**: フロントエンドアプリケーションにおけるユーザー認証の課題（ログイン・認証状態管理・セッション維持・画面遷移・エラーハンドリング）を解決し、バックエンドAPIとの連携でセキュアなユーザー体験を提供
- **想定されるユーザー**: Webブラウザを通じてアプリケーションを利用するエンドユーザー（Googleアカウント保有者）
- **システム内での位置づけ**: フロントエンド（Next.js）層の認証システムとして、Supabase Authを通じてバックエンドAPI（Hono）と連携し、全体認証フローのユーザーインターフェース部分を担当

**参照したEARS要件**: REQ-101（フロントエンド実装要件）、REQ-102（Google認証フロー）、REQ-104（認証済みUI表示）  
**参照した設計文書**: README.md フロントエンド技術スタック、architecture.md フロントエンド認証システム設計（33-43行目）、dataflow.md 初回ログインフロー・2回目以降ログインフロー

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

🟢 **青信号**: interfaces.ts、dataflow.mdから型定義と認証フローを完全抽出

### 認証フロー入力・出力

**Google認証開始**:
- **入力**: ユーザーのボタンクリック（GoogleLoginButton）
- **処理**: `supabase.auth.signInWithOAuth({ provider: 'google' })`
- **出力**: Googleページへのリダイレクト

**認証完了後**:
- **入力**: Google認証成功後のリダイレクトとSupabase Session
- **出力**: JWTトークン・ユーザー情報取得（AuthState更新）

**バックエンドAPI連携**:
```typescript
// API通信仕様
const response = await fetch('/api/user/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  }
});
```

**Redux State管理**:
```typescript
// 認証状態の型定義（interfaces.ts準拠）
interface AuthState {
  isAuthenticated: boolean;  // 認証済みフラグ
  user: User | null;         // ユーザー情報（未認証時はnull）
  isLoading: boolean;        // 処理中フラグ
  error: string | null;      // エラー情報
}

// 認証成功時のペイロード
interface AuthSuccessPayload {
  user: User;         // バックエンドから取得したユーザー情報
  isNewUser: boolean; // JITプロビジョニング実行フラグ
}
```

### コンポーネント仕様

**GoogleLoginButton**:
- **Props**: なし
- **出力**: 認証フロー開始、Redux state更新（isLoading: true）

**UserProfile**:
- **Props**: `{ user: User }` 
- **出力**: ユーザー情報表示（名前・メール・アバター）・ログアウト機能

**参照したEARS要件**: REQ-102（認証フロー仕様）、REQ-104（認証済みUI）  
**参照した設計文書**: interfaces.ts AuthState・User型定義、dataflow.md 認証シーケンス図

---

## 3. 制約条件（EARS非機能要件・アーキテクチャ設計ベース）

🟢 **青信号**: EARS非機能要件、アーキテクチャ設計から明確な制約を抽出

### パフォーマンス要件
- **認証フロー全体**: 10秒以内（README.mdパフォーマンス目標）
- **画面遷移**: 認証完了後2秒以内にUserProfile表示
- **セッション復元**: ページリロード時1秒以内で認証状態復元

### セキュリティ要件
- **HTTPS通信必須**: 本番環境でのHTTPS通信のみ許可
- **JWT管理**: セッションストレージ・ローカルストレージでの安全なトークン管理
- **リダイレクト制御**: 認証後のリダイレクト先URL制限（CSRF対策）
- **環境変数管理**: `NEXT_PUBLIC_*` 環境変数による設定外部化

### 互換性要件
- **ブラウザ対応**: モダンブラウザ（Chrome・Firefox・Safari・Edge）
- **レスポンシブ対応**: デスクトップ・タブレット・モバイルデバイス対応
- **Next.js 15**: App Routerおよび'use client'ディレクティブ対応

### アーキテクチャ制約
- **Redux状態管理**: Redux Toolkit使用必須
- **コンポーネント設計**: 関数コンポーネント + TypeScript厳格モード
- **プロバイダー抽象化**: AuthProviderInterface実装による統一認証処理
- **依存性逆転の原則**: 上位モジュールが下位の認証プロバイダー実装に依存しない
- **開放閉鎖の原則**: 新規プロバイダー追加時に既存コードを変更しない
- **Supabase Auth統合**: createClient経由のSupabaseクライアント使用
- **環境変数依存**: `NEXT_PUBLIC_SUPABASE_URL`・`NEXT_PUBLIC_SUPABASE_ANON_KEY`必須

### 実装制約
🔴 **赤信号**: 現在の実装で不完全な部分（要実装）

**未実装要件**:
- **セッション復元機能**: ページリロード時の認証状態自動復元
- **エラーハンドリング**: 認証失敗・ネットワークエラーの適切な処理
- **ローディング状態管理**: 認証処理中のUI表示制御
- **リダイレクト処理**: 認証完了後の適切な画面遷移

**参照したEARS要件**: NFR-002（パフォーマンス要件）、NFR-101（HTTPS必須）、REQ-101（フロントエンド技術制約）  
**参照した設計文書**: architecture.md セキュリティ・パフォーマンス設計、README.md パフォーマンス目標

---

## 4. 想定される使用例（EARSEdgeケース・データフローベース）

🟢 **青信号**: dataflow.md認証フロー、現在の実装状況から具体例を抽出

### 基本的な使用パターン

**初回ログインフロー**:
```javascript
// 1. ユーザーがGoogleログインボタンをクリック
// 2. GoogleLoginButtonコンポーネント → handleClick実行
// 3. supabase.auth.signInWithOAuth() → Googleページリダイレクト
// 4. Google認証完了 → アプリケーションにリダイレクト
// 5. Supabaseセッション確立 → JWTトークン取得
// 6. バックエンドAPI（/api/user/profile）呼び出し
// 7. ユーザー情報取得・JITプロビジョニング実行
// 8. Redux state更新（authSuccess action）
// 9. UserProfileコンポーネント表示
```

**2回目以降のログイン**:
```javascript
// 1. ページアクセス・リロード
// 2. useEffectでSupabaseセッション確認
// 3. 既存セッション発見 → 自動ログイン
// 4. JWTトークンでバックエンドAPI呼び出し
// 5. ユーザー情報取得（JITスキップ）
// 6. UserProfile表示
```

### エッジケース

🟡 **黄信号**: 設計文書から推測可能なエラーケース

- **EDGE-101**: Google認証キャンセル → ログイン画面に戻る・エラー表示なし
- **EDGE-102**: ネットワークエラー → 「インターネット接続を確認してください」表示
- **EDGE-103**: バックエンドAPI接続失敗 → 「サーバーとの通信に失敗しました」表示
- **EDGE-104**: JWT期限切れ → 自動ログアウト・再認証要求
- **EDGE-105**: アバター画像取得失敗 → デフォルト画像表示（実装済み）

### エラーケースの処理

```javascript
// 認証エラー処理例
try {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  });
  if (error) throw error;
} catch (error) {
  dispatch(authFailure({ error: 'Google認証に失敗しました' }));
}

// APIエラー処理例  
try {
  const response = await fetch('/api/user/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error('ユーザー情報の取得に失敗しました');
  }
} catch (error) {
  dispatch(authFailure({ error: error.message }));
}
```

**参照したEARS要件**: EDGE-101（認証キャンセル）、EDGE-102（ネットワークエラー）  
**参照した設計文書**: dataflow.md 初回・2回目ログインフロー、エラーフロー処理

---

## 5. EARS要件・設計文書との対応関係

### 参照したユーザストーリー
- **ストーリー1**: 「未認証ユーザーとして、私はGoogleアカウントでログインして認証状態になりたい」
- **ストーリー2**: 「認証済みユーザーとして、私は自分の情報を確認してログアウトできるようにしたい」

### 参照した機能要件
- **REQ-101**: フロントエンドはNext.js 15 + TypeScript + Redux + Tailwind CSSを使用しなければならない
- **REQ-102**: フロントエンドはSupabase Authを使用してGoogle認証フローを実装しなければならない  
- **REQ-103**: フロントエンドは認証処理中のローディング状態を表示しなければならない
- **REQ-104**: ユーザーが認証済みの場合、システムはユーザー情報とログアウトボタンを表示しなければならない

### 参照した非機能要件
- **NFR-002**: フロントエンドの認証フロー全体は10秒以内に完了しなければならない
- **NFR-101**: すべての認証通信はHTTPS経由で行われなければならない
- **NFR-201**: フロントエンドはモバイルデバイスでの使用に対応しなければならない

### 参照したEdgeケース
- **EDGE-101**: Google認証をキャンセルした場合、適切にログイン画面に戻る
- **EDGE-102**: ネットワークエラー時は分かりやすいエラーメッセージを表示する
- **EDGE-105**: アバター画像が取得できない場合はデフォルト画像を表示する

### 参照した設計文書
- **アーキテクチャ**: architecture.md
  - フロントエンド技術スタック（33-43行目）
  - 認証フローの全体設計
- **データフロー**: dataflow.md 
  - 初回ログインフロー（32-76行目）
  - 2回目以降のログインフロー（78-104行目）
  - ログアウトフロー（106-119行目）
- **型定義**: interfaces.ts
  - AuthState、User、AuthSuccessPayload型定義（232-256行目）
  - API通信インターフェース（172-183行目）

---

## 実装完了状況（2025-08-30現在）

### ✅ 部分実装済み（抽象化要対応）
1. **GoogleLoginButton（→LoginButton に抽象化予定）** - 基本的な認証開始機能
   - Supabase OAuth実行: `signInWithOAuth({ provider: 'google' })`
   - リダイレクト設定: options.redirectTo設定済み
   - 基本的なエラーハンドリング: console.log/console.error
   - **抽象化要件**: プロバイダー選択可能なLoginButtonコンポーネントへの変更
2. **UserProfile** - ユーザー情報表示・ログアウト機能（プロバイダー非依存実装済み）
   - ユーザー情報表示: name・email・avatarUrl表示
   - ログアウト実装: `supabase.auth.signOut()`実行
   - アバターフォールバック: デフォルト画像対応済み
3. **authSlice** - Redux認証状態管理の基礎（プロバイダー非依存実装済み）
   - AuthState型定義: isAuthenticated・user・isLoading・error
   - authSuccessアクション: 認証完了時の状態更新

### 🔴 未実装・要修正項目
1. **プロバイダー抽象化アーキテクチャ** - AuthProviderInterface・authService実装
2. **GoogleLoginButton→LoginButton抽象化** - プロバイダー選択可能な汎用コンポーネント化
3. **セッション復元機能** - ページリロード時の自動ログイン
4. **エラーハンドリング強化** - 認証失敗・API通信エラーの適切な処理
5. **ローディング状態管理** - isLoadingフラグの適切な制御
6. **認証フロー統合** - コンポーネント間の状態連携
7. **リダイレクト処理** - 認証後の画面遷移制御
8. **Redux追加アクション** - authStart・authFailure・logoutアクションの実装

---

## 品質判定結果

🔴 **実装未完了（要実装作業）**:
- **要件の明確性**: 設計文書・要件は明確、実装が部分的
- **入出力定義**: 型定義は完全、実際の処理フローが未完成
- **制約条件**: 制約は明確、セキュリティ・パフォーマンス要件の実装が未完了
- **実装適合性**: 基礎実装完了、統合・エラーハンドリング・セッション管理が未実装

### 必須実装項目（プロバイダー非依存設計適用）
1. **プロバイダー抽象化アーキテクチャ** - 依存性逆転による拡張可能設計
2. **LoginButton抽象化** - プロバイダー選択可能な汎用認証コンポーネント
3. **認証フロー統合** - ログイン→状態管理→UI更新の完全な流れ
4. **セッション復元** - アプリケーション起動時の自動認証状態復元
5. **エラーハンドリング** - 各段階での適切なエラー処理とユーザーフィードバック
6. **Redux アクション追加** - authStart・authFailure・logout の実装
7. **統合テスト** - 認証フロー全体の動作確認

---

## 次のステップ

**推奨ステップ**: `/tdd-testcases` でフロントエンド認証フロー全体のテストケース整備

**実装予定順序**:
1. **セッション復元機能** - useEffect + getSession()による自動ログイン
2. **Redux追加アクション** - authStart・authFailure・logoutアクションの実装  
3. **エラーハンドリング強化** - try-catch・エラーメッセージ表示
4. **認証フロー統合** - コンポーネント間の適切な状態連携
5. **統合テスト** - 認証フロー全体のE2Eテスト実装

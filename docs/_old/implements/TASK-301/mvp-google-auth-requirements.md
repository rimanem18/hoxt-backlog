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
- 🔵 **青信号**: EARS要件定義書・設計文書を参考にしてほぼ推測していない場合
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

🔵 **青信号**: EARS要件定義書・設計文書から詳細仕様を参照して推測なしで抽出

- **何をする機能か**: Next.js + Supabase Auth + Redux を使用したプロバイダー非依存認証フローの完全実装。現在はGoogle OAuthを主体とし、将来的な複数認証プロバイダー対応を見据えた拡張可能な統合フロントエンド認証システム
- **どのような問題を解決するか**: フロントエンドアプリケーションにおけるユーザー認証の課題（ログイン・認証状態管理・セッション維持・画面遷移・エラーハンドリング）を解決し、バックエンドAPIとの連携でセキュアなユーザー体験を提供
- **想定されるユーザー**: Webブラウザを通じてアプリケーションを利用するエンドユーザー（Googleアカウント保有者）
- **システム内での位置づけ**: フロントエンド（Next.js）層の認証システムとして、Supabase Authを通じてバックエンドAPI（Hono）と連携し、全体認証フローのユーザーインターフェース部分を担当

**参照したEARS要件**: REQ-101（フロントエンド実装要件）、REQ-102（Google認証フロー）、REQ-104（認証済みUI表示）  
**参照した設計文書**: README.md フロントエンド技術スタック、architecture.md フロントエンド認証システム設計（33-43行目）、dataflow.md 初回ログインフロー・2回目以降ログインフロー

---

## 2. 入力・出力の仕様（EARS機能要件・TypeScript型定義ベース）

🔵 **青信号**: interfaces.ts、dataflow.mdから型定義と認証フローを完全抽出

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

🔵 **青信号**: EARS非機能要件、アーキテクチャ設計から明確な制約を抽出

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

🔵 **青信号**: dataflow.md認証フロー、現在の実装状況から具体例を抽出

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

---

## 【2025-08-31 更新】プロダクション品質UI/UX要件追加

### 現在の実装課題（要件チェック結果）

**実装完了度**: 25% / 100% （基本認証機能のみ実装済み）

**🔴 未実装・緊急対応必要項目**:
1. **ローディング状態管理** - 認証処理中のUIフィードバック不足
   - ボタン無効化・スピナー表示・進行状況の視覚表示
2. **エラーハンドリング・表示** - ユーザーへの適切なエラーフィードバック不足
   - 日本語エラーメッセージ・自動エラークリア・リトライ機能
3. **レスポンシブ対応** - モバイル環境での使いにくさ
   - ブレークポイント対応・タッチ最適化・画面サイズ別UI調整
4. **アクセシビリティ対応** - 支援技術・キーボードナビゲーション未対応
   - ARIA属性・フォーカス管理・スクリーンリーダー対応
5. **LogoutButtonコンポーネント** - テスト可能な独立コンポーネント化
6. **統合E2Eテスト** - 認証フロー全体の動作確認テスト

### 追加されたUI/UX要件

#### REQ-UI-001: ローディング状態表示要件
- **必須**: 認証処理中（0.5秒以上）はボタンを無効化し、スピナーを表示しなければならない
- **必須**: `aria-busy`属性でスクリーンリーダーに処理中状態を通知しなければならない
- **必須**: ローディング中は「認証中...」などの適切なラベルを表示しなければならない

#### REQ-UI-002: エラー表示・ハンドリング要件  
- **必須**: 認証エラーは理解しやすい日本語メッセージで表示しなければならない
- **必須**: エラーメッセージは`role="alert"`属性で緊急性を示さなければならない
- **推奨**: エラーメッセージは3秒後に自動で消去されてもよい
- **必須**: ネットワークエラー時は「インターネット接続を確認してください」と表示し、再試行ボタンを提供しなければならない

#### REQ-UI-003: レスポンシブ対応要件
- **必須**: モバイル（767px以下）では最小44px×44pxのタッチエリアを確保しなければならない
- **必須**: タブレット（768-1023px）・デスクトップ（1024px以上）で適切なレイアウト調整を行わなければならない  
- **必須**: 画面向き変更（縦横回転）時に適切にレイアウトが調整されなければならない

#### REQ-UI-004: アクセシビリティ要件（WCAG 2.1 AA準拠）
- **必須**: ログイン・ログアウトボタンはキーボード（Tab・Enter・Space）で操作可能でなければならない
- **必須**: `aria-label`・`aria-describedby`属性で適切な説明を提供しなければならない
- **必須**: フォーカス時に視覚的インディケーターを表示しなければならない（`focus:ring-2`等）
- **必須**: カラーコントラスト比4.5:1以上を維持しなければならない

### 追加されたEdgeケース

#### EDGE-UI-001: ダブルクリック防止
- 0.5秒以内の連続クリックは無視し、処理の重複実行を防ぐ

#### EDGE-UI-002: 長時間処理対応  
- 10秒経過時「認証に時間がかかっています...」メッセージを表示

#### EDGE-A11Y-001: スクリーンリーダー対応
- 認証状態の変更を`aria-live="polite"`で適切に読み上げ

### 実装仕様例

```typescript
// 改善されたLoginButton実装例
interface LoginButtonProps {
  provider?: 'google';
  disabled?: boolean;
  onAuthStart?: () => void;
  onAuthSuccess?: (user: User) => void;
  onAuthError?: (error: string) => void;
}

const LoginButton: React.FC<LoginButtonProps> = ({
  provider = 'google', disabled, onAuthStart, onAuthSuccess, onAuthError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  
  const handleClick = async () => {
    if (isLoading) return; // ダブルクリック防止
    
    setIsLoading(true);
    dispatch(authStart());
    onAuthStart?.();
    
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      // 認証成功処理は別のuseEffectで監視
    } catch (error) {
      const errorMessage = error instanceof Error ? 
        error.message : '認証に失敗しました。しばらくしてからお試しください。';
      dispatch(authFailure({ error: errorMessage }));
      onAuthError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={isLoading ? '認証中...' : `${provider}でログイン`}
      aria-busy={isLoading}
      className={
        "px-4 py-2 bg-blue-500 text-white rounded " +
        "hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
        "disabled:opacity-50 disabled:cursor-not-allowed " +
        "sm:px-6 sm:py-3 lg:px-8 lg:py-4 " + // レスポンシブ
        "min-h-[44px] transition-all duration-200" // タッチ最適化
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <Spinner className="mr-2" />
          <span>認証中...</span>
        </div>
      ) : (
        `${provider}でログイン`
      )}
    </button>
  );
};
```

### 品質判定更新結果

🟡 **要実装（要件明確・実装準備完了）**:
- **要件明確性**: ✅ 完全 - UI/UX・アクセシビリティ要件が具体的
- **入出力定義**: ✅ 完全 - コンポーネントProps・State・イベント仕様が明確
- **制約条件**: ✅ 明確 - WCAG 2.1・レスポンシブ・パフォーマンス基準が具体的
- **実装可能性**: ✅ 確実 - React標準機能・Tailwind CSS・既存実装の拡張

---

## 次のステップ

**推奨ステップ**: `/tdd-testcases` でUI/UX要件を含む完全なテストケース整備

**実装優先順序（更新版）**:
1. **🔥 最優先**: ローディング状態管理・エラーハンドリング・表示
2. **🔄 高優先**: レスポンシブ対応・基本アクセシビリティ（ARIA・キーボード）
3. **⭐ 中優先**: 高度なアクセシビリティ・エラー自動クリア・リトライ機能
4. **💎 低優先**: UX詳細改善・アニメーション・細かなインタラクション
5. **🧪 並行作業**: コンポーネントテスト・統合E2Eテスト実装

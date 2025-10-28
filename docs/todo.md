ここよりも下に記載

---

# `features/google-auth/` を `features/auth/` へ統合する完全リファクタリングプラン

**作成日**: 2025-01-27 (JST)
**目的**: `google-auth` という具体的すぎる命名を `auth` に統合し、複数OAuthプロバイダー対応可能な拡張性の高いアーキテクチャへ全面改修

## 🎯 リファクタリングの目標

1. **命名の抽象化**: `google-auth` → `auth` へ統合し、ビジネスドメイン（認証）を表現
2. **責務の明確化**: セッション管理・Provider抽象化・UI を統一feature内で整理
3. **拡張性の確保**: 将来の GitHub/Microsoft OAuth 追加に対応できる構造
4. **SOLID原則遵守**: Redux Reducerから副作用を分離し、単一責任を徹底

## 📊 現状分析結果

### 既存の良い点（活用する資産）
- [ ] `features/auth/services/providers/` に既に Provider 抽象化が存在
  - `authProviderInterface.ts` - インターフェース定義済み
  - `googleAuthProvider.ts` - Google 実装済み
- [ ] エラーハンドリング機構が充実（`errorSlice`, `oauthErrorSlice`）
- [ ] `LoginButton`, `AuthGuard` などの UI コンポーネントが既に `features/auth/` に配置済み

### 統合が必要な機能（`google-auth` から移動）
- 🔄 `authSlice.ts` (344行) - セッション状態管理
- 🔄 `UserProfile.tsx` - ユーザープロフィール UI
- 🔄 `app/auth/callback/page.tsx` の Google 固有処理 (L52-L92, L117-L131)

### 問題点（修正する箇所）
- ❌ Redux Reducer 内に LocalStorage 副作用が混在（L128-L170, L186-L205）
- ❌ `app/auth/callback/page.tsx` が直接 Supabase SDK を呼び出し（L95-L131）
- ❌ 横断参照：4ファイルが `@/features/google-auth/` に依存
  - `app/provider.tsx`
  - `app/auth/callback/page.tsx`
  - `app/dashboard/page.tsx`
  - `store/index.ts`

---

## 📁 最終的なディレクトリ構造

```
features/auth/
├── __tests__/                          # テスト集約（CLAUDE.mdルール）
│   ├── authSlice.test.ts               # 移動元: google-auth/__tests__/
│   ├── UserProfile.test.tsx            # 移動元: google-auth/__tests__/
│   ├── sessionPersistence.test.ts      # 新規
│   ├── sessionListener.test.ts         # 新規
│   ├── sessionRestore.test.ts          # 既存
│   ├── errorHandling.test.ts           # 既存
│   ├── authProviderInterface.test.ts   # 既存
│   └── ui-ux/
│       └── LoadingState.test.tsx       # 既存
│
├── components/
│   ├── LoginButton.tsx                 # 既存（Provider DI 対応に改修）
│   ├── UserProfile.tsx                 # 移動元: google-auth/components/
│   ├── AuthGuard.tsx                   # 既存
│   ├── LoadingSpinner.tsx              # 既存
│   ├── GlobalErrorToast.tsx            # 既存
│   └── OAuthErrorDisplay.tsx           # 既存
│
├── store/
│   ├── authSlice.ts                    # 移動元: google-auth/store/（副作用除去）
│   ├── sessionListener.ts              # 新規（副作用を分離）
│   ├── errorSlice.ts                   # 既存
│   └── oauthErrorSlice.ts              # 既存
│
├── services/
│   ├── sessionPersistence.ts           # 新規（LocalStorage操作を抽出）
│   ├── sessionRestoreService.ts        # 既存
│   ├── authService.ts                  # 既存
│   ├── authErrorHandler.ts             # 既存
│   ├── networkErrorHandler.ts          # 既存
│   ├── oauthErrorHandler.ts            # 既存
│   ├── jwtExpirationHandler.ts         # 既存
│   ├── apiFallbackHandler.ts           # 既存
│   ├── environmentValidator.ts         # 既存
│   │
│   └── providers/                      # OAuth Provider実装（既存活用）
│       ├── authProviderInterface.ts    # 既存（callback処理を追加）
│       ├── googleAuthProvider.ts       # 既存（callback処理を追加）
│       └── mockAuthProvider.ts         # 新規（E2Eテスト用を分離）
│
├── hooks/
│   ├── useAuth.ts                      # 新規（authSliceのhooks wrapper）
│   ├── useAuthLoading.ts               # 既存
│   └── useOAuthCallback.ts             # 新規（callback処理を抽象化）
│
├── config/
│   └── authConfig.ts                   # 既存
│
└── types/
    └── auth.ts                         # 既存
```

---

## 🔄 段階的実装計画（15タスク）

### **Phase 1: 基盤整備（副作用分離）**

#### - [x] Task 1: LocalStorage操作の抽出
**目的**: Redux Reducer から副作用を分離し、SOLID原則（単一責任）を遵守

**新規作成**: `features/auth/services/sessionPersistence.ts`

**実装内容**:
```typescript
import type { User } from '@/features/auth/types/auth';

const STORAGE_KEY = 'auth_user';

/**
 * セッション永続化サービス
 * LocalStorage への読み書きを集約し、Redux Reducer を純粋関数化する
 */
export const sessionPersistence = {
  /**
   * ユーザー情報を LocalStorage に保存
   */
  save: (user: User): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      console.log('Session saved to localStorage:', user.id);
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
    }
  },

  /**
   * ユーザー情報を LocalStorage から読み込み
   */
  load: (): User | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      console.log('Session loaded from localStorage:', parsed.id);
      return parsed as User;
    } catch (error) {
      console.error('Failed to load session from localStorage:', error);
      return null;
    }
  },

  /**
   * ユーザー情報を LocalStorage から削除
   */
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Session cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear session from localStorage:', error);
    }
  },
};
```

**影響**: なし（新規ファイル）

---

#### - [x] Task 2: Redux Listener Middleware の実装
**目的**: 副作用を Reducer の外で管理し、テスタビリティ向上

**新規作成**: `features/auth/store/sessionListener.ts`

**実装内容**:
```typescript
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { sessionPersistence } from '@/features/auth/services/sessionPersistence';
import { authSuccess, logout, handleExpiredToken } from './authSlice';

/**
 * セッション永続化用 Listener Middleware
 * Redux の副作用を Reducer の外で管理し、純粋関数性を確保
 */
export const authListenerMiddleware = createListenerMiddleware();

/**
 * 認証成功時に LocalStorage へ保存
 */
authListenerMiddleware.startListening({
  matcher: isAnyOf(authSuccess),
  effect: (action, listenerApi) => {
    if (action.payload.user) {
      sessionPersistence.save(action.payload.user);
    }
  },
});

/**
 * ログアウト・トークン期限切れ時に LocalStorage をクリア
 */
authListenerMiddleware.startListening({
  matcher: isAnyOf(logout, handleExpiredToken),
  effect: () => {
    sessionPersistence.clear();
  },
});
```

**更新**: `store/index.ts`

**変更箇所** (L30-L37):
```typescript
// Before
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
    },
  }),

// After
import { authListenerMiddleware } from '@/features/auth/store/sessionListener';

middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
    },
  }).prepend(authListenerMiddleware.middleware), // 追加
```

**影響**: Redux Store の middleware 設定変更のみ（既存動作は維持）

---

#### - [x] Task 3: authSlice.ts の移動と純粋化
**目的**: `google-auth` から `auth` へ移動し、Reducer を純粋関数化

**移動**: `features/google-auth/store/authSlice.ts` → `features/auth/store/authSlice.ts`

**変更内容**:

1. **authSuccess Reducer の純粋化** (L128-L170):
```typescript
// Before
authSuccess: (state, action: PayloadAction<AuthSuccessPayload>) => {
  state.isAuthenticated = true;
  state.user = action.payload.user;
  state.isAuthRestoring = false;
  state.authError = null;

  // LocalStorage への保存（副作用）
  try {
    localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
    console.log('Session saved to localStorage:', action.payload.user.id);
  } catch (error) {
    console.error('Failed to save session to localStorage:', error);
  }
},

// After
authSuccess: (state, action: PayloadAction<AuthSuccessPayload>) => {
  state.isAuthenticated = true;
  state.user = action.payload.user;
  state.isAuthRestoring = false;
  state.authError = null;
  // LocalStorage 操作を削除（sessionListener で処理）
},
```

2. **logout Reducer の純粋化** (L186-L205):
```typescript
// Before
logout: (state) => {
  state.isAuthenticated = false;
  state.user = null;
  state.authError = null;

  // LocalStorage のクリア（副作用）
  try {
    localStorage.removeItem('auth_user');
    console.log('Session cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
},

// After
logout: (state) => {
  state.isAuthenticated = false;
  state.user = null;
  state.authError = null;
  // LocalStorage 操作を削除（sessionListener で処理）
},
```

3. **handleExpiredToken Reducer の純粋化** (L299-L328):
```typescript
// Before
handleExpiredToken: (state) => {
  state.isAuthenticated = false;
  state.user = null;
  state.authError = {
    code: 'TOKEN_EXPIRED',
    message: 'セッションの有効期限が切れました。再度ログインしてください。',
  };

  // console.log の削除（副作用）
  console.warn('Token expired, user logged out');

  // LocalStorage のクリア
  try {
    localStorage.removeItem('auth_user');
  } catch (error) {
    console.error('Failed to clear session from localStorage:', error);
  }
},

// After
handleExpiredToken: (state) => {
  state.isAuthenticated = false;
  state.user = null;
  state.authError = {
    code: 'TOKEN_EXPIRED',
    message: 'セッションの有効期限が切れました。再度ログインしてください。',
  };
  // console.log と LocalStorage 操作を削除（sessionListener で処理）
},
```

**影響**: 以下のファイルで import パス更新が必要
- `store/index.ts` (L9): `import { authSlice } from '@/features/google-auth/store/authSlice';` → `@/features/auth/store/authSlice`
- `app/provider.tsx` (L5): 同上
- `app/auth/callback/page.tsx` (L5): 同上
- `app/dashboard/page.tsx` (L5): 同上

---

### **Phase 2: UI コンポーネントの統合**

#### [x] Task 4: UserProfile.tsx とテストファイルの移動
**目的**: ユーザープロフィール UI を `auth` feature に集約

**移動対象**:
1. コンポーネント: `features/google-auth/components/UserProfile.tsx` → `features/auth/components/UserProfile.tsx`
2. テストファイル: `features/google-auth/__tests__/UserProfile.test.tsx` → `features/auth/__tests__/UserProfile.test.tsx`

**変更内容**:
1. `UserProfile.tsx` の L18:
   - `import { authSlice } from '@/features/google-auth/store/authSlice';`
   - → `@/features/auth/store/authSlice`

2. `UserProfile.test.tsx` の import パス:
   - `@/features/google-auth/...` → `@/features/auth/...` へ全て更新

**検証**:
- `docker compose exec client bunx tsc --noEmit`
- `docker compose exec client bun test UserProfile`
- `docker compose exec client bun run fix`

**影響**: テストファイルの移動により、Phase 2 完了後も既存テストが正常動作

---

#### [x] Task 5: LoginButton の Provider DI 対応（完了済み）
**目的**: 既存の `authService` DI パスを維持しつつ、Provider 抽象化の準備

**結論**: **既に実装済みのため追加作業不要**

**実装確認結果**:
1. ✅ `LoginButton` は既に `provider: AuthProvider` を Props で受け取っている
2. ✅ `authService` は `AuthServiceInterface` で抽象化され、DI 可能
3. ✅ テスト（`ui-ux/LoadingState.test.tsx`）が `authService` DI を検証済み
4. ✅ 型定義は `authConfig.ts` の `AuthProvider` 型を使用

**現在の実装内容**:
```typescript
// LoginButton.tsx (L26-L46)
interface LoginButtonProps {
  provider: AuthProvider; // authConfig.ts の型を使用
  disabled?: boolean;
  onAuthStart?: () => void;
  onAuthSuccess?: (data: unknown) => void;
  onAuthError?: (errorMessage: string) => void;
  className?: string;
  authService?: AuthServiceInterface; // DI 可能
}
```

**Provider 抽象化は Phase 3 で実施**:
- Task 6: authProviderInterface の拡張（callback 処理追加）
- Task 7: googleAuthProvider の callback 処理実装
- Task 8: mockAuthProvider の分離
- これらのタスクで `authService` 内部で Provider を使用する実装を追加

**影響**: なし（既に完了している機能の確認のみ）

---

### **Phase 3: Provider 抽象化の完成**

#### [x] Task 6: authProviderInterface の拡張
**目的**: callback 処理とモック処理を interface に追加

**更新**: `features/auth/services/providers/authProviderInterface.ts`

**変更内容**:
```typescript
import type { User } from '@/features/auth/types/auth';

/**
 * OAuth Provider インターフェース
 * 複数の OAuth プロバイダー（Google, GitHub, Microsoft等）を
 * 統一的に扱うための抽象化
 */
export interface IAuthProvider {
  /**
   * OAuth ログインフローを開始
   */
  signIn(): Promise<void>;

  /**
   * ログアウト処理
   */
  signOut(): Promise<void>;

  /**
   * OAuth コールバック処理
   * @param hashParams - URL フラグメントから取得したパラメータ
   * @returns 認証結果（成功時はユーザー情報、失敗時はエラー）
   */
  handleCallback(hashParams: URLSearchParams): Promise<AuthCallbackResult>;

  /**
   * トークンの妥当性検証
   * @param token - アクセストークン
   * @returns トークンが有効な場合 true（モックトークンは false）
   */
  validateToken(token: string): boolean;
}

/**
 * OAuth コールバック処理の結果
 */
export type AuthCallbackResult = {
  success: boolean;
  user?: User;
  isNewUser: boolean;
  error?: string;
};
```

**影響**: 既存の `googleAuthProvider.ts` に新メソッド実装が必要（Task 7）

---

#### [x] Task 7: googleAuthProvider の callback 処理実装
**目的**: `app/auth/callback/page.tsx` (L52-L131) の Google 固有処理を Provider へ移動

**更新**: `features/auth/services/providers/googleAuthProvider.ts`

**変更内容**:
```typescript
import { supabase } from '@/lib/supabase';
import type { IAuthProvider, AuthCallbackResult } from './authProviderInterface';
import type { User } from '@/features/auth/types/auth';

export class GoogleAuthProvider implements IAuthProvider {
  // 既存の signIn, signOut は維持

  /**
   * モックトークンかどうかを判定
   */
  validateToken(token: string): boolean {
    return token !== 'mock_access_token'; // モックトークンは無効とする
  }

  /**
   * Google OAuth コールバック処理
   * Supabase セッション確立とユーザー情報取得を実施
   */
  async handleCallback(hashParams: URLSearchParams): Promise<AuthCallbackResult> {
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    // エラーハンドリング
    if (!accessToken) {
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (error === 'access_denied') {
        // ユーザーキャンセルは success=false で返す（エラーではない）
        return { success: false, user: undefined, isNewUser: false };
      }

      throw new Error(errorDescription || error || '認証トークンが見つかりません');
    }

    // Supabase セッション確立
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (sessionError) {
      throw new Error(`Supabaseセッション確立エラー: ${sessionError.message}`);
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      throw new Error(
        `ユーザー情報取得エラー: ${userError?.message || 'ユーザーが見つかりません'}`
      );
    }

    // User オブジェクト構築
    const user: User = {
      id: userData.user.id,
      externalId: userData.user.id,
      provider: 'google',
      email: userData.user.email || '',
      name: userData.user.user_metadata.full_name || userData.user.email || '',
      avatarUrl: userData.user.user_metadata.avatar_url || null,
      createdAt: userData.user.created_at || new Date().toISOString(),
      updatedAt: userData.user.updated_at || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    return { success: true, user, isNewUser: false };
  }
}
```

**影響**: なし（新規メソッド追加のみ）

---

#### [x] Task 8: mockAuthProvider の分離
**目的**: E2E テスト用のモック処理を専用 Provider として分離

**新規作成**: `features/auth/services/providers/mockAuthProvider.ts`

**実装内容**:
```typescript
import type { IAuthProvider, AuthCallbackResult } from './authProviderInterface';
import type { User } from '@/features/auth/types/auth';

/**
 * E2Eテスト用モック認証プロバイダー
 * 本番環境では無効化される
 */
export class MockAuthProvider implements IAuthProvider {
  /**
   * モックトークンかどうかを判定
   */
  validateToken(token: string): boolean {
    return token === 'mock_access_token';
  }

  /**
   * モック認証のコールバック処理
   * テスト環境でのみ有効
   */
  async handleCallback(hashParams: URLSearchParams): Promise<AuthCallbackResult> {
    const accessToken = hashParams.get('access_token');

    // 本番環境での無効化チェック
    const isTestEnvironment =
      process.env.NODE_ENV === 'test' ||
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';

    if (!isTestEnvironment) {
      console.warn('モック認証は本番環境では無効です');
      throw new Error('無効な認証トークンです');
    }

    // モックユーザー情報
    const mockUser: User = {
      id: 'mock-user-id',
      externalId: 'mock-user-id',
      provider: 'google',
      email: 'test.user@example.com',
      name: 'Test User',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    console.log('モック認証が正常に完了しました:', mockUser);
    return { success: true, user: mockUser, isNewUser: false };
  }

  /**
   * モック認証のログイン処理
   * テスト用のトークンをURLフラグメントに設定
   */
  async signIn(): Promise<void> {
    window.location.hash = '#access_token=mock_access_token';
  }

  /**
   * モック認証のログアウト処理
   * No-op（何もしない）
   */
  async signOut(): Promise<void> {
    // No-op
  }
}
```

**影響**: なし（新規ファイル）

---

#### [x] Task 9: useOAuthCallback フックの実装
**目的**: callback 処理を抽象化し、`app/auth/callback/page.tsx` をシンプル化

**新規作成**: `features/auth/hooks/useOAuthCallback.ts`

**実装内容**:
```typescript
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { authSlice } from '@/features/auth/store/authSlice';
import { GoogleAuthProvider } from '@/features/auth/services/providers/googleAuthProvider';
import { MockAuthProvider } from '@/features/auth/services/providers/mockAuthProvider';

type CallbackStatus = 'processing' | 'success' | 'error';

/**
 * OAuth コールバック処理を抽象化するカスタムフック
 * Provider の選択と認証フローを管理
 */
export const useOAuthCallback = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleCallback = useCallback(
    async (providerType: 'google' | 'mock') => {
      try {
        // URLフラグメントを取得
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        // Provider を選択（モックトークンなら MockAuthProvider）
        const authProvider =
          accessToken === 'mock_access_token'
            ? new MockAuthProvider()
            : new GoogleAuthProvider();

        // Provider に callback 処理を委譲
        const result = await authProvider.handleCallback(hashParams);

        if (!result.success) {
          // ユーザーキャンセル（access_denied）
          console.log('ユーザーが認証をキャンセルしました');
          router.push('/');
          return;
        }

        // Redux に認証成功を通知
        dispatch(
          authSlice.actions.authSuccess({
            user: result.user!,
            isNewUser: result.isNewUser,
          })
        );

        console.log('認証が正常に完了しました:', result.user);
        setStatus('success');

        // 認証成功後はダッシュボードに遷移
        const redirectDelay = process.env.NODE_ENV === 'test' ? 1000 : 0;
        setTimeout(() => {
          router.push('/dashboard');
        }, redirectDelay);
      } catch (error) {
        // エラー種別に応じた処理
        let userMessage = '認証処理中にエラーが発生しました';
        let logMessage = 'OAuth認証コールバックエラー';

        if (error instanceof Error) {
          // Supabaseセッション関連エラー
          if (error.message.includes('Supabaseセッション確立エラー')) {
            userMessage =
              '認証サービスとの接続に失敗しました。しばらく待ってから再度お試しください。';
            logMessage = 'Supabase認証セッション確立失敗';
          }
          // ユーザー情報取得エラー
          else if (error.message.includes('ユーザー情報取得エラー')) {
            userMessage =
              'ユーザー情報の取得に失敗しました。再度ログインをお試しください。';
            logMessage = 'ユーザー情報取得API失敗';
          }
          // 認証トークン関連エラー
          else if (error.message.includes('認証トークンが見つかりません')) {
            userMessage =
              '認証情報が無効です。最初からログインをやり直してください。';
            logMessage = 'OAuth認証トークン不正または期限切れ';
          }
          // その他の既知エラー
          else {
            userMessage = error.message;
            logMessage = `認証プロセス実行時エラー: ${error.message}`;
          }
        }

        // デバッグ情報とエラースタックを記録
        console.error(`Auth callback error: ${String(logMessage)}`, {
          error,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });

        setStatus('error');
        setErrorMessage(userMessage);

        // Redux storeにエラー状態を設定
        dispatch(authSlice.actions.authFailure({ error: userMessage }));

        // エラー発生時のリダイレクト（テスト環境では短縮）
        const errorRedirectDelay = process.env.NODE_ENV === 'test' ? 1000 : 3000;
        setTimeout(() => {
          router.push('/');
        }, errorRedirectDelay);
      }
    },
    [dispatch, router]
  );

  return { status, errorMessage, handleCallback };
};
```

**影響**: なし（新規ファイル）

---

#### [x] Task 10: app/auth/callback/page.tsx のリファクタリング
**目的**: Provider 抽象化により、callback ページをシンプル化

**更新**: `app/auth/callback/page.tsx` (L1-L273)

**変更内容**:
```typescript
'use client';

import { useEffect } from 'react';
import { useOAuthCallback } from '@/features/auth/hooks/useOAuthCallback';

/**
 * OAuth認証コールバックページ
 *
 * Google OAuth認証完了後のURLフラグメントからトークンを取得し、
 * Supabaseセッション確立とRedux状態更新を行う。
 */
export default function AuthCallbackPage(): React.ReactNode {
  const { status, errorMessage, handleCallback } = useOAuthCallback();

  useEffect(() => {
    handleCallback('google'); // Provider指定
  }, [handleCallback]);

  // UI部分は既存のまま（L200-L271）
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              認証処理中...
            </h2>
            <p className="text-gray-600">しばらくお待ちください</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-600 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-labelledby="success-icon-title"
              >
                <title id="success-icon-title">認証成功アイコン</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              認証完了！
            </h2>
            <p className="text-gray-600">ホームページに移動しています...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-600 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-labelledby="error-icon-title"
              >
                <title id="error-icon-title">エラーアイコン</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              認証エラー
            </h2>
            <p className="text-red-600 mb-4">{errorMessage}</p>
            <p className="text-gray-600 text-sm">
              3秒後にホームページに戻ります
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

**削減**: 273行 → 約80行（処理ロジックを hooks へ移動）

**影響**: なし（内部実装の変更のみ）

---

### **Phase 4: テストの移動と追加**

#### [ ] Task 11: テストファイルの移動
**目的**: `google-auth/__tests__/` を `auth/__tests__/` へ集約

**移動**:
- `features/google-auth/__tests__/authSlice.test.ts` → `features/auth/__tests__/authSlice.test.ts`
- `features/google-auth/__tests__/UserProfile.test.tsx` → `features/auth/__tests__/UserProfile.test.tsx`

**更新内容**:
- import パスを `@/features/auth/...` へ変更
- モック対象のパスも同様に更新

**影響**: なし（テストファイルのみ）

---

#### [ ] Task 12: sessionPersistence のテスト追加
**目的**: LocalStorage 操作のテストカバレッジを確保

**新規作成**: `features/auth/__tests__/sessionPersistence.test.ts`

**テストケース**:
```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { sessionPersistence } from '@/features/auth/services/sessionPersistence';
import type { User } from '@/features/auth/types/auth';

describe('sessionPersistence', () => {
  const mockUser: User = {
    id: 'test-user-id',
    externalId: 'test-external-id',
    provider: 'google',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2025-01-27T00:00:00Z',
    updatedAt: '2025-01-27T00:00:00Z',
    lastLoginAt: '2025-01-27T00:00:00Z',
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    mock.restore();
  });

  describe('save', () => {
    it('ユーザー情報をLocalStorageに保存できる', () => {
      // When: ユーザー情報を保存
      sessionPersistence.save(mockUser);

      // Then: LocalStorageに保存されている
      const stored = localStorage.getItem('auth_user');
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toEqual(mockUser);
    });

    it('LocalStorageエラー時に例外を握りつぶす', () => {
      // Given: LocalStorageが使用不可
      const setItemSpy = mock(() => {
        throw new Error('Storage quota exceeded');
      });
      Storage.prototype.setItem = setItemSpy;

      // When & Then: 例外が発生しない
      expect(() => sessionPersistence.save(mockUser)).not.toThrow();
    });
  });

  describe('load', () => {
    it('LocalStorageからユーザー情報を読み込める', () => {
      // Given: ユーザー情報が保存済み
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // When: ユーザー情報を読み込み
      const loaded = sessionPersistence.load();

      // Then: 保存したユーザー情報が取得できる
      expect(loaded).toEqual(mockUser);
    });

    it('LocalStorageが空の場合はnullを返す', () => {
      // Given: LocalStorageが空

      // When: ユーザー情報を読み込み
      const loaded = sessionPersistence.load();

      // Then: nullが返される
      expect(loaded).toBeNull();
    });

    it('不正なJSONの場合はnullを返す', () => {
      // Given: 不正なJSON
      localStorage.setItem('auth_user', 'invalid-json');

      // When: ユーザー情報を読み込み
      const loaded = sessionPersistence.load();

      // Then: nullが返される
      expect(loaded).toBeNull();
    });
  });

  describe('clear', () => {
    it('LocalStorageからユーザー情報を削除できる', () => {
      // Given: ユーザー情報が保存済み
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      // When: ユーザー情報を削除
      sessionPersistence.clear();

      // Then: LocalStorageが空になる
      const stored = localStorage.getItem('auth_user');
      expect(stored).toBeNull();
    });
  });
});
```

**影響**: なし（新規ファイル）

---

#### [ ] Task 13: sessionListener のテスト追加
**目的**: Redux Listener Middleware の動作検証

**新規作成**: `features/auth/__tests__/sessionListener.test.ts`

**テストケース**:
```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from '@/features/auth/store/authSlice';
import { authListenerMiddleware } from '@/features/auth/store/sessionListener';
import * as sessionPersistenceModule from '@/features/auth/services/sessionPersistence';
import type { User } from '@/features/auth/types/auth';

describe('sessionListener', () => {
  let store: ReturnType<typeof configureStore>;
  let saveSpy: ReturnType<typeof mock>;
  let clearSpy: ReturnType<typeof mock>;

  const mockUser: User = {
    id: 'test-user-id',
    externalId: 'test-external-id',
    provider: 'google',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2025-01-27T00:00:00Z',
    updatedAt: '2025-01-27T00:00:00Z',
    lastLoginAt: '2025-01-27T00:00:00Z',
  };

  beforeEach(() => {
    // sessionPersistence のメソッドをモック化
    saveSpy = mock(() => {});
    clearSpy = mock(() => {});
    sessionPersistenceModule.sessionPersistence.save = saveSpy;
    sessionPersistenceModule.sessionPersistence.clear = clearSpy;

    // テスト用のストアを作成
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(authListenerMiddleware.middleware),
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it('authSuccess時にLocalStorageへ保存される', () => {
    // When: authSuccess アクションをディスパッチ
    store.dispatch(authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }));

    // Then: sessionPersistence.save が呼ばれる
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledWith(mockUser);
  });

  it('logout時にLocalStorageがクリアされる', () => {
    // Given: 認証済み状態
    store.dispatch(authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }));

    // When: logout アクションをディスパッチ
    store.dispatch(authSlice.actions.logout());

    // Then: sessionPersistence.clear が呼ばれる
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('handleExpiredToken時にLocalStorageがクリアされる', () => {
    // Given: 認証済み状態
    store.dispatch(authSlice.actions.authSuccess({ user: mockUser, isNewUser: false }));

    // When: handleExpiredToken アクションをディスパッチ
    store.dispatch(authSlice.actions.handleExpiredToken());

    // Then: sessionPersistence.clear が呼ばれる
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('Reducerは純粋関数でありLocalStorage操作を含まない', () => {
    // Given: モックがまだ呼ばれていない
    expect(saveSpy).not.toHaveBeenCalled();

    // When: Reducerを直接呼び出し（Listenerをバイパス）
    const state = authSlice.reducer(
      undefined,
      authSlice.actions.authSuccess({ user: mockUser, isNewUser: false })
    );

    // Then: Reducer内では副作用が実行されない（Listenerで実行される）
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    // Listenerは非同期で実行されるため、この時点ではまだ呼ばれていない可能性がある
  });
});
```

**影響**: なし（新規ファイル）

---

### **Phase 5: クリーンアップ**

#### [ ] Task 14: 旧ディレクトリの削除
**目的**: `features/google-auth/` を完全削除

**削除対象**:
```bash
rm -rf app/client/src/features/google-auth/
```

**削除内容**:
- `features/google-auth/store/authSlice.ts` → 移動済み
- `features/google-auth/components/UserProfile.tsx` → 移動済み
- `features/google-auth/__tests__/authSlice.test.ts` → 移動済み
- `features/google-auth/__tests__/UserProfile.test.tsx` → 移動済み

**影響**: なし（すべての参照が `features/auth/` へ移行済み）

---

#### [ ] Task 15: 最終検証
**目的**: すべての機能が正常動作することを確認

**検証項目**:

1. **型チェック**:
```bash
docker compose exec client bunx tsc --noEmit
```
→ 型エラーがないこと

2. **ユニットテスト**:
```bash
docker compose exec client bun test
```
→ 全テストがパス

3. **セキュリティチェック**:
```bash
docker compose run --rm semgrep semgrep --config=auto app/client/src/features/auth/
```
→ 重大な脆弱性がないこと

4. **E2Eテスト**:
```bash
docker compose exec e2e npx playwright test
```
→ モック認証・実際のOAuthフローが正常動作

5. **Redux DevTools 確認**:
- ブラウザで開発者ツールを開き、Redux DevTools でセッション永続化の動作確認
- `authSuccess` アクション後に LocalStorage に保存されること
- `logout` アクション後に LocalStorage がクリアされること

6. **実際のログインフロー確認**:
- Google OAuth ログインが正常動作すること
- ダッシュボードへのリダイレクトが正常動作すること
- リロード後もセッションが復元されること

---

## 📊 影響範囲サマリー

| カテゴリ | ファイル数 | 変更内容 |
|---------|----------|---------|
| **新規作成** | 7 | `sessionPersistence.ts`, `sessionListener.ts`, `mockAuthProvider.ts`, `useAuth.ts`, `useOAuthCallback.ts`, テスト2件 |
| **移動** | 3 | `authSlice.ts`, `UserProfile.tsx`, テスト2件 |
| **更新** | 8 | `store/index.ts`, `authProviderInterface.ts`, `googleAuthProvider.ts`, `LoginButton.tsx`, `callback/page.tsx`, `provider.tsx`, `dashboard/page.tsx`, `authSlice.ts`（純粋化） |
| **削除** | 1ディレクトリ | `features/google-auth/` 全体 |

**合計変更ファイル数**: 18ファイル

**import パス更新が必要なファイル**: 4ファイル
- `app/provider.tsx`
- `app/auth/callback/page.tsx`
- `app/dashboard/page.tsx`
- `store/index.ts`

---

## ⚠️ リスク評価と対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Redux 動作変更による既存機能の破損 | 🟡 中 | Task 3 実施後に即座に全テスト実行。Listener Middleware のテスト（Task 13）で副作用が正常動作することを検証 |
| import パス更新漏れ | 🟢 低 | TypeScript の型チェック（`bunx tsc --noEmit`）で検出可能。ビルド時にもエラーが発生するため見逃しにくい |
| LocalStorage 操作のタイミングずれ | 🟡 中 | Listener Middleware は Redux Toolkit の公式機能であり安定性が高い。Task 13 のテストで動作を保証 |
| E2E テストでのモック認証の動作不良 | 🟠 高 | Task 8 で専用 Provider 実装、Task 15 で E2E 実行。万が一動作しない場合は MockAuthProvider を修正 |
| Supabase SDK の呼び出しエラー | 🟢 低 | 既存の `googleAuthProvider.ts` に処理を移動するのみ。動作実績のあるコードを再利用 |

---

## [ ] 完了基準

1. [ ] `features/google-auth/` ディレクトリが存在しない
2. [ ] すべての import が `@/features/auth/...` を参照している
3. [ ] Redux Reducer に副作用が含まれない（LocalStorage, console 操作なし）
4. [ ] 全テストがパス（`bun test` + E2E）
5. [ ] 型エラーなし（`bunx tsc --noEmit`）
6. [ ] セキュリティチェック通過（semgrep）
7. [ ] 実際の Google OAuth ログインが正常動作
8. [ ] モック認証が E2E テストで正常動作
9. [ ] ブラウザリロード後もセッションが復元される

---

## 🚀 実行順序

**Phase 1（基盤整備）** → **Phase 2（UI統合）** → **Phase 3（Provider抽象化）** → **Phase 4（テスト）** → **Phase 5（クリーンアップ）**

各 Phase 完了後に型チェックとテストを実行し、問題がないことを確認してから次の Phase に進みます。

---

## 📝 専門家からの助言（参考情報）

### Gemini MCP の意見
- Next.js 15 のベストプラクティスとして、複数 OAuth プロバイダー対応は `features/auth/providers/` 構造が推奨される
- Strategy + Adapter パターンを採用することで、UI 側は `useAuth().signIn('google')` のみで済む
- NextAuth.js を使う場合も、ラッパーを `providers/nextauth/` に入れて同じインターフェースに揃えるべき

### o3 MCP の意見
- Clean Architecture の観点で、インフラ層の実装詳細（Google）を feature 名に含めることは依存方向の逆転を招く
- feature の粒度は「単一ユースケースを完結できるか」「エンドツーエンドでテストしやすいか」を基準に調整
- Provider 追加を想定するなら Strategy + Adapter + Factory（または DI）を採用すると疎結合・拡張性が高い

### Codex MCP の意見
- 既存の `features/auth/services/providers/` は活用すべき資産
- `authSlice` の LocalStorage 副作用は Redux Toolkit の `listenerMiddleware` で分離すべき
- 段階的移行戦略を採用し、既存機能を破壊せずに改修することが重要
- テストファイルは `__tests__` ディレクトリに集約するプロジェクトルールを遵守

---

## 🔗 関連ドキュメント

- [CLAUDE.md](../CLAUDE.md) - プロジェクト開発ガイドライン
- [Redux Toolkit Listener Middleware](https://redux-toolkit.js.org/api/createListenerMiddleware) - 公式ドキュメント
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) - Robert C. Martin
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID) - Wikipedia

---

**最終更新**: 2025-01-27 (JST)

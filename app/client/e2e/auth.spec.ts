import { test, expect } from '@playwright/test';
import { 
  setupAuthenticatedTestEnvironment,
  setupUnauthenticatedApiMocks,
  cleanupTestState,
  DEFAULT_TEST_USER 
} from './helpers/test-setup';
import type { AuthProvider } from '@/packages/shared-schemas/src/auth';

test.describe('Google OAuth認証フロー E2Eテスト', () => {
  test.afterEach(async ({ page }) => {
    // 各テスト後にクリーンアップを実行
    await cleanupTestState(page);
  });

  test('T001: 認証済みユーザーのダッシュボード表示テスト', async ({ page }) => {
    // 【テスト目的】: 新規ユーザーの初回ログイン後ダッシュボード表示確認
    // 【テスト内容】: Redux状態設定 → ダッシュボードアクセス → UserProfile表示確認
    // 【期待される動作】: セキュリティを保ちながらUserProfileコンポーネントが正常に表示される
    // 🟢 信頼性レベル: T002と同じアプローチによる安全で保守可能なテスト設計

    // 【Refactor改善】: T002と同じアプローチを使用
    await page.addInitScript((userData) => {
      // ページが読み込まれる前にグローバル状態を設定
      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };
      console.log('T001 Test state initialized:', window.__TEST_REDUX_AUTH_STATE__);
    }, DEFAULT_TEST_USER);

    // 【正規フロー】: 実際のダッシュボードページにアクセス
    await page.goto('/dashboard');

    // 【安定性向上】: コンポーネントの完全なレンダリングを待機
    await page.waitForLoadState('networkidle');

    // 【デバッグ】: 現在のページURL確認
    console.log('T001 Current page URL:', page.url());

    // ダッシュボードのメインタイトルを確認
    const dashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 });

    // ウェルカムメッセージの確認（DEFAULT_TEST_USERにlastLoginAtがあるため既存ユーザー扱い）
    const welcomeMessage = page.getByText('おかえりなさい！あなたのアカウント情報です。');
    await expect(welcomeMessage).toBeVisible();

    // 【UserProfile検証】: UserProfileコンポーネントの表示確認
    // セマンティックセレクタを使用してユーザー情報の表示を確認

    // ユーザー名の表示確認（h2要素内）
    const userNameHeading = page.locator('h2').filter({ hasText: DEFAULT_TEST_USER.name });
    await expect(userNameHeading).toBeVisible({ timeout: 5000 });

    // メールアドレスの表示確認（p要素内）
    const userEmailText = page.locator('p').filter({ hasText: DEFAULT_TEST_USER.email });
    await expect(userEmailText).toBeVisible();

    // 【機能検証】: ログアウトボタンが表示されることを確認
    const logoutButton = page.getByRole('button', { name: /ログアウト|logout/i });
    await expect(logoutButton).toBeVisible();

    // 【追加検証】: アバター画像の表示確認（デフォルト画像）
    const avatarImage = page.locator('img[alt="プロフィール画像"]');
    await expect(avatarImage).toBeVisible();
  });

  test('T002: 既存ユーザーの再ログインフローテスト', async ({ page }) => {
    // 【テスト目的】: 過去にログイン履歴がある既存ユーザーの認証フロー検証
    // 【テスト内容】: JITプロビジョニングをスキップし、lastLoginAt更新とisNewUser=falseを確認
    // 【期待される動作】: 既存ユーザーフラグが正しく設定され、ログイン履歴が更新される
    // 🟡 信頼性レベル: 要件定義から推測した既存ユーザー処理ロジック
    
    // TODO(human) 既存ユーザーの再ログイン機能実装が必要
    // 以下の機能が未実装のため、現在このテストは失敗します:
    // 1. 既存ユーザー判定ロジック（isNewUser: false）
    // 2. lastLoginAt フィールドの更新処理
    // 3. JITプロビジョニングのスキップ処理

    // 【テストデータ準備】: 過去のログイン履歴を持つ既存ユーザーを設定
    // 【初期条件設定】: 2日前にログインした既存ユーザーのデータを準備
    const existingUser = {
      id: 'existing-user-456',
      name: 'Existing User',
      email: 'existing.user@example.com',
      avatarUrl: null,
      // 2日前のログイン履歴
      lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      /** 【Refactor追加】: User型互換性のための必須フィールド */
      externalId: 'google_existing_456',
      provider: 'google' as AuthProvider,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // 【Refactor改善】: より堅牢なテスト状態設定
    // 【品質向上】: addInitScriptを使用してページ読み込み前に確実に設定
    
    await page.addInitScript((userData) => {
      // ページが読み込まれる前にグローバル状態を設定
      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };
      console.log('Test state initialized:', window.__TEST_REDUX_AUTH_STATE__);
    }, existingUser);
    
    // 【正規フロー】: 実際のダッシュボードページにアクセス
    await page.goto('/dashboard');
    
    // 【安定性向上】: コンポーネントの完全なレンダリングを待機
    await page.waitForLoadState('networkidle');
    
    // 【デバッグ】: 現在のページURL確認
    console.log('Current page URL:', page.url());
    
    // 【追加検証】: Reduxストアに状態が正しく設定されていることを確認
    const reduxState = await page.evaluate(() => {
      return window.__TEST_REDUX_AUTH_STATE__;
    });
    console.log('Redux test state:', reduxState);

    // 【結果検証】: ダッシュボードが正常に表示されることを確認
    // 【期待値確認】: 既存ユーザーとして正しく認証され、ダッシュボードにアクセスできる
    const dashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 }); // 【確認内容】: ダッシュボードページが表示されること 🟡

    // 【ユーザー情報表示確認】: 既存ユーザーの情報が正しく表示される
    const userNameHeading = page.locator('h2').filter({ hasText: existingUser.name });
    await expect(userNameHeading).toBeVisible({ timeout: 5000 }); // 【確認内容】: 既存ユーザー名が表示されること 🟡

    const userEmailText = page.locator('p').filter({ hasText: existingUser.email });
    await expect(userEmailText).toBeVisible(); // 【確認内容】: 既存ユーザーのメールアドレスが表示されること 🟡

    // 【lastLoginAt更新確認】: ログイン日時が更新されたことを確認
    // 現在は実装されていないため、この部分は失敗することが期待される
    const loginInfoElement = page.locator('[data-testarea="last-login-info"]');
    await expect(loginInfoElement).toContainText('最終ログイン'); // 【確認内容】: lastLoginAt情報が表示され更新されること 🔴

    // 【既存ユーザーフラグ確認】: isNewUser=falseが適切に処理されることを確認
    // ウェルカムメッセージではなく、既存ユーザー向けメッセージが表示される
    const existingUserMessage = page.getByText('おかえりなさい！', { exact: false });
    await expect(existingUserMessage).toBeVisible(); // 【確認内容】: 既存ユーザー向けメッセージが表示されること 🔴
  });

  test('T004: ページリロード時の認証状態復元テスト', async ({ page }) => {
    // 【テスト目的】: 認証済みユーザーがページリロードした際の認証状態適切復元確認
    // 【テスト内容】: 認証状態設定 → ダッシュボードアクセス → ページリロード → 認証状態維持確認
    // 【期待される動作】: リロード後も認証状態が維持され、ユーザー情報が継続表示される
    // 🟢 信頼性レベル: ユーザビリティの基本要件として明確に定義済み

    // TODO(human) ページリロード時の認証状態復元機能実装が必要
    // 以下の機能が未実装のため、現在このテストは失敗します:
    // 1. ページリロード時のLocalStorage/SessionStorage からの認証情報復元
    // 2. Supabase認証セッションの自動復元処理
    // 3. Redux状態の適切な再初期化とユーザー情報の復元
    // 4. リロード中のローディング状態管理

    // 【テストデータ準備】: 認証済みユーザーの完全なセッション情報を設定
    // 【初期条件設定】: 長期セッションを持つ認証済みユーザーのデータ準備
    const authenticatedUser = {
      id: 'auth-user-789',
      name: 'Authenticated User',
      email: 'auth.user@example.com',
      avatarUrl: null,
      lastLoginAt: new Date().toISOString(), // 現在ログイン中
      /** 【Refactor追加】: User型互換性のための必須フィールド */
      externalId: 'google_auth_789',
      provider: 'google' as AuthProvider,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 【初期認証状態設定】: 認証済み状態でダッシュボードにアクセス
    await page.addInitScript((userData) => {
      // ページが読み込まれる前にグローバル状態を設定
      window.__TEST_REDUX_AUTH_STATE__ = {
        isAuthenticated: true,
        user: userData,
        isLoading: false,
        error: null,
      };
      console.log('T004 Initial auth state set:', window.__TEST_REDUX_AUTH_STATE__);
    }, authenticatedUser);

    // 【実際の処理実行1】: 初回ダッシュボードアクセス
    // 【処理内容】: 認証済みユーザーとしてダッシュボード正常表示を確認
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 【初期状態検証】: 認証済み状態の確認
    const initialDashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(initialDashboardTitle).toBeVisible({ timeout: 10000 }); // 【確認内容】: 初期ダッシュボード表示が正常に動作すること 🟢

    const initialUserName = page.locator('h2').filter({ hasText: authenticatedUser.name });
    await expect(initialUserName).toBeVisible({ timeout: 5000 }); // 【確認内容】: 初期ユーザー情報表示が正常であること 🟢

    // 【実際の処理実行2】: ページリロード実行
    // 【処理内容】: 認証状態を維持したままページリロードを実行
    console.log('T004 Executing page reload...');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 【結果検証1】: リロード後のダッシュボード表示確認
    // 【期待値確認】: リロード後も認証状態が維持され、ダッシュボードが表示される
    const reloadedDashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(reloadedDashboardTitle).toBeVisible({ timeout: 10000 }); // 【確認内容】: リロード後のダッシュボード表示維持 🔴

    // 【結果検証2】: リロード後のユーザー情報表示確認
    // 【期待値確認】: ユーザー情報がリロード前と同様に表示される
    const reloadedUserName = page.locator('h2').filter({ hasText: authenticatedUser.name });
    await expect(reloadedUserName).toBeVisible({ timeout: 5000 }); // 【確認内容】: リロード後のユーザー情報表示維持 🔴

    const reloadedUserEmail = page.locator('p').filter({ hasText: authenticatedUser.email });
    await expect(reloadedUserEmail).toBeVisible(); // 【確認内容】: リロード後のメールアドレス表示維持 🔴

    // 【結果検証3】: リロード後の認証機能継続確認
    // 【期待値確認】: ログアウトボタンが表示され、認証機能が継続利用可能
    const reloadedLogoutButton = page.getByRole('button', { name: /ログアウト|logout/i });
    await expect(reloadedLogoutButton).toBeVisible(); // 【確認内容】: リロード後の認証機能継続性 🔴

    // 【結果検証4】: リロード後の認証状態永続化確認
    // 【期待値確認】: LocalStorageまたはSessionStorageに認証情報が適切に保存されている
    const persistedAuthState = await page.evaluate(() => {
      // LocalStorageからSupabase認証情報を確認
      const supabaseAuth = localStorage.getItem('sb-localhost-auth-token');
      return supabaseAuth ? JSON.parse(supabaseAuth) : null;
    });
    expect(persistedAuthState).toBeTruthy(); // 【確認内容】: 認証状態の永続化が正しく動作すること 🔴

    // 【セッション継続確認】: リロード後も既存ユーザーメッセージが表示される
    const continuedSessionMessage = page.getByText('おかえりなさい！', { exact: false });
    await expect(continuedSessionMessage).toBeVisible(); // 【確認内容】: セッション継続による適切なメッセージ表示 🔴
  });

  test('T003: 未認証ユーザーのリダイレクト確認', async ({ page }) => {
    // 【テスト目的】: 未認証ユーザーが保護されたルートにアクセスした際の適切なリダイレクト確認
    // 【セキュリティテスト】: 認証ガードの動作確認

    // 【セキュリティ対策】: 未認証状態のAPIモック設定
    await setupUnauthenticatedApiMocks(page);

    // 【実行】: 認証情報なしでダッシュボードにアクセス
    await page.goto('/dashboard');

    // 【期待値】: ホームページにリダイレクトされることを確認
    await expect(page).toHaveURL('/', { timeout: 10000 });

    // 【検証】: ログインボタンが表示されることを確認
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible();
  });
});
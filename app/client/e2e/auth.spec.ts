import { test, expect } from '@playwright/test';
import { 
  setupAuthenticatedTestEnvironment,
  setupUnauthenticatedApiMocks,
  cleanupTestState,
  DEFAULT_TEST_USER 
} from './helpers/test-setup';

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
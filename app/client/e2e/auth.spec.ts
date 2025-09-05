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
    // 【テスト目的】: APIモックを使用した安全なユーザー認証後のダッシュボード表示確認
    // 【テスト内容】: APIレスポンスモック → ダッシュボードアクセス → UserProfile表示確認
    // 【期待される動作】: セキュリティを保ちながらUserProfileコンポーネントが正常に表示される
    // 🟢 信頼性レベル: APIモックによる安全で保守可能なテスト設計

    // 【セキュリティ対策】: 安全なテスト環境セットアップ
    await setupAuthenticatedTestEnvironment(page, DEFAULT_TEST_USER);

    // 【基本検証】: ログインボタンが表示されることを確認（セットアップ時に既にトップページを表示）
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible();

    // 【認証後処理】: ダッシュボードページにアクセス
    await page.goto('/dashboard');

    // 【結果検証】: ダッシュボードページが正常に表示されることを確認
    await page.waitForLoadState('networkidle');

    // ダッシュボードのメインタイトルを確認
    const dashboardTitle = page.getByRole('heading', { name: 'ダッシュボード' });
    await expect(dashboardTitle).toBeVisible({ timeout: 10000 });

    // ウェルカムメッセージの確認
    const welcomeMessage = page.getByText('ようこそ！あなたのアカウント情報です。');
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

  test('T002: 未認証ユーザーのリダイレクト確認', async ({ page }) => {
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
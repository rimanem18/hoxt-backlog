import { test, expect } from '@playwright/test';

test.describe('Google OAuth認証フロー E2Eテスト', () => {
  test('T001: Google OAuth初回ログイン成功フロー', async ({ page }) => {
    // 【テスト目的】: 初回ユーザーがGoogle OAuthでログインし、認証フローが正常に動作することを確認
    // 【テスト内容】: ログインボタンクリック → 認証コールバック処理 → ダッシュボード表示
    // 【期待される動作】: 認証成功後にダッシュボードに遷移し、ユーザー情報が表示される
    // 🟡 信頼性レベル: 実際の認証フローに基づく現実的なテスト設計

    // 【テストデータ準備】: モック認証用のユーザー情報
    // 【初期条件設定】: 未認証状態でアプリケーションのトップページにアクセス
    const testUser = {
      email: 'test.user@example.com',
      name: 'Test User',
      id: 'mock-user-id',
    };

    // 【実際の処理実行】: トップページへアクセスし、ログインボタンの存在確認
    // 【処理内容】: Next.jsアプリケーションのルートページに遷移
    await page.goto('/');

    // 【結果検証】: ログインボタンが表示されることを確認
    // 【期待値確認】: 未認証ユーザーには認証用のUIが表示される
    const loginButton = page.getByRole('button', { name: /ログイン|login/i }); // 【確認内容】: ログインボタンの存在確認 🟢
    await expect(loginButton).toBeVisible();

    // 【テスト戦略変更】: 実際のOAuth認証の代わりに、認証成功状態を直接設定
    // 【実装方針】: E2Eテストでは外部API依存を避け、アプリケーション内部のフローをテスト
    await page.evaluate((user) => {
      // 【モック認証実行】: Redux storeに認証成功状態を直接設定
      // 【処理内容】: 実際の認証処理と同等の状態をブラウザ内で作成
      window.dispatchEvent(new CustomEvent('mock-auth-success', {
        detail: { user }
      }));
    }, testUser);

    // 【認証成功後の処理シミュレート】: 認証コールバック処理を模擬
    // 【処理内容】: 実際のOAuth認証フローでcallbackページに遷移する流れを再現
    await page.goto('/auth/callback#access_token=mock_access_token&refresh_token=mock_refresh_token');

    // 【結果検証】: 認証コールバック処理が正常に完了することを確認
    // 【期待値確認】: 認証成功後にダッシュボードページに遷移する
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 }); // 【確認内容】: ダッシュボード画面への遷移確認 🟡

    // 【結果検証】: ユーザープロフィール情報が正しく表示されることを確認
    // 【期待値確認】: 認証されたユーザーの情報が画面に反映される
    const userNameElement = page.getByTestId('user-name'); // 【確認内容】: ユーザー名の表示確認 🟡
    await expect(userNameElement).toBeVisible();

    const userEmailElement = page.getByTestId('user-email'); // 【確認内容】: ユーザーメールアドレスの表示確認 🟡
    await expect(userEmailElement).toBeVisible();

    // 【結果検証】: ログアウトボタンが表示されることを確認
    // 【期待値確認】: 認証済みユーザーにはログアウト機能が提供される
    const logoutButton = page.getByRole('button', { name: /ログアウト|logout/i }); // 【確認内容】: ログアウトボタンの表示確認 🟢
    await expect(logoutButton).toBeVisible();
  });
});

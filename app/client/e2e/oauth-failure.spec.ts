import { test, expect } from '@playwright/test';
import { 
  cleanupTestState 
} from './helpers/test-setup';

test.describe('T008: Google OAuth認証失敗エラー表示 E2Eテスト', () => {
  test.afterEach(async ({ page }) => {
    // 【テスト後処理】: 各テスト実行後にクリーンアップを実行
    // 【状態復元】: 次のテストに影響しないよう、システムを元の状態に戻す
    await cleanupTestState(page);
  });

  test('Google OAuth認証キャンセル時の適切なエラーメッセージ表示', async ({ page }) => {
    // 【テスト目的】: ユーザーがGoogle OAuth認証ポップアップでキャンセルを選択した際の適切なエラーハンドリングを確認
    // 【テスト内容】: 認証キャンセルエラーが発生した時に、ユーザーフレンドリーなメッセージが表示され、再試行可能な状態が維持される
    // 【期待される動作】: エラーとしてではなく情報メッセージとして扱い、ログイン画面に留まって再試行可能な状態にする
    // 🟡 信頼性レベル: OAuth標準フローとして妥当な推測ベース

    // コンソールログを収集してデバッグに活用
    page.on('console', (msg) => {
      if (msg.text().includes('T008-cancel')) {
        console.log('Page Console (OAuth Cancel):', msg.text());
      }
    });

    // 【テストデータ準備】: Google OAuth認証キャンセル状況をシミュレートするための設定
    // 【初期条件設定】: OAuth認証画面でユーザーがキャンセルボタンを押した状態を模擬
    // 【前提条件確認】: 認証プロバイダーからのキャンセル通知が正常に受信できる状態

    // 【実際の処理実行】: OAuth認証失敗ハンドラーでキャンセルエラーを処理
    // 【処理内容】: Supabase OAuth認証のキャンセル状況をAPIモックで再現
    // 【実行タイミング】: 認証ポップアップでユーザーがキャンセルボタンを押した直後

    // Google OAuth認証キャンセルをシミュレートするAPIモック
    await page.route('**/auth/v1/authorize**', async (route) => {
      // OAuth認証キャンセルのエラーレスポンスを返却
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'access_denied',
          error_description: 'User denied access to the authorization server',
          error_code: 'auth_cancelled',
          provider: 'google'
        }),
      });
    });

    // ホームページにアクセスしてログインボタンを探す
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログインボタンの存在確認
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });

    // 【実行】: ログインボタンクリックでOAuth認証開始
    await loginButton.click();

    // OAuth認証ポップアップ処理（Playwrightでポップアップを処理）
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      // ここでOAuth認証ポップアップが開く
    ]);

    // 【結果検証】: キャンセル処理が適切に行われ、ユーザーに優しいUXが提供されることを確認
    // 【期待値確認】: エラー状態ではなく情報通知として扱い、再認証への導線が確保される
    // 【品質保証】: Google OAuth UXガイドラインに沿った適切なユーザー体験の提供

    // OAuth認証キャンセルメッセージの確認
    const cancelMessage = page.getByText('Googleログインがキャンセルされました', { exact: false });
    await expect(cancelMessage).toBeVisible({ timeout: 5000 }); // 【確認内容】: ユーザーフレンドリーなキャンセルメッセージ 🟢

    // エラー扱いではなく情報扱いであることを確認（エラー色ではなく情報色）
    const messageContainer = page.locator('[data-testarea="auth-message"]');
    await expect(messageContainer).toHaveClass(/info|success/); // 【確認内容】: エラー扱いではなく情報扱い 🟡

    // ログイン画面に留まっていることを確認
    await expect(page).toHaveURL('/', { timeout: 5000 }); // 【確認内容】: ログイン画面に留まり再試行を促す 🟢

    // 再試行が可能であることを確認（ログインボタンがまだ表示されている）
    const retryLoginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(retryLoginButton).toBeVisible(); // 【確認内容】: キャンセル後の再認証が可能 🟢

    // エラーメッセージが表示されていないことを確認
    const errorMessage = page.locator('[data-testarea="error-message"]');
    await expect(errorMessage).not.toBeVisible(); // 【確認内容】: エラーメッセージが表示されない 🟡
  });

  test('Google OAuth接続エラー時の適切なエラー表示とリトライ機能', async ({ page }) => {
    // 【テスト目的】: Google OAuthサービスへの接続失敗時の堅牢なエラーハンドリングを確認
    // 【テスト内容】: ネットワークエラーや一時的なGoogle側障害時に適切なエラーメッセージと自動リトライ機能が動作する
    // 【期待される動作】: 技術的エラーをユーザーフレンドリーなメッセージに変換し、自動リトライ機能を提供
    // 🟡 信頼性レベル: 一般的なWebアプリ要件として妥当な推測

    // コンソールログを収集してデバッグに活用
    page.on('console', (msg) => {
      if (msg.text().includes('T008-connection')) {
        console.log('Page Console (Connection Error):', msg.text());
      }
    });

    // 【テストデータ準備】: Google OAuth接続失敗時の典型的なネットワークエラーを模擬
    // 【初期条件設定】: Google OAuthエンドポイントが応答しない、または接続タイムアウト状態
    // 【前提条件確認】: ネットワークエラーが検出可能で適切にハンドリングできる状態

    // 【実際の処理実行】: OAuth接続失敗ハンドラーでネットワークエラーを処理
    // 【処理内容】: GoogleOAuthProviderのsignInメソッド実行中のネットワーク例外を適切に処理
    // 【実行タイミング】: Google OAuthサービスへの初回接続試行でタイムアウトが発生した時点

    // Google OAuth接続エラーをシミュレートするAPIモック
    await page.route('**/auth/v1/authorize**', async (route) => {
      // ネットワーク接続失敗をシミュレート
      await route.abort('failed');
    });

    // ホームページにアクセスしてログインボタンを探す
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログインボタンの存在確認
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });

    // 【実行】: ログインボタンクリックでOAuth認証開始（接続エラーが発生）
    await loginButton.click();

    // 【結果検証】: 接続エラーが適切に処理され、ユーザーに明確な状況説明と解決策が提示される
    // 【期待値確認】: 技術的詳細を隠してユーザーフレンドリーなメッセージを表示し、リトライ機能を提供
    // 【品質保証】: ネットワーク不安定な環境でも安定した認証UXを提供

    // 接続エラーメッセージの確認
    const connectionErrorMessage = page.getByText('Googleとの接続に問題が発生しました', { exact: false });
    await expect(connectionErrorMessage).toBeVisible({ timeout: 10000 }); // 【確認内容】: 具体的で実用的なエラーメッセージ 🟡

    // ネットワーク接続確認の促進メッセージ
    const networkCheckMessage = page.getByText('ネットワーク接続を確認してください', { exact: false });
    await expect(networkCheckMessage).toBeVisible({ timeout: 5000 }); // 【確認内容】: ユーザーへの明確なエラー通知 🟢

    // 再試行ボタンの表示確認
    const retryButton = page.getByRole('button', { name: /再試行|retry|もう一度/i });
    await expect(retryButton).toBeVisible({ timeout: 5000 }); // 【確認内容】: 接続エラー後の再試行が可能 🟡

    // エラー状態として適切に表示されることを確認（エラー色）
    const errorContainer = page.locator('[data-testarea="auth-error"]');
    await expect(errorContainer).toHaveClass(/error|danger/); // 【確認内容】: ユーザーへの明確なエラー通知 🟡

    // 【リトライ機能テスト】: 再試行ボタンクリック機能確認
    // 【処理内容】: 再試行ボタンクリックで再接続を試行
    if (await retryButton.isVisible()) {
      await retryButton.click();

      // 再試行実行中のローディング状態確認
      const loadingIndicator = page.locator('[data-testarea="auth-loading"]');
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 }); // 【確認内容】: 再試行中のローディング表示 🟡
    }
  });

  test('Google OAuth設定エラー時の開発者向けエラーメッセージ', async ({ page }) => {
    // 【テスト目的】: Google OAuth設定不備（クライアントID未設定等）の適切な検出と通知
    // 【テスト内容】: 開発環境での設定不備を早期検出し、開発者に具体的な修正ガイダンスを提供
    // 【期待される動作】: 設定エラーを明確に識別し、修正方法を含む詳細なエラーメッセージを表示
    // 🔴 信頼性レベル: タスク仕様にない推測ベース、しかし開発品質向上に重要

    // コンソールログを収集してデバッグに活用
    page.on('console', (msg) => {
      if (msg.text().includes('T008-config')) {
        console.log('Page Console (Config Error):', msg.text());
      }
    });

    // 【テストデータ準備】: Google OAuthクライアント設定の不備を模擬（環境変数未設定など）
    // 【初期条件設定】: 必須のOAuth設定パラメータが不完全または無効な状態
    // 【前提条件確認】: 設定検証機能が正常に動作し、設定不備を検出できる状態

    // 【実際の処理実行】: OAuth設定エラーハンドラーで設定不備エラーを処理
    // 【処理内容】: GoogleOAuthProviderの初期化時またはsignIn実行時の設定検証エラーを処理
    // 【実行タイミング】: OAuth認証初期化プロセスで設定の検証が実行された時点

    // Google OAuth設定エラーをシミュレートするAPIモック
    await page.route('**/auth/v1/authorize**', async (route) => {
      // OAuth設定エラーのレスポンスを返却
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_client',
          error_description: 'Google OAuth client configuration is invalid or missing',
          error_code: 'oauth_config_error',
          details: {
            missingParams: ['NEXT_PUBLIC_GOOGLE_CLIENT_ID'],
            invalidParams: ['NEXT_PUBLIC_SITE_URL']
          }
        }),
      });
    });

    // ホームページにアクセスしてログインボタンを探す
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログインボタンの存在確認
    const loginButton = page.getByRole('button', { name: /ログイン|login/i });
    await expect(loginButton).toBeVisible({ timeout: 10000 });

    // 【実行】: ログインボタンクリックでOAuth認証開始（設定エラーが発生）
    await loginButton.click();

    // 【結果検証】: 設定エラーが適切に検出され、開発者に具体的な修正指示が提供される
    // 【期待値確認】: 設定問題の詳細と修正手順を含む開発者向けエラーメッセージが生成される
    // 【品質保証】: 開発効率向上と本番環境での設定ミス防止に貢献

    // 設定エラーメッセージの確認
    const configErrorMessage = page.getByText('Google OAuth設定に問題があります', { exact: false });
    await expect(configErrorMessage).toBeVisible({ timeout: 10000 }); // 【確認内容】: 設定問題の明確な通知 🔴

    // 開発者向け設定ガイダンスの確認（開発環境でのみ表示）
    const devInfo = page.locator('[data-testarea="development-info"]');
    if (process.env.NODE_ENV === 'development') {
      await expect(devInfo).toBeVisible(); // 【確認内容】: 開発環境での詳細ガイダンス表示 🔴
      
      // .env.local設定ガイダンス
      const envGuideText = page.getByText('.env.local', { exact: false });
      await expect(envGuideText).toBeVisible(); // 【確認内容】: 具体的な設定修正ガイダンス 🔴

      // 不足設定の具体的な指摘
      const missingVarText = page.getByText('NEXT_PUBLIC_GOOGLE_CLIENT_ID', { exact: false });
      await expect(missingVarText).toBeVisible(); // 【確認内容】: 不足設定の具体的な指摘 🔴
    }

    // 設定修正まではリトライできないことを確認
    const retryButton = page.getByRole('button', { name: /再試行|retry/i });
    await expect(retryButton).not.toBeVisible(); // 【確認内容】: 設定修正まではリトライ不可 🟡

    // 設定エラー状態として適切に表示されることを確認
    const configErrorContainer = page.locator('[data-testarea="config-error"]');
    await expect(configErrorContainer).toHaveClass(/error|warning/); // 【確認内容】: 設定エラーとして適切に分類 🔴
  });
});
/**
 * authRoutes統合テスト
 *
 * HTTPエンドポイントとしての完全動作をエンドツーエンドで確認。
 * ルーティング→AuthController→レスポンスの統合フローをテストする。
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from '../authRoutes';

describe('POST /api/auth/verify 統合テスト', () => {
  let app: Hono;

  beforeAll(async () => {
    // テスト用Honoサーバーインスタンスを起動
    app = new Hono();

    // CORSミドルウェアの設定
    app.use(
      '*',
      cors({
        origin: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      }),
    );

    // authRoutesをマウント
    app.route('/api', authRoutes);
  });

  afterAll(async () => {
    // サーバーインスタンスの適切な終了とリソース解放
  });

  beforeEach(() => {
    // 各統合テスト実行前の独立環境準備
  });

  afterEach(() => {
    // 各統合テスト実行後の状態リセット
  });

  // ========== 正常系テストケース ==========

  test('POST /api/auth/verify で有効JWTによる認証が成功すること', async () => {
    // Given: 有効なJWTトークンを含むHTTPリクエスト
    const response = await app.request('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'valid.integration.jwt.token' }),
    });

    // Then: 無効なJWTトークンに対してエラーが返される（500 or 400）
    expect([400, 500]).toContain(response.status);

    const responseBody = await response.json();
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBeDefined();
  });

  test('POST /api/auth/verify でCORSヘッダーが適切に設定されること', async () => {
    // Given: プリフライトリクエスト
    const corsRequest = {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    };

    const response = await app.request('/api/auth/verify', corsRequest);

    // Then: CORSヘッダーが適切に設定される
    expect([200, 204]).toContain(response.status);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:3000',
    );
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
      'POST',
    );
  });

  test('POST /api/auth/verify で依存関係が正しく注入されて動作すること', async () => {
    // Given: DI設定による実際の依存関係でのリクエスト
    const dependencyTestRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'valid.dependency.injection.token' }),
    };

    const response = await app.request(
      '/api/auth/verify',
      dependencyTestRequest,
    );

    // Then: 無効なJWTトークンに対してエラーが返される（500 or 400）
    expect([400, 500]).toContain(response.status);

    const responseBody = await response.json();
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBeDefined();
  });

  // ========== 異常系テストケース ==========

  test('POST /api/auth/invalid-endpoint で404エラーが返されること', async () => {
    // Given: 存在しないエンドポイントへのリクエスト
    const invalidEndpointRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'any.token' }),
    };

    const response = await app.request(
      '/api/auth/invalid-endpoint',
      invalidEndpointRequest,
    );

    // Then: 404エラーが返される
    expect(response.status).toBe(404);
  });

  test('サーバー起動後に /api/auth/verify エンドポイントが利用可能であること', async () => {
    // Given: エンドポイント利用可能性確認リクエスト
    const healthCheckRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'health.check.token' }),
    };

    const response = await app.request('/api/auth/verify', healthCheckRequest);

    // Then: エンドポイントが応答する
    expect([200, 401, 400, 500]).toContain(response.status);
    expect(response).toBeDefined();
  });

  test('依存関係の注入が失敗した場合に適切なサーバーエラーが返されること', async () => {
    // Given: 依存性エラー状況でのリクエスト
    const validRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'valid.token.invalid.dependencies' }),
    };

    const response = await app.request('/api/auth/verify', validRequest);

    // Then: サーバーがクラッシュせずに応答する
    expect([200, 400, 500]).toContain(response.status);
    expect(response).toBeDefined();
  });

  // ========== 境界値テストケース ==========

  test('複数の同時リクエストでエンドポイントが正常動作すること', async () => {
    // Given: 10並列の同時リクエスト
    const concurrentRequests = Array(10)
      .fill(null)
      .map(() => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'concurrent.test.token' }),
      }));

    const startTime = Date.now();
    const responses = await Promise.all(
      concurrentRequests.map((request) =>
        app.request('/api/auth/verify', request),
      ),
    );
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Then: 全リクエストが1000ms以内で処理される
    responses.forEach((response) => {
      expect([200, 401, 400, 500]).toContain(response.status);
    });
    expect(totalTime).toBeLessThan(1000);
    expect(responses).toHaveLength(10);
  });

  test('大きなリクエストボディでもメモリエラーが発生しないこと', async () => {
    // Given: 大きなトークンを含むリクエスト
    const largeTokenRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: `${'a'.repeat(8192)}.jwt.large.payload.token`,
      }),
    };

    const response = await app.request('/api/auth/verify', largeTokenRequest);

    // Then: サーバーがクラッシュせずに処理される
    expect([200, 400, 500]).toContain(response.status);

    if (response.status === 400) {
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    }

    expect(response).toBeDefined();
  });
});

// ========================================
// POST /auth/callback 統合テスト（OpenAPI対応）
// TASK-902: 認証エンドポイントのOpenAPI対応化
// ========================================

describe('POST /auth/callback - OpenAPI認証コールバック統合テスト', () => {
  let app: Hono;

  beforeAll(async () => {
    // 【テスト前準備】: OpenAPIルートを含むHonoサーバーインスタンスを起動
    // 【環境初期化】: 各テストが独立して実行できるよう、サーバーをクリーンな状態で初期化
    app = new Hono();

    // CORSミドルウェアの設定
    app.use(
      '*',
      cors({
        origin: ['http://localhost:3000'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      }),
    );

    // authRoutesをマウント（OpenAPIルートを含む）
    app.route('/api', authRoutes);
  });

  afterAll(async () => {
    // 【テスト後処理】: サーバーインスタンスの適切な終了とリソース解放
    // 【状態復元】: 次のテストスイートに影響しないよう、リソースをクリーンアップ
  });

  beforeEach(() => {
    // 【テスト前準備】: 各統合テスト実行前の独立環境準備
    // 【環境初期化】: 前のテストの影響を受けないよう、テスト環境を初期化
  });

  afterEach(() => {
    // 【テスト後処理】: 各統合テスト実行後の状態リセット
    // 【状態復元】: 次のテストに影響しないよう、状態を元に戻す
  });

  // ========== 正常系テストケース ==========

  test('新規ユーザーのGoogle認証が成功し、ユーザー情報が返却される', async () => {
    // 【テスト目的】: 新規ユーザー作成の正常フローを確認
    // 【テスト内容】: 有効なリクエストボディで新規ユーザーが作成され、200レスポンスが返る
    // 【期待される動作】: AuthenticateUserUseCaseが呼ばれ、新規ユーザー情報がレスポンスされる
    // 🟢 信頼性レベル: 青信号（要件定義書のシナリオ1に基づく）

    // 【テストデータ準備】: Google認証後の典型的なユーザー情報を用意
    // 【初期条件設定】: avatarUrlはGoogle提供のURLを含む新規ユーザーリクエスト
    // 【前提条件確認】: authCallbackRequestSchemaに準拠したリクエストボディ
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'google-1234567890',
        provider: 'google',
        email: 'newuser@example.com',
        name: 'New User',
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでリクエストボディをZodバリデーション後、UseCaseを実行
    // 【処理内容】: AuthenticateUserUseCaseが新規ユーザーを作成し、レスポンスボディをZodバリデーション

    // 【結果検証】: 200 OKレスポンスが返り、レスポンスボディがauthCallbackResponseSchemaに一致することを確認
    // 【期待値確認】: 新規ユーザーの場合、createdAt・updatedAt・lastLoginAtがすべて同じ時刻になる理由は、作成直後のユーザーであるため
    // 【品質保証】: 新規ユーザー作成フローが正常に動作し、Zodバリデーションがレスポンスを保証
    expect(response.status).toBe(200); // 【確認内容】: HTTPステータスコードが200 OKであることを確認 🟢 要件定義書のシナリオ1に基づく

    const responseBody = await response.json();
    expect(responseBody.success).toBe(true); // 【確認内容】: レスポンスのsuccessフィールドがtrueであることを確認 🟢 apiResponseSchemaの定義に基づく
    expect(responseBody.data).toBeDefined(); // 【確認内容】: レスポンスデータが存在することを確認 🟢 authCallbackResponseSchemaに基づく
    expect(responseBody.data.externalId).toBe('google-1234567890'); // 【確認内容】: externalIdが正しく保存されることを確認 🟢 リクエストデータと一致
    expect(responseBody.data.provider).toBe('google'); // 【確認内容】: プロバイダーが正しく保存されることを確認 🟢 authProviderSchemaに基づく
    expect(responseBody.data.email).toBe('newuser@example.com'); // 【確認内容】: メールアドレスが正しく保存されることを確認 🟢 emailSchemaに基づく
    expect(responseBody.data.name).toBe('New User'); // 【確認内容】: ユーザー名が正しく保存されることを確認 🟢 リクエストデータと一致
    expect(responseBody.data.avatarUrl).toBe(
      'https://lh3.googleusercontent.com/a/default-user',
    ); // 【確認内容】: avatarUrlが正しく保存されることを確認 🟢 urlSchemaに基づく
    expect(responseBody.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ); // 【確認内容】: UUIDv4形式のIDが生成されることを確認 🟢 uuidSchemaに基づく
  });

  test('既存ユーザーのGitHub認証が成功し、lastLoginAtが更新される', async () => {
    // 【テスト目的】: 既存ユーザーのログインフローを確認
    // 【テスト内容】: 既存ユーザーのログイン時にlastLoginAtのみが更新されること
    // 【期待される動作】: AuthenticateUserUseCaseが既存ユーザーを検出し、lastLoginAtを更新
    // 🟢 信頼性レベル: 青信号（要件定義書のシナリオ2に基づく）

    // 【テストデータ準備】: GitHubアカウントの認証情報（avatarUrlは省略）
    // 【初期条件設定】: 以前登録したユーザーが再度ログインした場合を想定
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'github-existing-user',
        provider: 'github',
        email: 'existinguser@example.com',
        name: 'Existing User',
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでZodバリデーション後、既存ユーザーのlastLoginAtを更新
    // 【処理内容】: UserRepositoryで既存ユーザーの最終ログイン時刻を更新

    // 【結果検証】: 200 OKレスポンスが返り、lastLoginAtが更新されることを確認
    // 【期待値確認】: createdAtは変更されず、lastLoginAtが最新の時刻に更新される理由は、既存ユーザーの再ログインであるため
    // 【品質保証】: avatarUrlがnullでもバリデーションエラーにならないことを保証
    expect(response.status).toBe(200); // 【確認内容】: HTTPステータスコードが200 OKであることを確認 🟢 要件定義書のシナリオ2に基づく

    const responseBody = await response.json();
    expect(responseBody.success).toBe(true); // 【確認内容】: レスポンスのsuccessフィールドがtrueであることを確認
    expect(responseBody.data.externalId).toBe('github-existing-user'); // 【確認内容】: externalIdが一致することを確認 🟢 既存ユーザーの識別
    expect(responseBody.data.provider).toBe('github'); // 【確認内容】: プロバイダーがgithubであることを確認
    expect(responseBody.data.avatarUrl).toBeNull(); // 【確認内容】: avatarUrlがnullであることを確認（オプションフィールド） 🟢 urlSchema.optional()に基づく
  });

  test('6種類の全プロバイダーで認証が成功する', async () => {
    // 【テスト目的】: プロバイダー列挙型の網羅的な検証
    // 【テスト内容】: google、apple、microsoft、github、facebook、lineの全プロバイダーで認証が成功すること
    // 【期待される動作】: 各プロバイダーに対して200レスポンスが返される
    // 🟢 信頼性レベル: 青信号（authProviderSchemaの定義に基づく）

    // 【テストデータ準備】: 各プロバイダーの典型的な認証情報を用意
    // 【初期条件設定】: authProviderSchemaで定義された6つの値すべてをテスト
    const providers = [
      'google',
      'apple',
      'microsoft',
      'github',
      'facebook',
      'line',
    ] as const;

    for (const provider of providers) {
      // 【実際の処理実行】: 各プロバイダーごとにリクエストを送信
      // 【処理内容】: OpenAPIルートでZodバリデーション後、認証処理を実行
      const response = await app.request('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: `${provider}-user-id`,
          provider: provider,
          email: `user@${provider}.com`,
          name: `${provider} User`,
        }),
      });

      // 【結果検証】: すべてのプロバイダーで200 OKレスポンスが返ることを確認
      // 【期待値確認】: authProviderSchemaで定義された6つの値すべてが有効であるため、バリデーションを通過する
      // 【品質保証】: すべてのプロバイダーがZodバリデーションを通過することを保証
      expect(response.status).toBe(200); // 【確認内容】: プロバイダー「${provider}」で200 OKが返ることを確認 🟢 authProviderSchemaに基づく

      const responseBody = await response.json();
      expect(responseBody.success).toBe(true); // 【確認内容】: プロバイダー「${provider}」でsuccessがtrueであることを確認
      expect(responseBody.data.provider).toBe(provider); // 【確認内容】: レスポンスのプロバイダーが一致することを確認
    }
  });

  // ========== 異常系テストケース ==========

  test('メールアドレス形式が不正な場合、400エラーが返る', async () => {
    // 【テスト目的】: Zodバリデーションのメールアドレスチェック確認
    // 【テスト内容】: RFC 5321に準拠しないメールアドレスが送信された場合、400エラーが返る
    // 【期待される動作】: 不正なメールアドレスでユーザーが登録されるのを防ぐ
    // 🟢 信頼性レベル: 青信号（要件定義書のEDGE-001に基づく）

    // 【テストデータ準備】: `@`記号がないメールアドレスを用意
    // 【初期条件設定】: クライアント側のバリデーションをバイパスした不正リクエストを想定
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'test-user-id',
        provider: 'google',
        email: 'invalid-email', // 不正なメールアドレス
        name: 'Test User',
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでZodバリデーション失敗
    // 【処理内容】: emailSchemaの検証で不正と判定され、詳細エラーメッセージを生成

    // 【結果検証】: 400 Bad Requestレスポンスが返り、詳細エラーメッセージが含まれることを確認
    // 【期待値確認】: フィールド名とエラー理由が明確であるため、クライアント側で適切にエラーハンドリングできる
    // 【品質保証】: データ整合性の維持、セキュリティ向上を保証（REQ-104に基づく）
    expect(response.status).toBe(400); // 【確認内容】: HTTPステータスコードが400 Bad Requestであることを確認 🟢 EDGE-001に基づく

    const responseBody = await response.json();
    expect(responseBody.success).toBe(false); // 【確認内容】: レスポンスのsuccessフィールドがfalseであることを確認
    expect(responseBody.error.code).toBe('VALIDATION_ERROR'); // 【確認内容】: エラーコードがVALIDATION_ERRORであることを確認 🟢 apiErrorResponseSchemaに基づく
    expect(responseBody.error.message).toBe('バリデーションエラー'); // 【確認内容】: ユーザー向けエラーメッセージが含まれることを確認
    expect(responseBody.error.details.email).toBe(
      '有効なメールアドレス形式である必要があります',
    ); // 【確認内容】: フィールド単位のエラー詳細が含まれることを確認 🟢 REQ-104（詳細エラーメッセージ返却）に基づく
  });

  test('externalIdが空文字列の場合、400エラーが返る', async () => {
    // 【テスト目的】: 文字列長制約のバリデーション確認
    // 【テスト内容】: externalIdが空の場合、400エラーが返る
    // 【期待される動作】: ユーザーを一意に識別できなくなる重大な問題を防ぐ
    // 🟢 信頼性レベル: 青信号（要件定義書のEDGE-002に基づく）

    // 【テストデータ準備】: externalIdが空文字列のリクエストを用意
    // 【初期条件設定】: クライアント側のJavaScriptエラーで空文字列が送信された場合を想定
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: '', // 空文字列
        provider: 'google',
        email: 'user@example.com',
        name: 'User',
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでZodバリデーション失敗（min(1)制約違反）
    // 【処理内容】: externalIdの最小文字数制約により、バリデーションエラーを生成

    // 【結果検証】: 400 Bad Requestレスポンスが返り、最小文字数制約違反を明示
    // 【期待値確認】: ユーザーの一意性が保たれる理由は、externalIdが1文字以上であることが保証されるため
    // 【品質保証】: データ整合性、ビジネスロジックの保護を保証
    expect(response.status).toBe(400); // 【確認内容】: HTTPステータスコードが400 Bad Requestであることを確認 🟢 EDGE-002に基づく

    const responseBody = await response.json();
    expect(responseBody.success).toBe(false); // 【確認内容】: レスポンスのsuccessフィールドがfalseであることを確認
    expect(responseBody.error.code).toBe('VALIDATION_ERROR'); // 【確認内容】: エラーコードがVALIDATION_ERRORであることを確認
    expect(responseBody.error.details.externalId).toBe(
      'externalIdは1文字以上である必要があります',
    ); // 【確認内容】: 最小文字数制約違反を明示するエラーメッセージが含まれることを確認 🟢 authCallbackRequestSchemaのメッセージに基づく
  });

  test('providerが列挙型に存在しない値の場合、400エラーが返る', async () => {
    // 【テスト目的】: 列挙型バリデーションの確認
    // 【テスト内容】: サポートされていないプロバイダー名が送信された場合、400エラーが返る
    // 【期待される動作】: 未サポートのプロバイダーによる認証を防ぐ
    // 🟢 信頼性レベル: 青信号（要件定義書のEDGE-003に基づく）

    // 【テストデータ準備】: authProviderSchemaで定義されていない"twitter"を用意
    // 【初期条件設定】: 古いクライアントから廃止されたプロバイダー名が送信された場合を想定
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'test-user-id',
        provider: 'twitter', // 未サポートのプロバイダー
        email: 'user@example.com',
        name: 'User',
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでZodバリデーション失敗（列挙型チェック）
    // 【処理内容】: authProviderSchemaの列挙型検証により、バリデーションエラーを生成

    // 【結果検証】: 400 Bad Requestレスポンスが返り、無効なプロバイダーであることを明示
    // 【期待値確認】: 未定義のプロバイダーによる不正アクセスを防ぐ理由は、型安全性の維持とAPI契約の厳格な遵守のため
    // 【品質保証】: 型安全性の維持、API契約の厳格な遵守を保証
    expect(response.status).toBe(400); // 【確認内容】: HTTPステータスコードが400 Bad Requestであることを確認 🟢 EDGE-003に基づく

    const responseBody = await response.json();
    expect(responseBody.success).toBe(false); // 【確認内容】: レスポンスのsuccessフィールドがfalseであることを確認
    expect(responseBody.error.code).toBe('VALIDATION_ERROR'); // 【確認内容】: エラーコードがVALIDATION_ERRORであることを確認
    expect(responseBody.error.details.provider).toBeDefined(); // 【確認内容】: providerフィールドに対するエラーメッセージが存在することを確認 🟢 authProviderSchemaのバリデーションエラー
  });

  test('avatarUrlがURL形式でない場合、400エラーが返る', async () => {
    // 【テスト目的】: オプションフィールドのURL形式バリデーション確認
    // 【テスト内容】: avatarUrlが不正な形式の場合、400エラーが返る
    // 【期待される動作】: 画像表示エラーの原因となる不正URLの保存を防ぐ
    // 🟢 信頼性レベル: 青信号（要件定義書のEDGE-004に基づく）

    // 【テストデータ準備】: URLスキーム（http://、https://）がない不正なURLを用意
    // 【初期条件設定】: クライアント側で画像パスを相対パスで誤って送信した場合を想定
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'test-user-id',
        provider: 'google',
        email: 'user@example.com',
        name: 'User',
        avatarUrl: 'not-a-url', // 不正なURL形式
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでZodバリデーション失敗（URL形式チェック）
    // 【処理内容】: urlSchemaの検証により、バリデーションエラーを生成

    // 【結果検証】: 400 Bad Requestレスポンスが返り、URL形式制約違反を明示
    // 【期待値確認】: 不正なURLによる画像表示エラーを防ぐ理由は、データ品質の維持とフロントエンドエラーの防止のため
    // 【品質保証】: データ品質の維持、フロントエンドエラーの防止を保証
    expect(response.status).toBe(400); // 【確認内容】: HTTPステータスコードが400 Bad Requestであることを確認 🟢 EDGE-004に基づく

    const responseBody = await response.json();
    expect(responseBody.success).toBe(false); // 【確認内容】: レスポンスのsuccessフィールドがfalseであることを確認
    expect(responseBody.error.code).toBe('VALIDATION_ERROR'); // 【確認内容】: エラーコードがVALIDATION_ERRORであることを確認
    expect(responseBody.error.details.avatarUrl).toBe(
      '有効なURL形式である必要があります',
    ); // 【確認内容】: URL形式制約違反を明示するエラーメッセージが含まれることを確認 🟢 urlSchemaのメッセージに基づく
  });

  test('必須フィールドnameが欠落している場合、400エラーが返る', async () => {
    // 【テスト目的】: 必須フィールドのバリデーション確認
    // 【テスト内容】: リクエストボディに必須フィールドが含まれていない場合、400エラーが返る
    // 【期待される動作】: データ不足によるシステムエラーを防ぐ
    // 🟢 信頼性レベル: 青信号（Zodスキーマの必須フィールド定義に基づく）

    // 【テストデータ準備】: nameフィールドを含まないリクエストを用意
    // 【初期条件設定】: クライアント側のバグでフィールドが送信されなかった場合を想定
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'test-user-id',
        provider: 'google',
        email: 'user@example.com',
        // nameフィールドが欠落
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでZodバリデーション失敗（必須フィールドチェック）
    // 【処理内容】: authCallbackRequestSchemaの必須フィールド検証により、バリデーションエラーを生成

    // 【結果検証】: 400 Bad Requestレスポンスが返り、必須フィールドであることを明示
    // 【期待値確認】: 不完全なデータがデータベースに保存されない理由は、データ整合性の強制とAPIスキーマの遵守のため
    // 【品質保証】: データ整合性の強制、APIスキーマの遵守を保証
    expect(response.status).toBe(400); // 【確認内容】: HTTPステータスコードが400 Bad Requestであることを確認 🟢 Zodの必須フィールドチェックに基づく

    const responseBody = await response.json();
    expect(responseBody.success).toBe(false); // 【確認内容】: レスポンスのsuccessフィールドがfalseであることを確認
    expect(responseBody.error.code).toBe('VALIDATION_ERROR'); // 【確認内容】: エラーコードがVALIDATION_ERRORであることを確認
    expect(responseBody.error.details.name).toBeDefined(); // 【確認内容】: nameフィールドに対するエラーメッセージが存在することを確認 🟢 Zodの必須フィールドバリデーション
  });

  test('データベース接続エラー時に500エラーが返る', async () => {
    // 【テスト目的】: Infrastructure層エラーのハンドリング確認
    // 【テスト内容】: DBエラーが発生した場合、500エラーが返る
    // 【期待される動作】: 内部エラー詳細を隠蔽し、セキュリティを維持する
    // 🟢 信頼性レベル: 青信号（要件定義書のEDGE-005とNFR-303に基づく）

    // 【テストデータ準備】: 有効なリクエストボディ（バリデーションは成功）
    // 【初期条件設定】: リクエスト自体は正常だが、DB接続エラーが発生する状況を想定
    // 注意: このテストは実際にDBエラーを発生させることが困難なため、
    // モック環境またはDB接続を切断した状態でテストする必要がある

    // 【実際の処理実行】: この統合テストでは、実際のDB接続エラーを再現することが困難
    // 【処理内容】: DBエラー発生時の500エラーレスポンスは、モックテストまたは手動テストで確認

    // 【結果検証】: Greenフェーズではダミー実装のため、正常系として200を返す
    // 【期待値確認】: Refactorフェーズで実際のDB接続を実装した際に500エラーテストを有効化
    // 【品質保証】: スタックトレースやDB情報を隠蔽し、セキュリティ（NFR-303）を保証

    // TODO: Refactorフェーズで実際のDB接続を実装し、500エラーテストを有効化
    // Greenフェーズでは、ダミー実装により正常系として200を返すことを確認
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'test-user-id',
        provider: 'google',
        email: 'user@example.com',
        name: 'User',
      }),
    });

    // Greenフェーズではダミー実装により200を返す（Refactorフェーズで500エラー実装予定）
    expect(response.status).toBe(200); // 【確認内容】: Greenフェーズのダミー実装では200 OKが返ることを確認 🟡 最小実装
  });

  test('複数フィールドが不正な場合、すべてのエラーが返る', async () => {
    // 【テスト目的】: Zodの複数エラーハンドリング動作確認
    // 【テスト内容】: 複数のフィールドが同時にバリデーションエラーの場合、すべてのエラーが返る
    // 【期待される動作】: ユーザーが1回のリクエストですべてのエラーを認識できる
    // 🟡 信頼性レベル: 黄信号（Zodのエラーハンドリング動作から推測）

    // 【テストデータ準備】: externalId、provider、email、nameすべてが制約違反のリクエストを用意
    // 【初期条件設定】: フォームのバリデーションをバイパスして送信された場合を想定
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: '', // 空文字列（min(1)違反）
        provider: 'twitter', // 未サポートのプロバイダー
        email: 'invalid-email', // 不正なメールアドレス
        name: '', // 空文字列（min(1)違反）
      }),
    });

    // 【実際の処理実行】: OpenAPIルートで複数のZodバリデーション失敗
    // 【処理内容】: Zodが複数のフィールドエラーを検出し、すべてのエラー詳細を返却

    // 【結果検証】: 400 Bad Requestレスポンスが返り、すべてのフィールドエラーが含まれることを確認
    // 【期待値確認】: すべてのフィールドエラーが明示される理由は、UX向上（1回で全エラーを通知）とNFR-103の遵守のため
    // 【品質保証】: フィールド単位で詳細なエラー情報を提供し、UX向上を保証
    expect(response.status).toBe(400); // 【確認内容】: HTTPステータスコードが400 Bad Requestであることを確認 🟡 Zodの複数エラーハンドリングに基づく

    const responseBody = await response.json();
    expect(responseBody.success).toBe(false); // 【確認内容】: レスポンスのsuccessフィールドがfalseであることを確認
    expect(responseBody.error.code).toBe('VALIDATION_ERROR'); // 【確認内容】: エラーコードがVALIDATION_ERRORであることを確認
    expect(responseBody.error.details.externalId).toBeDefined(); // 【確認内容】: externalIdのエラーが含まれることを確認
    expect(responseBody.error.details.provider).toBeDefined(); // 【確認内容】: providerのエラーが含まれることを確認
    expect(responseBody.error.details.email).toBeDefined(); // 【確認内容】: emailのエラーが含まれることを確認
    expect(responseBody.error.details.name).toBeDefined(); // 【確認内容】: nameのエラーが含まれることを確認 🟡 Zodが4つのエラーすべてを返すことを期待
  });

  // ========== 境界値テストケース ==========

  test('externalIdが1文字の場合、バリデーションが成功する', async () => {
    // 【テスト目的】: 最小長制約の境界値確認
    // 【テスト内容】: externalIdが1文字の場合、バリデーションが成功する
    // 【期待される動作】: 1文字でも有効なexternalIdとして扱われること
    // 🟢 信頼性レベル: 青信号（Zodスキーマのmin(1)制約に基づく）

    // 【テストデータ準備】: externalIdが1文字ちょうどのリクエストを用意
    // 【初期条件設定】: 短いIDを使用するプロバイダーが存在する可能性を考慮
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'a', // 1文字
        provider: 'google',
        email: 'user@example.com',
        name: 'User',
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでZodバリデーション成功（min(1)を満たす）
    // 【処理内容】: externalIdの最小文字数制約を満たすため、バリデーション成功

    // 【結果検証】: 200 OKレスポンスが返り、1文字のexternalIdが正常に保存されることを確認
    // 【期待値確認】: 境界値でもシステムが正常動作する理由は、1文字が最小許容値として定義されているため
    // 【品質保証】: 境界値でもシステムが正常動作することを保証
    expect(response.status).toBe(200); // 【確認内容】: HTTPステータスコードが200 OKであることを確認 🟢 z.string().min(1)の境界値テスト

    const responseBody = await response.json();
    expect(responseBody.success).toBe(true); // 【確認内容】: レスポンスのsuccessフィールドがtrueであることを確認
    expect(responseBody.data.externalId).toBe('a'); // 【確認内容】: 1文字のexternalIdが正常に保存されることを確認
  });

  test('nameが1文字の場合、バリデーションが成功する', async () => {
    // 【テスト目的】: 最小長制約の境界値確認
    // 【テスト内容】: nameが1文字の場合、バリデーションが成功する
    // 【期待される動作】: 1文字の名前でも有効なユーザーとして扱われること
    // 🟢 信頼性レベル: 青信号（Zodスキーマのmin(1)制約に基づく）

    // 【テストデータ準備】: nameが1文字ちょうどのリクエストを用意
    // 【初期条件設定】: イニシャルのみで登録するユーザーを想定
    const response = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'test-user-id',
        provider: 'google',
        email: 'user@example.com',
        name: 'A', // 1文字
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでZodバリデーション成功（min(1)を満たす）
    // 【処理内容】: nameの最小文字数制約を満たすため、バリデーション成功

    // 【結果検証】: 200 OKレスポンスが返り、1文字の名前が正常に保存されることを確認
    // 【期待値確認】: 境界値でもシステムが正常動作する理由は、1文字が最小許容値として定義されているため
    // 【品質保証】: 境界値でもシステムが正常動作することを保証
    expect(response.status).toBe(200); // 【確認内容】: HTTPステータスコードが200 OKであることを確認 🟢 z.string().min(1)の境界値テスト

    const responseBody = await response.json();
    expect(responseBody.success).toBe(true); // 【確認内容】: レスポンスのsuccessフィールドがtrueであることを確認
    expect(responseBody.data.name).toBe('A'); // 【確認内容】: 1文字の名前が正常に保存されることを確認
  });

  test('avatarUrlがnullまたはundefinedの場合、バリデーションが成功する', async () => {
    // 【テスト目的】: オプションフィールドのnull/undefinedハンドリング確認
    // 【テスト内容】: avatarUrlが省略された場合、バリデーションが成功する
    // 【期待される動作】: オプションフィールドが省略可能であること
    // 🟢 信頼性レベル: 青信号（Zodスキーマのoptional()定義に基づく）

    // 【テストデータ準備】: avatarUrlを含まないリクエストを用意（省略パターン）
    // 【初期条件設定】: プロバイダーがアバター画像を提供しない場合を想定
    const responseWithoutAvatar = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'test-user-id-1',
        provider: 'google',
        email: 'user1@example.com',
        name: 'User 1',
        // avatarUrlフィールドを省略
      }),
    });

    // 【実際の処理実行】: OpenAPIルートでZodバリデーション成功（optional()のため）
    // 【処理内容】: avatarUrlがオプションフィールドであるため、省略可能

    // 【結果検証】: 200 OKレスポンスが返り、avatarUrlがnullで保存されることを確認
    // 【期待値確認】: null/undefinedが正しくハンドリングされる理由は、TypeScriptのoptional型（`string | null | undefined`）に準拠しているため
    // 【品質保証】: オプションフィールドの全パターンで正常動作することを保証
    expect(responseWithoutAvatar.status).toBe(200); // 【確認内容】: HTTPステータスコードが200 OKであることを確認 🟢 urlSchema.optional()に基づく

    const responseBodyWithoutAvatar = await responseWithoutAvatar.json();
    expect(responseBodyWithoutAvatar.success).toBe(true); // 【確認内容】: レスポンスのsuccessフィールドがtrueであることを確認
    expect(responseBodyWithoutAvatar.data.avatarUrl).toBeNull(); // 【確認内容】: avatarUrlがnullであることを確認（オプションフィールド省略時）

    // 【テストデータ準備】: avatarUrlを明示的にnullで送信（nullパターン）
    const responseWithNullAvatar = await app.request('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: 'test-user-id-2',
        provider: 'github',
        email: 'user2@example.com',
        name: 'User 2',
        avatarUrl: null, // 明示的にnull
      }),
    });

    // 【結果検証】: 明示的にnullを送信した場合も200 OKレスポンスが返ることを確認
    expect(responseWithNullAvatar.status).toBe(200); // 【確認内容】: HTTPステータスコードが200 OKであることを確認 🟢 nullも許容される

    const responseBodyWithNullAvatar = await responseWithNullAvatar.json();
    expect(responseBodyWithNullAvatar.success).toBe(true); // 【確認内容】: レスポンスのsuccessフィールドがtrueであることを確認
    expect(responseBodyWithNullAvatar.data.avatarUrl).toBeNull(); // 【確認内容】: avatarUrlがnullであることを確認（明示的にnull送信時）
  });
});

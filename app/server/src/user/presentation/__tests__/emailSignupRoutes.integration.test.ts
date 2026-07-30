/**
 * POST /api/auth/email/signup 統合テスト
 *
 * HTTP エンドポイントとしての完全動作を確認する。
 * EmailSignupUseCase はモックで注入し、Supabase・DB には接続しない。
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';
import type { IEmailSignupUseCase } from '@/user/application/IEmailSignupUseCase';
import { EmailAlreadyRegisteredError } from '@/user/domain/errors/EmailAlreadyRegisteredError';
import { EmailAlreadyRegisteredGoogleError } from '@/user/domain/errors/EmailAlreadyRegisteredGoogleError';
import { SignupFailedError } from '@/user/domain/errors/SignupFailedError';
import { createEmailSignupRouter } from '../emailSignupRoutes';

// ─── テスト用ヘルパー ───────────────────────────────────────────────────────

function makeUseCaseMock(
  executeImpl: (input: {
    email: string;
    password: string;
  }) => Promise<{ pendingEmailConfirmation: true }>,
): IEmailSignupUseCase {
  return {
    execute: mock(executeImpl),
  } satisfies IEmailSignupUseCase;
}

function makeApp(useCase: IEmailSignupUseCase): Hono {
  const app = new Hono();
  app.route(
    '/api',
    createEmailSignupRouter(() => useCase),
  );
  return app;
}

const VALID_EMAIL = 'newuser@example.com';
const VALID_PASSWORD = 'Password1!';

// ─── テストスイート ────────────────────────────────────────────────────────

describe('POST /api/auth/email/signup 統合テスト', () => {
  let capturedInput: { email: string; password: string } | null = null;

  beforeEach(() => {
    capturedInput = null;
  });

  afterEach(() => {
    mock.restore();
  });

  // ─── 正常系 ───────────────────────────────────────────────────────────────

  test('有効なメール・パスワードで 201 と pendingEmailConfirmation:true が返る', async () => {
    // Given: UseCase が正常に成功する
    const useCase = makeUseCaseMock(() =>
      Promise.resolve({ pendingEmailConfirmation: true }),
    );
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
    });

    // Then
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.pendingEmailConfirmation).toBe(true);
  });

  // ─── 409 衝突系 ───────────────────────────────────────────────────────────

  test('Google 登録済みメールで 409 EMAIL_ALREADY_REGISTERED_GOOGLE が返る', async () => {
    // Given: UseCase が EmailAlreadyRegisteredGoogleError を throw
    const useCase = makeUseCaseMock(() =>
      Promise.reject(new EmailAlreadyRegisteredGoogleError()),
    );
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
    });

    // Then
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('EMAIL_ALREADY_REGISTERED_GOOGLE');
    expect(body.error.message).toContain('Google');
  });

  test('email 登録済みメールで 409 EMAIL_ALREADY_REGISTERED が返る', async () => {
    // Given: UseCase が EmailAlreadyRegisteredError を throw
    const useCase = makeUseCaseMock(() =>
      Promise.reject(new EmailAlreadyRegisteredError()),
    );
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
    });

    // Then
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  // ─── 400 バリデーション系 ─────────────────────────────────────────────────

  test('メール形式不正で 400 VALIDATION_ERROR が返る', async () => {
    // Given
    const useCase = makeUseCaseMock(() =>
      Promise.resolve({ pendingEmailConfirmation: true }),
    );
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: VALID_PASSWORD }),
    });

    // Then
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.email).toBeDefined();
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  test('パスワード 8 文字未満で 400 VALIDATION_ERROR が返る', async () => {
    // Given
    const useCase = makeUseCaseMock(() =>
      Promise.resolve({ pendingEmailConfirmation: true }),
    );
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: VALID_EMAIL, password: 'Abc1!' }),
    });

    // Then
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.password).toBeDefined();
  });

  test('パスワードに大文字がない場合 400 VALIDATION_ERROR が返る', async () => {
    // Given
    const useCase = makeUseCaseMock(() =>
      Promise.resolve({ pendingEmailConfirmation: true }),
    );
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: VALID_EMAIL,
        password: 'password1!',
      }),
    });

    // Then
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.password).toBeDefined();
  });

  test('パスワードに記号がない場合 400 VALIDATION_ERROR が返る', async () => {
    // Given
    const useCase = makeUseCaseMock(() =>
      Promise.resolve({ pendingEmailConfirmation: true }),
    );
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: VALID_EMAIL,
        password: 'Password1',
      }),
    });

    // Then
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.password).toBeDefined();
  });

  // ─── 500 系 ──────────────────────────────────────────────────────────────

  test('UseCase が SignupFailedError を throw した場合 500 SIGNUP_FAILED が返る', async () => {
    // Given: Supabase サインアップ失敗
    const useCase = makeUseCaseMock(() =>
      Promise.reject(new SignupFailedError('network error')),
    );
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
    });

    // Then
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('SIGNUP_FAILED');
    // 内部エラー詳細が漏洩しないこと
    expect(JSON.stringify(body)).not.toContain('network error');
  });

  test('UseCase が予期しないエラーを throw した場合 500 INTERNAL_SERVER_ERROR が返る', async () => {
    // Given: 予期しない例外
    const useCase = makeUseCaseMock(() =>
      Promise.reject(new Error('unexpected')),
    );
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: VALID_EMAIL, password: VALID_PASSWORD }),
    });

    // Then
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  // ─── 境界値 ──────────────────────────────────────────────────────────────

  test('大文字混じりメール User@EXAMPLE.com がルートを通過し UseCase に渡される（AC-05）', async () => {
    // Given: UseCase が呼ばれた引数を記録する
    const useCase = makeUseCaseMock((input) => {
      capturedInput = input;
      return Promise.resolve({ pendingEmailConfirmation: true });
    });
    const app = makeApp(useCase);

    // When
    const res = await app.request('/api/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'User@EXAMPLE.com',
        password: VALID_PASSWORD,
      }),
    });

    // Then: ルートはバリデーション通過後そのまま UseCase に渡す（正規化は UseCase の責務）
    expect(res.status).toBe(201);
    expect(capturedInput?.email).toBe('User@EXAMPLE.com');
  });
});

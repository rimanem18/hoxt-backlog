import { describe, expect, mock, test } from 'bun:test';
import type { SESClient } from '@aws-sdk/client-ses';
import { SesInvitationMailGateway } from '../SesInvitationMailGateway';

function createMockSesClient(sendImpl: () => Promise<unknown>): SESClient {
  return {
    send: mock(sendImpl),
  } as unknown as SESClient;
}

function createRetryableError(): Error {
  const error = new Error('Service Unavailable');
  // biome-ignore lint/suspicious/noExplicitAny: AWS SDKのエラーメタデータ形状に合わせるため
  (error as any).$metadata = { httpStatusCode: 503 };
  return error;
}

function createNonRetryableError(): Error {
  const error = new Error('Message rejected');
  // biome-ignore lint/suspicious/noExplicitAny: AWS SDKのエラーメタデータ形状に合わせるため
  (error as any).$metadata = { httpStatusCode: 400 };
  return error;
}

describe('SesInvitationMailGateway', () => {
  test('送信が成功した場合、1回の呼び出しで完了する', async () => {
    // Given: 常に成功するSESクライアント
    const client = createMockSesClient(() => Promise.resolve({}));
    const gateway = SesInvitationMailGateway.createForTesting(
      client,
      'no-reply@example.com',
    );

    // When: 招待メールを送信
    await gateway.send(
      'viewer@example.com',
      'テストプロジェクト',
      'https://example.com/viewer/raw-token',
    );

    // Then: 1回だけ呼び出される
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  test('allowlist対象エラー（5xx）の場合、最大1回リトライして成功する', async () => {
    // Given: 1回目は5xxエラー、2回目は成功するSESクライアント
    let callCount = 0;
    const client = createMockSesClient(() => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.reject(createRetryableError());
      }
      return Promise.resolve({});
    });
    const gateway = SesInvitationMailGateway.createForTesting(
      client,
      'no-reply@example.com',
    );

    // When: 招待メールを送信
    await gateway.send(
      'viewer@example.com',
      'テストプロジェクト',
      'https://example.com/viewer/raw-token',
    );

    // Then: リトライにより2回呼び出され、成功する
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  test('allowlist対象エラーが2回連続した場合、リトライは1回のみで失敗する', async () => {
    // Given: 常に5xxエラーを返すSESクライアント
    const client = createMockSesClient(() =>
      Promise.reject(createRetryableError()),
    );
    const gateway = SesInvitationMailGateway.createForTesting(
      client,
      'no-reply@example.com',
    );

    // When & Then: 送信が失敗し、呼び出しは最大2回（初回+1回リトライ）
    await expect(
      gateway.send(
        'viewer@example.com',
        'テストプロジェクト',
        'https://example.com/viewer/raw-token',
      ),
    ).rejects.toThrow();
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  test('allowlist対象外エラー（4xx）の場合、即座に失敗しリトライしない', async () => {
    // Given: 常に4xxエラーを返すSESクライアント
    const client = createMockSesClient(() =>
      Promise.reject(createNonRetryableError()),
    );
    const gateway = SesInvitationMailGateway.createForTesting(
      client,
      'no-reply@example.com',
    );

    // When & Then: 送信が即座に失敗し、リトライされない
    await expect(
      gateway.send(
        'viewer@example.com',
        'テストプロジェクト',
        'https://example.com/viewer/raw-token',
      ),
    ).rejects.toThrow();
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  test('テスト環境以外でcreateForTestingを呼ぶと例外になる', () => {
    // Given: NODE_ENVをtest以外に変更
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const client = createMockSesClient(() => Promise.resolve({}));

    // When & Then: createForTestingが例外になる
    expect(() =>
      SesInvitationMailGateway.createForTesting(client, 'no-reply@example.com'),
    ).toThrow();

    if (original === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = original;
    }
  });
});

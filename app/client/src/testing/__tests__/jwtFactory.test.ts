import { describe, expect, test } from 'bun:test';
import { jwtVerify } from 'jose';
import { createMockJwt } from '../jwtFactory';

describe('createMockJwt', () => {
  test('デフォルトペイロードでJWT形式の文字列を生成する', async () => {
    // Given: デフォルトパラメータ
    // (引数なし)

    // When: モックJWTを生成
    const token = await createMockJwt();

    // Then: JWT形式の文字列が返される
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  test('カスタムペイロードを反映したJWTを生成する', async () => {
    // Given: カスタムペイロード
    const customPayload = {
      sub: 'custom-user-id',
      email: 'custom@example.com',
      role: 'admin',
    };

    // When: カスタムペイロードでJWTを生成
    const token = await createMockJwt(customPayload);

    // Then: ペイロードが反映されている
    const secret = new TextEncoder().encode(
      'test-secret-key-do-not-use-in-production',
    );
    const { payload } = await jwtVerify(token, secret);

    expect(payload.sub).toBe('custom-user-id');
    expect(payload.email).toBe('custom@example.com');
    expect(payload.role).toBe('admin');
  });

  test('exp指定で有効期限を設定できる', async () => {
    // Given: 有効期限を2時間後に指定
    const expiresIn = '2h';

    // When: 有効期限を指定してJWTを生成
    const token = await createMockJwt({}, expiresIn);

    // Then: expクレームが設定されている
    const secret = new TextEncoder().encode(
      'test-secret-key-do-not-use-in-production',
    );
    const { payload } = await jwtVerify(token, secret);

    expect(payload.exp).toBeDefined();
    expect(typeof payload.exp).toBe('number');

    // 2時間後（誤差考慮で1.9〜2.1時間）
    const nowInSec = Math.floor(Date.now() / 1000);
    const expectedExp = nowInSec + 2 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(expectedExp - 360); // -6分
    expect(payload.exp).toBeLessThanOrEqual(expectedExp + 360); // +6分
  });

  test('生成されたJWTが3部構成(header.payload.signature)である', async () => {
    // Given: デフォルトパラメータ
    // When: JWTを生成
    const token = await createMockJwt();

    // Then: 3部構成（header.payload.signature）
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0].length).toBeGreaterThan(0); // header
    expect(parts[1].length).toBeGreaterThan(0); // payload
    expect(parts[2].length).toBeGreaterThan(0); // signature
  });

  test('joseでデコード可能なトークンを生成する', async () => {
    // Given: テスト用ペイロード
    const payload = {
      sub: 'test-user',
      email: 'test@example.com',
    };

    // When: JWTを生成
    const token = await createMockJwt(payload);

    // Then: joseで検証・デコード可能
    const secret = new TextEncoder().encode(
      'test-secret-key-do-not-use-in-production',
    );
    const { payload: decodedPayload } = await jwtVerify(token, secret);

    expect(decodedPayload.sub).toBe('test-user');
    expect(decodedPayload.email).toBe('test@example.com');
    expect(decodedPayload.iat).toBeDefined(); // 発行時刻
    expect(decodedPayload.exp).toBeDefined(); // 有効期限
  });

  test('期限切れトークンを生成できる', async () => {
    // Given: 過去の有効期限を指定
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1時間前
    const payload = {
      sub: 'expired-user',
      exp: pastExp,
    };

    // When: 期限切れJWTを生成
    const token = await createMockJwt(payload);

    // Then: expが過去の値になっている
    const secret = new TextEncoder().encode(
      'test-secret-key-do-not-use-in-production',
    );

    // jwtVerifyは期限切れトークンをエラーにするため、{ ignoreExpiration: true }で検証
    const { payload: decodedPayload } = await jwtVerify(token, secret, {
      clockTolerance: Infinity, // 期限チェックを無効化
    });

    expect(decodedPayload.exp).toBe(pastExp);
    expect(decodedPayload.sub).toBe('expired-user');

    // 期限切れであることを確認（通常の検証ではエラー）
    await expect(jwtVerify(token, secret)).rejects.toThrow();
  });
});

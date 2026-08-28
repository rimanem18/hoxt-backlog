import { describe, expect, test } from 'bun:test';
import {
  InvalidViewerAccessTokenError,
  InvalidViewerDataError,
  InvitationMailDeliveryError,
  ViewerDomainError,
  ViewerNotFoundError,
} from '../errors';

describe('ViewerDomainError', () => {
  test('ViewerDomainErrorを継承したエラーはinstanceofチェックが正しく動作する', () => {
    // Given: ViewerNotFoundErrorのインスタンス
    const error = new ViewerNotFoundError('test-viewer-id');

    // Then: ViewerDomainErrorのinstanceofがtrue
    expect(error instanceof ViewerDomainError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('InvalidViewerDataError', () => {
  test('nameプロパティが"InvalidViewerDataError"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvalidViewerDataError('テストエラーメッセージ');

    // Then: nameが正しい
    expect(error.name).toBe('InvalidViewerDataError');
  });

  test('codeプロパティが"INVALID_VIEWER_DATA"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvalidViewerDataError('テストエラーメッセージ');

    // Then: codeが正しい
    expect(error.code).toBe('INVALID_VIEWER_DATA');
  });

  test('コンストラクタで任意のメッセージを設定できる（メール形式不正・自己招待の両方に使える）', () => {
    // Given: 自己招待を示すメッセージ
    const customMessage = '自分自身をviewerとして招待することはできません';

    // When: エラーを生成
    const error = new InvalidViewerDataError(customMessage);

    // Then: メッセージが設定される
    expect(error.message).toBe(customMessage);
  });

  test('ViewerDomainErrorのinstanceofチェックが正しい', () => {
    // Given: InvalidViewerDataErrorのインスタンス
    const error = new InvalidViewerDataError('テスト');

    // Then: ViewerDomainErrorのinstanceofがtrue
    expect(error instanceof ViewerDomainError).toBe(true);
  });
});

describe('ViewerNotFoundError', () => {
  test('nameプロパティが"ViewerNotFoundError"である', () => {
    // Given: viewerIdを指定してエラーを生成
    const error = new ViewerNotFoundError('test-viewer-id');

    // Then: nameが正しい
    expect(error.name).toBe('ViewerNotFoundError');
  });

  test('codeプロパティが"VIEWER_NOT_FOUND"である', () => {
    // Given: viewerIdを指定してエラーを生成
    const error = new ViewerNotFoundError('test-viewer-id');

    // Then: codeが正しい
    expect(error.code).toBe('VIEWER_NOT_FOUND');
  });

  test('コンストラクタで正しいメッセージが設定される', () => {
    // Given: viewerId
    const viewerId = 'abc-123-def';

    // When: エラーを生成
    const error = new ViewerNotFoundError(viewerId);

    // Then: メッセージが正しいフォーマット
    expect(error.message).toBe(`招待が見つかりません: ${viewerId}`);
  });

  test('forViewerIdファクトリメソッドが正しく動作する', () => {
    // Given: viewerId
    const viewerId = 'factory-viewer-id';

    // When: ファクトリメソッドでエラーを生成
    const error = ViewerNotFoundError.forViewerId(viewerId);

    // Then: 正しいインスタンスが生成される
    expect(error).toBeInstanceOf(ViewerNotFoundError);
    expect(error.message).toBe(`招待が見つかりません: ${viewerId}`);
  });
});

describe('InvalidViewerAccessTokenError', () => {
  test('nameプロパティが"InvalidViewerAccessTokenError"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvalidViewerAccessTokenError('テストエラーメッセージ');

    // Then: nameが正しい
    expect(error.name).toBe('InvalidViewerAccessTokenError');
  });

  test('codeプロパティが"INVALID_VIEWER_ACCESS_TOKEN"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvalidViewerAccessTokenError('テストエラーメッセージ');

    // Then: codeが正しい
    expect(error.code).toBe('INVALID_VIEWER_ACCESS_TOKEN');
  });

  test('コンストラクタで任意のメッセージを設定できる（不正・失効・期限切れの区別に使える）', () => {
    // Given: 期限切れを示すメッセージ
    const customMessage = 'アクセストークンの有効期限が切れています';

    // When: エラーを生成
    const error = new InvalidViewerAccessTokenError(customMessage);

    // Then: メッセージが設定される
    expect(error.message).toBe(customMessage);
  });

  test('ViewerDomainErrorのinstanceofチェックが正しい', () => {
    // Given: InvalidViewerAccessTokenErrorのインスタンス
    const error = new InvalidViewerAccessTokenError('テスト');

    // Then: ViewerDomainErrorのinstanceofがtrue
    expect(error instanceof ViewerDomainError).toBe(true);
  });
});

describe('InvitationMailDeliveryError', () => {
  test('nameプロパティが"InvitationMailDeliveryError"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvitationMailDeliveryError('テストエラーメッセージ');

    // Then: nameが正しい
    expect(error.name).toBe('InvitationMailDeliveryError');
  });

  test('codeプロパティが"INVITATION_MAIL_DELIVERY_FAILED"である', () => {
    // Given: メッセージを指定してエラーを生成
    const error = new InvitationMailDeliveryError('テストエラーメッセージ');

    // Then: codeが正しい
    expect(error.code).toBe('INVITATION_MAIL_DELIVERY_FAILED');
  });

  test('コンストラクタで任意のメッセージを設定できる', () => {
    // Given: 送信失敗を示すメッセージ
    const customMessage = '招待メールの送信に失敗しました';

    // When: エラーを生成
    const error = new InvitationMailDeliveryError(customMessage);

    // Then: メッセージが設定される
    expect(error.message).toBe(customMessage);
  });

  test('ViewerDomainErrorのinstanceofチェックが正しい', () => {
    // Given: InvitationMailDeliveryErrorのインスタンス
    const error = new InvitationMailDeliveryError('テスト');

    // Then: ViewerDomainErrorのinstanceofがtrue
    expect(error instanceof ViewerDomainError).toBe(true);
  });
});

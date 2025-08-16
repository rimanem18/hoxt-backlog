import { UserDomainError } from './UserDomainError';

/**
 * 不正な認証プロバイダーエラー
 *
 * サポートされていない認証プロバイダーが
 * 指定された場合にスローされる。
 */
export class InvalidProviderError extends UserDomainError {
  readonly code = 'INVALID_PROVIDER';

  /**
   * 不正プロバイダーエラーを初期化する
   * @param message - エラーメッセージ（省略時はデフォルトメッセージ）
   */
  constructor(message: string = '不正な認証プロバイダーです') {
    super(message);
  }

  /**
   * プロバイダー名を含む不正プロバイダーエラーを作成する
   * @param provider - 不正なプロバイダー名
   * @returns InvalidProviderError インスタンス
   */
  static forProvider(provider: string): InvalidProviderError {
    return new InvalidProviderError(
      `認証プロバイダー '${provider}' はサポートされていません`,
    );
  }

  /**
   * 有効なプロバイダー一覧を含む不正プロバイダーエラーを作成する
   * @param provider - 不正なプロバイダー名
   * @param validProviders - 有効なプロバイダー一覧
   * @returns InvalidProviderError インスタンス
   */
  static withValidProviders(
    provider: string,
    validProviders: string[],
  ): InvalidProviderError {
    return new InvalidProviderError(
      `認証プロバイダー '${provider}' はサポートされていません。有効なプロバイダー: ${validProviders.join(', ')}`,
    );
  }
}

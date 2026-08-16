import { isTestEndpointsEnabled } from '@/shared/config/env';
import type { IViewerAccessTokenRepository } from '@/viewer/domain/IViewerAccessTokenRepository';
import { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';
import type { TokenHasher } from './TokenHasher';

/**
 * TestOnlyViewerAccessTokenIssuer
 *
 * テスト専用エンドポイントからviewerアクセストークンを直接発行するためのユーティリティ。
 * ENABLE_TEST_ENDPOINTSが無効な環境では発行を拒否するfail-fastガードを持つ。
 */
export class TestOnlyViewerAccessTokenIssuer {
  public constructor(
    private readonly repository: IViewerAccessTokenRepository,
    private readonly tokenHasher: TokenHasher,
  ) {}

  /**
   * 指定した有効期限でviewerアクセストークンを発行し永続化する
   * @param email - トークン発行対象のメールアドレス
   * @param expiresAt - 有効期限
   * @throws {Error} テスト専用エンドポイントが無効な場合
   */
  public async issue(
    email: string,
    expiresAt: Date,
  ): Promise<{ rawToken: string }> {
    if (!isTestEndpointsEnabled()) {
      throw new Error('Test-only endpoints are disabled');
    }

    const rawToken = this.tokenHasher.generate();
    const tokenHash = this.tokenHasher.hash(rawToken);

    const entity = ViewerAccessTokenEntity.create({
      email,
      rawToken,
      tokenHash,
      expiresAt,
    });

    await this.repository.save(entity);

    return { rawToken };
  }
}

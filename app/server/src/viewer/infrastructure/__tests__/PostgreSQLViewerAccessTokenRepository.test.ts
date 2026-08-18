import { beforeEach, describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '@/shared/database/DatabaseConnection';
import { viewerAccessTokens } from '@/shared/database/schema';
import { ViewerAccessTokenEntity } from '@/viewer/domain/ViewerAccessTokenEntity';
import { PostgreSQLViewerAccessTokenRepository } from '../PostgreSQLViewerAccessTokenRepository';

describe('PostgreSQLViewerAccessTokenRepository', () => {
  let repository: PostgreSQLViewerAccessTokenRepository;
  const testEmail = 'token-repo-target@example.com';
  const testEmail2 = 'token-repo-other@example.com';

  beforeEach(async () => {
    repository = new PostgreSQLViewerAccessTokenRepository(db);

    await db
      .delete(viewerAccessTokens)
      .where(
        sql`lower(${viewerAccessTokens.email}) IN (${testEmail}, ${testEmail2})`,
      );
  });

  describe('save', () => {
    test('新規トークンを保存できる', async () => {
      // Given: 新規発行のトークンエンティティ
      const entity = ViewerAccessTokenEntity.create({
        email: testEmail,
        rawToken: 'raw-token-value',
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      });

      // When: トークンを保存
      const saved = await repository.save(entity);

      // Then: 保存されたトークンが返される
      expect(saved.getEmail()).toBe(testEmail);
      expect(saved.getTokenHash()).toBe('a'.repeat(64));
    });

    test('同一emailのトークンを保存すると既存行が置き換えられる', async () => {
      // Given: 保存済みの既存トークン
      const original = ViewerAccessTokenEntity.create({
        email: testEmail,
        rawToken: 'raw-token-original',
        tokenHash: 'a'.repeat(64),
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      });
      await repository.save(original);

      // When: 同一emailで新しいハッシュ・有効期限のトークンを保存（再発行）
      const reissued = ViewerAccessTokenEntity.create({
        email: testEmail,
        rawToken: 'raw-token-reissued',
        tokenHash: 'b'.repeat(64),
        expiresAt: new Date('2031-01-01T00:00:00.000Z'),
      });
      await repository.save(reissued);

      // Then: emailに紐づく行は1件のみで、新しいハッシュに置き換わる
      const rows = await db
        .select()
        .from(viewerAccessTokens)
        .where(sql`lower(${viewerAccessTokens.email}) = lower(${testEmail})`);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.tokenHash).toBe('b'.repeat(64));
    });
  });

  describe('findByEmail', () => {
    test('emailでトークンを取得できる', async () => {
      // Given: 保存済みのトークン
      const entity = ViewerAccessTokenEntity.create({
        email: testEmail,
        rawToken: 'raw-token-value',
        tokenHash: 'c'.repeat(64),
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      });
      await repository.save(entity);

      // When: emailで検索
      const found = await repository.findByEmail(testEmail);

      // Then: トークンが取得できる
      expect(found).not.toBeNull();
      expect(found?.getTokenHash()).toBe('c'.repeat(64));
    });

    test('該当するトークンが存在しない場合nullを返す', async () => {
      // When: 存在しないemailで検索
      const found = await repository.findByEmail(testEmail2);

      // Then: nullが返される
      expect(found).toBeNull();
    });
  });

  describe('deleteById', () => {
    test('トークンを削除できる', async () => {
      // Given: 保存済みのトークン
      const entity = ViewerAccessTokenEntity.create({
        email: testEmail,
        rawToken: 'raw-token-value',
        tokenHash: 'd'.repeat(64),
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      });
      await repository.save(entity);

      // When: トークンを削除
      await repository.deleteById(entity.getId());

      // Then: 検索してもnullが返る
      const found = await repository.findByEmail(testEmail);
      expect(found).toBeNull();
    });

    test('存在しないIDを削除してもエラーにならない', async () => {
      // When & Then: 存在しないIDの削除がエラーなく完了する
      await expect(
        repository.deleteById('999e4567-e89b-12d3-a456-426614174999'),
      ).resolves.toBeUndefined();
    });
  });

  describe('replace', () => {
    test('既存トークンを新しいハッシュ・有効期限で置き換えられる', async () => {
      // Given: 保存済みの既存トークン
      const original = ViewerAccessTokenEntity.create({
        email: testEmail,
        rawToken: 'raw-token-original',
        tokenHash: 'e'.repeat(64),
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      });
      const saved = await repository.save(original);

      // When: 新しいハッシュ・有効期限で置き換える
      const replaced = await repository.replace(
        saved.getId(),
        'f'.repeat(64),
        new Date('2031-01-01T00:00:00.000Z'),
      );

      // Then: 新しいハッシュ・有効期限に更新される
      expect(replaced.getId()).toBe(saved.getId());
      expect(replaced.getTokenHash()).toBe('f'.repeat(64));
      expect(replaced.getExpiresAt()).toEqual(
        new Date('2031-01-01T00:00:00.000Z'),
      );

      // Then: 旧ハッシュでは検索できず、email単位で行は1件のまま
      const rows = await db
        .select()
        .from(viewerAccessTokens)
        .where(sql`lower(${viewerAccessTokens.email}) = lower(${testEmail})`);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.tokenHash).toBe('f'.repeat(64));
    });

    test('旧値へ再度replaceすることで完全に復元できる（補償操作）', async () => {
      // Given: 保存済みの既存トークン
      const original = ViewerAccessTokenEntity.create({
        email: testEmail,
        rawToken: 'raw-token-original',
        tokenHash: 'g'.repeat(64),
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      });
      const saved = await repository.save(original);
      const originalHash = saved.getTokenHash();
      const originalExpiresAt = saved.getExpiresAt();

      // When: 新しい値へ置き換えた後、旧値へ再度置き換える（補償操作の再現）
      await repository.replace(
        saved.getId(),
        'h'.repeat(64),
        new Date('2031-01-01T00:00:00.000Z'),
      );
      const restored = await repository.replace(
        saved.getId(),
        originalHash,
        originalExpiresAt,
      );

      // Then: 元のハッシュ・有効期限に完全に復元される
      expect(restored.getTokenHash()).toBe(originalHash);
      expect(restored.getExpiresAt()).toEqual(originalExpiresAt);
    });

    test('存在しないIDを置き換えようとするとエラーになる', async () => {
      // When & Then: 存在しないIDの置き換えはエラーになる
      await expect(
        repository.replace(
          '999e4567-e89b-12d3-a456-426614174999',
          'i'.repeat(64),
          new Date('2030-01-01T00:00:00.000Z'),
        ),
      ).rejects.toThrow();
    });
  });
});

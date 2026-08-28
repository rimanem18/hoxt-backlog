import { describe, expect, test } from 'bun:test';
import { ProjectViewerEntity } from '../ProjectViewerEntity';

describe('ProjectViewerEntity', () => {
  describe('create', () => {
    test('新規招待がactive状態で生成される', () => {
      // Given: projectIdとemail
      const projectId = 'project-1';
      const email = 'viewer@example.com';

      // When: 新規招待を生成
      const viewer = ProjectViewerEntity.create({ projectId, email });

      // Then: active状態でrevokedAtがnull
      expect(viewer.getStatus()).toBe('active');
      expect(viewer.getRevokedAt()).toBeNull();
      expect(viewer.getProjectId()).toBe(projectId);
      expect(viewer.getEmail()).toBe('viewer@example.com');
    });

    test('emailが正規化（trim + 小文字化）されて保持される', () => {
      // Given: 前後空白と大文字を含むemail
      const email = '  Viewer@Example.COM  ';

      // When: 新規招待を生成
      const viewer = ProjectViewerEntity.create({
        projectId: 'project-1',
        email,
      });

      // Then: 正規化された値が保持される
      expect(viewer.getEmail()).toBe('viewer@example.com');
    });

    test('生成のたびに異なるidが割り振られる', () => {
      // Given: 同一の入力
      const input = { projectId: 'project-1', email: 'viewer@example.com' };

      // When: 2件の招待を生成
      const first = ProjectViewerEntity.create(input);
      const second = ProjectViewerEntity.create(input);

      // Then: idが異なる
      expect(first.getId()).not.toBe(second.getId());
    });
  });

  describe('reconstruct', () => {
    test('永続化データから復元できる', () => {
      // Given: 永続化済みのプロパティ
      const props = {
        id: 'viewer-1',
        projectId: 'project-1',
        email: 'viewer@example.com',
        status: 'revoked' as const,
        invitedAt: new Date('2026-01-01T00:00:00.000Z'),
        revokedAt: new Date('2026-01-02T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      };

      // When: エンティティを復元
      const viewer = ProjectViewerEntity.reconstruct(props);

      // Then: プロパティがそのまま保持される
      expect(viewer.getId()).toBe('viewer-1');
      expect(viewer.getStatus()).toBe('revoked');
      expect(viewer.getRevokedAt()).toEqual(props.revokedAt);
    });
  });

  describe('revoke', () => {
    test('active状態からrevoke()するとstatusがrevokedになりrevokedAtが設定される', () => {
      // Given: active状態の招待
      const viewer = ProjectViewerEntity.create({
        projectId: 'project-1',
        email: 'viewer@example.com',
      });

      // When: 取り消しを実行
      viewer.revoke();

      // Then: statusがrevokedかつrevokedAtが設定される
      expect(viewer.getStatus()).toBe('revoked');
      expect(viewer.getRevokedAt()).not.toBeNull();
    });
  });

  describe('restore', () => {
    test('revoked状態からrestore()するとstatusがactiveに戻りrevokedAtがクリアされる', () => {
      // Given: revoked状態の招待
      const viewer = ProjectViewerEntity.reconstruct({
        id: 'viewer-1',
        projectId: 'project-1',
        email: 'viewer@example.com',
        status: 'revoked',
        invitedAt: new Date('2026-01-01T00:00:00.000Z'),
        revokedAt: new Date('2026-01-02T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      });

      // When: 復元を実行
      viewer.restore();

      // Then: statusがactiveかつrevokedAtがnullになる
      expect(viewer.getStatus()).toBe('active');
      expect(viewer.getRevokedAt()).toBeNull();
    });
  });

  describe('equals', () => {
    test('同一idのエンティティは同一と判定される', () => {
      // Given: 同一idを持つ2つのエンティティ
      const props = {
        id: 'viewer-1',
        projectId: 'project-1',
        email: 'viewer@example.com',
        status: 'active' as const,
        invitedAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const first = ProjectViewerEntity.reconstruct(props);
      const second = ProjectViewerEntity.reconstruct(props);

      // When & Then: 同一と判定される
      expect(first.equals(second)).toBe(true);
    });

    test('異なるidのエンティティは異なると判定される', () => {
      // Given: 異なるidを持つ2つのエンティティ
      const first = ProjectViewerEntity.create({
        projectId: 'project-1',
        email: 'viewer-a@example.com',
      });
      const second = ProjectViewerEntity.create({
        projectId: 'project-1',
        email: 'viewer-b@example.com',
      });

      // When & Then: 異なると判定される
      expect(first.equals(second)).toBe(false);
    });
  });
});

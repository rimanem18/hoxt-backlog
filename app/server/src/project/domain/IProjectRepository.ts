import type { ProjectEntity } from './ProjectEntity';

/**
 * プロジェクトリポジトリインターフェース
 *
 * プロジェクト集約の永続化契約を定義する。
 * Domain層で定義し、Infrastructure層で実装される。
 */
export interface IProjectRepository {
  /**
   * プロジェクトを保存する（新規作成）
   * @param project - 保存するProjectEntity
   * @returns 保存されたProjectEntity
   */
  save(project: ProjectEntity): Promise<ProjectEntity>;
}

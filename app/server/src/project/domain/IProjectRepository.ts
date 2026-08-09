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

  /**
   * ユーザーIDとプロジェクトIDでプロジェクトを取得する
   * @param userId - プロジェクト所有者のユーザーID
   * @param projectId - 取得するプロジェクトのID
   * @returns 見つかったProjectEntity、存在しない場合はnull
   */
  findById(userId: string, projectId: string): Promise<ProjectEntity | null>;

  /**
   * 指定ユーザーが所有するプロジェクトを全件取得する
   * @param userId - プロジェクト所有者のユーザーID
   * @returns ProjectEntityの配列
   */
  findByUserId(userId: string): Promise<ProjectEntity[]>;

  /**
   * プロジェクトを更新する（検証済みEntityを永続化）
   * @param userId - プロジェクト所有者のユーザーID
   * @param projectId - 更新対象のプロジェクトID
   * @param project - 更新済みの内容を持つProjectEntity
   * @returns 更新されたProjectEntity、所有者本人でない場合はnull
   */
  update(
    userId: string,
    projectId: string,
    project: ProjectEntity,
  ): Promise<ProjectEntity | null>;
}

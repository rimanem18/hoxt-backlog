import type { ProjectEntity } from '@/project/domain/ProjectEntity';

/**
 * プロジェクト更新ユースケースの入力データ
 */
export interface UpdateProjectInput {
  /** 認証済みユーザーID */
  userId: string;
  /** 更新対象のプロジェクトID */
  projectId: string;
  /** 更新後のプロジェクト名（未指定の場合は変更しない） */
  name?: string;
  /** 更新後のプロジェクト説明（未指定の場合は変更しない） */
  description?: string;
}

/**
 * プロジェクト更新ユースケース
 */
export interface IUpdateProjectUseCase {
  /**
   * プロジェクトを更新する
   *
   * @param input - 更新条件（userId, projectId, name, description）
   * @returns 更新されたProjectEntity
   * @throws {ProjectNotFoundError} プロジェクトが見つからない場合
   * @throws {InvalidProjectDataError} 名前が不正な場合
   */
  execute(input: UpdateProjectInput): Promise<ProjectEntity>;
}

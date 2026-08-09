import type { ProjectEntity } from '@/project/domain/ProjectEntity';

/**
 * プロジェクト作成ユースケースの入力データ
 */
export interface CreateProjectInput {
  userId: string;
  name: string;
  description?: string;
}

/**
 * プロジェクト作成ユースケース
 */
export interface ICreateProjectUseCase {
  /**
   * プロジェクトを作成する
   *
   * @param input - プロジェクト作成に必要な入力データ
   * @returns 作成されたProjectEntity
   * @throws {InvalidProjectDataError} 名前が不正な場合
   */
  execute(input: CreateProjectInput): Promise<ProjectEntity>;
}

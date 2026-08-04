import type { ProjectEntity } from '@/project/domain/ProjectEntity';

/**
 * プロジェクト一覧取得ユースケースの入力
 */
export interface GetProjectsInput {
  userId: string;
}

/**
 * プロジェクト一覧取得ユースケース
 */
export interface IGetProjectsUseCase {
  /**
   * プロジェクト一覧を取得する
   *
   * @param input - 取得条件（userId）
   * @returns ProjectEntity配列
   */
  execute(input: GetProjectsInput): Promise<ProjectEntity[]>;
}

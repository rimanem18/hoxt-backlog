import type { ProjectEntity } from '@/project/domain/ProjectEntity';

/**
 * プロジェクト詳細取得ユースケースの入力データ
 */
export interface GetProjectByIdInput {
  /** 認証済みユーザーID */
  userId: string;
  /** 取得対象のプロジェクトID */
  projectId: string;
}

/**
 * プロジェクト詳細取得ユースケース
 */
export interface IGetProjectByIdUseCase {
  /**
   * プロジェクト詳細を取得する
   *
   * @param input - 取得条件（userId, projectId）
   * @returns 取得されたProjectEntity
   * @throws {ProjectNotFoundError} プロジェクトが見つからない場合
   */
  execute(input: GetProjectByIdInput): Promise<ProjectEntity>;
}

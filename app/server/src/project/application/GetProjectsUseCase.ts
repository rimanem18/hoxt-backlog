import type { IProjectRepository } from '@/project/domain/IProjectRepository';
import type { ProjectEntity } from '@/project/domain/ProjectEntity';
import type {
  GetProjectsInput,
  IGetProjectsUseCase,
} from './IGetProjectsUseCase';

/**
 * プロジェクト一覧取得ユースケース
 *
 * ユーザーが所有するプロジェクトを取得する。
 */
export class GetProjectsUseCase implements IGetProjectsUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  /**
   * プロジェクト一覧を取得する
   *
   * @param input - 取得条件（userId）
   * @returns ProjectEntity配列
   */
  execute(input: GetProjectsInput): Promise<ProjectEntity[]> {
    return this.projectRepository.findByUserId(input.userId);
  }
}

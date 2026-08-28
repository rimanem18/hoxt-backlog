import type { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';

/**
 * プロジェクト閲覧者一覧取得ユースケースの入力データ
 */
export interface ListProjectViewersInput {
  /** project作成者のユーザーID */
  userId: string;
  /** 対象プロジェクトID */
  projectId: string;
}

/**
 * プロジェクト閲覧者一覧取得ユースケースインターフェース
 */
export interface IListProjectViewersUseCase {
  execute(input: ListProjectViewersInput): Promise<ProjectViewerEntity[]>;
}

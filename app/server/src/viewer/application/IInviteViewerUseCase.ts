import type { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';

/**
 * viewer招待ユースケースの入力データ
 */
export interface InviteViewerInput {
  /** project作成者のユーザーID */
  userId: string;
  /** 招待対象のプロジェクトID */
  projectId: string;
  /** 招待先メールアドレス（正規化前） */
  email: string;
}

/**
 * viewer招待ユースケースインターフェース
 */
export interface IInviteViewerUseCase {
  execute(input: InviteViewerInput): Promise<ProjectViewerEntity>;
}

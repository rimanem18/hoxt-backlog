/**
 * viewerがアクセス可能なプロジェクト取得ユースケースの入力
 */
export interface GetViewerAccessibleProjectsInput {
  /** 正規化済みメールアドレス */
  viewerEmail: string;
}

/**
 * viewerがアクセス可能なタスクDTO
 */
export interface ViewerAccessibleTaskDTO {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
}

/**
 * viewerがアクセス可能なプロジェクトDTO
 */
export interface ViewerAccessibleProjectDTO {
  projectId: string;
  projectName: string;
  tasks: ViewerAccessibleTaskDTO[];
}

/**
 * viewerがアクセス可能なプロジェクト取得ユースケースインターフェース
 */
export interface IGetViewerAccessibleProjectsUseCase {
  execute(
    input: GetViewerAccessibleProjectsInput,
  ): Promise<ViewerAccessibleProjectDTO[]>;
}

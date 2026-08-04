import { ProjectDomainError } from './ProjectDomainError';

/**
 * プロジェクト不存在エラー
 *
 * 指定されたプロジェクトIDでプロジェクトが見つからない場合にスローされる。
 * HTTPステータス404に対応。
 */
export class ProjectNotFoundError extends ProjectDomainError {
  readonly code = 'PROJECT_NOT_FOUND';

  /**
   * プロジェクト不存在エラーを初期化する
   * @param projectId - 見つからなかったプロジェクトID
   */
  constructor(projectId: string) {
    super(`プロジェクトが見つかりません: ${projectId}`);
  }

  /**
   * プロジェクトIDによる不存在エラーを作成する
   * @param projectId - 見つからなかったプロジェクトID
   * @returns ProjectNotFoundErrorインスタンス
   */
  static forProjectId(projectId: string): ProjectNotFoundError {
    return new ProjectNotFoundError(projectId);
  }
}

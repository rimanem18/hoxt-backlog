import type { ProjectViewerEntity } from './ProjectViewerEntity';

/**
 * プロジェクト閲覧者招待リポジトリインターフェース
 *
 * project×email招待集約の永続化契約を定義する。
 * Domain層で定義し、Infrastructure層で実装される。
 */
export interface IProjectViewerRepository {
  /**
   * projectIdとemailで招待を取得する（active/revoked問わず）
   * @param projectId - プロジェクトID
   * @param email - 正規化済みメールアドレス
   * @returns 見つかったProjectViewerEntity、存在しない場合はnull
   */
  findByProjectAndEmail(
    projectId: string,
    email: string,
  ): Promise<ProjectViewerEntity | null>;

  /**
   * 招待を保存する（新規作成・状態変更後の更新の両方に使用）
   * @param entity - 保存するProjectViewerEntity
   * @returns 保存されたProjectViewerEntity
   */
  save(entity: ProjectViewerEntity): Promise<ProjectViewerEntity>;

  /**
   * 招待を削除する（メール送信失敗時の補償操作用）
   * @param id - 削除対象の招待ID
   */
  deleteById(id: string): Promise<void>;
}

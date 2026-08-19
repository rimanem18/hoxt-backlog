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

  /**
   * 招待を取り消す（statusをrevokedにしrevokedAtを設定する）
   * @param id - 取り消し対象の招待ID
   */
  revoke(id: string): Promise<void>;

  /**
   * 取り消し済みの招待を復元する（statusをactiveに戻しrevokedAtをクリアする）
   * @param id - 復元対象の招待ID
   */
  restore(id: string): Promise<void>;

  /**
   * projectIdに紐づくactive状態の招待をemail昇順で取得する
   * @param projectId - プロジェクトID
   * @returns active状態のProjectViewerEntity配列
   */
  findActiveByProject(projectId: string): Promise<ProjectViewerEntity[]>;

  /**
   * emailに紐づくactive状態の招待のprojectId一覧を取得する
   * @param email - 正規化済みメールアドレス
   * @returns active状態の招待のprojectId配列
   */
  findActiveByEmail(email: string): Promise<string[]>;

  /**
   * IDで招待を取得する
   * @param id - 招待ID
   * @returns 見つかったProjectViewerEntity、存在しない場合はnull
   */
  findById(id: string): Promise<ProjectViewerEntity | null>;
}

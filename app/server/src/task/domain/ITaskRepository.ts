import type { TaskEntity } from './TaskEntity';

/**
 * タスクフィルタ条件
 */
export interface TaskFilters {
  /** 優先度フィルタ */
  priority?: string;
  /** ステータスフィルタ（複数選択可能） */
  status?: string[];
}

/**
 * タスクソート順
 */
export type TaskSortBy =
  | 'created_at_desc' // 作成日時（新しい順）
  | 'created_at_asc' // 作成日時（古い順）
  | 'priority_desc'; // 優先度（高→低）

/**
 * タスク更新入力データ
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: string;
}

/**
 * タスクリポジトリインターフェース
 *
 * タスク集約の永続化契約を定義する。
 * Domain層で定義し、Infrastructure層で実装される。
 */
export interface ITaskRepository {
  /**
   * タスクを保存する（新規作成）
   * @param task - 保存するTaskEntity
   * @returns 保存されたTaskEntity
   */
  save(task: TaskEntity): Promise<TaskEntity>;

  /**
   * ユーザーIDでタスク一覧を取得する
   * @param userId - ユーザーID
   * @param filters - フィルタ条件
   * @param sort - ソート順
   * @returns タスクエンティティの配列
   */
  findByUserId(
    userId: string,
    filters: TaskFilters,
    sort: TaskSortBy,
  ): Promise<TaskEntity[]>;

  /**
   * タスクIDとユーザーIDでタスクを取得する
   * @param userId - ユーザーID
   * @param taskId - タスクID
   * @returns タスクエンティティまたはnull
   */
  findById(userId: string, taskId: string): Promise<TaskEntity | null>;

  /**
   * タスクを更新する
   * @param userId - ユーザーID
   * @param taskId - タスクID
   * @param input - 更新データ
   * @returns 更新されたタスクエンティティまたはnull
   */
  update(
    userId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskEntity | null>;

  /**
   * タスクを削除する
   * @param userId - ユーザーID
   * @param taskId - タスクID
   * @returns 削除成功時true
   */
  delete(userId: string, taskId: string): Promise<boolean>;

  /**
   * タスクステータスを変更する
   * @param userId - ユーザーID
   * @param taskId - タスクID
   * @param status - 新しいステータス
   * @returns 更新されたタスクエンティティまたはnull
   */
  updateStatus(
    userId: string,
    taskId: string,
    status: string,
  ): Promise<TaskEntity | null>;
}

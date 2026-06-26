import { randomUUID } from 'node:crypto';
import { TaskPriority } from './valueobjects/TaskPriority';
import { TaskStatus } from './valueobjects/TaskStatus';
import { TaskTitle } from './valueobjects/TaskTitle';

/**
 * TaskEntity生成時の入力データ
 */
export interface CreateTaskEntityInput {
  userId: string;
  title: string;
  description?: string;
  priority?: string;
}

/**
 * TaskEntity復元時のプロパティ
 */
export interface TaskEntityProps {
  id: string;
  userId: string;
  title: TaskTitle;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TaskEntity
 *
 * タスクのドメインエンティティ。
 * DDDの原則に従い、タスクの本質的な振る舞いとビジネスロジックをカプセル化する。
 */
export class TaskEntity {
  private readonly id: string;
  private readonly userId: string;
  private title: TaskTitle;
  private description: string | null;
  private priority: TaskPriority;
  private status: TaskStatus;
  private readonly createdAt: Date;
  private updatedAt: Date;

  /**
   * プライベートコンストラクタ
   * 外部からの直接生成を禁止し、ファクトリメソッドを通じた生成を強制する
   */
  private constructor(props: TaskEntityProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.title = props.title;
    this.description = props.description;
    this.priority = props.priority;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * 新規タスクを作成する静的ファクトリメソッド
   *
   * @param input - 作成に必要な入力データ
   * @returns 新しいTaskEntityインスタンス
   * @throws {Error} バリデーションエラー時
   */
  public static create(input: CreateTaskEntityInput): TaskEntity {
    const now = new Date();

    return new TaskEntity({
      id: randomUUID(),
      userId: input.userId,
      title: TaskTitle.create(input.title),
      description: input.description ?? null,
      priority: TaskPriority.create(input.priority ?? 'medium'),
      status: TaskStatus.create('not_started'),
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * DBから復元する静的ファクトリメソッド
   * バリデーションは行わない（値オブジェクトは呼び出し側で生成済み）
   *
   * @param props - 復元に必要なプロパティ
   * @returns 復元されたTaskEntityインスタンス
   */
  public static reconstruct(props: TaskEntityProps): TaskEntity {
    return new TaskEntity(props);
  }

  // ==========================================================================
  // ゲッター
  // ==========================================================================

  public getId(): string {
    return this.id;
  }

  public getUserId(): string {
    return this.userId;
  }

  public getTitle(): string {
    return this.title.getValue();
  }

  public getDescription(): string | null {
    return this.description;
  }

  public getPriority(): string {
    return this.priority.getValue();
  }

  public getStatus(): string {
    return this.status.getValue();
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ==========================================================================
  // ビジネスロジック
  // ==========================================================================

  /**
   * タイトルを更新する
   *
   * @param title - 新しいタイトル
   * @throws {Error} バリデーションエラー時
   */
  public updateTitle(title: string): void {
    this.title = TaskTitle.create(title);
    this.touch();
  }

  /**
   * 説明を更新する
   *
   * @param description - 新しい説明（nullで削除）
   */
  public updateDescription(description: string | null): void {
    this.description = description;
    this.touch();
  }

  /**
   * 優先度を変更する
   *
   * @param priority - 新しい優先度
   * @throws {Error} バリデーションエラー時
   */
  public changePriority(priority: string): void {
    this.priority = TaskPriority.create(priority);
    this.touch();
  }

  /**
   * ステータスを変更する
   *
   * @param status - 新しいステータス
   * @throws {Error} バリデーションエラー時
   */
  public changeStatus(status: string): void {
    this.status = TaskStatus.create(status);
    this.touch();
  }

  /**
   * 他のTaskEntityと同一性を比較する
   * エンティティはIDによって同一性が決まる
   *
   * @param other - 比較対象のTaskEntity
   * @returns 同一の場合true
   */
  public equals(other: TaskEntity): boolean {
    return this.id === other.id;
  }

  /**
   * updatedAtを現在時刻に更新する
   */
  private touch(): void {
    this.updatedAt = new Date();
  }
}

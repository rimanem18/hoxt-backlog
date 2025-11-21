/**
 * 許容されるステータス値の定数配列（Single Source of Truth）
 */
const TASK_STATUS_VALUES = [
  'not_started',
  'in_progress',
  'in_review',
  'completed',
] as const;

/**
 * タスクステータスの型定義
 */
export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number];

/**
 * TaskStatus 値オブジェクト
 *
 * タスクのステータスを表現する値オブジェクト。
 * DDD原則に従い、ステータスという概念をイミュータブルな値オブジェクトとしてカプセル化する。
 */
export class TaskStatus {
  /**
   * ステータスの値
   */
  private readonly value: TaskStatusValue;

  /**
   * プライベートコンストラクタ
   * 外部からの直接生成を禁止し、create()メソッドを通じた生成を強制する
   *
   * @param value - ステータスの値
   */
  private constructor(value: TaskStatusValue) {
    this.value = value;
  }

  /**
   * TaskStatusインスタンスを生成する静的ファクトリメソッド
   *
   * @param value - ステータスの値（unknown型で受け取り、実行時にバリデーション）
   * @returns TaskStatusインスタンス
   * @throws {Error} 不正なステータス値の場合
   */
  public static create(value: unknown): TaskStatus {
    if (!TaskStatus.isValid(value)) {
      throw new Error(
        `不正なステータスです: ${value} (許容値: ${TASK_STATUS_VALUES.join(', ')})`,
      );
    }
    return new TaskStatus(value);
  }

  /**
   * ステータスの値を取得する
   *
   * @returns ステータスの値
   */
  public getValue(): TaskStatusValue {
    return this.value;
  }

  /**
   * 他のTaskStatusインスタンスと等価性を比較する
   *
   * @param other - 比較対象のTaskStatusインスタンス
   * @returns 等価の場合true、そうでない場合false
   */
  public equals(other: TaskStatus): boolean {
    return this.value === other.value;
  }

  /**
   * ステータスが完了状態かどうかを判定する
   *
   * @returns 完了状態の場合true、それ以外の場合false
   */
  public isCompleted(): boolean {
    return this.value === 'completed';
  }

  /**
   * 値が有効なステータスかを判定する型ガード関数
   *
   * @param value - 検証対象の値
   * @returns 有効なステータスの場合true
   */
  private static isValid(value: unknown): value is TaskStatusValue {
    return (
      typeof value === 'string' &&
      (TASK_STATUS_VALUES as readonly string[]).includes(value)
    );
  }
}

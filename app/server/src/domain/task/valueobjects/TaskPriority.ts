/**
 * 許容される優先度値の定数配列（Single Source of Truth）
 */
const TASK_PRIORITY_VALUES = ['high', 'medium', 'low'] as const;

/**
 * タスク優先度の型定義
 */
export type TaskPriorityValue = (typeof TASK_PRIORITY_VALUES)[number];

/**
 * TaskPriority 値オブジェクト
 *
 * タスクの優先度を表現する値オブジェクト。
 * DDD原則に従い、優先度という概念をイミュータブルな値オブジェクトとしてカプセル化する。
 */
export class TaskPriority {
  /**
   * 優先度の値
   */
  private readonly value: TaskPriorityValue;

  /**
   * プライベートコンストラクタ
   * 外部からの直接生成を禁止し、create()メソッドを通じた生成を強制する
   *
   * @param value - 優先度の値
   */
  private constructor(value: TaskPriorityValue) {
    this.value = value;
  }

  /**
   * TaskPriorityインスタンスを生成する静的ファクトリメソッド
   *
   * @param value - 優先度の値（unknown型で受け取り、実行時にバリデーション）
   * @returns TaskPriorityインスタンス
   * @throws {Error} 不正な優先度値の場合
   */
  public static create(value: unknown): TaskPriority {
    if (!TaskPriority.isValid(value)) {
      throw new Error(
        `不正な優先度です: ${value} (許容値: ${TASK_PRIORITY_VALUES.join(', ')})`,
      );
    }
    return new TaskPriority(value);
  }

  /**
   * 優先度の値を取得する
   *
   * @returns 優先度の値
   */
  public getValue(): TaskPriorityValue {
    return this.value;
  }

  /**
   * 他のTaskPriorityインスタンスと等価性を比較する
   *
   * @param other - 比較対象のTaskPriorityインスタンス
   * @returns 等価の場合true、そうでない場合false
   */
  public equals(other: TaskPriority): boolean {
    return this.value === other.value;
  }

  /**
   * 値が有効な優先度かを判定する型ガード関数
   *
   * @param value - 検証対象の値
   * @returns 有効な優先度の場合true
   */
  private static isValid(value: unknown): value is TaskPriorityValue {
    return (
      typeof value === 'string' &&
      (TASK_PRIORITY_VALUES as readonly string[]).includes(value)
    );
  }
}

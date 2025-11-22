/**
 * タイトルの長さ制約定数
 */
const TASK_TITLE_CONSTRAINTS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 100,
} as const;

/**
 * TaskTitle 値オブジェクト
 *
 * タスクのタイトルを表現する値オブジェクト。
 * DDD原則に従い、タイトルという概念をイミュータブルな値オブジェクトとしてカプセル化する。
 */
export class TaskTitle {
  /**
   * タイトルの値
   */
  private readonly value: string;

  /**
   * プライベートコンストラクタ
   * 外部からの直接生成を禁止し、create()メソッドを通じた生成を強制する
   *
   * @param value - タイトルの値
   */
  private constructor(value: string) {
    this.value = value;
  }

  /**
   * TaskTitleインスタンスを生成する静的ファクトリメソッド
   *
   * @param value - タイトルの値（unknown型で受け取り、実行時にバリデーション）
   * @returns TaskTitleインスタンス
   * @throws {Error} 不正なタイトル値の場合
   */
  public static create(value: unknown): TaskTitle {
    const trimmed = typeof value === 'string' ? value.trim() : '';

    if (trimmed.length < TASK_TITLE_CONSTRAINTS.MIN_LENGTH) {
      throw new Error('タイトルを入力してください');
    }

    if (trimmed.length > TASK_TITLE_CONSTRAINTS.MAX_LENGTH) {
      throw new Error(
        `タイトルは${TASK_TITLE_CONSTRAINTS.MAX_LENGTH}文字以内で入力してください`,
      );
    }

    return new TaskTitle(trimmed);
  }

  /**
   * タイトルの値を取得する
   *
   * @returns タイトルの値
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * 他のTaskTitleインスタンスと等価性を比較する
   *
   * @param other - 比較対象のTaskTitleインスタンス
   * @returns 等価の場合true、そうでない場合false
   */
  public equals(other: TaskTitle): boolean {
    return this.value === other.value;
  }
}

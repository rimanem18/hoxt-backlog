import { InvalidProjectDataError } from '../errors';

/**
 * プロジェクト名の長さ制約定数
 */
const PROJECT_NAME_CONSTRAINTS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 100,
} as const;

/**
 * ProjectName 値オブジェクト
 *
 * プロジェクトの名前を表現する値オブジェクト。
 * DDD原則に従い、プロジェクト名という概念をイミュータブルな値オブジェクトとしてカプセル化する。
 */
export class ProjectName {
  /**
   * プロジェクト名の値
   */
  private readonly value: string;

  /**
   * プライベートコンストラクタ
   * 外部からの直接生成を禁止し、create()メソッドを通じた生成を強制する
   *
   * @param value - プロジェクト名の値
   */
  private constructor(value: string) {
    this.value = value;
  }

  /**
   * ProjectNameインスタンスを生成する静的ファクトリメソッド
   *
   * @param value - プロジェクト名の値（unknown型で受け取り、実行時にバリデーション）
   * @returns ProjectNameインスタンス
   * @throws {InvalidProjectDataError} 不正なプロジェクト名の場合
   */
  public static create(value: unknown): ProjectName {
    const trimmed = typeof value === 'string' ? value.trim() : '';

    if (trimmed.length < PROJECT_NAME_CONSTRAINTS.MIN_LENGTH) {
      throw new InvalidProjectDataError('名前を入力してください');
    }

    if (trimmed.length > PROJECT_NAME_CONSTRAINTS.MAX_LENGTH) {
      throw new InvalidProjectDataError('名前は100文字以内で入力してください');
    }

    return new ProjectName(trimmed);
  }

  /**
   * プロジェクト名の値を取得する
   *
   * @returns プロジェクト名の値
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * 他のProjectNameインスタンスと等価性を比較する
   *
   * @param other - 比較対象のProjectNameインスタンス
   * @returns 等価の場合true、そうでない場合false
   */
  public equals(other: ProjectName): boolean {
    return this.value === other.value;
  }
}

import { randomUUID } from 'node:crypto';
import { ProjectName } from './valueobjects/ProjectName';

/**
 * Projectエンティティ
 *
 * ユーザーが管理するプロジェクトを表現するドメインエンティティ。
 * プロジェクトのライフサイクルと状態を管理する。
 */
export class ProjectEntity {
  /**
   * プロジェクトID
   */
  private readonly id: string;

  /**
   * ユーザーID
   */
  private readonly userId: string;

  /**
   * プロジェクト名（値オブジェクト）
   */
  private name: ProjectName;

  /**
   * プロジェクト説明（オプション）
   */
  private description: string | null;

  /**
   * 作成日時
   */
  private readonly createdAt: Date;

  /**
   * 更新日時
   */
  private updatedAt: Date;

  /**
   * プライベートコンストラクタ
   * 外部からの直接生成を禁止し、create()またはreconstruct()を通じた生成を強制する
   */
  private constructor(
    id: string,
    userId: string,
    name: ProjectName,
    description: string | null,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * 新規プロジェクトを作成する
   *
   * @param props - プロジェクト作成パラメータ
   * @param props.userId - ユーザーID
   * @param props.name - プロジェクト名
   * @param props.description - プロジェクト説明（オプション）
   * @returns 新規作成されたProjectEntity
   */
  public static create(props: {
    userId: string;
    name: string;
    description?: string;
  }): ProjectEntity {
    const now = new Date();

    return new ProjectEntity(
      randomUUID(),
      props.userId,
      ProjectName.create(props.name),
      props.description ?? null,
      now,
      now,
    );
  }

  /**
   * データベースから復元したプロジェクトを再構築する
   *
   * @param props - 復元パラメータ
   * @param props.id - プロジェクトID
   * @param props.userId - ユーザーID
   * @param props.name - プロジェクト名（値オブジェクト）
   * @param props.description - プロジェクト説明
   * @param props.createdAt - 作成日時
   * @param props.updatedAt - 更新日時
   * @returns 復元されたProjectEntity
   */
  public static reconstruct(props: {
    id: string;
    userId: string;
    name: ProjectName;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectEntity {
    return new ProjectEntity(
      props.id,
      props.userId,
      props.name,
      props.description,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * プロジェクトIDを取得
   */
  public getId(): string {
    return this.id;
  }

  /**
   * ユーザーIDを取得
   */
  public getUserId(): string {
    return this.userId;
  }

  /**
   * プロジェクト名を取得
   */
  public getName(): string {
    return this.name.getValue();
  }

  /**
   * プロジェクト説明を取得
   */
  public getDescription(): string | null {
    return this.description;
  }

  /**
   * 作成日時を取得
   */
  public getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * 更新日時を取得
   */
  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * プロジェクト名を更新する
   *
   * @param name - 新しいプロジェクト名
   * @throws {InvalidProjectDataError} 名前が不正な場合
   */
  public updateName(name: unknown): void {
    this.name = ProjectName.create(name);
    this.touch();
  }

  /**
   * プロジェクト説明を更新する
   *
   * @param description - 新しいプロジェクト説明
   */
  public updateDescription(description: string | undefined): void {
    this.description = description ?? null;
    this.touch();
  }

  /**
   * 更新日時を現在時刻に更新する
   */
  private touch(): void {
    this.updatedAt = new Date();
  }
}

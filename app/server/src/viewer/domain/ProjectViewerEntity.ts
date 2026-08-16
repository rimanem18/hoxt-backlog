import { randomUUID } from 'node:crypto';
import { EmailAddress } from '@/shared/domain/valueobjects/EmailAddress';

/**
 * ProjectViewerEntity生成時の入力データ
 */
export interface CreateProjectViewerEntityInput {
  projectId: string;
  email: string;
}

/**
 * ProjectViewerEntity復元時のプロパティ
 */
export interface ProjectViewerEntityProps {
  id: string;
  projectId: string;
  email: string;
  status: 'active' | 'revoked';
  invitedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ProjectViewerEntity
 *
 * プロジェクト閲覧者招待のドメインエンティティ。
 */
export class ProjectViewerEntity {
  private readonly id: string;
  private readonly projectId: string;
  private readonly email: EmailAddress;
  private status: 'active' | 'revoked';
  private readonly invitedAt: Date;
  private revokedAt: Date | null;
  private readonly createdAt: Date;
  private updatedAt: Date;

  /**
   * プライベートコンストラクタ
   * 外部からの直接生成を禁止し、ファクトリメソッドを通じた生成を強制する
   */
  private constructor(props: {
    id: string;
    projectId: string;
    email: EmailAddress;
    status: 'active' | 'revoked';
    invitedAt: Date;
    revokedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.projectId = props.projectId;
    this.email = props.email;
    this.status = props.status;
    this.invitedAt = props.invitedAt;
    this.revokedAt = props.revokedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * 新規招待を作成する静的ファクトリメソッド
   *
   * @param input - 作成に必要な入力データ
   * @returns 新しいProjectViewerEntityインスタンス
   */
  public static create(
    input: CreateProjectViewerEntityInput,
  ): ProjectViewerEntity {
    const now = new Date();

    return new ProjectViewerEntity({
      id: randomUUID(),
      projectId: input.projectId,
      email: EmailAddress.of(input.email),
      status: 'active',
      invitedAt: now,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * DBから復元する静的ファクトリメソッド
   * バリデーションは行わない
   *
   * @param props - 復元に必要なプロパティ
   * @returns 復元されたProjectViewerEntityインスタンス
   */
  public static reconstruct(
    props: ProjectViewerEntityProps,
  ): ProjectViewerEntity {
    return new ProjectViewerEntity({
      id: props.id,
      projectId: props.projectId,
      email: EmailAddress.of(props.email),
      status: props.status,
      invitedAt: props.invitedAt,
      revokedAt: props.revokedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  // ==========================================================================
  // ゲッター
  // ==========================================================================

  public getId(): string {
    return this.id;
  }

  public getProjectId(): string {
    return this.projectId;
  }

  public getEmail(): string {
    return this.email.value;
  }

  public getStatus(): 'active' | 'revoked' {
    return this.status;
  }

  public getRevokedAt(): Date | null {
    return this.revokedAt;
  }

  public getInvitedAt(): Date {
    return this.invitedAt;
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
   * 招待を取り消す
   */
  public revoke(): void {
    this.status = 'revoked';
    this.revokedAt = new Date();
    this.touch();
  }

  /**
   * 取り消した招待を復元する
   */
  public restore(): void {
    this.status = 'active';
    this.revokedAt = null;
    this.touch();
  }

  /**
   * 他のProjectViewerEntityと同一性を比較する
   * エンティティはIDによって同一性が決まる
   *
   * @param other - 比較対象のProjectViewerEntity
   * @returns 同一の場合true
   */
  public equals(other: ProjectViewerEntity): boolean {
    return this.id === other.id;
  }

  /**
   * updatedAtを現在時刻に更新する
   */
  private touch(): void {
    this.updatedAt = new Date();
  }
}

import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type {
  AuthProvider,
  CreateUserInput,
  UpdateUserInput,
  User,
} from '@/domain/user';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import { getDatabaseConfig } from '../config/env';
import { getConnection } from './connection';

/**
 * データベースのユーザー行の型定義
 */
interface DBUserRow {
  id: string;
  external_id: string;
  provider: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

/**
 * PostgreSQLユーザーリポジトリ実装
 *
 * IUserRepositoryインターフェースのPostgreSQL実装。
 * ユーザーデータの永続化層を提供し、CRUD操作を実行する。
 * DDD + クリーンアーキテクチャにおけるInfrastructure層のコンポーネント。
 */
export class PostgreSQLUserRepository implements IUserRepository {
  private readonly tableName: string;

  constructor() {
    const config = getDatabaseConfig();
    this.tableName = `${config.tablePrefix}users`;
  }

  /**
   * PostgreSQLエラーかどうかを判定する
   */
  private isPgDatabaseError(
    error: unknown,
  ): error is { code: string; constraint?: string; message: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
    );
  }

  /**
   * データベースエラーをドメインエラーに変換する
   */
  private handleDatabaseError(error: unknown): never {
    if (this.isPgDatabaseError(error)) {
      if (error.code === '23505') {
        if (error.constraint === 'unique_external_id_provider') {
          throw new Error('外部IDとプロバイダーの組み合わせが既に存在します');
        }
        if (error.constraint?.includes('email')) {
          throw new Error('メールアドレスが既に登録されています');
        }
      }

      if (error.code === 'ECONNREFUSED') {
        throw new Error('データベースへの接続に失敗しました');
      }

      throw new Error(`データベースエラー: ${error.message}`);
    }

    throw new Error(
      `データベースエラー: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  /**
   * データベースの行をUserオブジェクトに変換する
   */
  private rowToUser(row: DBUserRow): User {
    return {
      id: row.id,
      externalId: row.external_id,
      provider: row.provider as AuthProvider,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  }
  /**
   * 外部IDとプロバイダーでユーザーを検索
   *
   * JWT認証時の高速検索用。複合インデックスを使用。
   *
   * @param externalId - 外部プロバイダーでのユーザーID
   * @param provider - 認証プロバイダー種別
   * @returns ユーザーエンティティまたはnull
   */
  async findByExternalId(
    externalId: string,
    provider: AuthProvider,
  ): Promise<User | null> {
    try {
      const client = await getConnection();
      try {
        const query = `SELECT * FROM ${this.tableName} WHERE external_id = $1 AND provider = $2`;
        const result = await client.query<DBUserRow>(query, [
          externalId,
          provider,
        ]);

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        if (!row) {
          return null;
        }
        return this.rowToUser(row);
      } finally {
        client.release();
      }
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  /**
   * ユーザーIDでユーザーを検索
   *
   * @param id - ユーザー固有ID（UUID v4）
   * @returns ユーザーエンティティまたはnull
   */
  async findById(id: string): Promise<User | null> {
    // UUID形式の検証
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('無効なUUID形式です');
    }

    try {
      const client = await getConnection();
      try {
        const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
        const result = await client.query<DBUserRow>(query, [id]);

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        if (!row) {
          return null;
        }
        return this.rowToUser(row);
      } finally {
        client.release();
      }
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  /**
   * メールアドレスでユーザーを検索
   *
   * @param email - メールアドレス
   * @returns ユーザーエンティティまたはnull
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const client = await getConnection();
      try {
        // 大文字小文字を区別しない検索
        const query = `SELECT * FROM ${this.tableName} WHERE LOWER(email) = LOWER($1)`;
        const result = await client.query<DBUserRow>(query, [email]);

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        if (!row) {
          return null;
        }
        return this.rowToUser(row);
      } finally {
        client.release();
      }
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  /**
   * 新規ユーザー作成
   *
   * JITプロビジョニング時に使用。
   *
   * @param input - ユーザー作成時の値オブジェクト
   * @returns 作成されたユーザーエンティティ
   * @throws 一意制約違反等のデータベースエラー
   */
  async create(input: CreateUserInput): Promise<User> {
    try {
      const client = await getConnection();
      try {
        const now = new Date();
        const query = `
          INSERT INTO ${this.tableName} (
            external_id, provider, email, name, avatar_url, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        const values = [
          input.externalId,
          input.provider,
          input.email,
          input.name,
          input.avatarUrl || null,
          now,
          now,
        ];

        const result = await client.query(query, values);
        const row = result.rows[0];
        if (!row) {
          throw new Error('ユーザー作成に失敗しました');
        }
        return this.rowToUser(row);
      } finally {
        client.release();
      }
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  /**
   * ユーザー情報更新
   *
   * @param id - 更新対象のユーザーID
   * @param input - ユーザー更新時の値オブジェクト
   * @returns 更新されたユーザーエンティティ
   * @throws ユーザーが存在しない場合のエラー
   */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    try {
      const client = await getConnection();
      try {
        // 部分更新用のクエリ構築
        const updateFields: string[] = [];
        const values: Array<string | number | boolean | Date | null> = [];
        let paramIndex = 2; // $1はidで使用

        if (input.name !== undefined) {
          updateFields.push(`name = $${paramIndex}`);
          values.push(input.name);
          paramIndex++;
        }

        if (input.avatarUrl !== undefined) {
          updateFields.push(`avatar_url = $${paramIndex}`);
          values.push(input.avatarUrl || null);
          paramIndex++;
        }

        if (input.lastLoginAt !== undefined) {
          updateFields.push(`last_login_at = $${paramIndex}`);
          values.push(input.lastLoginAt);
          paramIndex++;
        }

        // updated_atは常に更新
        updateFields.push(`updated_at = $${paramIndex}`);
        values.push(new Date());

        const query = `
          UPDATE ${this.tableName} 
          SET ${updateFields.join(', ')}
          WHERE id = $1
          RETURNING *
        `;

        const result = await client.query<DBUserRow>(query, [id, ...values]);

        if (result.rows.length === 0) {
          throw new UserNotFoundError(id);
        }

        const row = result.rows[0];
        if (!row) {
          throw new UserNotFoundError(id);
        }
        return this.rowToUser(row);
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      this.handleDatabaseError(error);
    }
  }

  /**
   * ユーザー削除
   *
   * @param id - 削除対象のユーザーID
   * @throws ユーザーが存在しない場合のエラー
   */
  async delete(id: string): Promise<void> {
    try {
      const client = await getConnection();
      try {
        const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
        const result = await client.query<DBUserRow>(query, [id]);

        if (result.rowCount === 0) {
          throw new UserNotFoundError(id);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      this.handleDatabaseError(error);
    }
  }
}

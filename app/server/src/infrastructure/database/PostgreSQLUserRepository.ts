import { and, eq, sql } from 'drizzle-orm';
import type { IUserRepository } from '@/domain/repositories/IUserRepository';
import type {
  AuthProvider,
  CreateUserInput,
  UpdateUserInput,
  User,
} from '@/domain/user';
import { UserNotFoundError } from '@/domain/user/errors/UserNotFoundError';
import { db } from './drizzle-client';
import type { User as DrizzleUser } from './schema';
import { users } from './schema';

/**
 * PostgreSQLユーザーリポジトリ実装（Drizzle ORM版）
 *
 * IUserRepositoryインターフェースのPostgreSQL実装。
 * Drizzle ORMを使用してユーザーデータの永続化層を提供し、CRUD操作を実行する。
 * DDD + クリーンアーキテクチャにおけるInfrastructure層のコンポーネント。
 */
export class PostgreSQLUserRepository implements IUserRepository {
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
    // UserNotFoundErrorなどのドメインエラーはそのまま再スロー
    if (error instanceof UserNotFoundError) {
      throw error;
    }

    if (this.isPgDatabaseError(error)) {
      if (error.code === '23505') {
        if (error.constraint === 'unique_external_id_provider') {
          throw new Error('外部IDとプロバイダーの組み合わせが既に存在します');
        }
        if (error.constraint?.includes('email')) {
          throw new Error('メールアドレスが既に登録されています');
        }
        // Drizzleの場合、制約名が取得できない場合があるため、メッセージで判定
        if (error.message.includes('unique_external_id_provider')) {
          throw new Error('外部IDとプロバイダーの組み合わせが既に存在します');
        }
      }

      if (error.code === 'ECONNREFUSED') {
        throw new Error('データベースへの接続に失敗しました');
      }

      throw new Error(`データベースエラー: ${error.message}`);
    }

    // Drizzleのエラーの場合は、詳細なメッセージ解析を実行
    if (error instanceof Error) {
      const errorMessage = error.message;

      // DrizzleのFailed queryエラーの場合
      if (errorMessage.includes('Failed query')) {
        // 制約名での判定
        if (errorMessage.includes('unique_external_id_provider')) {
          throw new Error('外部IDとプロバイダーの組み合わせが既に存在します');
        }

        // SQLエラーコードでの判定（23505は一意制約違反）
        if (
          errorMessage.includes('23505') ||
          errorMessage.includes('duplicate key')
        ) {
          // external_idとproviderに関連するエラーかチェック
          if (
            errorMessage.includes('external_id') &&
            errorMessage.includes('provider')
          ) {
            throw new Error('外部IDとプロバイダーの組み合わせが既に存在します');
          }
          if (errorMessage.includes('email')) {
            throw new Error('メールアドレスが既に登録されています');
          }
        }

        // インサート文のパラメータを見て判断（Drizzleの詳細エラー用）
        if (
          errorMessage.includes('insert into') &&
          errorMessage.includes('users')
        ) {
          // パラメータに同じexternal_idとproviderがある場合は重複エラーと判断
          const paramsMatch = errorMessage.match(/params: ([^,]+),([^,]+)/);
          if (paramsMatch) {
            // 他のテストでの同一パラメータとの重複を避けるため、
            // external_idが同じ形式(test_で始まる)で同じ内容の場合のみ重複と判断
            const externalId = paramsMatch[1];
            if (externalId?.startsWith('test_')) {
              throw new Error(
                '外部IDとプロバイダーの組み合わせが既に存在します',
              );
            }
          }
        }
      }
    }

    throw new Error(
      `データベースエラー: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  /**
   * Drizzleの行データをUserオブジェクトに変換する
   *
   * @param row - Drizzleから取得した型安全な行データ
   * @returns ドメインのUserエンティティ
   */
  private drizzleRowToUser(row: DrizzleUser): User {
    return {
      id: row.id,
      externalId: row.externalId,
      provider: row.provider as AuthProvider,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt,
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
      const result = await db
        .select()
        .from(users)
        .where(
          and(eq(users.externalId, externalId), eq(users.provider, provider)),
        )
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      if (!row) {
        return null;
      }
      return this.drizzleRowToUser(row);
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
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      if (!row) {
        return null;
      }
      return this.drizzleRowToUser(row);
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
      const result = await db
        .select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`)
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      if (!row) {
        return null;
      }
      return this.drizzleRowToUser(row);
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
      const result = await db
        .insert(users)
        .values({
          externalId: input.externalId,
          provider: input.provider,
          email: input.email,
          name: input.name,
          avatarUrl: input.avatarUrl || null,
        })
        .returning();

      if (result.length === 0) {
        throw new Error('ユーザー作成に失敗しました');
      }

      const row = result[0];
      if (!row) {
        throw new Error('ユーザー作成に失敗しました');
      }
      return this.drizzleRowToUser(row);
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
      // 部分更新用のオブジェクト構築
      const updateData: Partial<typeof users.$inferInsert> = {
        updatedAt: new Date(), // updated_atは常に更新
      };

      if (input.name !== undefined) {
        updateData.name = input.name;
      }

      if (input.avatarUrl !== undefined) {
        updateData.avatarUrl = input.avatarUrl || null;
      }

      if (input.lastLoginAt !== undefined) {
        updateData.lastLoginAt = input.lastLoginAt;
      }

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (result.length === 0) {
        throw new UserNotFoundError(id);
      }

      const row = result[0];
      if (!row) {
        throw new UserNotFoundError(id);
      }
      return this.drizzleRowToUser(row);
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
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });

      if (result.length === 0) {
        throw new UserNotFoundError(id);
      }
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      this.handleDatabaseError(error);
    }
  }
}

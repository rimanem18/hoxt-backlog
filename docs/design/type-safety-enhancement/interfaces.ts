/**
 * 型安全性強化・API契約強化 - TypeScriptインターフェース定義
 *
 * このファイルは設計文書として、主要な型定義のサンプルを示す。
 * 実際のコードでは、これらの型はDrizzle ORM → Drizzle Zod → OpenAPIの
 * 自動生成フローで生成される。
 *
 * 作成日: 2025-10-12
 * 更新日: 2025-10-12
 */

import { z } from 'zod';

// =============================================================================
// 1. データベーススキーマから生成される型（Drizzle ORM）
// =============================================================================

/**
 * Drizzle ORMのテーブル定義から推論される型
 * 実際は: typeof users.$inferSelect
 */
export interface User {
  /** ユーザーID（UUID v4） */
  id: string;
  /** 外部認証プロバイダーでのユーザーID */
  externalId: string;
  /** 認証プロバイダー種別 */
  provider: 'google' | 'apple' | 'microsoft' | 'github' | 'facebook' | 'line';
  /** メールアドレス（RFC 5321準拠） */
  email: string;
  /** ユーザー名 */
  name: string;
  /** アバターURL（nullable） */
  avatarUrl: string | null;
  /** 作成日時（タイムゾーン付き） */
  createdAt: Date;
  /** 更新日時（タイムゾーン付き） */
  updatedAt: Date;
  /** 最終ログイン日時（nullable） */
  lastLoginAt: Date | null;
}

/**
 * Drizzle ORMのINSERT用型
 * 実際は: typeof users.$inferInsert
 */
export interface NewUser {
  /** ユーザーID（省略可・自動生成） */
  id?: string;
  /** 外部認証プロバイダーでのユーザーID */
  externalId: string;
  /** 認証プロバイダー種別 */
  provider: 'google' | 'apple' | 'microsoft' | 'github' | 'facebook' | 'line';
  /** メールアドレス */
  email: string;
  /** ユーザー名 */
  name: string;
  /** アバターURL（省略可） */
  avatarUrl?: string | null;
  /** 作成日時（省略可・自動生成） */
  createdAt?: Date;
  /** 更新日時（省略可・自動生成） */
  updatedAt?: Date;
  /** 最終ログイン日時（省略可） */
  lastLoginAt?: Date | null;
}

// =============================================================================
// 2. Zodスキーマ定義（Drizzle Zodで自動生成 + カスタマイズ）
// =============================================================================

/**
 * 認証プロバイダー種別のZodスキーマ
 * 実際は: createSelectSchema(users).shape.provider
 */
export const authProviderSchema = z.enum([
  'google',
  'apple',
  'microsoft',
  'github',
  'facebook',
  'line',
]);

/**
 * ユーザーエンティティのZodスキーマ
 * 実際は: createSelectSchema(users)
 */
export const selectUserSchema = z.object({
  id: z.uuid().describe('ユーザーID（UUID v4）'),
  externalId: z
    .string()
    .min(1)
    .describe('外部認証プロバイダーでのユーザーID'),
  provider: authProviderSchema.describe('認証プロバイダー種別'),
  email: z.email().describe('メールアドレス（RFC 5321準拠）'),
  name: z.string().min(1).describe('ユーザー名'),
  avatarUrl: z.string().url().nullable().describe('アバターURL'),
  createdAt: z.date().describe('作成日時（タイムゾーン付き）'),
  updatedAt: z.date().describe('更新日時（タイムゾーン付き）'),
  lastLoginAt: z.date().nullable().describe('最終ログイン日時'),
});

/**
 * ユーザー作成用のZodスキーマ
 * 実際は: createInsertSchema(users)
 */
export const insertUserSchema = z.object({
  externalId: z
    .string()
    .min(1)
    .describe('外部認証プロバイダーでのユーザーID'),
  provider: authProviderSchema.describe('認証プロバイダー種別'),
  email: z.email().describe('メールアドレス'),
  name: z.string().min(1).describe('ユーザー名'),
  avatarUrl: z.string().url().optional().describe('アバターURL'),
});

// =============================================================================
// 3. API契約スキーマ（リクエスト・レスポンス）
// =============================================================================

/**
 * 共通APIレスポンス構造
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean().describe('処理成功フラグ'),
    data: dataSchema.describe('レスポンスデータ'),
  });

/**
 * 共通APIエラーレスポンス構造
 */
export const apiErrorResponseSchema = z.object({
  success: z.literal(false).describe('処理失敗フラグ'),
  error: z
    .object({
      code: z.string().describe('エラーコード（例: VALIDATION_ERROR）'),
      message: z.string().describe('エラーメッセージ'),
      details: z.record(z.any()).optional().describe('エラー詳細（省略可）'),
    })
    .describe('エラー情報'),
});

// =============================================================================
// 4. 認証関連のスキーマ
// =============================================================================

/**
 * 認証コールバックリクエストスキーマ
 */
export const authCallbackRequestSchema = z.object({
  externalId: z
    .string()
    .min(1)
    .describe('外部認証プロバイダーでのユーザーID'),
  provider: authProviderSchema.describe('認証プロバイダー種別'),
  email: z.email().describe('メールアドレス'),
  name: z.string().min(1).describe('ユーザー名'),
  avatarUrl: z.string().url().optional().describe('アバターURL'),
});

export type AuthCallbackRequest = z.infer<typeof authCallbackRequestSchema>;

/**
 * 認証レスポンススキーマ
 */
export const authResponseSchema = apiResponseSchema(selectUserSchema);

export type AuthResponse = z.infer<typeof authResponseSchema>;

// =============================================================================
// 5. ユーザー関連のAPIスキーマ
// =============================================================================

/**
 * ユーザー取得リクエストパラメータ
 */
export const getUserParamsSchema = z.object({
  id: z.uuid().describe('ユーザーID（UUID v4）'),
});

export type GetUserParams = z.infer<typeof getUserParamsSchema>;

/**
 * ユーザー取得レスポンススキーマ
 */
export const getUserResponseSchema = apiResponseSchema(selectUserSchema);

export type GetUserResponse = z.infer<typeof getUserResponseSchema>;

/**
 * ユーザー一覧取得クエリパラメータ
 */
export const listUsersQuerySchema = z.object({
  provider: authProviderSchema.optional().describe('プロバイダーフィルター'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('取得件数（1-100）'),
  offset: z.coerce.number().int().min(0).default(0).describe('オフセット'),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/**
 * ユーザー一覧取得レスポンススキーマ
 */
export const listUsersResponseSchema = apiResponseSchema(
  z.object({
    users: z.array(selectUserSchema).describe('ユーザー一覧'),
    total: z.number().int().describe('総件数'),
    limit: z.number().int().describe('取得件数'),
    offset: z.number().int().describe('オフセット'),
  }),
);

export type ListUsersResponse = z.infer<typeof listUsersResponseSchema>;

/**
 * ユーザー更新リクエストボディ
 */
export const updateUserBodySchema = z.object({
  name: z.string().min(1).optional().describe('ユーザー名'),
  avatarUrl: z.string().url().optional().describe('アバターURL'),
});

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;

/**
 * ユーザー更新レスポンススキーマ
 */
export const updateUserResponseSchema = apiResponseSchema(selectUserSchema);

export type UpdateUserResponse = z.infer<typeof updateUserResponseSchema>;

// =============================================================================
// 6. OpenAPIから自動生成される型定義（フロントエンド）
// =============================================================================

/**
 * OpenAPI仕様から自動生成されるパス定義
 * 実際は: openapi-typescriptで生成
 */
export interface paths {
  '/auth/callback': {
    post: {
      requestBody: {
        content: {
          'application/json': AuthCallbackRequest;
        };
      };
      responses: {
        200: {
          content: {
            'application/json': AuthResponse;
          };
        };
        400: {
          content: {
            'application/json': z.infer<typeof apiErrorResponseSchema>;
          };
        };
      };
    };
  };
  '/users/{id}': {
    get: {
      parameters: {
        path: GetUserParams;
      };
      responses: {
        200: {
          content: {
            'application/json': GetUserResponse;
          };
        };
        404: {
          content: {
            'application/json': z.infer<typeof apiErrorResponseSchema>;
          };
        };
      };
    };
    put: {
      parameters: {
        path: GetUserParams;
      };
      requestBody: {
        content: {
          'application/json': UpdateUserBody;
        };
      };
      responses: {
        200: {
          content: {
            'application/json': UpdateUserResponse;
          };
        };
        400: {
          content: {
            'application/json': z.infer<typeof apiErrorResponseSchema>;
          };
        };
        404: {
          content: {
            'application/json': z.infer<typeof apiErrorResponseSchema>;
          };
        };
      };
    };
  };
  '/users': {
    get: {
      parameters: {
        query: ListUsersQuery;
      };
      responses: {
        200: {
          content: {
            'application/json': ListUsersResponse;
          };
        };
      };
    };
  };
}

// =============================================================================
// 7. 型安全なAPIクライアント型定義（フロントエンド）
// =============================================================================

/**
 * APIクライアントのメソッド型定義
 * openapi-fetchと組み合わせて使用
 */
export type ApiClient = {
  GET<P extends keyof paths>(
    path: P,
    init: {
      params?: paths[P] extends { get: { parameters: infer Params } }
        ? Params
        : never;
    },
  ): Promise<{
    data: paths[P] extends { get: { responses: { 200: { content: { 'application/json': infer Data } } } } }
      ? Data
      : never;
    error?: unknown;
  }>;

  POST<P extends keyof paths>(
    path: P,
    init: {
      body: paths[P] extends { post: { requestBody: { content: { 'application/json': infer Body } } } }
        ? Body
        : never;
    },
  ): Promise<{
    data: paths[P] extends { post: { responses: { 200: { content: { 'application/json': infer Data } } } } }
      ? Data
      : never;
    error?: unknown;
  }>;

  PUT<P extends keyof paths>(
    path: P,
    init: {
      params?: paths[P] extends { put: { parameters: infer Params } }
        ? Params
        : never;
      body: paths[P] extends { put: { requestBody: { content: { 'application/json': infer Body } } } }
        ? Body
        : never;
    },
  ): Promise<{
    data: paths[P] extends { put: { responses: { 200: { content: { 'application/json': infer Data } } } } }
      ? Data
      : never;
    error?: unknown;
  }>;
};

// =============================================================================
// 8. DDD + クリーンアーキテクチャ統合型定義
// =============================================================================

/**
 * Domain層: エンティティ型（Zodスキーマから推論）
 */
export type UserEntity = z.infer<typeof selectUserSchema>;

/**
 * Application層: Use Case入力型
 */
export interface GetUserUseCaseInput {
  userId: string;
}

/**
 * Application層: Use Case出力型
 */
export interface GetUserUseCaseOutput {
  success: boolean;
  data: UserEntity;
}

/**
 * Infrastructure層: Repository型
 */
export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByExternalId(
    externalId: string,
    provider: z.infer<typeof authProviderSchema>,
  ): Promise<UserEntity | null>;
  create(data: z.infer<typeof insertUserSchema>): Promise<UserEntity>;
  update(id: string, data: Partial<UpdateUserBody>): Promise<UserEntity>;
  delete(id: string): Promise<void>;
  list(params: ListUsersQuery): Promise<{
    users: UserEntity[];
    total: number;
  }>;
}

// =============================================================================
// まとめ
// =============================================================================

/**
 * この設計文書では、以下の型定義を示した：
 *
 * 1. データベーススキーマ型（Drizzle ORM）
 * 2. Zodスキーマ定義（Drizzle Zod + カスタマイズ）
 * 3. API契約スキーマ（リクエスト・レスポンス）
 * 4. 認証関連スキーマ
 * 5. ユーザー関連APIスキーマ
 * 6. OpenAPI自動生成型定義（フロントエンド）
 * 7. 型安全なAPIクライアント型
 * 8. DDD + クリーンアーキテクチャ統合型
 *
 * これらの型は、以下のフローで自動生成される：
 * Drizzle ORM → Drizzle Zod → Zod Schemas → OpenAPI → TypeScript Types
 *
 * Single Source of Truth: Drizzle ORMのデータベーススキーマ
 * 型安全性: コンパイル時（TypeScript） + 実行時（Zod）
 */

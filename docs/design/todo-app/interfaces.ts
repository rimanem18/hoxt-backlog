/**
 * TODOリストアプリ TypeScript型定義
 *
 * 作成日: 2025-11-06
 * 要件名: TODO リストアプリ
 * バージョン: 1.0.0
 *
 * 🔵 信頼性レベル: 要件定義書、技術スタックから確実な定義
 *
 * 注意:
 * - このファイルは設計段階の型定義であり、実際の実装では
 *   スキーマ駆動開発フロー(Drizzle → Zod → OpenAPI → TypeScript型定義)に従う
 * - 自動生成される型定義は以下:
 *   - app/packages/shared-schemas/tasks.ts (Zodスキーマ)
 *   - app/client/src/types/api/generated.ts (OpenAPI型定義)
 */

// ============================================================================
// Domain層 型定義
// ============================================================================

/**
 * タスク優先度の型定義
 * 🔵 要件定義書 REQ-005 より
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * タスクステータスの型定義
 * 🔵 要件定義書 REQ-004 より
 */
export type TaskStatus =
  | 'not_started' // 未着手
  | 'in_progress' // 進行中
  | 'in_review' // レビュー中
  | 'completed'; // 完了

/**
 * タスクエンティティ
 * 🔵 要件定義書、技術スタック より
 */
export interface TaskEntity {
  id: string; // UUID
  userId: string; // UUID - 所有ユーザーID
  title: string; // 1-100文字
  description: string | null; // Markdown形式、nullableで任意
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * タスク作成時の入力データ
 * 🔵 要件定義書 REQ-001 より
 */
export interface CreateTaskInput {
  title: string; // 必須、1-100文字
  description?: string; // 任意、Markdown形式
  priority?: TaskPriority; // 任意、デフォルト: 'medium'
  // status はデフォルト 'not_started' で自動設定されるため不要
}

/**
 * タスク更新時の入力データ
 * 🔵 要件定義書 REQ-002 より
 */
export interface UpdateTaskInput {
  title?: string; // 任意、1-100文字
  description?: string | null; // 任意、Markdown形式、null可
  priority?: TaskPriority; // 任意
  // status は別のエンドポイントで更新(ChangeTaskStatusInput)
}

/**
 * タスクステータス変更時の入力データ
 * 🔵 要件定義書 REQ-004 より
 */
export interface ChangeTaskStatusInput {
  status: TaskStatus; // 必須
}

/**
 * タスク一覧取得時のフィルタ
 * 🔵 要件定義書 REQ-201, REQ-202 より
 */
export interface TaskFilters {
  priority?: TaskPriority; // 優先度フィルタ
  status?: TaskStatus[]; // ステータスフィルタ(複数選択可能)
}

/**
 * タスク一覧取得時のソート
 * 🔵 要件定義書 REQ-203 より
 */
export type TaskSortBy =
  | 'created_at_desc' // 作成日時(新しい順) - デフォルト
  | 'created_at_asc' // 作成日時(古い順)
  | 'priority_desc'; // 優先度(高→低)

/**
 * タスク一覧取得時のクエリパラメータ
 * 🔵 要件定義書 REQ-201, REQ-202, REQ-203 より
 */
export interface GetTasksQuery {
  priority?: TaskPriority;
  status?: string; // カンマ区切りの文字列 (例: "not_started,in_progress")
  sort?: TaskSortBy;
}

// ============================================================================
// Application層 型定義
// ============================================================================

/**
 * タスク作成ユースケースの入力
 * 🔵 要件定義書 REQ-001 より
 */
export interface CreateTaskUseCaseInput {
  userId: string; // JWT認証で取得
  input: CreateTaskInput;
}

/**
 * タスク更新ユースケースの入力
 * 🔵 要件定義書 REQ-002 より
 */
export interface UpdateTaskUseCaseInput {
  userId: string; // JWT認証で取得
  taskId: string; // UUID
  input: UpdateTaskInput;
}

/**
 * タスク削除ユースケースの入力
 * 🔵 要件定義書 REQ-003 より
 */
export interface DeleteTaskUseCaseInput {
  userId: string; // JWT認証で取得
  taskId: string; // UUID
}

/**
 * タスク一覧取得ユースケースの入力
 * 🔵 要件定義書 REQ-006, REQ-201, REQ-202, REQ-203 より
 */
export interface GetTasksUseCaseInput {
  userId: string; // JWT認証で取得
  filters: TaskFilters;
  sort: TaskSortBy;
}

/**
 * タスク詳細取得ユースケースの入力
 * 🟡 REST API慣習から推測
 */
export interface GetTaskByIdUseCaseInput {
  userId: string; // JWT認証で取得
  taskId: string; // UUID
}

/**
 * タスクステータス変更ユースケースの入力
 * 🔵 要件定義書 REQ-004 より
 */
export interface ChangeTaskStatusUseCaseInput {
  userId: string; // JWT認証で取得
  taskId: string; // UUID
  input: ChangeTaskStatusInput;
}

// ============================================================================
// Infrastructure層 型定義
// ============================================================================

/**
 * タスクリポジトリインターフェース
 * 🔵 DDD + クリーンアーキテクチャの原則
 */
export interface ITaskRepository {
  /**
   * タスクを作成
   * 🔵 要件定義書 REQ-001 より
   */
  save(task: TaskEntity): Promise<TaskEntity>;

  /**
   * ユーザーIDでタスク一覧を取得(フィルタ・ソート対応)
   * 🔵 要件定義書 REQ-006, REQ-201, REQ-202, REQ-203 より
   */
  findByUserId(
    userId: string,
    filters: TaskFilters,
    sort: TaskSortBy,
  ): Promise<TaskEntity[]>;

  /**
   * タスクIDでタスクを取得
   * 🟡 REST API慣習から推測
   */
  findById(userId: string, taskId: string): Promise<TaskEntity | null>;

  /**
   * タスクを更新
   * 🔵 要件定義書 REQ-002 より
   */
  update(
    userId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskEntity | null>;

  /**
   * タスクを削除
   * 🔵 要件定義書 REQ-003 より
   */
  delete(userId: string, taskId: string): Promise<boolean>;

  /**
   * タスクステータスを変更
   * 🔵 要件定義書 REQ-004 より
   */
  updateStatus(
    userId: string,
    taskId: string,
    status: TaskStatus,
  ): Promise<TaskEntity | null>;
}

// ============================================================================
// Presentation層 型定義(API DTO)
// ============================================================================

/**
 * タスクDTO(Data Transfer Object)
 * API レスポンスで使用
 * 🔵 要件定義書、REST API慣習より
 */
export interface TaskDTO {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string; // ISO 8601形式の文字列
  updatedAt: string; // ISO 8601形式の文字列
}

/**
 * タスク作成APIリクエスト
 * 🔵 要件定義書 REQ-001 より
 */
export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
}

/**
 * タスク作成APIレスポンス
 * 🔵 REST API慣習
 */
export interface CreateTaskResponse {
  success: true;
  data: TaskDTO;
}

/**
 * タスク更新APIリクエスト
 * 🔵 要件定義書 REQ-002 より
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
}

/**
 * タスク更新APIレスポンス
 * 🔵 REST API慣習
 */
export interface UpdateTaskResponse {
  success: true;
  data: TaskDTO;
}

/**
 * タスク一覧取得APIレスポンス
 * 🔵 要件定義書 REQ-006 より
 */
export interface GetTasksResponse {
  success: true;
  data: TaskDTO[];
}

/**
 * タスク詳細取得APIレスポンス
 * 🟡 REST API慣習から推測
 */
export interface GetTaskByIdResponse {
  success: true;
  data: TaskDTO;
}

/**
 * タスクステータス変更APIリクエスト
 * 🔵 要件定義書 REQ-004 より
 */
export interface ChangeTaskStatusRequest {
  status: TaskStatus;
}

/**
 * タスクステータス変更APIレスポンス
 * 🔵 REST API慣習
 */
export interface ChangeTaskStatusResponse {
  success: true;
  data: TaskDTO;
}

/**
 * APIエラーレスポンス
 * 🔵 既存エラーハンドリング方針
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string; // エラーコード(例: "VALIDATION_ERROR", "NOT_FOUND")
    message: string; // エラーメッセージ(日本語)
    details?: Record<string, string[]>; // フィールド別エラー詳細(バリデーションエラー時)
  };
}

/**
 * 共通APIレスポンス型
 * 🔵 REST API慣習
 */
export type ApiResponse<T> = T | ApiErrorResponse;

// ============================================================================
// フロントエンド 型定義
// ============================================================================

/**
 * Redux状態: タスクフィルタ
 * 🔵 要件定義書 REQ-201, REQ-202 より
 */
export interface TaskFilterState {
  priority: TaskPriority | 'all'; // "all"はすべての優先度
  status: TaskStatus[]; // 複数選択可能、空配列=すべて
}

/**
 * Redux状態: タスクソート
 * 🔵 要件定義書 REQ-203 より
 */
export interface TaskSortState {
  sortBy: TaskSortBy;
}

/**
 * Redux状態: タスク管理全体
 * 🔵 技術スタック、CLAUDE.md より
 */
export interface TaskSliceState {
  filters: TaskFilterState;
  sort: TaskSortState;
}

/**
 * TanStack Query: タスク一覧取得のキー
 * 🔵 技術スタック より
 */
export interface TasksQueryKey {
  scope: 'tasks';
  filters: TaskFilters;
  sort: TaskSortBy;
}

/**
 * TanStack Query: タスク詳細取得のキー
 * 🟡 一般的なReact Queryパターン
 */
export interface TaskQueryKey {
  scope: 'task';
  taskId: string;
}

// ============================================================================
// バリデーション 型定義
// ============================================================================

/**
 * タスクタイトルのバリデーション制約
 * 🔵 要件定義書 EDGE-001, EDGE-002 より
 */
export const TASK_TITLE_CONSTRAINTS = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 100,
} as const;

/**
 * タスク説明のバリデーション制約
 * 🔴 推測(データ制限)
 */
export const TASK_DESCRIPTION_CONSTRAINTS = {
  MAX_LENGTH: 10000,
} as const;

/**
 * バリデーションエラー
 * 🔵 要件定義書、CLAUDE.md より
 */
export interface ValidationError {
  field: string; // フィールド名
  message: string; // エラーメッセージ(日本語)
}

// ============================================================================
// エラー 型定義
// ============================================================================

/**
 * ドメインエラー: タスクが見つからない
 * 🔵 要件定義書 EDGE-003 より
 */
export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`タスクが見つかりません: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

/**
 * ドメインエラー: 不正なタスクデータ
 * 🔵 要件定義書、バリデーション要件より
 */
export class InvalidTaskDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTaskDataError';
  }
}

/**
 * ドメインエラー: アクセス権限なし
 * 🔵 要件定義書 EDGE-004 より
 */
export class TaskAccessDeniedError extends Error {
  constructor(taskId: string) {
    super(`このタスクにアクセスする権限がありません: ${taskId}`);
    this.name = 'TaskAccessDeniedError';
  }
}

// ============================================================================
// ユーティリティ 型定義
// ============================================================================

/**
 * TaskEntityをTaskDTOに変換
 * 🔵 REST API慣習
 */
export function toTaskDTO(entity: TaskEntity): TaskDTO {
  return {
    id: entity.id,
    userId: entity.userId,
    title: entity.title,
    description: entity.description,
    priority: entity.priority,
    status: entity.status,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/**
 * 優先度のラベル取得
 * 🔵 要件定義書 REQ-005 より
 */
export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[priority];
}

/**
 * ステータスのラベル取得
 * 🔵 要件定義書 REQ-004 より
 */
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    not_started: '未着手',
    in_progress: '進行中',
    in_review: 'レビュー中',
    completed: '完了',
  };
  return labels[status];
}

/**
 * 優先度の色取得(Tailwind CSS)
 * 🔵 要件定義書 NFR-201、ユーザーストーリー 2.2 より
 */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    high: 'text-[#ff6a00]', // アクセントカラー
    medium: 'text-gray-700',
    low: 'text-gray-400',
  };
  return colors[priority];
}

/**
 * ステータスの色取得(Tailwind CSS)
 * 🔵 要件定義書 REQ-004 より
 */
export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    not_started: 'bg-gray-200 text-gray-700',
    in_progress: 'bg-blue-200 text-blue-700',
    in_review: 'bg-yellow-200 text-yellow-700',
    completed: 'bg-green-200 text-green-700',
  };
  return colors[status];
}

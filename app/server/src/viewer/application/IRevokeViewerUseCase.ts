/**
 * viewer取り消しユースケースの入力データ
 */
export interface RevokeViewerInput {
  /** project作成者のユーザーID */
  userId: string;
  /** 対象プロジェクトID */
  projectId: string;
  /** 取り消し対象の招待ID */
  viewerId: string;
}

/**
 * viewer取り消しユースケースインターフェース
 */
export interface IRevokeViewerUseCase {
  execute(input: RevokeViewerInput): Promise<void>;
}

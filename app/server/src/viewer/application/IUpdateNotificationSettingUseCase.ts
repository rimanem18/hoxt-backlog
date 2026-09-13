import type { ProjectViewerEntity } from '@/viewer/domain/ProjectViewerEntity';

/**
 * 通知設定変更ユースケースの入力データ
 */
export interface UpdateNotificationSettingInput {
  /** viewerアクセストークンから解決した正規化済みメールアドレス */
  viewerEmail: string;
  /** 対象プロジェクトID */
  projectId: string;
  /** 変更後の通知ON/OFF */
  enabled: boolean;
}

/**
 * 通知設定変更ユースケースインターフェース
 */
export interface IUpdateNotificationSettingUseCase {
  execute(input: UpdateNotificationSettingInput): Promise<ProjectViewerEntity>;
}

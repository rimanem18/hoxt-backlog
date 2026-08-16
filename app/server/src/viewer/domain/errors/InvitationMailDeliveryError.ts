import { ViewerDomainError } from './ViewerDomainError';

/**
 * 招待メール配信失敗エラー
 *
 * 招待メールの配信に失敗した場合にスローされる。
 * HTTPステータス502に対応。
 */
export class InvitationMailDeliveryError extends ViewerDomainError {
  readonly code = 'INVITATION_MAIL_DELIVERY_FAILED';
}

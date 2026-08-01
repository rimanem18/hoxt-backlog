import { ProjectDomainError } from './ProjectDomainError';

/**
 * 不正プロジェクトデータエラー
 *
 * プロジェクトのデータが不正な場合にスローされる。
 * HTTPステータス400に対応。
 */
export class InvalidProjectDataError extends ProjectDomainError {
  readonly code = 'INVALID_PROJECT_DATA';
}

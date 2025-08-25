/**
 * JWTトークンのバリデーションを担当するドメインサービス
 *
 * JWT文字列の初期検証（構造チェック、サイズチェック）とセキュリティに関わる基本的な検証を一元管理。
 * 暗号学的検証は別のサービス（IAuthProvider）に委譲。
 */
export interface IJwtValidationService {
  /**
   * JWTトークンの基本的な検証を実行
   *
   * @param jwt JWTトークン文字列
   * @param maxLength 許容される最大文字列長
   * @throws {ValidationError} 検証に失敗した場合
   */
  validateJwt(jwt: string, maxLength: number): void;
}

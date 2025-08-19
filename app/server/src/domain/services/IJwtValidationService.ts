/**
 * JWTトークンのバリデーションを担当するドメインサービス
 * 
 * 【責務】
 * - JWT文字列の初期検証（構造チェック、サイズチェック）
 * - セキュリティに関わる基本的な検証の一元管理
 * 
 * 【設計方針】
 * - 単一責任の原則に従い、JWT検証に特化した関心の分離
 * - 暗号学的検証は別のサービス（IAuthProvider）に委譲
 * 
 * 🟢 セキュリティレビュー + SOLID原則に基づく設計
 */
export interface IJwtValidationService {
  /**
   * JWTトークンの基本的な検証を実行
   * 
   * @param jwt JWTトークン文字列
   * @param maxLength 許容される最大文字列長
   * @throws {ValidationError} 検証に失敗した場合
   * 
   * 【検証内容】
   * - null/undefined/空文字のチェック
   * - トークン長制限のチェック
   * - JWT構造（3つのドット区切りセグメント）の確認
   */
  validateJwt(jwt: string, maxLength: number): void;
}
/**
 * 招待メール送信ゲートウェイインターフェース（Application層 port）
 *
 * InviteViewerUseCaseが依存する外部メール送信操作の抽象化。
 * テスト時はこのインターフェースに対してFake実装を注入する。
 */
export interface IInvitationMailGateway {
  /**
   * 招待メールを送信する
   *
   * @param email - 送信先メールアドレス
   * @param projectName - 招待対象プロジェクト名
   * @param accessUrl - 生トークンを含むviewerアクセスURL
   */
  send(email: string, projectName: string, accessUrl: string): Promise<void>;
}

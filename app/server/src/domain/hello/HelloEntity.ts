/**
 * Hello を表すドメインエンティティ
 * メッセージの不変性とビジネスルールを保証する
 */
export class HelloEntity {
  private constructor(private readonly message: string) {}

  /**
   * メッセージの値を取得する
   * @returns メッセージ文字列
   */
  getValue(): string {
    return this.message;
  }

  /**
   * HelloEntity インスタンスを生成する
   * @param message - メッセージ内容
   * @returns HelloEntity インスタンス
   * @throws Error メッセージが空の場合
   */
  static create(message: string): HelloEntity {
    // ビジネスルール: メッセージは空であってはならない
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    return new HelloEntity(message.trim());
  }
}

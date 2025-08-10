/**
 * Greet を表すドメインエンティティ
 * メッセージの不変性とビジネスルールを保証する
 */
export class GreetEntity {
  private constructor(private readonly message: string) {}

  /**
   * メッセージの値を取得する
   * @returns メッセージ文字列
   */
  getValue(): string {
    return this.message;
  }

  /**
   * GreetEntity インスタンスを生成する
   * @param message - メッセージ内容
   * @returns GreetEntity インスタンス
   * @throws Error メッセージが空の場合
   */
  static create(message: string): GreetEntity {
    // ビジネスルール: メッセージは空であってはならない
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    return new GreetEntity(message.trim());
  }
}

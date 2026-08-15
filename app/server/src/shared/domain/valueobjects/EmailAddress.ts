/**
 * メールアドレス値オブジェクト
 *
 * trim + 小文字化による正規化を保証する。
 */
export class EmailAddress {
  private readonly _value: string;

  /**
   * EmailAddressのコンストラクタ（private）
   *
   * 直接的なインスタンス化を防ぎ、静的ファクトリメソッドの使用を強制。
   *
   * @param value - 正規化済みのメールアドレス
   */
  private constructor(value: string) {
    this._value = value;
  }

  /**
   * 生のメールアドレス文字列からEmailAddressを生成する（静的ファクトリメソッド）
   *
   * @param raw - 正規化前のメールアドレス
   * @returns 正規化済みの値を保持するEmailAddressインスタンス
   */
  public static of(raw: string): EmailAddress {
    return new EmailAddress(raw.trim().toLowerCase());
  }

  /** 正規化済みのメールアドレスを取得 */
  get value(): string {
    return this._value;
  }

  /**
   * 他のEmailAddressと等価かどうかを判定する
   *
   * @param other - 比較対象のEmailAddress
   * @returns 正規化後の値が一致する場合はtrue
   */
  public equals(other: EmailAddress): boolean {
    return this._value === other._value;
  }
}

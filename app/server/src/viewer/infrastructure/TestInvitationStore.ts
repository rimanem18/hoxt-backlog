/**
 * 招待メール送信内容の記録
 */
export interface InvitationRecord {
  recipient: string;
  projectName: string;
  accessUrl: string;
  sentAt: Date;
}

/**
 * TestInvitationStore
 *
 * テスト用に招待メール送信内容をメモリ上に記録するシングルトン。
 * E2E/統合テストからメール送信内容（アクセスURLなど）を検証するために使用する。
 */
export class TestInvitationStore {
  private static instance: TestInvitationStore | null = null;

  private readonly recordsByRecipient: Map<string, InvitationRecord[]>;

  private constructor() {
    this.recordsByRecipient = new Map();
  }

  /**
   * シングルトンインスタンスを取得する
   */
  public static getInstance(): TestInvitationStore {
    if (!TestInvitationStore.instance) {
      TestInvitationStore.instance = new TestInvitationStore();
    }
    return TestInvitationStore.instance;
  }

  /**
   * テスト間の状態汚染を防ぐため、記録を全クリアする
   * @throws {Error} テスト環境以外で呼び出された場合
   */
  public static resetForTesting(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('resetForTesting is only available in test environment');
    }

    TestInvitationStore.instance = new TestInvitationStore();
  }

  /**
   * 送信内容を記録する
   * @param record - 記録する送信内容
   */
  public record(record: InvitationRecord): void {
    const key = record.recipient.toLowerCase();
    const existing = this.recordsByRecipient.get(key) ?? [];
    existing.push(record);
    this.recordsByRecipient.set(key, existing);
  }

  /**
   * recipientに対する最新の記録を取得する
   * @param recipient - 送信先メールアドレス（大文字小文字を区別しない）
   * @returns 最新の記録、存在しない場合はnull
   */
  public findLatestByRecipient(recipient: string): InvitationRecord | null {
    const key = recipient.toLowerCase();
    const records = this.recordsByRecipient.get(key);
    if (!records || records.length === 0) {
      return null;
    }
    return records[records.length - 1] ?? null;
  }
}

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { IInvitationMailGateway } from '@/viewer/application/IInvitationMailGateway';

/**
 * SES(Simple Email Service)を使った招待メール送信の実装
 *
 * allowlist方式のリトライ（5xx/429のみ最大1回）を適用し、
 * それ以外のエラー（4xx等）はfail-fastで即座に例外化する。
 */
export class SesInvitationMailGateway implements IInvitationMailGateway {
  private static instance: SesInvitationMailGateway | null = null;

  private constructor(
    private readonly client: SESClient,
    private readonly fromAddress: string,
  ) {}

  static getInstance(): SesInvitationMailGateway {
    if (!SesInvitationMailGateway.instance) {
      const region = process.env.AWS_REGION;
      const fromAddress = process.env.SES_FROM_ADDRESS;

      if (!region) {
        throw new Error('AWS_REGION environment variable is required');
      }
      if (!fromAddress) {
        throw new Error('SES_FROM_ADDRESS environment variable is required');
      }

      // SDK標準リトライを無効化し、本クラスのallowlistリトライ（最大1回）のみに一本化する
      const client = new SESClient({ region, maxAttempts: 1 });

      SesInvitationMailGateway.instance = new SesInvitationMailGateway(
        client,
        fromAddress,
      );
    }

    return SesInvitationMailGateway.instance;
  }

  /**
   * テスト用: 注入済み SESClient からインスタンスを生成する
   *
   * fail-fast のため NODE_ENV=test 以外での呼び出しは例外を投げる。
   */
  static createForTesting(
    client: SESClient,
    fromAddress: string,
  ): SesInvitationMailGateway {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('createForTesting is only available in test environment');
    }

    return new SesInvitationMailGateway(client, fromAddress);
  }

  async send(
    email: string,
    projectName: string,
    accessUrl: string,
  ): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.fromAddress,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: {
          Data: `${projectName}への招待`,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: `以下のURLからアクセスしてください。\n${accessUrl}`,
            Charset: 'UTF-8',
          },
        },
      },
    });

    try {
      await this.client.send(command);
    } catch (err) {
      if (!this.isRetryable(err)) {
        throw err;
      }

      // allowlist対象（5xx/429）のみ最大1回リトライする
      await this.client.send(command);
    }
  }

  /**
   * リトライ可能なトランジェントエラー（5xx/429）かを判定する
   */
  private isRetryable(err: unknown): boolean {
    const httpStatusCode = (err as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;

    if (httpStatusCode === undefined) {
      return false;
    }

    return httpStatusCode >= 500 || httpStatusCode === 429;
  }
}

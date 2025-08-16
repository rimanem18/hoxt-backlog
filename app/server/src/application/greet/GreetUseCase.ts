import { GreetEntity } from '@/domain/greet/GreetEntity';

/**
 * Greet を取得するユースケース
 * アプリケーション層として、ドメインロジックの利用を担う
 */
export class GreetUseCase {
  /**
   * Greet エンティティを生成して返却する
   * @returns GreetEntity ドメインオブジェクト
   */
  execute(): GreetEntity {
    // デフォルトのメッセージを生成
    // 将来的には設定や外部依存からメッセージを取得する可能性がある
    return GreetEntity.create('Hello, Hono + Next.js on Docker!');
  }
}

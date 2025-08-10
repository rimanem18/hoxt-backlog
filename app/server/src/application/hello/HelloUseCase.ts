import { HelloEntity } from '../../domain/hello/HelloEntity';

/**
 * Hello を取得するユースケース
 * アプリケーション層として、ドメインロジックの利用を担う
 */
export class HelloUseCase {
  /**
   * Hello エンティティを生成して返却する
   * @returns HelloEntity ドメインオブジェクト
   */
  execute(): HelloEntity {
    // デフォルトのメッセージを生成
    // 将来的には設定や外部依存からメッセージを取得する可能性がある
    return HelloEntity.create('Hello, Hono + Next.js on Docker!');
  }
}

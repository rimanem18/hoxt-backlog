import { Hono } from 'hono';
import { HelloUseCase } from '../../../application/hello/HelloUseCase';

/**
 * Hello API のルート定義
 * プレゼンテーション層として、HTTPリクエストをユースケースに委譲する
 */
const hello = new Hono();

/**
 * GET /hello エンドポイント
 * Hello メッセージを JSON で返却する
 */
hello.get('/hello', (c) => {
  // ユースケースを実行してドメインオブジェクトを取得
  const helloUseCase = new HelloUseCase();
  const helloEntity = helloUseCase.execute();

  // ドメインオブジェクトからデータを抽出してレスポンスに変換
  return c.json({ message: helloEntity.getValue() });
});

export default hello;

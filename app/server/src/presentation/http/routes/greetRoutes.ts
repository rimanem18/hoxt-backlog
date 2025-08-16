import { Hono } from 'hono';
import { GreetUseCase } from '@/application/greet/GreetUseCase';

/**
 * Greet API のルート定義
 * プレゼンテーション層として、HTTPリクエストをユースケースに委譲する
 */
const greet = new Hono();

/**
 * GET /greet エンドポイント
 * Greet メッセージを JSON で返却する
 */
greet.get('/greet', (c) => {
  // ユースケースを実行してドメインオブジェクトを取得
  const greetUseCase = new GreetUseCase();
  const greetEntity = greetUseCase.execute();

  // ドメインオブジェクトからデータを抽出してレスポンスに変換
  return c.json({ message: greetEntity.getValue() });
});

export default greet;

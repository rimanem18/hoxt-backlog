import app from './index';

/**
 * Bunサーバーの起動と適切なシャットダウン処理
 * Docker環境での安定動作のためSIGTERMハンドリングを実装
 */

const port = Number(process.env.SERVER_PORT) || 3001;

// サーバーインスタンスを起動
const server = Bun.serve({
  fetch: app.fetch,
  port: port,
});

console.log(`🚀 Server started on port ${port}`);

// Docker SIGTERMハンドリング: 適切にサーバーを停止してソケットを解放
process.on('SIGTERM', () => {
  console.log('📋 Received SIGTERM, shutting down gracefully...');
  server.stop(); // リクエスト完了を待ってからソケットを閉じる
  console.log('✅ Server stopped successfully');
  process.exit(0);
});

// SIGINT ハンドリング (Ctrl+C)
process.on('SIGINT', () => {
  console.log('📋 Received SIGINT, shutting down gracefully...');
  server.stop();
  console.log('✅ Server stopped successfully');
  process.exit(0);
});

/**
 * Hello World メッセージを表示するコンポーネント
 */
export default function HelloWorld() {
  return (
    <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Hello, World!</h1>
        <p className="text-lg opacity-90">Welcome to our Next.js application</p>
      </div>
    </div>
  );
}

/**
 * ログインページの見出しコンポーネント（Server Component）
 *
 * 静的な見出しと説明文のみを描画する。
 */
export function LoginPageHeader(): React.ReactNode {
  return (
    <div className="text-center space-y-1">
      <h2 className="text-2xl font-bold text-gray-800">アカウントでログイン</h2>
      <p className="text-sm text-gray-500">
        メールアドレスまたは Google アカウントでログインしてください。
      </p>
    </div>
  );
}

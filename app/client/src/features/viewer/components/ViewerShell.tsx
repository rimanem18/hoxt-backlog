interface ViewerShellProps {
  children: React.ReactNode;
}

/**
 * viewer画面共通のレイアウトシェル（Server Component）
 *
 * ダッシュボードと同一の幅制限・中央寄せコンテナで子要素を包む
 */
export function ViewerShell(props: ViewerShellProps): React.ReactNode {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {props.children}
      </div>
    </div>
  );
}

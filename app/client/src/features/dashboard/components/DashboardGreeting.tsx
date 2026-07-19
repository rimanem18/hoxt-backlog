'use client';

import { useAppSelector } from '@/store/hooks';

/**
 * ユーザーのlastLoginAtに応じて挨拶文を切り替える動的サブタイトル
 *
 * h1見出し自体はpage.tsx（Server Component）が静的に描画するため、
 * Redux依存のこの部分のみをClient Componentとして分離する。
 */
export function DashboardGreeting(): React.ReactNode {
  const hasLastLoginAt = useAppSelector((state) =>
    Boolean(state.auth.user?.lastLoginAt),
  );

  return (
    <p className="mt-2 text-gray-600">
      {hasLastLoginAt
        ? 'おかえりなさい！あなたのタスクを管理しましょう。'
        : 'ようこそ！タスク管理を始めましょう。'}
    </p>
  );
}

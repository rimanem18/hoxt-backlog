'use client';

import type { ReactNode } from 'react';
import { UserProfile } from '@/features/auth/components/UserProfile';
import RecentProjects from '@/features/project/components/RecentProjects';
import { useAppSelector } from '@/store/hooks';

interface ProjectsShellProps {
  children: ReactNode;
}

/**
 * project配下画面共通のレイアウトシェル（Client Component）
 * 左サイドバーにユーザープロフィール、右メインエリアにchildrenを配置する
 *
 * @param props - childrenスロット
 * @returns project配下画面向けの共通レイアウト
 */
export function ProjectsShell(props: ProjectsShellProps): React.ReactNode {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="order-2 lg:order-1 lg:col-span-1 space-y-6">
            {user && <UserProfile user={user} />}
            <RecentProjects />
          </div>

          <div className="order-1 lg:order-2 lg:col-span-2">
            {props.children}
          </div>
        </div>
      </div>
    </div>
  );
}

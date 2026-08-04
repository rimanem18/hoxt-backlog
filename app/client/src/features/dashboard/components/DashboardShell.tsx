'use client';

import type { Task } from '@hoxt-backlog/shared-schemas/tasks';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { UserProfile } from '@/features/auth/components/UserProfile';
import { handleExpiredToken } from '@/features/auth/store/authSlice';
import { showNetworkError } from '@/features/auth/store/errorSlice';
import { useDashboardServices } from '@/features/dashboard/lib/DashboardServicesContext';
import TaskEditModal from '@/features/todo/components/TaskEditModal';
import TaskList from '@/features/todo/components/TaskList';
import { getSupabaseStorageKey } from '@/shared/utils/authValidation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

interface DashboardShellProps {
  createTaskSection: ReactNode;
  filterSortSection: ReactNode;
  taskListHeading: ReactNode;
  devDebugSlot: ReactNode;
}

/**
 * 認証済みユーザー専用のダッシュボード画面（Client Component）
 * page.tsx（Server Component）から静的なスロットを受け取り、
 * JWT期限切れ検出とネットワークエラーハンドリングを担当する
 *
 * @param props - createTaskSection・filterSortSection・taskListHeading・devDebugSlotの各スロット
 * @returns 認証済みユーザー向けダッシュボード画面
 */
export function DashboardShell(props: DashboardShellProps): React.ReactNode {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { fetchUserStatus } = useDashboardServices();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // ページ読み込み時にネットワーク状態を確認
  useEffect(() => {
    async function checkNetworkAndShowError() {
      try {
        // ユーザー情報APIでネットワーク状態を検証
        const response = await fetchUserStatus();

        // 500番台エラーはネットワークエラーと判定
        if (!response.ok && response.status >= 500) {
          throw new Error('Server error detected');
        }
      } catch (error) {
        // fetch失敗・タイムアウト・サーバーエラーをネットワークエラーとして処理
        if (
          error instanceof Error &&
          (error.name === 'TypeError' ||
            error.name === 'TimeoutError' ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('Server error'))
        ) {
          // エラー状態をRedux storeに設定
          dispatch(
            showNetworkError({
              message: 'ネットワーク接続を確認してください',
            }),
          );
        }
      }
    }

    checkNetworkAndShowError();
  }, [dispatch, fetchUserStatus]);

  // JWT期限切れの監視のみを実行（認証状態復元はprovider.tsxで実施）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storageKey = getSupabaseStorageKey();
    const savedAuthData = localStorage.getItem(storageKey);
    if (!savedAuthData) return;

    try {
      const parsedAuthData = JSON.parse(savedAuthData);
      const expiresAt = Number(parsedAuthData.expires_at);

      // 期限切れチェックのみ実行
      // expires_atは秒単位なのでミリ秒に変換して比較
      const expiresAtMs = expiresAt * 1000;
      if (Number.isNaN(expiresAt) || expiresAtMs <= Date.now()) {
        dispatch(handleExpiredToken());
        // AuthGuardが自動的にリダイレクトするため、手動リダイレクトは不要
      }
    } catch {
      dispatch(handleExpiredToken());
    }
  }, [dispatch]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* ユーザープロフィール（左サイドバー） */}
        <div className="lg:col-span-1">
          {user && <UserProfile user={user} />}
        </div>

        {/* タスク管理セクション（メインエリア） */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* タスク作成フォーム */}
            {props.createTaskSection}

            {/* フィルタとソート */}
            {props.filterSortSection}

            {/* タスク一覧 */}
            <div className="bg-white rounded-lg shadow">
              {props.taskListHeading}
              <div className="divide-y divide-gray-200">
                <TaskList onEdit={setEditingTask} />
              </div>
            </div>
          </div>

          {/* タスク編集モーダル */}
          <TaskEditModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
          />
        </div>
      </div>

      {props.devDebugSlot}
    </>
  );
}

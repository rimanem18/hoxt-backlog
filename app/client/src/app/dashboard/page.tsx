'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserProfile } from '@/features/auth/components/UserProfile';
import { handleExpiredToken } from '@/features/auth/store/authSlice';
import { showNetworkError } from '@/features/auth/store/errorSlice';
import TaskCreateForm from '@/features/todo/components/TaskCreateForm';
import TaskEditModal from '@/features/todo/components/TaskEditModal';
import TaskFilter from '@/features/todo/components/TaskFilter';
import TaskList from '@/features/todo/components/TaskList';
import TaskSort from '@/features/todo/components/TaskSort';
import { TaskServicesProvider } from '@/features/todo/lib/TaskServicesContext';
import type { Task } from '@/packages/shared-schemas/src/tasks';
import { getSupabaseStorageKey } from '@/shared/utils/authValidation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

/**
 * 認証済みユーザー専用のダッシュボードページ
 * AuthGuardによって認証が保証されているため、認証チェックは不要
 * JWT期限切れ検出とネットワークエラーハンドリングのみを担当
 *
 * @returns 認証済みユーザー向けダッシュボード画面
 */
export default function DashboardPage(): React.ReactNode {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // JWT期限切れ時の処理をメモ化して複数回実行を防止
  const handleTokenExpiration = useCallback(() => {
    dispatch(handleExpiredToken());
    // AuthGuardが自動的にリダイレクトするため、手動リダイレクトは不要
  }, [dispatch]);

  // ネットワークエラーを検出してユーザーフレンドリーなメッセージを表示
  const checkNetworkAndShowError = useCallback(async () => {
    try {
      // ユーザー情報APIでネットワーク状態を検証
      const response = await fetch('/api/v1/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 5秒のタイムアウトを設定
        signal: AbortSignal.timeout(5000),
      });

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
            correlationId: `err_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          }),
        );
      }
    }
  }, [dispatch]);

  // ページ読み込み時にネットワーク状態を確認
  useEffect(() => {
    // ネットワーク状態を自動確認
    checkNetworkAndShowError();
  }, [checkNetworkAndShowError]);

  // JWT期限切れの監視のみを実行（認証状態復元はprovider.tsxで実施）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = getSupabaseStorageKey();
      const savedAuthData = localStorage.getItem(storageKey);
      if (savedAuthData) {
        try {
          const parsedAuthData = JSON.parse(savedAuthData);
          const expiresAt = Number(parsedAuthData.expires_at);

          // 期限切れチェックのみ実行
          // expires_atは秒単位なのでミリ秒に変換して比較
          const expiresAtMs = expiresAt * 1000;
          if (Number.isNaN(expiresAt) || expiresAtMs <= Date.now()) {
            handleTokenExpiration();
          }
        } catch {
          handleTokenExpiration();
        }
      }
    }
  }, [handleTokenExpiration]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ダッシュボードタイトル */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">
            {user?.lastLoginAt
              ? 'おかえりなさい！あなたのタスクを管理しましょう。'
              : 'ようこそ！タスク管理を始めましょう。'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* ユーザープロフィール（左サイドバー） */}
          <div className="lg:col-span-1">
            {user && <UserProfile user={user} />}
          </div>

          {/* タスク管理セクション（メインエリア） */}
          <div className="lg:col-span-2">
            <TaskServicesProvider>
              <div className="space-y-6">
                {/* タスク作成フォーム */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-xl font-semibold mb-4">新しいタスク</h2>
                  <TaskCreateForm />
                </div>

                {/* フィルタとソート */}
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    絞り込み・並び替え
                  </h2>
                  <div className="space-y-4">
                    <TaskFilter />
                    <TaskSort />
                  </div>
                </div>

                {/* タスク一覧 */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 sm:p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold">タスク一覧</h2>
                  </div>
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
            </TaskServicesProvider>
          </div>
        </div>

        {/* 開発環境での認証状態デバッグ表示 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h3 className="font-semibold text-blue-800 mb-2">開発情報:</h3>
            <p className="text-blue-700">認証状態: 認証済み（AuthGuard保証）</p>
            <p className="text-blue-700">
              ユーザーID: {user?.id ? '設定済み' : '未設定'}
            </p>
            <p className="text-blue-700">
              最終ログイン: {user?.lastLoginAt ? '記録あり' : '未設定'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

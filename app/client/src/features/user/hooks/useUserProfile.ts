/**
 * ユーザープロフィール取得カスタムフック
 * userServiceを使用してプロフィール情報を取得し、状態管理を行う
 */

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@/packages/shared-schemas/src/auth';
import { useUserService } from '../contexts/UserServiceContext';
import type { UserServiceInterface } from '../services/userService';

/**
 * ユーザープロフィール取得と状態管理を行うカスタムフックの返り値型
 */
interface UseUserProfileReturn {
  /** 取得したユーザー情報（初期値・エラー時はnull） */
  user: User | null;
  /** API通信中かどうかのローディング状態 */
  loading: boolean;
  /** API通信エラー情報（正常時・ローディング中はnull） */
  error: Error | null;
  /** 手動でのプロフィール情報再取得関数 */
  refetch: () => Promise<void>;
}

/**
 * ユーザープロフィール情報の取得と状態管理を行うカスタムフック
 *
 * @returns {UseUserProfileReturn} プロフィール情報・状態・再取得関数
 */
export const useUserProfile = (): UseUserProfileReturn => {
  const injectedUserService = useUserService();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * プロフィール情報を取得してステート更新を行う内部関数
   */
  const fetchUserProfile = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // テスト環境での状態変化の確実性を保つための微小遅延
      await new Promise((resolve) => setTimeout(resolve, 0));

      const userData = await injectedUserService.getUserProfile();
      setUser(userData);
      setError(null);
    } catch (err) {
      setUser(null);

      // Error型以外も適切にError型に変換
      const errorToSet =
        err instanceof Error
          ? err
          : new Error(
              typeof err === 'string' ? err : '不明なエラーが発生しました',
            );
      setError(errorToSet);
    } finally {
      setLoading(false);
    }
  }, [injectedUserService]);

  /**
   * 手動でプロフィール情報を再取得するためのrefetch関数
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  // コンポーネントマウント時に自動でプロフィール情報を取得
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  return {
    user,
    loading,
    error,
    refetch,
  };
};

/**
 * 従来のDIオプション付きインターフェースのサポート（非推奨）
 * @deprecated Context DI版のuseUserProfile()を使用してください
 */
export const useUserProfileWithDI = (_options?: {
  userService?: UserServiceInterface;
}): UseUserProfileReturn => {
  // 旧DIオプションは無視し、Context版を使用
  return useUserProfile();
};

import type { User } from '@/packages/shared-schemas/src/auth';

const STORAGE_KEY = 'auth_user';

/**
 * セッション永続化サービス
 *
 * LocalStorageへの読み書きを集約し、Redux Reducerを純粋関数化する。
 * SSR環境（window未定義）でも安全に動作するよう設計されている。
 */
export const sessionPersistence = {
  /**
   * ユーザー情報をLocalStorageに保存
   *
   * @param user - 保存するユーザー情報
   */
  save: (user: User): void => {
    // SSR環境ではLocalStorageが使用できないため早期リターン
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

      // 開発環境でのみログ出力
      if (process.env.NODE_ENV === 'development') {
        console.log('Session saved to localStorage:', user.id);
      }
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
    }
  },

  /**
   * ユーザー情報をLocalStorageから読み込み
   *
   * @returns ユーザー情報（存在しない場合はnull）
   */
  load: (): User | null => {
    // SSR環境ではLocalStorageが使用できないためnullを返す
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // 開発環境でのみログ出力
      if (process.env.NODE_ENV === 'development') {
        console.log('Session loaded from localStorage:', parsed.id);
      }

      return parsed as User;
    } catch (error) {
      console.error('Failed to load session from localStorage:', error);
      return null;
    }
  },

  /**
   * ユーザー情報をLocalStorageから削除
   */
  clear: (): void => {
    // SSR環境ではLocalStorageが使用できないため早期リターン
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);

      // 開発環境でのみログ出力
      if (process.env.NODE_ENV === 'development') {
        console.log('Session cleared from localStorage');
      }
    } catch (error) {
      console.error('Failed to clear session from localStorage:', error);
    }
  },
};

/**
 * 認証ローディング状態管理カスタムフック
 *
 * ローディング状態、ダブルクリック防止、長時間処理検出の
 * 状態管理ロジックをコンポーネントから分離して再利用性を向上。
 */

import { useEffect, useMemo, useState } from 'react';

/**
 * 認証処理のタイマー設定
 */
const AUTH_CONFIG = {
  /** ダブルクリック防止の間隔（ミリ秒） */
  DOUBLE_CLICK_THRESHOLD: 500,
  /** 長時間処理メッセージ表示までの時間（ミリ秒） */
  LONG_PROCESS_THRESHOLD: 10000,
} as const;

/**
 * 認証ローディング状態管理カスタムフック
 *
 * @returns ローディング状態と制御関数
 */
export const useAuthLoading = () => {
  // 認証処理に関連する状態を管理
  const [isLoading, setIsLoading] = useState(false);
  const [showLongProcessMessage, setShowLongProcessMessage] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // 長時間処理の検出とメッセージ表示
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isLoading) {
      // 長時間処理タイマーを設定
      timer = setTimeout(() => {
        setShowLongProcessMessage(true);
      }, AUTH_CONFIG.LONG_PROCESS_THRESHOLD);
    } else {
      // ローディング終了時の状態リセット
      setShowLongProcessMessage(false);
    }

    // コンポーネントアンマウント時のタイマークリア
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isLoading]);

  // ダブルクリック防止機能
  const canClick = useMemo(() => {
    return (currentTime: number): boolean => {
      // 前回クリックからの経過時間を評価
      return currentTime - lastClickTime >= AUTH_CONFIG.DOUBLE_CLICK_THRESHOLD;
    };
  }, [lastClickTime]);

  // ローディング開始制御
  const startLoading = useMemo(() => {
    return (): boolean => {
      const now = Date.now();

      // ダブルクリックチェック
      if (!canClick(now)) {
        return false;
      }

      // ローディング状態を開始
      setLastClickTime(now);
      setIsLoading(true);
      return true;
    };
  }, [canClick]);

  // ローディング終了制御
  const stopLoading = useMemo(() => {
    return (): void => {
      // ローディング状態を終了
      setIsLoading(false);
    };
  }, []);

  // フックの戻り値を構築
  return useMemo(
    () => ({
      isLoading,
      showLongProcessMessage,
      startLoading,
      stopLoading,
      config: AUTH_CONFIG,
    }),
    [isLoading, showLongProcessMessage, startLoading, stopLoading],
  );
};

export type UseAuthLoadingReturn = ReturnType<typeof useAuthLoading>;

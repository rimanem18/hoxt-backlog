/**
 * 【カスタムフック】: 認証処理のローディング状態管理を担当
 * 【設計方針】: 状態管理ロジックをコンポーネントから分離し再利用性を向上
 * 【単一責任】: ローディング状態・タイマー制御・ダブルクリック防止の責任のみを担当
 * 🟢 信頼性レベル: 既存の実装パターンから抽出した確実な設計
 */

import { useState, useEffect, useMemo } from 'react';

/**
 * 【設定定数】: 認証関連のタイマー設定値
 * 【調整可能性】: 将来的にユーザビリティテストに基づき調整が必要な場合に備えて外出し
 * 🟡 信頼性レベル: エッジケース要件からの妥当な推測値
 */
const AUTH_CONFIG = {
  DOUBLE_CLICK_THRESHOLD: 500,    // 【ダブルクリック防止】: 0.5秒間隔でのクリック制御
  LONG_PROCESS_THRESHOLD: 10000,  // 【長時間処理検出】: 10秒経過時のメッセージ表示
} as const;

/**
 * 【カスタムフック定義】: 認証ローディング状態の管理機能を提供
 * 【戻り値】: ローディング状態と制御関数をオブジェクトとして返却
 * 【メモ化対応】: パフォーマンス最適化のため計算結果をキャッシュ
 * 🟢 信頼性レベル: テスト要件を満たす確実な実装
 */
export const useAuthLoading = () => {
  // 【状態管理】: 認証処理に関連する全ての状態を一元管理
  // 【実装理由】: コンポーネント側での状態管理の複雑さを軽減
  const [isLoading, setIsLoading] = useState(false);
  const [showLongProcessMessage, setShowLongProcessMessage] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // 【長時間処理検出機能】: 10秒経過時の自動メッセージ表示
  // 【実装方針】: ユーザビリティ向上のため適切なフィードバック提供
  // 🟡 信頼性レベル: UX要件からの妥当な実装推測
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoading) {
      // 【タイマー設定】: 長時間処理を検出してユーザーに適切な情報提供
      timer = setTimeout(() => {
        setShowLongProcessMessage(true);
      }, AUTH_CONFIG.LONG_PROCESS_THRESHOLD);
    } else {
      // 【状態クリーンアップ】: ローディング終了時の適切な状態リセット
      setShowLongProcessMessage(false);
    }

    // 【メモリリーク防止】: コンポーネントアンマウント時のタイマー解放
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isLoading]);

  // 【ダブルクリック防止機能】: 短時間内の連続操作を制御
  // 【実装方針】: システム負荷軽減とユーザー混乱防止を両立
  // 🟡 信頼性レベル: エッジケース要件からの妥当な実装推測
  const canClick = useMemo(() => {
    return (currentTime: number): boolean => {
      // 【時間差計算】: 前回クリックからの経過時間を評価
      return currentTime - lastClickTime >= AUTH_CONFIG.DOUBLE_CLICK_THRESHOLD;
    };
  }, [lastClickTime]);

  // 【ローディング開始制御】: 認証処理開始時の状態更新
  // 【処理内容】: ダブルクリック防止チェックと状態設定を一括処理
  const startLoading = useMemo(() => {
    return (): boolean => {
      const now = Date.now();
      
      // 【ダブルクリック判定】: 連続クリックの場合は処理を拒否
      if (!canClick(now)) {
        return false; // 【早期リターン】: クリック間隔が短すぎる場合は無視
      }

      // 【状態更新】: ローディング開始に必要な全状態を一括設定
      setLastClickTime(now);
      setIsLoading(true);
      return true; // 【成功通知】: 処理開始が正常に実行されたことを通知
    };
  }, [canClick, lastClickTime]);

  // 【ローディング終了制御】: 認証処理完了時の状態リセット
  // 【処理内容】: ローディング状態の安全な終了処理
  const stopLoading = useMemo(() => {
    return (): void => {
      // 【状態リセット】: 全ローディング関連状態の初期化
      setIsLoading(false);
      // showLongProcessMessageは useEffect で自動的にリセット
    };
  }, []);

  // 【戻り値オブジェクト】: 外部コンポーネントで必要な状態と関数を提供
  // 【設計方針】: 使いやすいAPIとして必要最小限の機能を公開
  return useMemo(() => ({
    // 【状態値】: 現在のローディング状態
    isLoading,
    showLongProcessMessage,
    
    // 【制御関数】: ローディング状態を安全に変更するための関数
    startLoading,
    stopLoading,
    
    // 【設定値】: 外部からアクセス可能な設定定数
    config: AUTH_CONFIG,
  }), [isLoading, showLongProcessMessage, startLoading, stopLoading]);
};

/**
 * 【型定義エクスポート】: useAuthLoadingフックの戻り値型
 * 【用途】: TypeScript環境での型安全性確保
 * 🟢 信頼性レベル: TypeScript標準パターンに基づく確実な型定義
 */
export type UseAuthLoadingReturn = ReturnType<typeof useAuthLoading>;
/**
 * 【機能概要】: 認証プロバイダー非依存のログインボタンコンポーネント
 * 【実装方針】: TDD Greenフェーズ - テストを通すための最小限実装
 * 【テスト対応】: LoadingState.test.tsx の3つのテストケースを通すための実装
 * 🟢 信頼性レベル: REQ-UI-001要件から直接抽出された仕様に基づく実装
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 【型定義】: LoginButtonコンポーネントのProps仕様
 * 【設計方針】: プロバイダー非依存設計により将来のApple認証対応を考慮
 * 🟢 信頼性レベル: テストファイルの要求仕様から抽出
 */
interface LoginButtonProps {
  provider: 'google' | 'apple';
  disabled?: boolean;
  onAuthStart?: () => void;
  onAuthSuccess?: (user: any) => void;
  onAuthError?: (error: string) => void;
}

/**
 * 【コンポーネント定義】: 認証処理を担当するLoginButtonコンポーネント
 * 【実装方針】: ローディング状態管理とアクセシビリティ要件を満たす最小実装
 * 【テスト対応】: 3つのテストケース（基本動作・ダブルクリック防止・長時間処理）に対応
 * 🟢 信頼性レベル: テスト仕様を直接実装
 */
export const LoginButton: React.FC<LoginButtonProps> = ({
  provider,
  disabled = false,
  onAuthStart,
  onAuthSuccess,
  onAuthError
}) => {
  // 【状態管理】: ローディング状態とUI制御のための状態定義
  // 【実装理由】: テストで要求されるローディング状態の表示制御に必要
  // 🟢 信頼性レベル: テストケースから直接抽出
  const [isLoading, setIsLoading] = useState(false);
  const [showLongProcessMessage, setShowLongProcessMessage] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  // 【長時間処理検出】: 10秒経過時のメッセージ表示制御
  // 【実装理由】: 長時間処理対応テストケースを通すために必要
  // 🟡 信頼性レベル: EDGE-UI-002からの妥当な実装推測
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      // 【タイマー設定】: 10秒後に長時間処理メッセージを表示
      timer = setTimeout(() => {
        setShowLongProcessMessage(true);
      }, 10000);
    } else {
      // 【状態リセット】: ローディング終了時にメッセージをクリア
      setShowLongProcessMessage(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  // 【認証処理関数】: Google OAuth認証を実行する関数
  // 【実装方針】: テストを通すための最小限の認証ロジック
  // 🟢 信頼性レベル: 既存のSupabase連携パターンに基づく
  const handleAuth = useCallback(async () => {
    const now = Date.now();
    
    // 【ダブルクリック防止】: 0.5秒以内の連続クリックを無視
    // 【実装理由】: ダブルクリック防止テストケースを通すために必要
    // 🟡 信頼性レベル: EDGE-UI-001からの妥当な実装推測
    if (now - lastClickTime < 500) {
      return; // 【早期リターン】: 連続クリックの場合は処理を中断
    }
    
    setLastClickTime(now);
    setIsLoading(true);
    
    try {
      // 【認証開始通知】: コールバック関数の呼び出し
      onAuthStart?.();
      
      // 【実際の認証処理】: Supabase OAuth認証を実行
      // 【処理内容】: Google認証プロバイダーでサインイン処理
      // 🟢 信頼性レベル: 既存の認証サービス実装に基づく
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        // 【エラー処理】: 認証失敗時のエラーハンドリング
        onAuthError?.(error.message);
      } else {
        // 【成功処理】: 認証成功時のコールバック呼び出し
        onAuthSuccess?.(data);
      }
    } catch (error) {
      // 【例外処理】: 予期しないエラーのキャッチ
      const errorMessage = error instanceof Error ? error.message : '認証に失敗しました';
      onAuthError?.(errorMessage);
    } finally {
      // 【状態リセット】: 処理完了後のローディング状態解除
      setIsLoading(false);
    }
  }, [provider, onAuthStart, onAuthSuccess, onAuthError, lastClickTime]);

  // 【プロバイダー別ラベル生成】: 表示テキストの動的生成
  // 【実装理由】: テストで期待される初期ラベルを提供
  // 🟢 信頼性レベル: テストケースの期待値から直接抽出
  const getButtonLabel = () => {
    if (isLoading) {
      return '認証中...'; // 【ローディング中ラベル】: テストで期待される処理中表示
    }
    
    switch (provider) {
      case 'google':
        return 'Googleでログイン'; // 【初期ラベル】: テストで期待される初期表示
      case 'apple':
        return 'Appleでログイン'; // 【将来対応】: Apple認証対応時のラベル
      default:
        return 'ログイン'; // 【フォールバック】: 予期しないプロバイダーの場合
    }
  };

  // 【ARIA-Label生成】: アクセシビリティ対応のラベル生成
  // 【実装理由】: ARIA属性テストケースを通すために必要
  // 🟢 信頼性レベル: WCAG 2.1 AA準拠要件から直接抽出
  const getAriaLabel = () => {
    if (isLoading) {
      return '認証中...'; // 【処理中ARIA】: スクリーンリーダー向け処理中通知
    }
    return getButtonLabel(); // 【通常時ARIA】: 通常状態のアクセシブルラベル
  };

  return (
    <div className="relative">
      {/* 【メインボタン要素】: 認証処理を実行するボタン */}
      {/* 【スタイリング】: Tailwind CSSによる基本的な見た目設定 */}
      <button
        type="button"
        onClick={handleAuth}
        disabled={disabled || isLoading} // 【無効化制御】: 外部無効化またはローディング中の操作制御
        aria-busy={isLoading} // 【ARIA属性】: 処理中状態をスクリーンリーダーに通知
        aria-label={getAriaLabel()} // 【ARIA属性】: アクセシブルなラベル設定
        className={`
          px-6 py-3 rounded-md font-medium text-white transition-all duration-200
          ${isLoading 
            ? 'bg-gray-400 cursor-not-allowed' // 【ローディング時スタイル】: 無効化状態の視覚表現
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800' // 【通常時スタイル】: インタラクティブな状態変化
          }
        `}
      >
        <div className="flex items-center justify-center gap-2">
          {/* 【ローディングスピナー】: 処理中の視覚的フィードバック */}
          {/* 【表示条件】: ローディング中のみ表示 */}
          {/* 🟢 信頼性レベル: プロジェクトガイドラインに準拠したrole属性での特定 */}
          {isLoading && (
            <div
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              role="progressbar" // 【ARIA役割】: プログレスバーとして処理中状態を明示
              aria-label="認証処理中" // 【ARIA属性】: スクリーンリーダー向けの明確な説明
            />
          )}
          
          {/* 【ボタンテキスト】: 状態に応じた動的ラベル表示 */}
          <span>{getButtonLabel()}</span>
        </div>
      </button>

      {/* 【長時間処理メッセージ】: 10秒経過時の追加情報表示 */}
      {/* 【表示条件】: ローディング中かつ10秒経過後 */}
      {/* 🟡 信頼性レベル: エッジケーステストからの実装推測 */}
      {showLongProcessMessage && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          認証に時間がかかっています... {/* 【追加メッセージ】: ユーザーの不安軽減のための情報提供 */}
        </div>
      )}
    </div>
  );
};
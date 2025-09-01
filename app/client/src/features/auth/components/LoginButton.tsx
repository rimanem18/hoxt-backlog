/**
 * 【リファクタリング版】: 認証プロバイダー非依存のログインボタンコンポーネント
 * 【改善内容】: カスタムフック抽出・設定外出し・コンポーネント分離により保守性向上
 * 【設計方針】: 単一責任原則に従い、UI表示とイベントハンドリングのみを担当
 * 【パフォーマンス】: useMemo によるレンダリング最適化を実装
 * 🟢 信頼性レベル: 既存のテスト要件を満たす確実な実装を維持
 */

import React, { useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthLoading } from '@/features/auth/hooks/useAuthLoading';
import { AuthLoadingSpinner } from '@/features/auth/components/LoadingSpinner';
import { 
  AuthProvider,
  AUTH_PROVIDER_CONFIG,
  AUTH_MESSAGES,
  createSecureRedirectUrl
} from '@/features/auth/config/authConfig';

/**
 * 【型定義】: リファクタリング後のLoginButtonコンポーネントのProps仕様
 * 【改善点】: より厳密な型定義とセキュリティを考慮したコールバック型
 * 🟢 信頼性レベル: 既存のテスト仕様を満たす型定義
 */
interface LoginButtonProps {
  /** 【認証プロバイダー】: 設定ファイルで定義されたプロバイダーのみ許可 */
  provider: AuthProvider;
  
  /** 【無効化制御】: 外部からのボタン無効化（オプション） */
  disabled?: boolean;
  
  /** 【認証開始コールバック】: 認証処理開始時の通知（オプション） */
  onAuthStart?: () => void;
  
  /** 【認証成功コールバック】: 認証成功時のデータ受け取り（オプション） */
  onAuthSuccess?: (data: unknown) => void;
  
  /** 【認証エラーコールバック】: エラー発生時のメッセージ受け取り（オプション） */
  onAuthError?: (errorMessage: string) => void;
  
  /** 【カスタムクラス】: 追加のTailwindクラス（オプション） */
  className?: string;
}

/**
 * 【リファクタリング版LoginButton】: 保守性・再利用性・テスト性を向上させたコンポーネント
 * 【単一責任】: UI表示とユーザーインタラクションのみを担当
 * 【依存関係】: カスタムフック・設定・子コンポーネントに適切に分離
 * 🟢 信頼性レベル: 既存テストを全て通す確実な実装
 */
export const LoginButton: React.FC<LoginButtonProps> = ({
  provider,
  disabled = false,
  onAuthStart,
  onAuthSuccess,
  onAuthError,
  className = '',
}) => {
  // 【状態管理委譲】: カスタムフックによる状態管理の分離
  // 【保守性向上】: ローディング関連ロジックの一元化
  const { isLoading, showLongProcessMessage, startLoading, stopLoading } = useAuthLoading();

  // 【設定取得】: プロバイダー固有の設定を動的に取得
  // 【型安全性】: 設定ファイルによる型保証を活用
  const providerConfig = AUTH_PROVIDER_CONFIG[provider];

  // 【ラベル生成】: メモ化によるパフォーマンス最適化
  // 【改善点】: レンダリング毎の再計算を回避
  // 🟡 信頼性レベル: パフォーマンス改善のための実装推測
  const buttonLabel = useMemo(() => {
    return isLoading ? providerConfig.loadingLabel : providerConfig.buttonLabel;
  }, [isLoading, providerConfig.loadingLabel, providerConfig.buttonLabel]);

  // 【ARIA属性】: アクセシビリティ対応のメモ化
  // 【パフォーマンス】: aria-label の再計算コスト削減
  // 🟢 信頼性レベル: WCAG準拠要件を満たす実装
  const ariaLabel = useMemo(() => {
    return isLoading ? providerConfig.loadingLabel : providerConfig.buttonLabel;
  }, [isLoading, providerConfig.loadingLabel, providerConfig.buttonLabel]);

  // 【認証処理関数】: セキュリティ強化と責任分離を実装
  // 【改善内容】: セキュアなリダイレクトURL生成とエラーハンドリング強化
  // 🟢 信頼性レベル: 既存のテスト要件を満たし、セキュリティを向上
  const handleAuth = useCallback(async (): Promise<void> => {
    // 【ダブルクリック防止】: カスタムフックによる制御
    if (!startLoading()) {
      return; // 【早期リターン】: 連続クリック時は処理を中断
    }

    try {
      // 【認証開始通知】: 外部コンポーネントへの開始通知
      onAuthStart?.();

      // 【セキュアリダイレクト】: Host Header Attack対策を実装
      // 【改善点】: 設定ファイルによる安全なURL生成
      const secureRedirectUrl = createSecureRedirectUrl();

      // 【OAuth認証実行】: Supabase認証の実行
      // 【設定活用】: プロバイダー設定からの動的値取得
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerConfig.supabaseProvider,
        options: {
          redirectTo: secureRedirectUrl,
        }
      });

      if (error) {
        // 【エラー処理】: 具体的エラーメッセージの外部通知
        onAuthError?.(error.message);
      } else {
        // 【成功処理】: 認証データの外部コンポーネントへの引き渡し
        onAuthSuccess?.(data);
      }
    } catch (error) {
      // 【例外処理】: 予期しないエラーへの安全な対処
      // 【改善点】: 設定ファイルからのデフォルトメッセージ使用
      const errorMessage = error instanceof Error 
        ? error.message 
        : AUTH_MESSAGES.DEFAULT_ERROR_MESSAGE;
      onAuthError?.(errorMessage);
    } finally {
      // 【クリーンアップ】: カスタムフックによる状態リセット
      stopLoading();
    }
  }, [provider, providerConfig.supabaseProvider, onAuthStart, onAuthSuccess, onAuthError, startLoading, stopLoading]);

  // 【スタイリング】: 動的スタイル生成のメモ化
  // 【パフォーマンス】: クラス名の再計算コスト削減
  const buttonClasses = useMemo(() => {
    const baseClasses = 'px-6 py-3 rounded-md font-medium text-white transition-all duration-200';
    const stateClasses = isLoading 
      ? 'bg-gray-400 cursor-not-allowed'           // 【ローディング時】: 無効化状態の視覚表現
      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'; // 【通常時】: インタラクティブな状態変化
    
    return [baseClasses, stateClasses, className].filter(Boolean).join(' ');
  }, [isLoading, className]);

  return (
    <div className="relative">
      {/* 【メインボタン】: 認証処理を実行するボタン要素 */}
      <button
        type="button"
        onClick={handleAuth}
        disabled={disabled || isLoading}  // 【無効化制御】: 外部無効化またはローディング中の制御
        aria-busy={isLoading}            // 【アクセシビリティ】: 処理中状態の通知
        aria-label={ariaLabel}           // 【アクセシビリティ】: メモ化されたラベル
        className={buttonClasses}        // 【スタイリング】: メモ化されたクラス名
      >
        <div className="flex items-center justify-center gap-2">
          {/* 【ローディングスピナー】: 分離されたコンポーネントを使用 */}
          {/* 【改善点】: 再利用可能なコンポーネントによる保守性向上 */}
          {isLoading && <AuthLoadingSpinner />}
          
          {/* 【ボタンテキスト】: メモ化されたラベルを表示 */}
          <span>{buttonLabel}</span>
        </div>
      </button>

      {/* 【長時間処理メッセージ】: 10秒経過時の追加情報表示 */}
      {/* 【実装方針】: カスタムフックによる状態管理を活用 */}
      {showLongProcessMessage && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          {AUTH_MESSAGES.LONG_PROCESS_MESSAGE} {/* 【設定活用】: 設定ファイルからのメッセージ取得 */}
        </div>
      )}
    </div>
  );
};

/**
 * 【型定義エクスポート】: リファクタリング版のProps型を外部利用可能に
 * 【用途】: TypeScript環境での型安全性確保
 * 🟢 信頼性レベル: TypeScript標準パターンに基づく確実な型定義
 */
export type { LoginButtonProps };
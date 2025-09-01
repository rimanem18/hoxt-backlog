/**
 * 【再利用可能コンポーネント】: ローディング中の視覚的フィードバック表示
 * 【設計方針】: 単一責任の原則に従い、ローディング表示のみを担当
 * 【アクセシビリティ】: WCAG 2.1 AA準拠のARIA属性を適切に設定
 * 🟢 信頼性レベル: 既存実装から抽出した確実なコンポーネント設計
 */

import React from 'react';

/**
 * 【Propsインターフェース】: LoadingSpinnerコンポーネントの受け取る属性定義
 * 【アクセシビリティ重視】: ARIA属性による支援技術対応を必須化
 * 🟢 信頼性レベル: アクセシビリティ要件から直接抽出
 */
interface LoadingSpinnerProps {
  /** 【ARIA対応】: スクリーンリーダー向けの説明テキスト（必須） */
  'aria-label': string;
  
  /** 【サイズ調整】: スピナーのサイズ指定（オプション、デフォルト: 'medium'） */
  size?: 'small' | 'medium' | 'large';
  
  /** 【色設定】: スピナーの色指定（オプション、デフォルト: 'white'） */
  color?: 'white' | 'blue' | 'gray';
  
  /** 【カスタムクラス】: 追加のTailwindクラス（オプション） */
  className?: string;
}

/**
 * 【サイズマッピング】: size propに対応するTailwindクラスの定義
 * 【保守性】: サイズ設定の変更時に一箇所で修正完了
 * 🟡 信頼性レベル: デザインシステムからの妥当な推測値
 */
const SIZE_CLASSES = {
  small: 'w-3 h-3',
  medium: 'w-4 h-4', // 【デフォルト】: 既存実装で使用されているサイズ
  large: 'w-6 h-6',
} as const;

/**
 * 【色マッピング】: color propに対応するTailwindクラスの定義
 * 【拡張性】: 将来的な色追加に対応可能な構造
 * 🟡 信頼性レベル: 既存のカラーパレットから推測した設定
 */
const COLOR_CLASSES = {
  white: 'border-white border-t-transparent',     // 【既存使用】: 現在の実装で使用
  blue: 'border-blue-600 border-t-transparent',   // 【ブランド色】: プライマリカラー対応
  gray: 'border-gray-400 border-t-transparent',   // 【無効化時】: ローディング無効時の色
} as const;

/**
 * 【LoadingSpinnerコンポーネント】: 汎用的なローディングインディケーター
 * 【実装方針】: プロジェクトガイドライン準拠（role属性、data-testid禁止）
 * 【再利用性】: 認証以外の機能でも利用可能な設計
 * 🟢 信頼性レベル: 既存実装パターンを確実に再現
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  'aria-label': ariaLabel,
  size = 'medium',
  color = 'white', 
  className = '',
}) => {
  // 【クラス名生成】: props に基づく動的クラス構築
  // 【保守性】: 設定変更時の影響範囲を限定
  const sizeClass = SIZE_CLASSES[size];
  const colorClass = COLOR_CLASSES[color];
  
  // 【結合クラス】: 基本クラス + 動的クラス + カスタムクラス
  const combinedClasses = [
    'border-2 rounded-full animate-spin', // 【基本スタイル】: スピナーの基本見た目
    sizeClass,    // 【サイズ】: プロップス指定サイズ
    colorClass,   // 【色】: プロップス指定カラー
    className,    // 【カスタム】: 外部指定の追加クラス
  ].filter(Boolean).join(' '); // 【クリーンアップ】: 空文字列を除外して結合

  return (
    <div
      className={combinedClasses}
      role="progressbar"           // 【ARIA役割】: プログレスバーとして認識させる
      aria-label={ariaLabel}       // 【アクセシビリティ】: スクリーンリーダー向け説明
      aria-live="polite"          // 【ライブリージョン】: 状態変更時の適切な通知
      data-loading-spinner="true"  // 【識別子】: テスト時の要素特定（data-testid代替）
    />
  );
};

/**
 * 【プリセットコンポーネント】: 認証処理専用のローディングスピナー
 * 【用途】: 認証関連コンポーネントでの使用を簡単にするヘルパー
 * 【設計理由】: よく使われる設定の組み合わせを事前定義
 * 🟢 信頼性レベル: 既存の使用パターンから抽出
 */
export const AuthLoadingSpinner: React.FC<{
  /** 【カスタムクラス】: 追加のスタイル指定（オプション） */
  className?: string;
}> = ({ className }) => (
  <LoadingSpinner
    aria-label="認証処理中"    // 【固定ラベル】: 認証処理専用の適切な説明
    size="medium"             // 【標準サイズ】: 認証ボタンに適したサイズ
    color="white"             // 【標準色】: ボタン内で視認しやすい色
    className={className}     // 【拡張可能】: 外部からのスタイル追加を許可
  />
);

/**
 * 【型定義エクスポート】: LoadingSpinnerのProps型を外部利用可能に
 * 【用途】: TypeScript環境での型安全性確保
 * 🟢 信頼性レベル: TypeScript標準パターンに基づく確実な型定義
 */
export type { LoadingSpinnerProps };
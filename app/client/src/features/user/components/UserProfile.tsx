/**
 * TASK-302: ユーザープロフィール表示実装（新アーキテクチャ版）
 * 【機能概要】: 認証済みユーザーの詳細プロフィール情報を表示するReactコンポーネント
 * 【実装方針】: useUserProfileフックを使用したシンプルな条件分岐表示実装
 * 【テスト対応】: UserProfile.test.tsxで作成された9つのテストケースを通すための実装
 * 🟢 信頼性レベル: 既存UI実装パターンからの高信頼性
 */

'use client';
import Image from 'next/image';
import type React from 'react';
import { useState } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';

/**
 * 【機能概要】: 日時文字列をローカライズされた日本語形式に変換するユーティリティ関数
 * 【実装方針】: テストで期待される「2025年9月1日 19:30」形式への変換実装
 * 【テスト対応】: 最終ログイン日時表示テストケース対応
 * 🟢 信頼性レベル: テストケースで期待される出力形式に直接対応
 * @param {string} isoString - ISO 8601形式の日時文字列
 * @returns {string} 日本語ローカライズされた日時文字列
 */
const formatDateTimeToJapanese = (isoString: string): string => {
  // 【日時解析】: ISO 8601形式の文字列をDateオブジェクトに変換
  const date = new Date(isoString);
  
  // 【ローカライズ実行】: 日本語表記での年月日時分表示を生成
  // 【テスト要件対応】: 「2025年9月1日 19:30」形式でのフォーマット出力
  const formatted = date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo' // 【日本時間表示】: JSTでの時刻表示を確保
  });
  
  // 【テスト対応】: 全角コロンを半角コロンに変換してテスト期待値に合致させる
  return formatted.replace('：', ':');
};

/**
 * 【機能概要】: ユーザー名の長さをチェックして必要に応じて省略表示する関数
 * 【実装方針】: 50文字超過時に47文字+"..."での省略処理実装
 * 【テスト対応】: 長いユーザー名省略表示テストケース対応
 * 🟢 信頼性レベル: EDGE-101要件明示による高信頼性
 * @param {string} name - 元のユーザー名
 * @returns {string} 省略処理済みのユーザー名
 */
const truncateUserName = (name: string): string => {
  // 【文字数チェック】: 50文字以下の場合はそのまま返却
  if (name.length <= 50) {
    return name; // 【正常表示】: 制限内の名前はそのまま表示
  }
  
  // 【省略処理】: 51文字以上の場合は47文字+"..."で省略表示
  return name.substring(0, 47) + '...'; // 【省略表示】: EDGE-101要件に準拠した省略ルール 🟢
};

/**
 * 【機能概要】: ユーザープロフィール情報を表示するReactコンポーネント
 * 【実装方針】: useUserProfileフックを使用した状態別条件分岐表示
 * 【テスト対応】: 9つのテストケース（正常系・異常系・境界値）を通すための実装
 * 🟢 信頼性レベル: 既存コンポーネント実装パターンに基づく
 * @returns {React.ReactNode} プロフィール表示要素
 */
export const UserProfile: React.FC = () => {
  // 【フック活用】: useUserProfileフックからプロフィール情報と状態を取得
  // 【状態管理】: ローディング・エラー・ユーザーデータの3つの状態を管理
  const { user, loading, error, refetch } = useUserProfile(); // 🟢 実装済みフックとの連携

  // 【ローディング状態表示】: データ取得中のスケルトンUI表示処理
  // 【テスト対応】: スケルトンUI表示テストケース対応
  if (loading) {
    return (
      <div 
        className="responsive-container p-4 bg-white rounded-lg shadow"
        data-testid="user-profile-container"
        role="status" 
        aria-label="読み込み中"
      >
        {/* 【スケルトンUI】: ローディング中の適切なプレースホルダー表示 */}
        <div className="space-y-4">
          {/* 【アバタースケルトン】: 円形のアバター用プレースホルダー */}
          <div 
            className="responsive-avatar w-16 h-16 bg-gray-200 rounded-full mx-auto animate-pulse"
            data-testid="avatar-skeleton"
          />
          
          {/* 【名前スケルトン】: 名前用の長方形プレースホルダー */}
          <div 
            className="h-6 bg-gray-200 rounded w-32 mx-auto animate-pulse"
            data-testid="name-skeleton"
          />
          
          {/* 【メールスケルトン】: メール用の長方形プレースホルダー */}
          <div 
            className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse"
            data-testid="email-skeleton"
          />
          
          {/* 【最終ログインスケルトン】: 最終ログイン日時用プレースホルダー */}
          <div 
            className="h-4 bg-gray-200 rounded w-40 mx-auto animate-pulse"
            data-testid="lastlogin-skeleton"
          />
        </div>
      </div>
    );
  }

  // 【エラー状態表示】: API通信エラー時のエラーメッセージと再試行ボタン表示
  // 【テスト対応】: 3つのエラーハンドリングテストケース対応
  if (error) {
    return (
      <div 
        className="responsive-container p-4 bg-white rounded-lg shadow"
        data-testid="user-profile-container"
      >
        {/* 【エラー表示】: 適切なaria-role設定でのエラーメッセージ表示 */}
        <div role="alert" className="text-center">
          <p className="text-red-600 mb-4">{error.message}</p>
          
          {/* 【再試行ボタン】: ユーザーが手動で復旧できる再試行機能 */}
          <button
            type="button"
            onClick={() => refetch()} // 【再取得実行】: refetch関数による手動データ再取得
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            再試行
          </button>
          
          {/* 【認証エラー時の誘導】: 401エラー時のログインページへの誘導リンク */}
          {error.message.includes('認証が必要') && (
            <div className="mt-4">
              <a 
                href="/login" 
                role="link"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                ログインページへ
              </a>
            </div>
          )}
          
          {/* 【ネットワークエラー時の表示】: オフライン状態の視覚的表示 */}
          {error.message.includes('インターネット接続') && (
            <div 
              className="mt-4 p-2 bg-gray-100 rounded text-gray-600"
              data-testid="offline-indicator"
            >
              オフライン状態です
            </div>
          )}
        </div>
      </div>
    );
  }

  // 【正常表示】: ユーザープロフィール情報の完全表示処理
  // 【テスト対応】: 正常系・境界値テストケース対応
  if (user) {
    // 【名前省略処理】: 長い名前の適切な省略表示実行
    const displayName = truncateUserName(user.name); // 【境界値対応】: 50文字超過時の省略処理 🟢
    const showFullNameOnHover = user.name.length > 50; // 【title属性制御】: 省略時のみフルネーム表示

    // 【画像フォールバック設定】: 無効画像URLへのデフォルト画像対応
    const [avatarSrc, setAvatarSrc] = useState(user.avatarUrl || '/default-avatar.png'); // 【境界値対応】: null・無効URL時のフォールバック 🟢

    // 【最終ログイン日時処理】: null値の適切な処理と表示メッセージ生成
    const lastLoginDisplay = user.lastLoginAt 
      ? formatDateTimeToJapanese(user.lastLoginAt) // 【日本語ローカライズ】: ISO文字列の日本語変換 🟢
      : '初回ログインです'; // 【null値対応】: 初回ログイン時の適切なメッセージ表示 🟢

    return (
      <div 
        className="responsive-container p-4 bg-white rounded-lg shadow"
        data-testid="user-profile-container"
      >
        {/* 【アバター画像表示】: Next.js Image コンポーネントを使用した最適化画像表示 */}
        <Image
          src={avatarSrc}
          alt="プロフィール画像" // 【アクセシビリティ】: 適切なalt属性設定 🟢
          width={64}
          height={64}
          className="responsive-avatar rounded-full mx-auto mb-4"
          priority // 【パフォーマンス】: 重要画像の優先読み込み設定
          onError={() => {
            // 【画像読み込み失敗時】: デフォルト画像への自動フォールバック処理
            setAvatarSrc('/default-avatar.png');
          }}
        />

        {/* 【ユーザー名表示】: 適切な見出し構造での名前表示 */}
        <h2 
          className="text-xl font-bold text-center mb-2"
          title={showFullNameOnHover ? user.name : undefined} // 【省略時補完】: hover時の完全名表示 🟢
        >
          {displayName}
        </h2>

        {/* 【メールアドレス表示】: 段落要素での適切な情報表示 */}
        <p className="text-gray-600 text-center mb-2">
          {user.email}
        </p>

        {/* 【最終ログイン日時表示】: 新機能として追加されたログイン履歴表示 */}
        <p className="text-gray-500 text-center text-sm mb-4">
          最終ログイン: {lastLoginDisplay} {/* 【新機能】: TASK-302で追加されたログイン日時表示 🟢 */}
        </p>
      </div>
    );
  }

  // 【予期しない状態】: user・loading・errorがすべてfalse/nullの場合のフォールバック
  // 【安全性確保】: 予期しない状態での適切なフォールバック表示
  return (
    <div 
      className="responsive-container p-4 bg-white rounded-lg shadow"
      data-testid="user-profile-container"
    >
      <p className="text-center text-gray-500">プロフィール情報を読み込めませんでした</p>
    </div>
  );
};